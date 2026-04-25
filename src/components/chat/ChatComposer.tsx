import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Send, ImageIcon, Video, Mic, ChevronDown, Camera, Aperture, Sparkles, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type { ChatMediaRoute } from "@/lib/chatVisualRouting";
import { CHAT_VIDEO_TIMING_USER_NOTE } from "@/lib/chatVisualRouting";
import type { ChatMediaBarAction } from "@/components/chat/ChatMediaRequestBar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Props = {
  input: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  loading: boolean;
  placeholder: string;
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
  /** Stills & clips: same contract as the previous top media bar. */
  onMediaRequest: (action: ChatMediaBarAction) => void;
  mediaMenuDisabled: boolean;
  videoMenuDisabled: boolean;
  imageCostLabel: string;
  videoCostLabel: string;
  autoSpendEnabled: boolean;
  onAutoSpendChange: (v: boolean) => void;
  /** Media controls + auto-still are only for signed-in users (same as legacy bar). */
  userLoggedIn: boolean;
};

const GALLERY_DND = "application/lustforge-gallery";

/**
 * Glowing field + mic (Web Speech) + three mood media dropdowns, send CTA, auto-spend toggle.
 */
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
  onMediaRequest,
  mediaMenuDisabled,
  videoMenuDisabled,
  imageCostLabel,
  videoCostLabel,
  autoSpendEnabled,
  onAutoSpendChange,
  userLoggedIn,
}: Props) {
  const [listening, setListening] = useState(false);
  const [focused, setFocused] = useState(false);
  const recRef = useRef<unknown>(null);

  const submitTitle =
    isAdminUser
      ? "Send"
      : mediaDraftKind === "video"
        ? videoSubmitTitle
        : mediaDraftKind === "image"
          ? imageSubmitTitle
          : `Send (${tokenCost} FC)`;

  const startVoice = useCallback(() => {
    // Web Speech API — typings vary; keep construction loose.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) {
      toast.error("Voice input is not available in this browser. Try Chrome or Edge.");
      return;
    }
    if (recRef.current) {
      try {
        (recRef.current as { stop: () => void }).stop();
      } catch {
        /* ignore */
      }
      recRef.current = null;
    }
    const r = new SR();
    r.lang = "en-US";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e: { results: { [k: number]: { [j: number]: { transcript: string } } } }) => {
      const t = e.results[0][0].transcript.trim();
      onChange(input ? `${input} ${t}` : t);
    };
    r.onerror = () => {
      setListening(false);
    };
    r.onend = () => {
      setListening(false);
      recRef.current = null;
    };
    recRef.current = r;
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
    }
  }, [input, onChange]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const url = e.dataTransfer.getData(GALLERY_DND) || e.dataTransfer.getData("text/uri-list");
      if (!url?.trim()) return;
      onChange(
        (input + (input.trim() ? " " : "") + `*still from my gallery — same energy, same tease*`).trim(),
      );
      toast.message("Pulled a gallery vibe into the field — say it and send.");
    },
    [input, onChange],
  );

  return (
    <div className="shrink-0 border-t border-white/[0.07] bg-gradient-to-t from-black/95 via-black/80 to-black/40 px-3 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] backdrop-blur-2xl sm:px-4 sm:pt-3.5">
      <div className="mb-2.5 flex items-center justify-between gap-2 px-0.5">
        <p className="min-w-0 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/90">Message</p>
        {userLoggedIn ? (
          <label className="inline-flex max-w-[55%] cursor-pointer select-none items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[9px] font-medium text-foreground/90 sm:text-[10px]">
            <input
              type="checkbox"
              checked={autoSpendEnabled}
              onChange={(e) => onAutoSpendChange(e.target.checked)}
              className="h-3 w-3 shrink-0 rounded border border-white/20 bg-black/50 accent-primary"
              title="Skip the confirm when chat triggers a still"
            />
            <span>Auto-still on trigger</span>
          </label>
        ) : null}
      </div>

      <form
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="space-y-2.5"
      >
        <div
          className={cn(
            "flex min-h-[3.75rem] items-stretch gap-2 rounded-[1.15rem] border p-1.5 transition-[box-shadow,background,border-color] sm:min-h-16",
            focused
              ? "border-primary/45 bg-gradient-to-r from-fuchsia-950/45 to-black/55 shadow-[0_0_0_1px_hsl(320_85%_50%_/_0.25),0_0_40px_hsl(320_85%_50%_/_0.15)]"
              : "border-white/11 bg-black/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
            disabled && "opacity-50",
          )}
        >
          <div className="flex shrink-0 items-center pl-0.5">
            <button
              type="button"
              onClick={listening ? undefined : startVoice}
              className={cn(
                "inline-flex h-12 w-12 items-center justify-center rounded-xl text-[#00ffd4] transition-colors sm:h-14 sm:w-14",
                "hover:bg-[#00ffd4]/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ffd4]/40",
                (loading || disabled || listening) && "pointer-events-none opacity-40",
              )}
              title={listening ? "Listening…" : "Dictate (browser voice)"}
              aria-label="Voice input"
            >
              {listening ? <Loader2 className="h-6 w-6 animate-spin" /> : <Mic className="h-6 w-6" />}
            </button>
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            className="min-w-0 flex-1 border-0 bg-transparent py-3 pr-1 text-base text-foreground placeholder:text-muted-foreground/65 focus:outline-none focus:ring-0 sm:py-3.5 sm:text-[16px]"
            disabled={loading || disabled}
            autoComplete="off"
            aria-label={`Message ${companionName}`}
          />
          {userLoggedIn ? (
            <div className="hidden shrink-0 items-center pr-0.5 sm:flex">
              <MoodMediaDropdowns
                disabled={mediaMenuDisabled}
                videoDisabled={videoMenuDisabled}
                onRequest={onMediaRequest}
                imageCostLabel={imageCostLabel}
                videoCostLabel={videoCostLabel}
              />
            </div>
          ) : null}
        </div>

        {/* Mobile: media row under field */}
        {userLoggedIn ? (
          <div className="sm:hidden">
            <MoodMediaDropdowns
              disabled={mediaMenuDisabled}
              videoDisabled={videoMenuDisabled}
              onRequest={onMediaRequest}
              imageCostLabel={imageCostLabel}
              videoCostLabel={videoCostLabel}
              compact
            />
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2 pt-0.5">
          <motion.button
            type="submit"
            whileTap={{ scale: 0.98 }}
            disabled={loading || !input.trim() || disabled}
            className="inline-flex h-14 min-w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-700 text-primary-foreground transition-opacity disabled:opacity-30 shadow-[0_4px_24px_hsl(320_85%_50%_/_0.35),0_0_40px_hsl(320_85%_50%_/_0.2)] sm:min-w-[3.75rem] sm:px-2"
            title={submitTitle}
          >
            {mediaDraftKind === "video" ? (
              <Video className="h-5 w-5 sm:h-6 sm:w-6" />
            ) : mediaDraftKind === "image" ? (
              <ImageIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            ) : (
              <Send className="h-5 w-5 sm:h-6 sm:w-6" />
            )}
          </motion.button>
        </div>
      </form>

      <p className="text-[9px] leading-relaxed text-muted-foreground/85 text-center mt-2.5 px-0.5 sm:text-[10px]">
        Safe: <span className="text-destructive font-bold">{safeWord}</span> ·{" "}
        {isAdminUser ? (
          "Admin session · "
        ) : (
          <>
            {tokenCost} msg / {imageTokenCost} still / {videoTokenCost} clip FC ·{" "}
          </>
        )}
        18+ only · {CHAT_VIDEO_TIMING_USER_NOTE}
        {!isAdminUser && tokensBalance <= 0 ? (
          <>
            {" "}
            <Link to="/" className="text-primary underline">
              Get FC
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}

function MoodMediaDropdowns({
  disabled,
  videoDisabled,
  onRequest,
  imageCostLabel,
  videoCostLabel,
  compact,
}: {
  disabled: boolean;
  videoDisabled: boolean;
  onRequest: (a: ChatMediaBarAction) => void;
  imageCostLabel: string;
  videoCostLabel: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-end gap-1", compact && "w-full justify-start")}>
      <MenuCol label="Selfie" icon={Camera} accent="border-white/10 bg-white/[0.04]" onRequest={onRequest} disabled={disabled} videoDisabled={videoDisabled} which="selfie" imageCostLabel={imageCostLabel} videoCostLabel={videoCostLabel} />
      <MenuCol label="Lewd" icon={Aperture} accent="border-primary/25 bg-primary/[0.08] text-primary/95" onRequest={onRequest} disabled={disabled} videoDisabled={videoDisabled} which="lewd" imageCostLabel={imageCostLabel} videoCostLabel={videoCostLabel} />
      <MenuCol label="Nude" icon={Sparkles} accent="border-fuchsia-500/30 bg-fuchsia-950/30 text-fuchsia-100" onRequest={onRequest} disabled={disabled} videoDisabled={videoDisabled} which="nude" imageCostLabel={imageCostLabel} videoCostLabel={videoCostLabel} />
    </div>
  );
}

type Which = "selfie" | "lewd" | "nude";

function MenuCol({
  label,
  icon: Icon,
  accent,
  onRequest,
  disabled,
  videoDisabled,
  which,
  imageCostLabel,
  videoCostLabel,
}: {
  label: string;
  icon: typeof Camera;
  accent: string;
  onRequest: (a: ChatMediaBarAction) => void;
  disabled: boolean;
  videoDisabled: boolean;
  which: Which;
  imageCostLabel: string;
  videoCostLabel: string;
}) {
  const pic: ChatMediaBarAction = which === "selfie" ? "selfie_picture" : which === "lewd" ? "lewd_picture" : "nude_picture";
  const vid: ChatMediaBarAction = which === "selfie" ? "selfie_video" : which === "lewd" ? "lewd_video" : "nude_video";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-0.5 rounded-lg border px-1.5 py-1.5 text-[9px] font-bold uppercase tracking-wide touch-manipulation sm:gap-1 sm:px-2.5 sm:text-[10px]",
            accent,
          )}
        >
          <Icon className="h-3 w-3 shrink-0" />
          {label}
          <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
        </motion.button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="end"
        className="min-w-[10.5rem] border border-white/10 bg-[hsl(280_25%_10%)]/98"
      >
        <DropdownMenuLabel className="text-[9px] uppercase text-muted-foreground">Picture / clip</DropdownMenuLabel>
        <DropdownMenuItem
          className="cursor-pointer text-sm"
          onSelect={(e) => e.preventDefault()}
          onClick={() => onRequest(pic)}
        >
          <ImageIcon className="mr-2 h-3.5 w-3.5" />
          Picture
          <span className="ml-auto text-[10px] text-muted-foreground">{imageCostLabel}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer text-sm"
          disabled={videoDisabled}
          onSelect={(e) => e.preventDefault()}
          onClick={() => onRequest(vid)}
        >
          <Video className="mr-2 h-3.5 w-3.5 text-cyan-400" />
          Video
          <span className="ml-auto text-[10px] text-cyan-400/80">{videoCostLabel}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
