const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getXaiApiKey(): string | null {
  return Deno.env.get("XAI_API_KEY")?.trim() || Deno.env.get("GROK_API_KEY")?.trim() || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = getXaiApiKey();
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            "xAI API key not configured. Set Edge Function secret XAI_API_KEY or GROK_API_KEY (https://console.x.ai/).",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-3",
        messages: [
          {
            role: "system",
            content: `You are a companion profile parser for an AI companion platform. Extract structured fields from the user's pasted profile text. If a field isn't explicitly mentioned, infer it from context. Always return data via the extract_companion_fields tool call.`
          },
          {
            role: "user",
            content: `Parse this companion profile and extract all fields:\n\n${prompt}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_companion_fields",
              description: "Extract structured companion profile fields from text",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Character name" },
                  tagline: { type: "string", description: "Short catchy tagline" },
                  gender: { type: "string", description: "Gender identity" },
                  orientation: { type: "string", description: "Sexual orientation" },
                  role: { type: "string", description: "Dom/Sub/Switch role" },
                  tags: { type: "array", items: { type: "string" }, description: "Category tags" },
                  kinks: { type: "array", items: { type: "string" }, description: "Kink/fetish tags" },
                  appearance: { type: "string", description: "Physical appearance description" },
                  personality: { type: "string", description: "Personality traits and style" },
                  bio: { type: "string", description: "Character biography/backstory" },
                  system_prompt: { type: "string", description: "The full roleplay system prompt for this companion" },
                  fantasy_starters: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        emoji: { type: "string" },
                        label: { type: "string" },
                        message: { type: "string" }
                      },
                      required: ["emoji", "label", "message"]
                    },
                    description: "3-5 fantasy scenario starters"
                  },
                  gradient_from: { type: "string", description: "Hex color for gradient start" },
                  gradient_to: { type: "string", description: "Hex color for gradient end" },
                  image_prompt: { type: "string", description: "Image generation prompt for the character portrait" }
                },
                required: ["name"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_companion_fields" } },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Grok API error:", errText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "extract_companion_fields") {
      return new Response(JSON.stringify({ error: "Failed to parse profile" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fields = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ fields }), {
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
