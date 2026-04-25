/**
 * LustForge nude Tensor pipeline: "realistic" (photoreal / SDXL realism) vs "stylized" (anime / 2D).
 * Keep keyword lists in sync with `src/lib/nudeTensorRenderGroup.ts` when updating heuristics.
 */
export type NudeRenderGroup = "realistic" | "stylized";

const STYLIZED_SNIPPETS = [
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
  "anything xl",
  "counterfeit",
  "pastel mix",
] as const;

const REALISM_SNIPPETS = [
  "photorealistic",
  "photo-real",
  "photo real",
  "hyper-real",
  "hyperreal",
  "realistic",
  "realism",
  "photoreal",
  "dslr",
  "raw photo",
  "film photography",
  "8k uhd",
  "cinematic photography",
  "studio portrait photography",
  "fashion editorial photo",
  "juggernaut",
  "epic realism",
] as const;

/** @returns null if we cannot disambiguate from text alone. */
export function inferNudeRenderGroupFromTextBlob(blob: string): NudeRenderGroup | null {
  const t = blob.toLowerCase();
  if (!t.trim()) return null;

  let s = 0;
  for (const w of STYLIZED_SNIPPETS) {
    if (t.includes(w)) s++;
  }
  let r = 0;
  for (const w of REALISM_SNIPPETS) {
    if (t.includes(w)) r++;
  }
  if (s > 0 && r === 0) return "stylized";
  if (r > 0 && s === 0) return "realistic";
  if (s > r) return "stylized";
  if (r > s) return "realistic";
  return null;
}

/**
 * Merges companion row fields that describe art direction (not scene prompts).
 * Forge stores display labels like "Photorealistic" / "Anime" in `tags` + prose in appearance.
 */
export function nudeStyleBlobFromRow(row: Record<string, unknown>): string {
  const tagArr = row.tags;
  const tags = Array.isArray(tagArr) ? tagArr.map((x) => String(x)).join(" | ") : "";
  const pick = (k: string) => (typeof row[k] === "string" ? (row[k] as string) : "");
  return [
    tags,
    pick("appearance"),
    pick("image_prompt"),
    pick("personality"),
    pick("bio"),
    pick("name"),
  ]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" \n ");
}
