import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Gmail / Googlemail: ignore dots in the local part when comparing allowlists. */
function normalizeAuthEmailForCompare(email: string | null | undefined): string {
  if (!email) return "";
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at <= 0) return e;
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return `${local.replace(/\./g, "")}@${domain}`;
  }
  return e;
}

/**
 * With `verify_jwt = false` on the function, Kong skips JWT algorithm checks (e.g. ES256).
 * Call this first and validate the caller with the anon key + Authorization bearer.
 */
export async function requireSessionUser(req: Request): Promise<
  | { user: { id: string; email?: string | null } }
  | { response: Response }
> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !supabaseAnon) {
    return {
      response: new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const authHeader = req.headers.get("Authorization") || "";
  const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
  const anonTrim = supabaseAnon.trim();
  if (!bearer || bearer === anonTrim) {
    return {
      response: new Response(JSON.stringify({ error: "Sign in required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: `Bearer ${bearer}` } },
  });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return {
      response: new Response(JSON.stringify({ error: "Invalid or expired session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }
  return { user };
}

export async function requireAdminUser(req: Request): Promise<
  | { user: { id: string; email?: string | null } }
  | { response: Response }
> {
  const session = await requireSessionUser(req);
  if ("response" in session) return session;

  const adminRaw = (Deno.env.get("ADMIN_EMAIL") ?? "lustforgeapp@gmail.com").trim();
  const adminEmails = new Set(
    adminRaw
      .split(",")
      .map((s) => normalizeAuthEmailForCompare(s.trim()))
      .filter(Boolean),
  );
  const em = normalizeAuthEmailForCompare(session.user.email);
  if (em && adminEmails.has(em)) {
    return { user: session.user };
  }

  const idsRaw = (Deno.env.get("ADMIN_USER_IDS") ?? "").trim();
  if (idsRaw && session.user.id) {
    const idSet = new Set(
      idsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
    if (idSet.has(session.user.id)) {
      return { user: session.user };
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return {
      response: new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const adminClient = createClient(supabaseUrl, serviceKey);
  const { data: roles, error } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", session.user.id)
    .eq("role", "admin");

  if (error || !roles?.length) {
    return {
      response: new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }
  return { user: session.user };
}
