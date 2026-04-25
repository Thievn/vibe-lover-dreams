import { resolveXaiApiKey } from "./resolveXaiApiKey.ts";

const DEFAULT_VISION = "grok-2-vision-1212";

/**
 * Asks a vision model to label the main portrait as realistic-photography vs stylized (anime/cartoon/illustration).
 * Fails soft: returns `null` so callers can default to "realistic".
 */
export async function classifyPortraitRenderGroupWithXai(
  getEnv: (k: string) => string | undefined,
  publicImageUrl: string,
): Promise<"realistic" | "stylized" | null> {
  const apiKey = resolveXaiApiKey(getEnv);
  if (!apiKey || !publicImageUrl.trim()) return null;
  const model = (getEnv("GROK_VISION_CLASSIFY_MODEL") ?? DEFAULT_VISION).trim();

  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 8,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: publicImageUrl.trim() },
              },
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
      }),
    });
    if (!res.ok) {
      const raw = await res.text();
      console.error("Grok vision classify: HTTP", res.status, raw.slice(0, 500));
      return null;
    }
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const t = (j.choices?.[0]?.message?.content ?? "").trim().toLowerCase();
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
