import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resolveXaiApiKey } from "../_shared/resolveXaiApiKey.ts";
import { renderPortraitToStorage } from "../_shared/renderCompanionPortrait.ts";
import { generateAppearanceReferenceText } from "../_shared/generateAppearanceReferenceText.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as {
      companionId?: string;
      imagePrompt?: string;
      target?: "catalog" | "forge";
      forgeRowUuid?: string;
      contentTier?: string;
    };

    const { companionId, imagePrompt } = body;
    const target = body.target === "forge" ? "forge" : "catalog";
    const forgeRowUuid = typeof body.forgeRowUuid === "string" ? body.forgeRowUuid.trim() : "";

    if (!imagePrompt) {
      return new Response(JSON.stringify({ error: "imagePrompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (target === "catalog" && !companionId) {
      return new Response(JSON.stringify({ error: "companionId is required for catalog portraits" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (target === "forge" && !forgeRowUuid) {
      return new Response(JSON.stringify({ error: "forgeRowUuid is required for forge portraits" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const xaiKey = resolveXaiApiKey((n) => Deno.env.get(n));
    if (!xaiKey) {
      return new Response(
        JSON.stringify({
          error:
            "Missing XAI_API_KEY or GROK_API_KEY for admin/forge portrait generation (Grok Imagine — same stack as generate-image).",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let characterData: Record<string, unknown> = {};
    if (target === "forge") {
      const { data: row } = await adminClient
        .from("custom_characters")
        .select("*")
        .eq("id", forgeRowUuid)
        .maybeSingle();
      characterData = (row as Record<string, unknown>) ?? {};
    } else if (companionId) {
      const { data: row } = await adminClient.from("companions").select("*").eq("id", companionId).maybeSingle();
      characterData = (row as Record<string, unknown>) ?? {};
    }

    const storageTarget =
      target === "forge"
        ? ({ kind: "forge" as const, uuid: forgeRowUuid })
        : ({ kind: "catalog" as const, catalogId: companionId! });

    const portraitTier =
      body.contentTier === "full_adult_art" ? ("full_adult_art" as const) : ("forge_preview_sfw" as const);
    const { publicUrl, displayUrl } = await renderPortraitToStorage({
      adminClient,
      imagePrompt,
      characterData,
      target: storageTarget,
      contentTier: portraitTier,
    });

    const getEnv = (n: string) => Deno.env.get(n);
    let appearanceRef: string | null = null;
    try {
      appearanceRef = await generateAppearanceReferenceText(getEnv, {
        publicImageUrl: publicUrl,
        gender: String(characterData.gender ?? ""),
        identityAnatomyDetail:
          typeof characterData.identity_anatomy_detail === "string"
            ? characterData.identity_anatomy_detail
            : undefined,
        appearanceDraft: String(characterData.appearance ?? ""),
      });
    } catch (e) {
      console.error("generate-companion-image: appearance_reference failed", e);
    }

    if (target === "forge") {
      const forgePatch: Record<string, unknown> = {
        image_url: publicUrl,
        avatar_url: publicUrl,
        static_image_url: publicUrl,
        image_prompt: imagePrompt,
        ...(appearanceRef ? { appearance_reference: appearanceRef, character_reference: appearanceRef } : {}),
      };
      let { error: updateError } = await adminClient.from("custom_characters").update(forgePatch).eq("id", forgeRowUuid);
      if (updateError && /character_reference|PGRST204/i.test(updateError.message ?? "")) {
        const { error: e2 } = await adminClient
          .from("custom_characters")
          .update({
            image_url: publicUrl,
            avatar_url: publicUrl,
            static_image_url: publicUrl,
            image_prompt: imagePrompt,
            ...(appearanceRef ? { appearance_reference: appearanceRef } : {}),
          })
          .eq("id", forgeRowUuid);
        updateError = e2;
      }

      if (updateError) {
        console.error("DB update error (forge):", updateError);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const catPatch: Record<string, unknown> = {
        image_url: publicUrl,
        image_prompt: imagePrompt,
        ...(appearanceRef ? { appearance_reference: appearanceRef, character_reference: appearanceRef } : {}),
      };
      let { error: updateError } = await adminClient.from("companions").update(catPatch).eq("id", companionId!);
      if (updateError && /character_reference|PGRST204/i.test(updateError.message ?? "")) {
        const { error: e2 } = await adminClient
          .from("companions")
          .update({
            image_url: publicUrl,
            image_prompt: imagePrompt,
            ...(appearanceRef ? { appearance_reference: appearanceRef } : {}),
          })
          .eq("id", companionId!);
        updateError = e2;
      }

      if (updateError) {
        console.error("DB update error (catalog):", updateError);
      }
    }

    return new Response(JSON.stringify({ imageUrl: displayUrl, publicImageUrl: publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Edge function error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
