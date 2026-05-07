import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Heart, MessageCircle, Repeat2, Share, BarChart3 } from "lucide-react";

function renderHighlighted(full: string) {
  const tokens = full.split(/(\s+)/);
  return tokens.map((tok, i) => {
    const t = tok.trim();
    if (/^#[\w\u00c0-\u024f]+$/i.test(t) || /^@[\w]+$/i.test(t)) {
      return (
        <span key={i} className="text-[#1d9bf0]">
          {tok}
        </span>
      );
    }
    if (/^https?:\/\//i.test(t)) {
      return (
        <span key={i} className="text-[#1d9bf0]">
          {tok}
        </span>
      );
    }
    return <span key={i}>{tok}</span>;
  });
}

type Props = {
  brandName?: string;
  handle?: string;
  /** Full tweet including hashtags (same string Zernio will post). */
  fullText: string;
  /** @deprecated Prefer `media` — plain image URL when no custom slot. */
  imageUrl?: string | null;
  /** Card chrome, looping video, etc. When set, overrides `imageUrl`. */
  media?: ReactNode;
  charCount: number;
  maxChars?: number;
  mediaBlockedReason?: string | null;
};

export function MarketingTweetPreview({
  brandName = "LustForge",
  handle = "LustForgeApp",
  fullText,
  imageUrl = null,
  media,
  charCount,
  maxChars = 280,
  mediaBlockedReason,
}: Props) {
  const over = charCount > maxChars;
  const hasCopy = fullText.trim().length > 0;

  return (
    <div className="rounded-2xl border overflow-hidden text-left shadow-xl bg-black border-[#2f3336]">
      <div className="px-4 pt-3 pb-2 flex gap-3">
        <div
          className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-[#FF2D7B] to-[#5b21b6] flex items-center justify-center text-xs font-black text-white border border-white/10"
          aria-hidden
        >
          LF
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span className="font-bold text-[15px] text-white leading-tight truncate">{brandName}</span>
            <span className="text-[15px] text-[#71767b] leading-tight">
              @{handle} · <span className="text-[#71767b]">now</span>
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 pb-2">
        {hasCopy ? (
          <p className="text-[15px] text-white leading-[1.4] whitespace-pre-wrap break-words [word-break:break-word]">
            {renderHighlighted(fullText)}
          </p>
        ) : (
          <p className="text-[15px] text-[#71767b] leading-relaxed">Generate copy to see your post preview.</p>
        )}
      </div>

      {media ? (
        <div className="mt-1 border-t border-[#2f3336]">
          <div className="relative w-full bg-[#16181c] py-3 px-3 flex justify-center">{media}</div>
        </div>
      ) : imageUrl ? (
        <div className="mt-1 border-t border-[#2f3336]">
          <div className="relative w-full bg-[#16181c]">
            <img src={imageUrl} alt="" className="w-full max-h-[min(320px,45vh)] object-cover object-top" />
          </div>
        </div>
      ) : hasCopy ? (
        <div className="mx-4 mb-2 rounded-xl border border-dashed border-[#2f3336] bg-[#0a0a0b] px-3 py-5 text-center">
          <p className="text-[13px] text-[#71767b] leading-snug">Text-only in preview — add a portrait or marketing still above to attach media on X.</p>
        </div>
      ) : null}

      {mediaBlockedReason ? (
        <p className="px-4 py-2.5 text-[11px] text-amber-200/95 bg-amber-500/[0.12] border-t border-amber-500/25 leading-snug">
          {mediaBlockedReason}
        </p>
      ) : null}

      <div className="px-2 py-1 flex items-center justify-between text-[#71767b] border-t border-[#2f3336]">
        <div className="flex items-center gap-0.5 pointer-events-none opacity-80">
          <span className="p-2 rounded-full">
            <MessageCircle className="h-[18px] w-[18px]" />
          </span>
          <span className="p-2 rounded-full">
            <Repeat2 className="h-[18px] w-[18px]" />
          </span>
          <span className="p-2 rounded-full">
            <Heart className="h-[18px] w-[18px]" />
          </span>
          <span className="p-2 rounded-full">
            <BarChart3 className="h-[18px] w-[18px]" />
          </span>
          <span className="p-2 rounded-full">
            <Share className="h-[18px] w-[18px]" />
          </span>
        </div>
        <span
          className={cn(
            "shrink-0 px-3 py-2 text-[13px] font-semibold tabular-nums",
            over ? "text-[#f4212e]" : "text-[#71767b]",
          )}
        >
          {charCount} / {maxChars}
        </span>
      </div>
    </div>
  );
}
