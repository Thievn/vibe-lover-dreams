import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import webpush from "npm:web-push@3.6.7";
import { requireSessionUser } from "../_shared/requireSessionUser.ts";
import { isWithinCallNotifyWindow, type CallNotifyWindowRow } from "../_shared/callNotifyWindow.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

let vapidReady = false;

function initVapid(): string | null {
  if (vapidReady) return null;
  const publicKey = (Deno.env.get("VAPID_PUBLIC_KEY") ?? "").trim();
  const privateKey = (Deno.env.get("VAPID_PRIVATE_KEY") ?? "").trim();
  const subject = (Deno.env.get("VAPID_CONTACT") ?? "mailto:support@lustforge.app").trim();
  if (!publicKey || !privateKey) {
    return "Web Push is not configured: set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY Edge Function secrets.";
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidReady = true;
  return null;
}

type SendBody = {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
  icon?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const session = await requireSessionUser(req);
  if ("response" in session) return session.response;

  const vapidErr = initVapid();
  if (vapidErr) {
    return new Response(JSON.stringify({ error: vapidErr, sent: 0 }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: SendBody;
  try {
    body = (await req.json()) as SendBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "LustForge";
  const text = typeof body.body === "string" ? body.body.trim() : "";
  const url = typeof body.url === "string" && body.url.trim() ? body.url.trim() : "/";
  const tag = typeof body.tag === "string" && body.tag.trim() ? body.tag.trim() : "lf-push";
  const icon = typeof body.icon === "string" && body.icon.trim() ? body.icon.trim() : "";

  const payload = JSON.stringify({ title, body: text, url, tag, icon: icon || undefined });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const supabase = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: `Bearer ${bearer}` } },
  });

  const { data: prof } = await supabase
    .from("profiles")
    .select("call_notify_window_enabled, call_notify_tz, call_notify_start_min, call_notify_end_min")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (!isWithinCallNotifyWindow(new Date(), prof as CallNotifyWindowRow | null)) {
    return new Response(JSON.stringify({ ok: true, sent: 0, skipped: "outside_call_notify_window" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: rows, error: qErr } = await supabase
    .from("web_push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", session.user.id);

  if (qErr) {
    return new Response(JSON.stringify({ error: qErr.message, sent: 0 }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const list = rows ?? [];
  if (list.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  const failures: string[] = [];

  for (const row of list) {
    const endpoint = typeof row.endpoint === "string" ? row.endpoint : "";
    const p256dh = typeof row.p256dh === "string" ? row.p256dh : "";
    const auth = typeof row.auth === "string" ? row.auth : "";
    const id = typeof row.id === "string" ? row.id : "";
    if (!endpoint || !p256dh || !auth || !id) continue;

    const subscription = { endpoint, keys: { p256dh, auth } };
    try {
      await webpush.sendNotification(subscription, payload, {
        TTL: 120,
        urgency: "high",
      });
      sent++;
    } catch (e: unknown) {
      const status = typeof e === "object" && e !== null && "statusCode" in e
        ? (e as { statusCode?: number }).statusCode
        : undefined;
      if (status === 404 || status === 410) {
        await supabase.from("web_push_subscriptions").delete().eq("id", id);
      } else {
        const msg = e instanceof Error ? e.message : String(e);
        failures.push(msg.slice(0, 120));
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, sent, failures: failures.slice(0, 3) }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
