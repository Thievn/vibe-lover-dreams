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
  let local = e.slice(0, at);
  const domain = e.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    const plus = local.indexOf("+");
    if (plus >= 0) local = local.slice(0, plus);
    return `${local.replace(/\./g, "")}@${domain}`;
  }
  return e;
}

const DEFAULT_ADMIN_EMAIL_NORM = normalizeAuthEmailForCompare("lustforgeapp@gmail.com");

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

/**
 * True when the user is a LustForge platform admin (email list, id list, or `user_roles.admin`).
 * Used to skip end-user “stay on fantasy” scoping; never trust client-reported admin flags.
 */
export async function isLustforgeAdminUser(user: {
  id: string;
  email?: string | null;
}): Promise<boolean> {
  const adminRaw = (Deno.env.get("ADMIN_EMAIL") ?? "lustforgeapp@gmail.com").trim();
  const adminEmails = new Set(
    [
      DEFAULT_ADMIN_EMAIL_NORM,
      ...adminRaw
        .split(",")
        .map((s) => normalizeAuthEmailForCompare(s.trim()))
        .filter(Boolean),
    ],
  );
  const em = normalizeAuthEmailForCompare(user.email);
  if (em && adminEmails.has(em)) {
    return true;
  }

  const idsRaw = (Deno.env.get("ADMIN_USER_IDS") ?? "").trim();
  if (idsRaw && user.id) {
    const idSet = new Set(
      idsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
    if (idSet.has(user.id)) {
      return true;
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return false;
  }

  const adminClient = createClient(supabaseUrl, serviceKey);
  const { data: roles, error } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");

  if (error || !roles?.length) {
    return false;
  }
  return true;
}

export async function requireAdminUser(req: Request): Promise<
  | { user: { id: string; email?: string | null } }
  | { response: Response }
> {
  const session = await requireSessionUser(req);
  if ("response" in session) return session;

  if (await isLustforgeAdminUser(session.user)) {
    return { user: session.user };
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

  return {
    response: new Response(JSON.stringify({ error: "Admin access required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }),
  };
}
