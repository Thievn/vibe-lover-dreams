import { grokVisionClassifyModelCandidates } from "./grokVisionModels.ts";
import { resolveXaiApiKey } from "./resolveXaiApiKey.ts";
import { extractGrokAssistantText, grokChatCompletionRaw } from "./xaiGrokChatRaw.ts";

/**
 * Asks a Grok vision model (xAI) to label the main portrait as realistic vs stylized.
 * Fails soft: returns `null` so callers can default to "realistic".
 */
export async function classifyPortraitRenderGroupWithXai(
  getEnv: (k: string) => string | undefined,
  publicImageUrl: string,
): Promise<"realistic" | "stylized" | null> {
  if (!resolveXaiApiKey(getEnv) || !publicImageUrl.trim()) return null;
  const models = grokVisionClassifyModelCandidates(getEnv);

  for (const model of models) {
    try {
      const res = await grokChatCompletionRaw({
        model,
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
        temperature: 0.1,
        max_tokens: 16,
      });
      if (!res.ok || res.json === null) {
        const raw = res.rawText.slice(0, 500);
        if (res.status === 401 || res.status === 403) {
          console.error("Grok vision classify: auth error", res.status, raw);
          return null;
        }
        console.warn("Grok vision classify: HTTP", res.status, "trying next model;", raw.slice(0, 200));
        continue;
      }
      const t = extractGrokAssistantText(res.json).trim().toLowerCase();
      if (t.includes("styliz") || t.includes("anime") || t === "b" || t.startsWith("b")) {
        return "stylized";
      }
      if (t.includes("realistic") || t.includes("photo") || t === "a" || t.startsWith("a")) {
        return "realistic";
      }
      return null;
    } catch (e) {
      console.error("classifyPortraitRenderGroupWithXai:", model, e);
    }
  }
  return null;
}
