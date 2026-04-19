import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resolveXaiApiKey } from "../_shared/resolveXaiApiKey.ts";
import { buildAnatomyRewriterDirective, resolveAnatomyVariant } from "../_shared/anatomyImageRules.ts";
import { rewritePromptForImagine } from "../_shared/safeImagePromptRewriter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
    const anonTrim = SUPABASE_ANON_KEY?.trim() ?? "";

    if (!bearer || (anonTrim && bearer === anonTrim)) {
      return new Response(
        JSON.stringify({
          error:
            "Sign in required — send your session JWT as Authorization Bearer (not the anon key alone).",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
        JSON.stringify({ error: authErr?.message || "Invalid or expired session." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json()) as {
      raw?: string;
      context?: string;
      characterData?: Record<string, unknown>;
      userId?: string;
      /** `portrait_card` = SFW catalog-style rewrite; default `chat_session` = adult session image. */
      rewriteMode?: "chat_session" | "portrait_card";
    };
    const raw = (body.raw ?? "").trim();
    if (!raw) {
      return new Response(JSON.stringify({ error: "Missing raw text (field: raw)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.userId && body.userId !== user.id) {
      return new Response(JSON.stringify({ error: "userId does not match session." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = resolveXaiApiKey((name) => Deno.env.get(name));
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "Missing XAI_API_KEY / GROK_API_KEY for the rewriter.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const context = (body.context ?? "").trim();
    let characterData: Record<string, unknown> =
      body.characterData && typeof body.characterData === "object" ? { ...body.characterData } : {};
    if (!Object.keys(characterData).length && context) {
      try {
        const parsed = JSON.parse(context) as { characterData?: Record<string, unknown> };
        if (parsed?.characterData && typeof parsed.characterData === "object") {
          characterData = { ...parsed.characterData };
        }
      } catch {
        /* context not JSON */
      }
    }
    const anatomyVariant = resolveAnatomyVariant(characterData);
    const rewriteMode = body.rewriteMode === "portrait_card" ? "portrait_card" : "chat_session";

    const safePrompt = await rewritePromptForImagine({
      raw,
      context,
      apiKey,
      anatomyPolicy: buildAnatomyRewriterDirective(anatomyVariant),
      rewriteMode,
    });

    return new Response(JSON.stringify({ safePrompt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("safe-image-prompt:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
