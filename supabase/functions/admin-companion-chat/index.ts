import { openRouterChatCompletion, openRouterChatModel, extractOpenRouterAssistantText, resolveOpenRouterApiKey } from "../_shared/openRouter.ts";
import { buildForgeAssistantSystemPrompt } from "../_shared/forgeAssistantSystemPrompt.ts";
import { requireAdminUser } from "../_shared/requireSessionUser.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const adminGate = await requireAdminUser(req);
  if ("response" in adminGate) return adminGate.response;

  try {
    const { message, companions, chatHistory } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const getEnv = (n: string) => Deno.env.get(n);
    if (!resolveOpenRouterApiKey(getEnv)) {
      return new Response(
        JSON.stringify({
          error:
            "OpenRouter not configured. Set Edge Function secret OPENROUTER_API_KEY (https://openrouter.ai/keys).",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const companionSummary = (companions || []).map((c: Record<string, unknown>) => {
      const tags = Array.isArray(c.tags) ? (c.tags as string[]).join(", ") : "";
      const rarity = typeof c.rarity === "string" ? c.rarity : "common";
      return `- ID: "${c.id}", Name: "${c.name}", Rarity: ${rarity}, Tagline: "${c.tagline ?? ""}", Gender: ${c.gender}, Role: ${c.role}, Tags: [${tags}], Active: ${c.is_active}`;
    }).join("\n");

    const systemPrompt = buildForgeAssistantSystemPrompt(
      companionSummary || "(No companions loaded — ask the admin to open Character management or refresh.)",
    );

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

    const model = openRouterChatModel(getEnv);
    const orRes = await openRouterChatCompletion({
      getEnv,
      model,
      messages,
      temperature: 0.5,
      max_tokens: 2048,
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
                          description:
                            "Key-value pairs to update. Allowed keys: name, tagline, gender, orientation, role, tags, kinks, appearance, personality, personality_forge (object: timePeriod, personalityType, speechStyle, sexualEnergy, relationshipVibe), bio, backstory, system_prompt, image_prompt, gradient_from, gradient_to, rarity, is_active, static_image_url, animated_image_url, rarity_border_overlay_url, image_url, fantasy_starters (array of {title, description})",
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
    });

    if (!orRes.ok || orRes.json === null) {
      const errText = orRes.rawText;
      console.error("OpenRouter admin-companion-chat error:", errText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = orRes.json as { choices?: Array<{ message?: { content?: string; tool_calls?: Array<{ function?: { name?: string; arguments?: string } }> } }> };
    const choice = data.choices?.[0]?.message;

    // Check for tool calls
    if (choice?.tool_calls && choice.tool_calls.length > 0) {
      const toolCall = choice.tool_calls[0];
      const args = JSON.parse(toolCall.function?.arguments ?? "{}");

      if (toolCall.function?.name === "apply_companion_updates") {
        return new Response(JSON.stringify({
          type: "updates",
          updates: args.updates,
          summary: args.summary,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (toolCall.function?.name === "respond_to_admin") {
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
      message: extractOpenRouterAssistantText(orRes.json) || choice?.content || "I didn't understand that request.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
