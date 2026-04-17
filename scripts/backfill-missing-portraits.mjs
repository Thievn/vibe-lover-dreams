/**
 * One-off portrait backfill for catalog + forge rows with no usable still image.
 * Keeps prompts aligned with edge `renderCompanionPortrait` / `portraitImageDesignBrief` — re-read that file if drift matters.
 *
 * Usage:
 *   npm run backfill:portraits -- [--dry-run] [--max=50] [--delay-ms=2800] [--source=catalog|forge|all]
 *
 * Requires in .env or .env.local (repo root):
 *   VITE_SUPABASE_URL or SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   XAI_API_KEY or GROK_API_KEY
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

const BRIEF = `Portrait design mandate (apply on every generation):
• Strictly SFW: no nudity, no visible genitals, no explicit sex acts — seductive pin-up, fashion editorial, or cinematic cover art only.
• No logos, watermarks, UI chrome, or legible product/app names in-frame.
• Believable anatomy for human figures unless stylization is clearly cartoon/anime from tags.
• Faces are wholly fictional — never a celebrity likeness.`;

const ANATOMY = `Anatomy: prioritize believable proportions, limbs, hands, and feet for default human figures.`;

function parseArgs() {
  const out = { dryRun: false, max: 40, delayMs: 2800, source: "all" };
  for (const a of process.argv.slice(2)) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a.startsWith("--max=")) out.max = Math.max(1, parseInt(a.slice(6), 10) || 40);
    else if (a.startsWith("--delay-ms=")) out.delayMs = Math.max(500, parseInt(a.slice(11), 10) || 2800);
    else if (a.startsWith("--source=")) out.source = a.slice(9) || "all";
  }
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildPrompt(row) {
  const explicit = String(row.image_prompt || "").trim();
  if (explicit) return explicit;
  const name = String(row.name || "Character");
  const app = String(row.appearance || "").trim().slice(0, 900);
  return `SFW cinematic vertical portrait of ${name}. ${app || "Premium romance catalog hero — striking wardrobe, moody lighting, magnetic expression."}`;
}

function finalImaginePrompt(imagePrompt) {
  return `
${BRIEF}

${ANATOMY}

Create a highly detailed, cinematic, seductive SFW portrait for a romance / AI companion catalog card.

Character / scene request:
${imagePrompt}
  `.trim();
}

async function generateBytes(apiKey, imagePrompt) {
  const model = process.env.GROK_IMAGE_MODEL?.trim() || "grok-imagine-image";
  const res = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, prompt: finalImaginePrompt(imagePrompt), n: 1, aspect_ratio: "3:4" }),
  });
  const rawText = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(`Invalid JSON from xAI: ${rawText.slice(0, 300)}`);
  }
  if (!res.ok) {
    throw new Error(parsed?.error?.message || rawText.slice(0, 400));
  }
  const remoteUrl = parsed.data?.[0]?.url;
  const b64 = parsed.data?.[0]?.b64_json;
  let binaryData;
  let ext = "jpg";
  let contentType = "image/jpeg";
  if (remoteUrl) {
    if (remoteUrl.startsWith("data:")) {
      const m = remoteUrl.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!m) throw new Error("Bad data URL from xAI");
      ext = m[1] === "jpeg" ? "jpg" : m[1];
      contentType = `image/${m[1] === "jpeg" ? "jpeg" : m[1]}`;
      binaryData = Uint8Array.from(Buffer.from(m[2], "base64"));
    } else {
      const imgRes = await fetch(remoteUrl);
      if (!imgRes.ok) throw new Error(`Download xAI image failed ${imgRes.status}`);
      const ct = imgRes.headers.get("content-type") || "";
      if (ct.includes("png")) {
        ext = "png";
        contentType = "image/png";
      }
      binaryData = new Uint8Array(await imgRes.arrayBuffer());
    }
  } else if (b64) {
    binaryData = Uint8Array.from(Buffer.from(b64, "base64"));
  } else {
    throw new Error("No image in xAI response");
  }
  return { binaryData, ext, contentType };
}

function missingCatalogPortrait(row) {
  const st = String(row.static_image_url || "").trim();
  const im = String(row.image_url || "").trim();
  return !st && !im;
}

function missingForgePortrait(row) {
  const im = String(row.image_url || "").trim();
  const av = String(row.avatar_url || "").trim();
  const st = String(row.static_image_url || "").trim();
  return !im && !av && !st;
}

async function main() {
  const opts = parseArgs();
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE_URL (or VITE_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  if (!apiKey) {
    console.error("Missing XAI_API_KEY or GROK_API_KEY");
    process.exit(1);
  }

  const admin = createClient(url, key);
  const jobs = [];

  if (opts.source === "catalog" || opts.source === "all") {
    const { data, error } = await admin.from("companions").select("id,name,appearance,image_prompt,static_image_url,image_url").eq("is_active", true);
    if (error) throw error;
    for (const row of data || []) {
      if (missingCatalogPortrait(row)) {
        jobs.push({ kind: "catalog", row });
      }
    }
  }

  if (opts.source === "forge" || opts.source === "all") {
    const { data, error } = await admin
      .from("custom_characters")
      .select("id,name,appearance,image_prompt,image_url,avatar_url,static_image_url");
    if (error) throw error;
    for (const row of data || []) {
      if (missingForgePortrait(row)) {
        jobs.push({ kind: "forge", row });
      }
    }
  }

  const slice = jobs.slice(0, opts.max);
  console.log(`Found ${jobs.length} missing portraits (processing ${slice.length}, dryRun=${opts.dryRun})`);

  let done = 0;
  for (const job of slice) {
    const row = job.row;
    const imagePrompt = buildPrompt(row);
    const label = job.kind === "catalog" ? `catalog:${row.id}` : `forge:${row.id}`;
    console.log(`\n[${done + 1}/${slice.length}] ${label}`);
    if (opts.dryRun) {
      console.log("  dry-run — would generate with prompt length", imagePrompt.length);
      done++;
      continue;
    }

    const { binaryData, ext, contentType } = await generateBytes(apiKey, imagePrompt);
    const path = job.kind === "catalog" ? `${row.id}.${ext}` : `forge/${row.id}.${ext}`;

    const { error: upErr } = await admin.storage.from("companion-portraits").upload(path, binaryData, {
      contentType,
      upsert: true,
    });
    if (upErr) {
      console.error("  storage upload failed:", upErr.message);
      await sleep(opts.delayMs);
      continue;
    }

    const publicUrl = admin.storage.from("companion-portraits").getPublicUrl(path).data.publicUrl;

    if (job.kind === "catalog") {
      const { error: dbErr } = await admin
        .from("companions")
        .update({ image_url: publicUrl, image_prompt: imagePrompt })
        .eq("id", row.id);
      if (dbErr) console.error("  db update failed:", dbErr.message);
      else console.log("  updated companions.image_url");
    } else {
      const { error: dbErr } = await admin
        .from("custom_characters")
        .update({
          image_url: publicUrl,
          avatar_url: publicUrl,
          static_image_url: publicUrl,
          image_prompt: imagePrompt,
        })
        .eq("id", row.id);
      if (dbErr) console.error("  db update failed:", dbErr.message);
      else console.log("  updated custom_characters portrait fields");
    }

    done++;
    await sleep(opts.delayMs);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
