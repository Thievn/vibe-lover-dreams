import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireAdminUser } from "../_shared/requireSessionUser.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ZERNIO_API = "https://zernio.com/api/v1";

function getZernioKey(): string {
  const key = Deno.env.get("ZERNIO_API_KEY")?.trim();
  if (!key) throw new Error("ZERNIO_API_KEY is not set. Add it in Supabase Edge Function secrets.");
  return key;
}

function publicSiteUrl(): string {
  const u = Deno.env.get("PUBLIC_SITE_URL")?.trim();
  if (u && /^https?:\/\//i.test(u)) return u.replace(/\/$/, "");
  return "https://lustforge.app";
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function shortHypeCaption(args: {
  name: string;
  rarity: string;
  tagline: string;
  landingUrl: string;
}): string {
  const rarity = args.rarity?.trim() || "rare";
  const tag = args.tagline?.trim();
  const line = tag ? `${tag.slice(0, 120)}\n\n` : "";
  return `Weekly Companion Drop: ${args.name} (${rarity})\n\n${line}Tap in:\n${args.landingUrl}\n\n#LustForge #AICompanion #AIDating`;
}

async function pickWeeklyDropCandidates(
  svc: ReturnType<typeof createClient>,
  count: number,
  sourceMode: "mixed" | "catalog_only" | "forge_only",
): Promise<Array<{ companion_id: string; name: string; rarity: string; image_url: string | null }>> {
  const { data: stock, error: stockErr } = await svc
    .from("companions")
    .select("id, name, rarity, image_url, created_at")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(100);
  if (stockErr) throw stockErr;

  const { data: custom, error: customErr } = await svc
    .from("custom_characters")
    .select("id, name, rarity, image_url, created_at")
    .eq("is_public", true)
    .eq("approved", true)
    .order("created_at", { ascending: false })
    .limit(200);
  if (customErr) throw customErr;

  const { data: droppedRows, error: droppedErr } = await svc
    .from("weekly_drop_posts")
    .select("companion_id")
    .order("posted_at", { ascending: false })
    .limit(2000);
  if (droppedErr) throw droppedErr;

  const dropped = new Set((droppedRows ?? []).map((r) => String((r as { companion_id?: string }).companion_id ?? "")));

  const merged: Array<{ companion_id: string; name: string; rarity: string; image_url: string | null; created_at: string }> = [];
  if (sourceMode !== "forge_only") {
    for (const row of stock ?? []) {
      const id = String((row as { id?: string }).id ?? "").trim();
      if (!id) continue;
      merged.push({
        companion_id: id,
        name: String((row as { name?: string }).name ?? "Companion"),
        rarity: String((row as { rarity?: string }).rarity ?? "rare"),
        image_url:
          typeof (row as { image_url?: unknown }).image_url === "string"
            ? (row as { image_url: string }).image_url
            : null,
        created_at: String((row as { created_at?: string }).created_at ?? ""),
      });
    }
  }
  if (sourceMode !== "catalog_only") {
    for (const row of custom ?? []) {
      const uuid = String((row as { id?: string }).id ?? "").trim();
      if (!uuid) continue;
      merged.push({
        companion_id: `cc-${uuid}`,
        name: String((row as { name?: string }).name ?? "Companion"),
        rarity: String((row as { rarity?: string }).rarity ?? "rare"),
        image_url:
          typeof (row as { image_url?: unknown }).image_url === "string"
            ? (row as { image_url: string }).image_url
            : null,
        created_at: String((row as { created_at?: string }).created_at ?? ""),
      });
    }
  }

  merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const filtered = merged.filter((r) => !dropped.has(r.companion_id));
  return filtered.slice(0, count);
}

async function zernioFetch(path: string, init: RequestInit & { json?: unknown } = {}) {
  const key = getZernioKey();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${key}`);
  let body: BodyInit | undefined = init.body as BodyInit | undefined;
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }
  return fetch(`${ZERNIO_API}${path}`, { ...init, headers, body });
}

/** Best-effort parse of Zernio POST /posts JSON — HTTP can be 2xx while a platform is still pending or failed. */
function zernioTwitterSignals(parsed: unknown): {
  rootError?: string;
  platformPostUrl?: string;
  platformStatus?: string;
} {
  if (parsed == null || typeof parsed !== "object") return {};
  const o = parsed as Record<string, unknown>;
  if (typeof o.error === "string" && o.error.trim()) {
    return { rootError: o.error.trim() };
  }
  const post = o.post;
  if (!post || typeof post !== "object") return {};
  const p = post as Record<string, unknown>;
  const platforms = p.platforms;
  if (!Array.isArray(platforms)) return {};
  for (const pl of platforms) {
    if (!pl || typeof pl !== "object") continue;
    const plat = pl as Record<string, unknown>;
    if (plat.platform !== "twitter" && plat.platform !== "x") continue;
    const url = typeof plat.platformPostUrl === "string" ? plat.platformPostUrl : undefined;
    const st = typeof plat.status === "string" ? plat.status : undefined;
    return { platformPostUrl: url, platformStatus: st };
  }
  return {};
}

async function loadSettings(svc: ReturnType<typeof createClient>) {
  const { data, error } = await svc.from("marketing_social_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return data as {
    id: number;
    zernio_twitter_account_id: string | null;
    auto_process_forge_queue: boolean;
    use_looping_video_for_x: boolean;
    updated_at: string;
  } | null;
}

function isWeeklyCronAuthorized(req: Request, body: Record<string, unknown>): boolean {
  const secret = Deno.env.get("WEEKLY_DROP_CRON_SECRET")?.trim();
  if (!secret) return false;
  const headerSecret = req.headers.get("x-weekly-drop-secret")?.trim();
  if (headerSecret && headerSecret === secret) return true;
  const bearer = req.headers.get("authorization")?.trim() ?? "";
  if (bearer.toLowerCase().startsWith("bearer ")) {
    const token = bearer.slice(7).trim();
    if (token && token === secret) return true;
  }
  const bodySecret = typeof body.cronSecret === "string" ? body.cronSecret.trim() : "";
  return bodySecret === secret;
}

async function runWeeklyDropTick(args: {
  svc: ReturnType<typeof createClient>;
  actorUserId: string | null;
  force: boolean;
}): Promise<Response> {
  const { svc, actorUserId, force } = args;
  const settings = await loadSettings(svc);
  const accountId = settings?.zernio_twitter_account_id?.trim() || "";
  if (!settings?.weekly_drop_enabled) {
    return new Response(JSON.stringify({ ok: true, skipped: true, reason: "weekly drops disabled" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!accountId) {
    return new Response(JSON.stringify({ error: "No X/Twitter account id configured in settings." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = new Date();
  const intervalDays = Number((settings as Record<string, unknown>).weekly_drop_interval_days ?? 3);
  const lastRunRaw = (settings as Record<string, unknown>).weekly_drop_last_run_at;
  const lastRun = typeof lastRunRaw === "string" ? new Date(lastRunRaw) : null;
  if (!force && lastRun && now.getTime() - lastRun.getTime() < intervalDays * 24 * 60 * 60 * 1000) {
    return new Response(
      JSON.stringify({
        ok: true,
        skipped: true,
        reason: "interval not reached",
        nextRunInHours: Math.ceil((intervalDays * 24 * 60 * 60 * 1000 - (now.getTime() - lastRun.getTime())) / (60 * 60 * 1000)),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const dropsPerWeek = Number((settings as Record<string, unknown>).weekly_drops_per_week ?? 2);
  const runCount = Math.max(1, Math.min(4, Math.ceil(dropsPerWeek / 2)));
  const sourceModeRaw = String((settings as Record<string, unknown>).weekly_drop_source_mode ?? "mixed");
  const sourceMode =
    sourceModeRaw === "catalog_only" || sourceModeRaw === "forge_only" ? sourceModeRaw : "mixed";
  const candidates = await pickWeeklyDropCandidates(svc, runCount, sourceMode);
  if (candidates.length === 0) {
    await svc.from("marketing_social_settings").update({
      weekly_drop_last_run_at: now.toISOString(),
      updated_at: now.toISOString(),
    }).eq("id", 1);
    return new Response(JSON.stringify({ ok: true, processed: 0, skipped: true, reason: "no new companions" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const site = publicSiteUrl();
  const results: Array<{ companionId: string; ok: boolean; landingUrl: string; xPostUrl?: string; error?: string }> = [];
  for (const c of candidates) {
    const { data: dropRow, error: dropErr } = await svc
      .from("weekly_drop_posts")
      .insert({
        created_by: actorUserId,
        companion_id: c.companion_id,
        companion_name: c.name,
        rarity: c.rarity,
        landing_url: `${site}/companions/${c.companion_id}?drop=1`,
      })
      .select("id")
      .single();
    if (dropErr) {
      results.push({ companionId: c.companion_id, ok: false, landingUrl: "", error: dropErr.message });
      continue;
    }
    const dropId = String((dropRow as { id: string }).id);
    const landingUrl = `${site}/companions/${c.companion_id}?drop=1&wd=${dropId}`;
    const content = shortHypeCaption({
      name: c.name,
      rarity: c.rarity,
      tagline: "",
      landingUrl,
    }).slice(0, 25_000);
    const payload: Record<string, unknown> = {
      content,
      platforms: [{ platform: "twitter", accountId }],
      publishNow: true,
    };
    if (c.image_url?.trim()) {
      payload.mediaItems = [{ url: c.image_url.trim().split("?")[0] }];
    }
    const postRes = await zernioFetch("/posts", { method: "POST", json: payload });
    const postText = await postRes.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(postText);
    } catch {
      parsed = { raw: postText };
    }
    const signals = zernioTwitterSignals(parsed);
    if (!postRes.ok || signals.rootError) {
      await svc.from("weekly_drop_posts").update({
        landing_url: landingUrl,
      }).eq("id", dropId);
      await svc.from("social_post_jobs").insert({
        created_by: actorUserId,
        kind: "auto_forge",
        status: "failed",
        companion_id: c.companion_id,
        content: content.slice(0, 2000),
        error: signals.rootError || postText.slice(0, 1800),
        zernio_response: parsed as Record<string, unknown>,
      });
      results.push({
        companionId: c.companion_id,
        ok: false,
        landingUrl,
        error: signals.rootError || `HTTP ${postRes.status}`,
      });
      continue;
    }
    const { data: jobData } = await svc.from("social_post_jobs").insert({
      created_by: actorUserId,
      kind: "auto_forge",
      status: "posted",
      companion_id: c.companion_id,
      content: content.slice(0, 2000),
      zernio_response: parsed as Record<string, unknown>,
    }).select("id").single();
    await svc.from("weekly_drop_posts").update({
      landing_url: landingUrl,
      x_post_url: signals.platformPostUrl ?? null,
      social_post_job_id: (jobData as { id?: string } | null)?.id ?? null,
      posted_at: new Date().toISOString(),
    }).eq("id", dropId);
    results.push({
      companionId: c.companion_id,
      ok: true,
      landingUrl,
      xPostUrl: signals.platformPostUrl,
    });
  }

  await svc.from("marketing_social_settings").update({
    weekly_drop_last_run_at: now.toISOString(),
    updated_at: now.toISOString(),
  }).eq("id", 1);

  return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !serviceKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const svc = createClient(url, serviceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const mode = typeof body.mode === "string" ? body.mode : "";
    const bodyObj = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

    // Public tracking endpoint for weekly landing page click attribution.
    if (mode === "track_drop_click") {
      const dropId = typeof body.dropId === "string" ? body.dropId.trim() : "";
      if (!dropId) {
        return new Response(JSON.stringify({ error: "dropId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const ua = req.headers.get("user-agent") ?? "";
      const referer = req.headers.get("referer") ?? "";
      const xff = req.headers.get("x-forwarded-for") ?? "";
      const ipRaw = xff.split(",")[0]?.trim() ?? "";
      const ipHash = ipRaw ? await sha256Hex(ipRaw) : "";
      await svc.from("weekly_drop_clicks").insert({
        weekly_drop_post_id: dropId,
        user_agent: ua.slice(0, 500),
        referer: referer.slice(0, 500),
        ip_hash: ipHash.slice(0, 64) || null,
      });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "weekly_drop_tick_cron") {
      if (!isWeeklyCronAuthorized(req, bodyObj)) {
        return new Response(JSON.stringify({ error: "Unauthorized cron trigger" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const force = bodyObj.force === true;
      return await runWeeklyDropTick({
        svc,
        actorUserId: null,
        force,
      });
    }

    const adminGate = await requireAdminUser(req);
    if ("response" in adminGate) return adminGate.response;

    if (mode === "ping") {
      const hasKey = Boolean(Deno.env.get("ZERNIO_API_KEY")?.trim());
      let zernioReachable = false;
      let detail: string | undefined;
      if (hasKey) {
        try {
          const r = await fetch(`${ZERNIO_API}/profiles`, {
            headers: { Authorization: `Bearer ${Deno.env.get("ZERNIO_API_KEY")!.trim()}` },
          });
          zernioReachable = r.ok;
          detail = `GET /profiles → HTTP ${r.status}`;
        } catch (e) {
          detail = e instanceof Error ? e.message : String(e);
        }
      }
      return new Response(JSON.stringify({ hasZernioKey: hasKey, zernioReachable, detail }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "settings_update") {
      const zid = typeof body.zernioTwitterAccountId === "string" ? body.zernioTwitterAccountId.trim() : undefined;
      const autoQ = typeof body.autoProcessForgeQueue === "boolean" ? body.autoProcessForgeQueue : undefined;
      const loopX = typeof body.useLoopingVideoForX === "boolean" ? body.useLoopingVideoForX : undefined;
      const cur = await loadSettings(svc);
      const weeklyEnabled = typeof body.weeklyDropEnabled === "boolean" ? body.weeklyDropEnabled : undefined;
      const weeklyDropsPerWeek =
        typeof body.weeklyDropsPerWeek === "number" && Number.isFinite(body.weeklyDropsPerWeek)
          ? Math.max(1, Math.min(14, Math.floor(body.weeklyDropsPerWeek)))
          : undefined;
      const weeklyIntervalDays =
        typeof body.weeklyDropIntervalDays === "number" && Number.isFinite(body.weeklyDropIntervalDays)
          ? Math.max(1, Math.min(30, Math.floor(body.weeklyDropIntervalDays)))
          : undefined;

      const sourceModeRaw = typeof body.weeklyDropSourceMode === "string" ? body.weeklyDropSourceMode.trim() : undefined;
      const sourceMode =
        sourceModeRaw === "catalog_only" || sourceModeRaw === "forge_only" || sourceModeRaw === "mixed"
          ? sourceModeRaw
          : undefined;

      const next = {
        id: 1 as const,
        zernio_twitter_account_id: zid !== undefined ? zid || null : cur?.zernio_twitter_account_id ?? null,
        auto_process_forge_queue: autoQ !== undefined ? autoQ : cur?.auto_process_forge_queue ?? false,
        use_looping_video_for_x: loopX !== undefined ? loopX : cur?.use_looping_video_for_x ?? false,
        weekly_drop_enabled: weeklyEnabled !== undefined ? weeklyEnabled : (cur as Record<string, unknown> | null)?.weekly_drop_enabled ?? false,
        weekly_drops_per_week:
          weeklyDropsPerWeek !== undefined ? weeklyDropsPerWeek : Number((cur as Record<string, unknown> | null)?.weekly_drops_per_week ?? 2),
        weekly_drop_interval_days:
          weeklyIntervalDays !== undefined ? weeklyIntervalDays : Number((cur as Record<string, unknown> | null)?.weekly_drop_interval_days ?? 3),
        weekly_drop_source_mode:
          sourceMode !== undefined
            ? sourceMode
            : String((cur as Record<string, unknown> | null)?.weekly_drop_source_mode ?? "mixed"),
        updated_at: new Date().toISOString(),
      };
      const { error } = await svc.from("marketing_social_settings").upsert(next);
      if (error) throw error;
      const row = await loadSettings(svc);
      return new Response(JSON.stringify({ settings: row }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "settings_get") {
      const row = await loadSettings(svc);
      return new Response(
        JSON.stringify({
          settings: row ?? {
            id: 1,
            zernio_twitter_account_id: null,
            auto_process_forge_queue: false,
            use_looping_video_for_x: false,
            weekly_drop_enabled: false,
            weekly_drops_per_week: 2,
            weekly_drop_interval_days: 3,
            weekly_drop_source_mode: "mixed",
            weekly_drop_last_run_at: null,
          },
          hasZernioKey: Boolean(Deno.env.get("ZERNIO_API_KEY")?.trim()),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (mode === "profiles_list") {
      const r = await zernioFetch("/profiles", { method: "GET" });
      const text = await r.text();
      if (!r.ok) {
        return new Response(JSON.stringify({ error: "Zernio profiles list failed", status: r.status, detail: text.slice(0, 500) }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { raw: text };
      }
      return new Response(JSON.stringify({ profiles: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "post") {
      const content = typeof body.content === "string" ? body.content.trim() : "";
      const accountId =
        (typeof body.accountId === "string" && body.accountId.trim()) ||
        (await loadSettings(svc))?.zernio_twitter_account_id?.trim() ||
        "";
      if (!content) {
        return new Response(JSON.stringify({ error: "content required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!accountId) {
        return new Response(
          JSON.stringify({ error: "No X/Twitter account id — set it in Marketing → Zernio or pass accountId." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const scheduledFor =
        typeof body.scheduledFor === "string" && body.scheduledFor.trim() ? body.scheduledFor.trim() : null;
      const publishNow = scheduledFor ? false : body.publishNow !== false;

      const payload: Record<string, unknown> = {
        content: content.slice(0, 25_000),
        platforms: [{ platform: "twitter", accountId }],
      };
      if (scheduledFor) {
        payload.scheduledFor = scheduledFor;
      } else if (publishNow) {
        payload.publishNow = true;
      }

      const mediaUrls = Array.isArray(body.mediaUrls) ? body.mediaUrls.filter((u: unknown) => typeof u === "string") : [];
      if (mediaUrls.length) {
        payload.mediaItems = mediaUrls.slice(0, 4).map((u: string) => ({ url: u }));
      }

      const r = await zernioFetch("/posts", { method: "POST", json: payload });
      const text = await r.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { raw: text };
      }
      if (!r.ok) {
        return new Response(JSON.stringify({ error: "Zernio post failed", status: r.status, detail: parsed }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const signals = zernioTwitterSignals(parsed);
      if (signals.rootError) {
        return new Response(JSON.stringify({ error: signals.rootError, detail: parsed }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!scheduledFor && publishNow && signals.platformStatus === "failed") {
        return new Response(
          JSON.stringify({
            error: "X post did not publish (Zernio reports platform status: failed). Check Zernio logs and X account connection.",
            detail: parsed,
            platformStatus: signals.platformStatus,
          }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      let publishWarning: string | undefined;
      if (!scheduledFor && publishNow && !signals.platformPostUrl) {
        publishWarning =
          signals.platformStatus === "pending"
            ? "Zernio accepted the post; X URL not ready yet (pending). Check Zernio → Posts or your timeline in a minute."
            : "Zernio accepted the request but no X post URL was returned — confirm in Zernio and that the Twitter account id matches @handle you expect.";
      }

      await svc.from("social_post_jobs").insert({
        created_by: adminGate.user.id,
        kind: "manual",
        status: "posted",
        content: content.slice(0, 2000),
        zernio_response: parsed as Record<string, unknown>,
      });

      return new Response(
        JSON.stringify({
          success: true,
          result: parsed,
          platformPostUrl: signals.platformPostUrl,
          platformStatus: signals.platformStatus,
          publishWarning,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (mode === "enqueue_auto_forge") {
      const companionId = typeof body.companionId === "string" ? body.companionId.trim() : "";
      if (!companionId) {
        return new Response(JSON.stringify({ error: "companionId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await svc
        .from("social_post_jobs")
        .insert({
          created_by: adminGate.user.id,
          kind: "auto_forge",
          status: "pending",
          companion_id: companionId,
        })
        .select("id")
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ id: data.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "process_queue") {
      const settings = await loadSettings(svc);
      const accountId = settings?.zernio_twitter_account_id?.trim() || "";
      if (!accountId) {
        return new Response(JSON.stringify({ error: "Set zernio_twitter_account_id in marketing settings first." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: jobs, error: jq } = await svc
        .from("social_post_jobs")
        .select("*")
        .eq("status", "pending")
        .eq("kind", "auto_forge")
        .order("created_at", { ascending: true })
        .limit(8);
      if (jq) throw jq;

      const site = publicSiteUrl();
      const results: { id: string; ok: boolean; error?: string }[] = [];

      for (const job of jobs || []) {
        const jid = job.id as string;
        const cid = typeof job.companion_id === "string" ? job.companion_id : "";
        if (!cid) {
          await svc.from("social_post_jobs").update({ status: "failed", error: "missing companion_id" }).eq("id", jid);
          results.push({ id: jid, ok: false, error: "missing companion_id" });
          continue;
        }

        let name = "Companion";
        let tagline = "";
        let profilePath = `/companions/${cid}`;

        if (cid.startsWith("cc-")) {
          const uuid = cid.slice(3);
          const { data: row } = await svc.from("custom_characters").select("name, tagline").eq("id", uuid).maybeSingle();
          if (row) {
            name = (row as { name?: string }).name || name;
            tagline = (row as { tagline?: string }).tagline || "";
          }
        } else {
          const { data: row } = await svc.from("companions").select("name, tagline").eq("id", cid).maybeSingle();
          if (row) {
            name = (row as { name?: string }).name || name;
            tagline = (row as { tagline?: string }).tagline || "";
          }
        }

        const content =
          `🔥 Forged on LustForge: ${name}\n\n${tagline ? `${tagline}\n\n` : ""}${site}${profilePath}\n\n#AI #NSFW #LustForge`.slice(
            0,
            25_000,
          );

        const r = await zernioFetch("/posts", {
          method: "POST",
          json: {
            content,
            platforms: [{ platform: "twitter", accountId }],
            publishNow: true,
          },
        });
        const text = await r.text();
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = { raw: text };
        }
        if (!r.ok) {
          await svc
            .from("social_post_jobs")
            .update({ status: "failed", error: text.slice(0, 2000), zernio_response: parsed as Record<string, unknown> })
            .eq("id", jid);
          results.push({ id: jid, ok: false, error: text.slice(0, 200) });
          continue;
        }

        await svc
          .from("social_post_jobs")
          .update({
            status: "posted",
            content: content.slice(0, 2000),
            zernio_response: parsed as Record<string, unknown>,
          })
          .eq("id", jid);
        results.push({ id: jid, ok: true });
      }

      return new Response(JSON.stringify({ processed: results.length, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "weekly_drop_stats") {
      const { data: rows, error } = await svc.rpc("get_weekly_drop_stats");
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ rows: rows ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "weekly_drop_tick") {
      const force = bodyObj.force === true;
      return await runWeeklyDropTick({
        svc,
        actorUserId: adminGate.user.id,
        force,
      });
    }

    return new Response(JSON.stringify({ error: "Invalid mode", valid: ["ping", "settings_get", "settings_update", "profiles_list", "post", "enqueue_auto_forge", "process_queue", "weekly_drop_stats", "weekly_drop_tick", "weekly_drop_tick_cron", "track_drop_click"] }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("zernio-social:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
