/** Base64 / data-URL helpers for Grok Imagine responses (no third-party image API). */

export function normalizeB64ImageToDataUrl(raw: string): string {
  const t = raw.trim();
  if (t.startsWith("data:")) return t;
  return `data:image/png;base64,${t}`;
}

/** @deprecated Use normalizeB64ImageToDataUrl */
export const normalizeTogetherImageToDataUrl = normalizeB64ImageToDataUrl;

export function decodeImageDataUrl(dataUrl: string): {
  binary: Uint8Array;
  contentType: string;
  ext: string;
} {
  const t = dataUrl.trim();
  const m = /^data:([^;]+);base64,(.+)$/is.exec(t);
  if (!m) {
    throw new Error("Invalid image data URL");
  }
  const contentType = m[1].toLowerCase();
  const b64 = m[2].replace(/\s/g, "");
  const binaryStr = atob(b64);
  const binary = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) binary[i] = binaryStr.charCodeAt(i);
  const ext =
    contentType.includes("jpeg") || contentType.includes("jpg")
      ? "jpg"
      : contentType.includes("webp")
        ? "webp"
        : contentType.includes("png")
          ? "png"
          : "png";
  return { binary, contentType, ext };
}
