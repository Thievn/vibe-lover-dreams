import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resolveXaiApiKey } from "../_shared/resolveXaiApiKey.ts";
import { PORTRAIT_IMAGE_DESIGN_BRIEF } from "../_shared/portraitImageDesignBrief.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_IMAGE_MODEL = "grok-imagine-image";

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

    const { companionId, imagePrompt } = await req.json();

    if (!companionId || !imagePrompt) {
      return new Response(JSON.stringify({ error: "companionId and imagePrompt are required" }), {
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

    const model = Deno.env.get("GROK_IMAGE_MODEL")?.trim() || DEFAULT_IMAGE_MODEL;

    const finalPrompt = `
${PORTRAIT_IMAGE_DESIGN_BRIEF}

Create a highly detailed, cinematic, seductive SFW portrait for a romance / AI companion catalog card.
Strictly SFW: no nudity, no visible genitals, no explicit sex acts. Artistic pin-up or cover quality.

Character / scene request:
${imagePrompt}
    `.trim();

    const aiResponse = await fetch("https://api.x.ai/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt: finalPrompt,
        n: 1,
        aspect_ratio: "3:4",
      }),
    });

    const rawText = await aiResponse.text();
    let parsed: { data?: Array<{ url?: string; b64_json?: string }>; error?: { message?: string } } = {};
    try {
      parsed = JSON.parse(rawText) as typeof parsed;
    } catch {
      return new Response(
        JSON.stringify({ error: "xAI returned invalid JSON", details: rawText.slice(0, 400) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!aiResponse.ok) {
      const msg = parsed.error?.message || rawText.slice(0, 500);
      return new Response(JSON.stringify({ error: "xAI image generation failed", details: msg }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let remoteUrl = parsed.data?.[0]?.url;
    const b64 = parsed.data?.[0]?.b64_json;

    let binaryData: Uint8Array;
    let ext = "jpg";
    let contentType = "image/jpeg";

    if (remoteUrl) {
      if (remoteUrl.startsWith("data:")) {
        const m = remoteUrl.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!m) {
          return new Response(JSON.stringify({ error: "Invalid data URL from xAI" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        ext = m[1] === "jpeg" ? "jpg" : m[1]!;
        contentType = `image/${m[1] === "jpeg" ? "jpeg" : m[1]}`;
        binaryData = Uint8Array.from(atob(m[2]!), (c) => c.charCodeAt(0));
      } else {
        const imgRes = await fetch(remoteUrl);
        if (!imgRes.ok) {
          return new Response(JSON.stringify({ error: "Failed to download image from xAI URL" }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const ct = imgRes.headers.get("content-type") || "";
        if (ct.includes("png")) {
          ext = "png";
          contentType = "image/png";
        }
        const buf = await imgRes.arrayBuffer();
        binaryData = new Uint8Array(buf);
      }
    } else if (b64) {
      binaryData = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    } else {
      return new Response(JSON.stringify({ error: "No image URL or base64 in xAI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fileName = `${companionId}.${ext}`;

    const { error: uploadError } = await adminClient.storage
      .from("companion-portraits")
      .upload(fileName, binaryData, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Failed to upload image", details: uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: publicUrlData } = adminClient.storage.from("companion-portraits").getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl + "?t=" + Date.now();

    const { error: updateError } = await adminClient
      .from("companions")
      .update({
        image_url: publicUrl,
        image_prompt: imagePrompt,
      })
      .eq("id", companionId);

    if (updateError) {
      console.error("DB update error:", updateError);
    }

    return new Response(JSON.stringify({ imageUrl: publicUrl }), {
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
