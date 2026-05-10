import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateAppearanceReferenceText } from "../_shared/generateAppearanceReferenceText.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
    const anonTrim = SUPABASE_ANON_KEY?.trim() ?? "";

    if (!bearer || (anonTrim && bearer === anonTrim)) {
      return new Response(
        JSON.stringify({ success: false, error: "Sign in required — use your session token." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
    });
    const {
      data: { user },
      error: authErr,
    } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ success: false, error: authErr?.message || "Invalid session." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json()) as {
      userId?: string;
      publicImageUrl?: string;
      gender?: string;
      identityAnatomyDetail?: string;
      appearanceDraft?: string;
      persistCustomCharacterId?: string;
    };

    const userId = String(body.userId ?? "").trim();
    if (!userId || userId !== user.id) {
      return new Response(JSON.stringify({ success: false, error: "userId must match the signed-in user." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let publicImageUrl = String(body.publicImageUrl ?? "").trim();
    let gender = String(body.gender ?? "").trim();
    let idAnat = String(body.identityAnatomyDetail ?? "").trim();
    let draft = String(body.appearanceDraft ?? "").trim();

    const persistId = String(body.persistCustomCharacterId ?? "").trim();
    const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (persistId) {
      const { data: row, error: selErr } = await svc
        .from("custom_characters")
        .select("user_id, gender, identity_anatomy_detail, appearance, image_url, static_image_url")
        .eq("id", persistId)
        .maybeSingle();
      if (selErr || !row) {
        return new Response(JSON.stringify({ success: false, error: "Companion not found." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const r = row as Record<string, unknown>;
      if (String(r.user_id ?? "") !== user.id) {
        return new Response(JSON.stringify({ success: false, error: "Not your companion." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!gender && typeof r.gender === "string") gender = r.gender;
      if (!idAnat && typeof r.identity_anatomy_detail === "string") idAnat = String(r.identity_anatomy_detail);
      if (!draft && typeof r.appearance === "string") draft = String(r.appearance);
      if (!publicImageUrl) {
        publicImageUrl =
          String(r.static_image_url ?? "").trim() ||
          String(r.image_url ?? "").trim();
      }
    }

    if (!publicImageUrl) {
      return new Response(JSON.stringify({ success: false, error: "publicImageUrl is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const getEnv = (n: string) => Deno.env.get(n);
    const appearanceReference = await generateAppearanceReferenceText(getEnv, {
      publicImageUrl,
      gender,
      identityAnatomyDetail: idAnat || undefined,
      appearanceDraft: draft || undefined,
    });

    if (persistId) {
      const patch: Record<string, unknown> = {
        appearance_reference: appearanceReference,
        character_reference: appearanceReference,
      };
      let { error: upErr } = await svc.from("custom_characters").update(patch).eq("id", persistId).eq("user_id", user.id);
      if (upErr && /character_reference|PGRST204/i.test(upErr.message ?? "")) {
        const { error: up2 } = await svc
          .from("custom_characters")
          .update({ appearance_reference: appearanceReference })
          .eq("id", persistId)
          .eq("user_id", user.id);
        upErr = up2;
      }
      if (upErr) {
        return new Response(JSON.stringify({ success: false, error: upErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    return new Response(JSON.stringify({ success: true, appearanceReference }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("sync-appearance-reference:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
