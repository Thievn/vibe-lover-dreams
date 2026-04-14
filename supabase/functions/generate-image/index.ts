import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** xAI / Grok: use same key as console.x.ai — set in Supabase Dashboard → Edge Functions → Secrets */
function getXaiApiKey(): string | null {
  return (
    Deno.env.get("XAI_API_KEY")?.trim() ||
    Deno.env.get("GROK_API_KEY")?.trim() ||
    null
  );
}

const DEFAULT_IMAGE_MODEL = "grok-imagine-image";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = getXaiApiKey();
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Missing API key. Set Edge Function secret XAI_API_KEY (or legacy GROK_API_KEY) to your xAI API key from https://console.x.ai/",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase service configuration missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const {
      prompt,
      characterData = {},
      userId,
      isPortrait = false,
      name = "",
      subtitle = "",
    } = await req.json();

    if (!prompt || !userId) {
      throw new Error("Missing prompt or userId");
    }

    let baseDescription = characterData.baseDescription || "a highly attractive character";

    if (characterData.randomize === true) {
      baseDescription =
        "a completely unique and original character with random appearance, body type, and style";
    }

    const finalPrompt = `
Create a highly seductive, provocative, and artistic portrait of ${baseDescription}.

Character Details:
- Body type: ${characterData.bodyType || "any body type (slim, curvy, muscular, plus-size, petite, tall, short, etc.)"}
- Ethnicity / skin tone: ${characterData.ethnicity || "any"}
- Age range: ${characterData.ageRange || "young adult"}
- Hair: ${characterData.hair || "any style and color"}
- Eyes: ${characterData.eyes || "expressive and beautiful"}
- Clothing / outfit: ${characterData.clothing || "elegant, sexy, provocative clothing with lace, leather, straps, sheer fabrics, corsets, harnesses, or any style the character would wear"}
- Pose: ${characterData.pose || "seductive and provocative pose"}
- Expression / mood: ${characterData.expression || "seductive, confident, mysterious, or alluring"}
- Overall vibe: ${characterData.vibe || "extremely sexy and artistic"}

Key Rules:
- Strictly SFW — no nudity, no visible genitals, no explicit sex acts
- Extremely sexy and provocative but tasteful and artistic
- Perfect anatomy is NOT required — body can be realistic, curvy, thick, skinny, muscular, soft, etc.
- Highly detailed, cinematic lighting, premium quality, vertical portrait composition suitable for TCG-style card

Original user request: ${prompt}
    `.trim();

    const model = Deno.env.get("GROK_IMAGE_MODEL")?.trim() || DEFAULT_IMAGE_MODEL;

    const response = await fetch("https://api.x.ai/v1/images/generations", {
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

    const rawText = await response.text();
    let data: { data?: Array<{ url?: string; b64_json?: string }>; error?: { message?: string } } = {};
    try {
      data = JSON.parse(rawText) as typeof data;
    } catch {
      throw new Error(`xAI returned non-JSON (${response.status}): ${rawText.slice(0, 500)}`);
    }

    if (!response.ok) {
      const msg = data.error?.message || rawText.slice(0, 500) || `HTTP ${response.status}`;
      throw new Error(`xAI image API error: ${msg}`);
    }

    let imageUrl = data.data?.[0]?.url;
    const b64 = data.data?.[0]?.b64_json;

    if (!imageUrl && b64) {
      imageUrl = `data:image/jpeg;base64,${b64}`;
    }

    if (!imageUrl) {
      console.error("xAI response:", rawText.slice(0, 2000));
      throw new Error("Failed to generate image from xAI (no url or b64 in response)");
    }

    const bucket = isPortrait ? "companion-portraits" : "companion-images";
    const fileName = isPortrait
      ? `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
      : `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

    let imageBuffer: ArrayBuffer;
    if (imageUrl.startsWith("data:")) {
      const parts = imageUrl.split(",");
      if (parts.length < 2) throw new Error("Invalid base64 image data");
      const binary = atob(parts[1]!);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      imageBuffer = bytes.buffer;
    } else {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download generated image: ${imageResponse.status}`);
      }
      imageBuffer = await imageResponse.arrayBuffer();
    }

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, imageBuffer, { contentType: "image/jpeg", upsert: true });

    if (uploadError) throw uploadError;

    const publicUrl = supabase.storage.from(bucket).getPublicUrl(fileName).data.publicUrl;

    const table = isPortrait ? "companion_portraits" : "generated_images";

    const insertData: Record<string, unknown> = {
      user_id: userId,
      image_url: publicUrl,
      prompt: prompt,
      style: characterData.style || "custom",
      created_at: new Date().toISOString(),
    };

    if (isPortrait) {
      insertData.name = name || "Custom Companion";
      insertData.subtitle = subtitle || "Generated Portrait";
      insertData.is_public = true;
    } else {
      insertData.companion_id = characterData.companionId || "forge-preview";
    }

    const { error: insertError } = await supabase.from(table).insert(insertData);
    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, imageUrl: publicUrl, bucket, isPortrait }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
