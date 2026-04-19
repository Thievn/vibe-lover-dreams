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

async function loadSettings(svc: ReturnType<typeof createClient>) {
  const { data, error } = await svc.from("marketing_social_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return data as {
    id: number;
    zernio_twitter_account_id: string | null;
    auto_process_forge_queue: boolean;
    updated_at: string;
  } | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const adminGate = await requireAdminUser(req);
  if ("response" in adminGate) return adminGate.response;

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
      const cur = await loadSettings(svc);
      const next = {
        id: 1 as const,
        zernio_twitter_account_id: zid !== undefined ? zid || null : cur?.zernio_twitter_account_id ?? null,
        auto_process_forge_queue: autoQ !== undefined ? autoQ : cur?.auto_process_forge_queue ?? false,
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
          settings: row ?? { id: 1, zernio_twitter_account_id: null, auto_process_forge_queue: false },
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

      await svc.from("social_post_jobs").insert({
        created_by: adminGate.user.id,
        kind: "manual",
        status: "posted",
        content: content.slice(0, 2000),
        zernio_response: parsed as Record<string, unknown>,
      });

      return new Response(JSON.stringify({ success: true, result: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    return new Response(JSON.stringify({ error: "Invalid mode", valid: ["ping", "settings_get", "settings_update", "profiles_list", "post", "enqueue_auto_forge", "process_queue"] }), {
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
