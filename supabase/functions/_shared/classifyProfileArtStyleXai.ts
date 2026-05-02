import { openRouterChatCompletion, extractOpenRouterAssistantText, openRouterChatModel, resolveOpenRouterApiKey } from "./openRouter.ts";

const DEFAULT_VISION = "grok-2-vision-1212";

/**
 * Asks a vision-capable chat model (OpenRouter) to label the main portrait as realistic vs stylized.
 * Fails soft: returns `null` so callers can default to "realistic".
 */
export async function classifyPortraitRenderGroupWithXai(
  getEnv: (k: string) => string | undefined,
  publicImageUrl: string,
): Promise<"realistic" | "stylized" | null> {
  if (!resolveOpenRouterApiKey(getEnv) || !publicImageUrl.trim()) return null;
  const model = (getEnv("OPENROUTER_VISION_CLASSIFY_MODEL") ?? openRouterChatModel(getEnv) ?? DEFAULT_VISION).trim();

  try {
    const res = await openRouterChatCompletion({
      getEnv,
      model,
      temperature: 0.1,
      max_tokens: 16,
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: publicImageUrl.trim() } },
            {
              type: "text",
              text:
                "This is a character's main profile still. " +
                "Is it most like (A) photorealistic/photography/real-skin, or (B) anime/illustration/2D/cartoon/stylized? " +
                "Reply with exactly one token: realistic OR stylized. No other words.",
            },
          ],
        },
      ],
    });
    if (!res.ok || res.json === null) {
      const raw = res.rawText;
      console.error("OpenRouter vision classify: HTTP", res.status, raw.slice(0, 500));
      return null;
    }
    const t = extractOpenRouterAssistantText(res.json).trim().toLowerCase();
    if (t.includes("styliz") || t.includes("anime") || t === "b" || t.startsWith("b")) {
      return "stylized";
    }
    if (t.includes("realistic") || t.includes("photo") || t === "a" || t.startsWith("a")) {
      return "realistic";
    }
  } catch (e) {
    console.error("classifyPortraitRenderGroupWithXai:", e);
  }
  return null;
}
