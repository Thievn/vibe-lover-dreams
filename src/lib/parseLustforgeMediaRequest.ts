import { parseLooseInnerObject, sliceBalancedBrace } from "./parseLovenseChatCommand";

export type LustforgeMediaRequest = {
  kind: "image" | "video";
  /** Image/video creative brief in plain language (Grok generation pipeline). */
  brief: string;
  /** For video: optional mood bucket for the motion prompt. */
  mood?: "sfw" | "lewd";
};

/**
 * Phase 3/4: Strip optional `lustforge_media_request` JSON the model appends (silent media orchestration).
 * The user never sees this block — we parse it and trigger client-side generation after the reply.
 */
export function parseLustforgeMediaRequest(text: string): {
  cleanText: string;
  media: LustforgeMediaRequest | null;
} {
  const raw = (typeof text === "string" ? text : String(text ?? "")).trim();
  if (!raw) return { cleanText: text, media: null };
  const lower = raw.toLowerCase();
  const anchor = "lustforge_media_request";
  if (!lower.includes(anchor)) return { cleanText: text, media: null };

  const idx = lower.indexOf(anchor);
  const openOuter = raw.lastIndexOf("{", idx);
  if (openOuter === -1) return { cleanText: text, media: null };

  const outerBlock = sliceBalancedBrace(raw, openOuter);
  if (!outerBlock) return { cleanText: text, media: null };

  let kind: "image" | "video" | null = null;
  let brief = "";
  let mood: "sfw" | "lewd" | undefined;

  try {
    const parsed = JSON.parse(outerBlock) as { lustforge_media_request?: unknown };
    const inner = parsed?.lustforge_media_request;
    if (inner && typeof inner === "object" && inner !== null) {
      const o = inner as Record<string, unknown>;
      const k = o.kind;
      if (k === "image" || k === "video") kind = k;
      const b = o.brief;
      if (typeof b === "string") brief = b.trim();
      const m = o.mood;
      if (m === "sfw" || m === "lewd") mood = m;
      if (m === "nude") mood = "lewd";
    }
  } catch {
    const innerHead = outerBlock.match(/lustforge_media_request\s*:\s*\{/i);
    if (innerHead && innerHead.index !== undefined) {
      const innerOpen = innerHead.index + innerHead[0].length - 1;
      const innerBlock = sliceBalancedBrace(outerBlock, innerOpen);
      if (innerBlock) {
        const o = parseLooseInnerObject(innerBlock);
        if (o) {
          if (o.kind === "image" || o.kind === "video") kind = o.kind;
          if (typeof o.brief === "string") brief = o.brief.trim();
          if (o.mood === "sfw" || o.mood === "lewd") mood = o.mood;
          else if (o.mood === "nude") mood = "lewd";
        }
      }
    }
  }

  let cleanText = raw.replace(outerBlock, "").trim();
  cleanText = cleanText.replace(/\s{3,}/g, "\n\n").trim();

  if (!kind || !brief) {
    return { cleanText, media: null };
  }

  return { cleanText, media: { kind, brief, mood: mood ?? (kind === "video" ? "lewd" : undefined) } };
}
