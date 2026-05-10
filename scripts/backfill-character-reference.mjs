/**
 * Backfills `character_reference` (physical-only Imagine lock) for catalog + forge rows.
 *
 * Phase A — instant: copy existing `appearance_reference` when `character_reference` is empty (idempotent).
 * Phase B — vision: rows with a portrait URL still missing `character_reference` call Grok vision (same rules as Edge).
 *
 * Usage:
 *   node scripts/backfill-character-reference.mjs [--dry-run] [--max=30] [--delay-ms=2500] [--source=catalog|forge|all] [--skip-copy-phase]
 *
 * Requires (.env.local or .env):
 *   SUPABASE_URL or VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   XAI_API_KEY or GROK_API_KEY
 *
 * Vision: env model first, then grok-4.3 → grok-2-vision-latest → grok-2-vision (see grokVisionModels.ts).
 * If all vision calls fail, text-only distill from `appearance`, then a short generic stub.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function loadEnvFiles() {
  for (const f of [".env.local", ".env"]) {
    const p = join(ROOT, f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq <= 0) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (process.env[k] === undefined) process.env[k] = v;
    }
  }
}

loadEnvFiles();

const SYSTEM = `You write a single dense prose paragraph for an image model's "character lock".
Rules:
- Describe ONLY permanent physical appearance: face shape, eyes, eyebrows, nose, lips, hair (style, length, color), skin tone and texture, body type and proportions, height read, species or fantasy traits (horns, tail, ears, fur, scales, wings), piercings, tattoos, scars, distinctive marks.
- Do NOT mention clothing, outfit, jewelry worn as fashion, pose, background, environment, lighting, camera, props, or story scene.
- Respect the subject's gender / anatomy presentation from the user's context; use inclusive wording; do not sexualize minors (all subjects are adults).
- Output plain prose only — no bullet lists, no markdown, no preamble.`;

function parseArgs() {
  const out = { dryRun: false, max: 25, delayMs: 2500, source: "all", skipCopyPhase: false };
  for (const a of process.argv.slice(2)) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--skip-copy-phase") out.skipCopyPhase = true;
    else if (a.startsWith("--max=")) out.max = Math.max(1, parseInt(a.slice(6), 10) || 25);
    else if (a.startsWith("--delay-ms=")) out.delayMs = Math.max(400, parseInt(a.slice(11), 10) || 2500);
    else if (a.startsWith("--source=")) out.source = a.slice(9) || "all";
  }
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function portraitUrl(row) {
  return (
    String(row.static_image_url ?? "").trim() ||
    String(row.image_url ?? "").trim() ||
    String(row.avatar_url ?? "").trim() ||
    ""
  );
}

function extractAssistant(json) {
  const ch = json?.choices?.[0]?.message?.content;
  if (typeof ch === "string" && ch.trim()) return ch.trim();
  const parts = json?.choices?.[0]?.message?.content;
  if (!Array.isArray(parts)) return "";
  const t = parts
    .filter((p) => p?.type === "text" && typeof p.text === "string")
    .map((p) => p.text)
    .join(" ")
    .trim();
  return t;
}

/** Keep in sync with `supabase/functions/_shared/grokVisionModels.ts` */
const VISION_MODEL_FALLBACKS = ["grok-4.3", "grok-2-vision-latest", "grok-2-vision"];

function grokVisionModelCandidates() {
  const env = process.env.GROK_VISION_MODEL?.trim() || process.env.GROK_APPEARANCE_VISION_MODEL?.trim();
  return [...new Set([env, ...VISION_MODEL_FALLBACKS].filter(Boolean))];
}

function defaultTextDistillModel() {
  return (
    process.env.GROK_FORGE_PARSE_MODEL?.trim() ||
    process.env.GROK_CHAT_MODEL?.trim() ||
    "grok-3"
  );
}

/** Text-only character lock when every vision model fails (same rules as Edge `generateAppearanceReferenceText`). */
async function grokTextDistillCharacterReference(apiKey, gender, idAnat, appearanceDraft) {
  const draft = String(appearanceDraft ?? "").trim();
  if (draft.length < 24) return "";
  const user = `Gender / presentation: ${gender || "adult character"}.
${idAnat ? `Identity / anatomy: ${idAnat}\n` : ""}
Writer appearance draft (strip scene, outfit, pose, and background — keep only permanent body/face/hair facts):
${draft.slice(0, 6000)}`;

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: defaultTextDistillModel(),
      temperature: 0.35,
      max_tokens: 650,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
    }),
  });
  const raw = await res.text();
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(`Grok text distill: non-JSON HTTP ${res.status}: ${raw.slice(0, 400)}`);
  }
  if (!res.ok) throw new Error(`Grok text distill HTTP ${res.status}: ${raw.slice(0, 500)}`);
  const t = extractAssistant(json);
  if (!t || t.length < 40) throw new Error("Grok text distill: empty or short assistant content");
  return t.replace(/\s+/g, " ").trim().slice(0, 2000);
}

/** Returns physical-reference paragraph, or empty string if every vision model fails (caller may text-distill). */
async function grokVisionParagraph(apiKey, imageUrl, gender, idAnat, appearanceDraft) {
  const userText = [
    `Gender / presentation context: ${gender || "adult character"}.`,
    idAnat ? `Identity / anatomy notes (keep if visible on the body): ${idAnat}` : "",
    appearanceDraft
      ? `Written appearance draft (use only if the image is unclear; still omit clothing/scene): ${appearanceDraft}`
      : "",
    "Study the attached image and write the paragraph per the system rules.",
  ]
    .filter(Boolean)
    .join("\n");

  let lastErr = /** @type {Error | null} */ (null);
  for (const model of grokVisionModelCandidates()) {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.25,
        max_tokens: 700,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });
    const raw = await res.text();
    let json;
    try {
      json = JSON.parse(raw);
    } catch {
      lastErr = new Error(`Grok vision: non-JSON HTTP ${res.status}: ${raw.slice(0, 400)}`);
      console.warn(`[vision] model "${model}":`, lastErr.message);
      continue;
    }
    if (!res.ok) {
      const snippet = raw.slice(0, 500);
      lastErr = new Error(`Grok vision HTTP ${res.status}: ${snippet}`);
      console.warn(`[vision] model "${model}" HTTP ${res.status}, trying next…`, snippet.slice(0, 120));
      continue;
    }
    const t = extractAssistant(json);
    if (!t || t.length < 40) {
      lastErr = new Error("Grok vision: empty or short assistant content");
      continue;
    }
    return t.replace(/\s+/g, " ").trim().slice(0, 2000);
  }
  if (lastErr) console.warn("[vision] all vision models failed:", lastErr.message);
  return "";
}

async function main() {
  const args = parseArgs();
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const xai = process.env.XAI_API_KEY || process.env.GROK_API_KEY || "";
  if (!url || !key) {
    console.error("Missing SUPABASE_URL (or VITE_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  if (!xai) {
    console.warn("No XAI_API_KEY / GROK_API_KEY — vision phase will be skipped (copy phase still runs unless --skip-copy-phase).");
  }

  const supabase = createClient(url, key);
  let copied = 0;
  let visioned = 0;
  let skipped = 0;
  let errors = 0;

  const needsCharacterReference = (raw) => {
    const t = String(raw ?? "").trim();
    return t.length < 40;
  };

  if (!args.skipCopyPhase) {
    for (const table of ["companions", "custom_characters"]) {
      const { data: rows, error } = await supabase
        .from(table)
        .select("id, appearance_reference, character_reference")
        .not("appearance_reference", "is", null)
        .limit(5000);
      if (error) {
        console.error(`${table} copy-phase select:`, error.message);
        errors++;
        continue;
      }
      for (const r of rows || []) {
        if (!needsCharacterReference(r.character_reference)) continue;
        const ref = String(r.appearance_reference ?? "").trim();
        if (ref.length < 40) continue;
        if (args.dryRun) {
          copied++;
          console.log(`[dry-run][copy] ${table} ${r.id} ← appearance_reference (${ref.length} chars)`);
          continue;
        }
        const { error: upErr } = await supabase.from(table).update({ character_reference: ref }).eq("id", r.id);
        if (upErr) {
          console.error(`${table} ${r.id} copy update:`, upErr.message);
          errors++;
        } else {
          copied++;
          console.log(`[copy] ${table} ${r.id} ← appearance_reference (${ref.length} chars)`);
        }
      }
    }
  }

  const runVision = async (table) => {
    if (!xai) return;
    let remaining = args.max;
    const want = Math.max(args.max * 6, 60);
    const pageSize = 120;
    const maxScan = 8000;
    const batch = [];
    /** `companions` has no `avatar_url` (forge-only); portrait stills use static_image_url / image_url. */
    const visionSelect =
      table === "companions"
        ? "id, gender, appearance, character_reference, static_image_url, image_url"
        : "id, gender, identity_anatomy_detail, appearance, character_reference, static_image_url, image_url, avatar_url";
    for (let offset = 0; batch.length < want && offset < maxScan; offset += pageSize) {
      const { data: page, error } = await supabase
        .from(table)
        .select(visionSelect)
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) {
        console.error(`${table} vision select @${offset}:`, error.message);
        errors++;
        return;
      }
      const rows = page || [];
      if (!rows.length) break;
      for (const row of rows) {
        if (needsCharacterReference(row.character_reference)) batch.push(row);
      }
    }
    for (const row of batch || []) {
      if (remaining <= 0) break;
      if (!needsCharacterReference(row.character_reference)) continue;
      const img = portraitUrl(row);
      if (!img.startsWith("http")) {
        skipped++;
        console.log(`[skip] ${table} ${row.id} — no HTTPS portrait`);
        continue;
      }
      const gender = String(row.gender ?? "").trim() || "adult character";
      const idAnat =
        table === "custom_characters"
          ? String(row.identity_anatomy_detail ?? "").trim().slice(0, 400)
          : "";
      const draft = String(row.appearance ?? "").trim().slice(0, 6000);
      let text = "";
      if (args.dryRun) {
        text = "[dry-run] would call vision";
      } else {
        text = await grokVisionParagraph(xai, img, gender, idAnat, draft);
        if (text.trim().length < 40 && draft.length >= 24) {
          try {
            const fb = await grokTextDistillCharacterReference(xai, gender, idAnat, draft);
            if (fb.trim().length >= 40) {
              text = fb;
              console.log(`[text-fallback] ${table} ${row.id} (${text.length} chars)`);
            }
          } catch (e) {
            console.warn(`[text-fallback] ${table} ${row.id}:`, e instanceof Error ? e.message : e);
          }
        }
        if (text.trim().length < 40) {
          text = `${gender} adult-presenting character — preserve face, hair, skin tone, and body-type continuity from the canonical portrait when generating new scenes.`;
          console.log(`[stub] ${table} ${row.id} — vision + distill insufficient; generic lock (re-run after richer appearance text)`);
        }
      }
      if (args.dryRun) {
        console.log(`[dry-run] ${table} ${row.id} vision ok (${text.length} chars)`);
        remaining--;
        continue;
      }
      const { error: upErr } = await supabase.from(table).update({ character_reference: text }).eq("id", row.id);
      if (upErr) {
        if (/character_reference|PGRST204/i.test(upErr.message ?? "")) {
          console.error(`[skip] ${table} ${row.id} — DB missing character_reference column? Run migrations.`);
        } else {
          console.error(`[err] ${table} ${row.id} update:`, upErr.message);
        }
        errors++;
      } else {
        visioned++;
        console.log(`[vision] ${table} ${row.id} (${text.length} chars)`);
      }
      remaining--;
      await sleep(args.delayMs);
    }
  };

  if (args.source === "catalog" || args.source === "all") {
    await runVision("companions");
  }
  if (args.source === "forge" || args.source === "all") {
    await runVision("custom_characters");
  }

  console.log(
    `\nDone. source=${args.source} dryRun=${args.dryRun} copy=${copied} vision=${visioned} skipped=${skipped} errors=${errors}` +
      (args.dryRun ? " (dry-run: copy/vision counts are targets only, no DB writes)" : ""),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
