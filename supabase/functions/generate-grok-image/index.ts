First, the task is to apply the SUGGESTED EDIT to the ORIGINAL CODE and output the complete modified file.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// NSFW prompt rephrasing to make them more acceptable to image generators
const rephrase_nsfw_request = (prompt: string): string => {
  const request_lower = prompt.toLowerCase();
  
  // Map crude requests to artistic descriptions
  const replacements: Record<string, string> = {
    'show your cock': 'artistic nude portrait showcasing natural masculine form with dramatic lighting',
    'show your pussy': 'intimate artistic nude composition with tasteful lighting',
    'send nudes': 'artistic full-body portrait with elegant artistic framing',
    'nudes': 'artistic intimate body portrait',
    'nude': 'tasteful artistic nude',
    'naked': 'artistic full-body portrait',
    'strip': 'progressive artistic undressing sequence',
    'masturbate': 'intimate solo artistic composition',
    'sex': 'intimate artistic pose',
    'fuck': 'passionate artistic intimate pose',
    'suck': 'intimate oral artistic composition',
    'cum': 'climactic artistic moment',
    'spicy': 'sensually charged, tasteful composition',
    'hot': 'sultry, warm-glow portrait',
    'sexy': 'elegant sensual artwork',
    'erotic': 'tasteful erotic art',
    'steamy': 'moody, steamy lighting and atmosphere',
    'porn': 'artistic adult-inspired image',
    'bare': 'sensual artistic exposure',
  };
  
  let rephrased = prompt;
  for (const [crude, artistic] of Object.entries(replacements)) {
    const regex = new RegExp(`\\b${crude}\\b`, 'gi');
    rephrased = rephrased.replace(regex, artistic);
  }
  
  return rephrased;
}

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

    const { companionId, userRequest, companionData } = await req.json();

    if (!companionId || !userRequest || !companionData) {
      return new Response(JSON.stringify({ error: "companionId, userRequest, and companionData are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
    if (!XAI_API_KEY) {
      return new Response(JSON.stringify({ error: "XAI API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rephrase NSFW requests to be more artistic
    const rephrasedRequest = rephrase_nsfw_request(userRequest);

    // Build comprehensive image prompt with companion description
    const imagePrompt = `Create an image of ${companionData.name}. 
Description: ${companionData.appearance}
Context: ${rephrasedRequest}

Style: Professional, highly detailed, artistic. Ensure the character matches the description provided. High quality, realistic lighting.`;

    // Call Grok API for image generation with retry logic
    let attempts = 0;
    const maxAttempts = 2;
    let imageUrl = null;
    let grokData = null;

    while (attempts < maxAttempts && !imageUrl) {
      attempts++;
      console.log(`Attempt ${attempts} to generate image for prompt: ${rephrasedRequest}`);
    const grokResponse = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-vision-beta",
        messages: [
          {
            role: "system",
            content: "You are an image generation assistant. Convert the user's request into a direct image output. If the request contains explicit language, rewrite it into tasteful, artistic visual language before producing the image.",
          },
          {
            role: "user",
            content: imagePrompt,
          },
        ],
        modalities: ["image", "text"],
        temperature: 0.9,
      }),
    });

    if (!grokResponse.ok) {
      const errText = await grokResponse.text();
        console.error(`Grok image generation error on attempt ${attempts}:`, errText);
        if (attempts === maxAttempts) {
          return new Response(JSON.stringify({ error: "Image generation failed after retries", details: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
        continue;
      }

      grokData = await grokResponse.json();
    const rawContent = grokData.choices?.[0]?.message;

    const parseImageUrl = (message: any) => {
      if (!message) return null;

      if (typeof message === "string") {
        const dataMatch = message.match(/(data:image\/[^\s"']+)/i);
        if (dataMatch) return dataMatch[1];

        const urlMatch = message.match(/(https?:\/\/(?:[\w-]+\.)+[\w-]+[^\s"']*\.(?:png|jpg|jpeg|webp|gif|svg))/i);
        if (urlMatch) return urlMatch[1];

        const clean = message.trim();
        return clean.startsWith("http") || clean.startsWith("data:") ? clean : null;
      }

      if (Array.isArray(message.images) && message.images.length > 0) {
        for (const image of message.images) {
          const url = image.url || image.image_url?.url || image.image_url || image.data;
          if (typeof url === "string") return url;
        }
      }

      const nestedImage = message.data?.images?.[0] ?? message.images?.[0];
      if (nestedImage) {
        return nestedImage.url || nestedImage.image_url?.url || nestedImage.image_url || nestedImage.data || null;
      }

      return null;
    };

      imageUrl = parseImageUrl(rawContent);
    if (imageUrl && typeof imageUrl !== "string") {
      imageUrl = String(imageUrl);
    }

      if (!imageUrl && attempts === maxAttempts) {
        return new Response(JSON.stringify({ error: "No image URL could be extracted from the AI response after retries" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    }

    // Store generated image in the database
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: generatedImage, error: insertError } = await adminClient
      .from("generated_images")
      .insert({
        user_id: user.id,
        companion_id: companionId,
        image_url: imageUrl,
        prompt: rephrasedRequest,
        original_prompt: userRequest,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to store image", details: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      imageId: generatedImage.id,
      imageUrl,
      timestamp: generatedImage.created_at,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

