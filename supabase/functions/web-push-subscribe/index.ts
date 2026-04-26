import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireSessionUser } from "../_shared/requireSessionUser.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PushKeys = { p256dh?: string; auth?: string };
type PushSubscriptionJSON = { endpoint?: string; keys?: PushKeys };

function parseBody(raw: unknown): { error: string } | PushSubscriptionJSON {
  if (!raw || typeof raw !== "object") return { error: "Expected JSON body" };
  const o = raw as Record<string, unknown>;
  const subscription = o.subscription;
  if (!subscription || typeof subscription !== "object") {
    return { error: "Missing subscription object" };
  }
  return subscription as PushSubscriptionJSON;
}

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

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = parseBody(json);
  if ("error" in parsed && typeof parsed.error === "string") {
    return new Response(JSON.stringify({ error: parsed.error }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sub = parsed as PushSubscriptionJSON;
  const endpoint = typeof sub.endpoint === "string" ? sub.endpoint.trim() : "";
  const p256dh = typeof sub.keys?.p256dh === "string" ? sub.keys.p256dh.trim() : "";
  const authKey = typeof sub.keys?.auth === "string" ? sub.keys.auth.trim() : "";
  if (!endpoint || !p256dh || !authKey) {
    return new Response(JSON.stringify({ error: "subscription.endpoint and keys.p256dh, keys.auth are required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const supabase = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: `Bearer ${bearer}` } },
  });

  const ua = req.headers.get("user-agent")?.slice(0, 500) ?? null;

  const { error } = await supabase.from("web_push_subscriptions").upsert(
    {
      user_id: session.user.id,
      endpoint,
      p256dh,
      auth: authKey,
      user_agent: ua,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,endpoint" },
  );

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
