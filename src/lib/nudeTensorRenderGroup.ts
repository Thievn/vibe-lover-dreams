/**
 * Client-side mirror of nude Tensor.art "render group" heuristics (for UI / debugging).
 * Authoritative pick + DB persistence live on the `generate-image-tensor` edge function.
 */
export type NudeTensorRenderGroup = "realistic" | "stylized";

const STYLIZED = [
  "anime",
  "manga",
  "cartoon",
  "2d",
  "cel-shaded",
  "cel shaded",
  "stylized",
  "stylised",
  "chibi",
  "hentai",
  "kawaii",
  "waifu",
  "yuri",
  "yaoi",
  "ecchi",
  "visual novel",
  "illustrat",
  "anime style",
  "manga style",
  "comic art",
  "painted anime",
] as const;

const REALISM = [
  "photorealistic",
  "photo-real",
  "photo real",
  "hyper-real",
  "hyperreal",
  "realistic",
  "realism",
  "dslr",
  "raw photo",
  "film photography",
  "8k uhd",
  "cinematic photography",
  "studio portrait photography",
  "fashion editorial photo",
] as const;

/**
 * @returns null if ambiguous; caller (edge) can fall back to vision or "realistic".
 */
export function inferNudeTensorRenderGroupFromText(blob: string): NudeTensorRenderGroup | null {
  const t = blob.toLowerCase();
  if (!t.trim()) return null;

  let sHits = 0;
  for (const w of STYLIZED) {
    if (t.includes(w)) sHits++;
  }
  let rHits = 0;
  for (const w of REALISM) {
    if (t.includes(w)) rHits++;
  }

  if (sHits > 0 && rHits === 0) return "stylized";
  if (rHits > 0 && sHits === 0) return "realistic";
  if (sHits > rHits) return "stylized";
  if (rHits > sHits) return "realistic";
  return null;
}
