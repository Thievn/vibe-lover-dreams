import { Send, ImageIcon, Video } from "lucide-react";
import { Link } from "react-router-dom";
import type { ChatMediaRoute } from "@/lib/chatVisualRouting";
import { CHAT_VIDEO_TIMING_USER_NOTE } from "@/lib/chatVisualRouting";

type Props = {
  input: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  loading: boolean;
  placeholder: string;
  /** Draft preview: which Tensor path the typed line would trigger (no send yet). */
  mediaDraftKind: ChatMediaRoute;
  isAdminUser: boolean;
  tokensBalance: number;
  tokenCost: number;
  imageTokenCost: number;
  videoTokenCost: number;
  imageSubmitTitle: string;
  videoSubmitTitle: string;
  safeWord: string;
  companionName: string;
};

export function ChatComposer({
  input,
  onChange,
  onSubmit,
  disabled,
  loading,
  placeholder,
  mediaDraftKind,
  isAdminUser,
  tokensBalance,
  tokenCost,
  imageTokenCost,
  videoTokenCost,
  imageSubmitTitle,
  videoSubmitTitle,
  safeWord,
  companionName,
}: Props) {
  const submitTitle =
    isAdminUser
      ? "Send"
      : mediaDraftKind === "video"
        ? videoSubmitTitle
        : mediaDraftKind === "image"
          ? imageSubmitTitle
          : `Send (${tokenCost} tokens)`;

  return (
    <div className="border-t border-white/[0.07] bg-black/50 backdrop-blur-2xl px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex gap-2 items-end"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 px-4 py-3.5 rounded-2xl bg-muted/60 border border-border/80 text-foreground text-[15px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-shadow"
          disabled={loading || disabled}
          autoComplete="off"
          aria-label={`Message ${companionName}`}
        />
        <button
          type="submit"
          disabled={loading || !input.trim() || disabled}
          className="shrink-0 h-[52px] w-[52px] rounded-2xl bg-primary text-primary-foreground disabled:opacity-30 hover:opacity-95 transition-all flex items-center justify-center shadow-[0_0_24px_rgba(255,45,123,0.25)]"
          title={submitTitle}
        >
          {mediaDraftKind === "video" ? (
            <Video className="h-5 w-5" />
          ) : mediaDraftKind === "image" ? (
            <ImageIcon className="h-5 w-5" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </form>
      <p className="text-[10px] text-muted-foreground text-center mt-2 px-1 leading-snug">
        Safe word: <span className="text-destructive font-bold">{safeWord}</span> ·{" "}
        {isAdminUser ? (
          "Admin session — credits waived · "
        ) : (
          <>
            {tokenCost} tokens/message · {imageTokenCost} still / {videoTokenCost} clip ·{" "}
          </>
        )}
        18+ only · {CHAT_VIDEO_TIMING_USER_NOTE}
        {!isAdminUser && tokensBalance <= 0 ? (
          <>
            {" "}
            <Link to="/" className="text-primary underline">
              Get tokens
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}
