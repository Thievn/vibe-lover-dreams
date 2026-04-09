const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const XAI_API_KEY = Deno.env.get("xai-PhEmyQn0YgbpzI3YHzs9yRHy7EmVCWFPv9ygxux3aJwLLClhpuQAQZwQQ0uNxApOW6HsnljO27SZQLY0");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { message, companions, chatHistory } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!XAI_API_KEY) {
      return new Response(JSON.stringify({ error: "XAI API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build companion context summary
    const companionSummary = (companions || []).map((c: any) =>
      `- ID: "${c.id}", Name: "${c.name}", Gender: ${c.gender}, Role: ${c.role}, Tags: [${c.tags?.join(", ")}], Active: ${c.is_active}`
    ).join("\n");

    const systemPrompt = `You are an admin assistant for the ViceVibe AI companion platform. You can modify companion profiles based on admin requests.

Here are the current companions:
${companionSummary}

When the admin asks to change companion data, return the specific updates via the apply_companion_updates tool. You can update multiple companions at once. Match companions by name (case-insensitive) or ID.

Available fields to update: name, tagline, gender, orientation, role, tags (string array), kinks (string array), appearance, personality, bio, system_prompt, gradient_from (hex), gradient_to (hex), image_prompt, is_active (boolean).

If the request is ambiguous or you need clarification, return a message via the respond_to_admin tool instead.`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add chat history for multi-turn
    if (chatHistory && Array.isArray(chatHistory)) {
      for (const msg of chatHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: "user", content: message });

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-3",
        messages,
        tools: [
          {
            type: "function",
            function: {
              name: "apply_companion_updates",
              description: "Apply updates to one or more companions",
              parameters: {
                type: "object",
                properties: {
                  updates: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "Companion ID to update" },
                        fields: {
                          type: "object",
                          description: "Key-value pairs of fields to update"
                        }
                      },
                      required: ["id", "fields"]
                    }
                  },
                  summary: { type: "string", description: "Human-readable summary of changes" }
                },
                required: ["updates", "summary"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "respond_to_admin",
              description: "Send a text response to the admin without making changes",
              parameters: {
                type: "object",
                properties: {
                  message: { type: "string", description: "Response message" }
                },
                required: ["message"]
              }
            }
          }
        ],
        temperature: 0.5,
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
    const choice = data.choices?.[0]?.message;

    // Check for tool calls
    if (choice?.tool_calls && choice.tool_calls.length > 0) {
      const toolCall = choice.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);

      if (toolCall.function.name === "apply_companion_updates") {
        return new Response(JSON.stringify({
          type: "updates",
          updates: args.updates,
          summary: args.summary,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (toolCall.function.name === "respond_to_admin") {
        return new Response(JSON.stringify({
          type: "message",
          message: args.message,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fallback: plain text response
    return new Response(JSON.stringify({
      type: "message",
      message: choice?.content || "I didn't understand that request.",
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
