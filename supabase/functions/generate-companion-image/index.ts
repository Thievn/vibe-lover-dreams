import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resolveXaiApiKey } from "../_shared/resolveXaiApiKey.ts";
import { renderPortraitToStorage } from "../_shared/renderCompanionPortrait.ts";

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

    const apiKey = resolveXaiApiKey((name) => Deno.env.get(name));
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            "Missing xAI API key. Set Edge Function secret GROK_API_KEY or XAI_API_KEY (same key you use for generate-image).",
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

    const { publicUrl, displayUrl } = await renderPortraitToStorage({
      adminClient,
      apiKey,
      imagePrompt,
      characterData,
      target: storageTarget,
      ...(body.contentTier === "forge_preview_sfw" ? { contentTier: "forge_preview_sfw" as const } : {}),
    });

    if (target === "forge") {
      const { error: updateError } = await adminClient
        .from("custom_characters")
        .update({
          image_url: publicUrl,
          avatar_url: publicUrl,
          static_image_url: publicUrl,
          image_prompt: imagePrompt,
        })
        .eq("id", forgeRowUuid);

      if (updateError) {
        console.error("DB update error (forge):", updateError);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const { error: updateError } = await adminClient
        .from("companions")
        .update({
          image_url: publicUrl,
          image_prompt: imagePrompt,
        })
        .eq("id", companionId!);

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
