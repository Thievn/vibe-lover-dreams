import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Send,
  ImageIcon,
  Video,
  Mic,
  Square,
  Camera,
  Loader2,
  CircleHelp,
  Flame,
  Aperture,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type { ChatMediaRoute } from "@/lib/chatVisualRouting";
import {
  CHAT_IN_SESSION_VIDEO_CLIPS_COMING_SOON,
  CHAT_VIDEO_FOOTER_SECONDARY_NOTE,
} from "@/lib/chatVisualRouting";
import type { ChatMediaBarAction } from "@/components/chat/ChatMediaRequestBar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { FabSelfieTier } from "@/lib/chatImageSettings";
import { CHAT_MESSAGE_FC_AFTER_DAILY_FREE } from "@/lib/forgeEconomy";
import type { ChatStillMenuCategory } from "@/lib/chatStillMenuCategories";
import { CHAT_LEWD_STILL_CATEGORIES, CHAT_SELFIE_STILL_CATEGORIES } from "@/lib/chatStillMenuCategories";
import { cn } from "@/lib/utils";

function MicWaveBars({ active }: { active: boolean }) {
  if (!active) return null;
  const heights = [6, 14, 9, 16, 8];
  return (
    <span className="flex h-5 items-end gap-0.5 px-0.5" aria-hidden>
      {heights.map((h, i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-[#00ffd4]/90"
          style={{ height: h, transformOrigin: "bottom" }}
          animate={{ scaleY: [0.5, 1, 0.55, 0.92, 0.5] }}
          transition={{
            duration: 0.65,
            repeat: Infinity,
            delay: i * 0.08,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
}

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
  /** Stills sheet: FAB tier base + Grok scene line from `chatStillMenuCategories`. */
  onStyledStillRequest: (p: { tier: FabSelfieTier; userLine: string; sceneExtension: string }) => void;
  mediaMenuDisabled: boolean;
  videoMenuDisabled: boolean;
  chatImageLewdFc: number;
  videoClipFc: number;
  /** Gallery “clip” with preset hint (motion steered per card). */
  onGalleryClipRequest?: (p: { mood: "sfw" | "lewd" | "nude"; motionHint: string }) => void;
  autoSpendEnabled: boolean;
  onAutoSpendChange: (v: boolean) => void;
  /** Media controls + auto-still are only for signed-in users (same as legacy bar). */
  userLoggedIn: boolean;
  /** Live Voice: slimmer photo row (galleries only) to leave room for chat. */
  photoDockLayout?: "full" | "live_voice";
  /** Free text lines left today (UTC); footer copy when drafting plain text. */
  textQuotaRemaining?: number | null;
};

const GALLERY_DND = "application/lustforge-gallery";

const GALLERY_RESULT_DISCLAIMER =
  "Stills and clips are tailored to the moment — lighting, wardrobe, or motion can land a touch softer or wilder than you pictured. That’s part of the tease; Forge coins still apply when you confirm.";

const CLIP_PURCHASE_DISCLAIMER =
  "Short clips are built from her portrait plus the vibe you chose; every now and then framing or motion comes out a little unexpected. Forge coins still apply. Continue?";

/**
 * Glowing field + mic (Web Speech) + stills sheet (Selfies / Lewd), send CTA, auto-spend toggle.
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
  onStyledStillRequest,
  mediaMenuDisabled,
  videoMenuDisabled,
  chatImageLewdFc,
  videoClipFc,
  onGalleryClipRequest,
  autoSpendEnabled,
  onAutoSpendChange,
  userLoggedIn,
  photoDockLayout = "full",
  textQuotaRemaining = null,
}: Props) {
  const [micLive, setMicLive] = useState(false);
  const [focused, setFocused] = useState(false);
  const recRef = useRef<unknown>(null);
  const dictationPrefixRef = useRef("");
  const dictationCommittedRef = useRef("");

  const submitTitle =
    isAdminUser
      ? "Send"
      : mediaDraftKind === "video"
        ? videoSubmitTitle
        : mediaDraftKind === "image"
          ? imageSubmitTitle
          : tokenCost <= 0
            ? "Send (free)"
            : `Send (${tokenCost} FC)`;

  const stopVoice = useCallback(() => {
    const r = recRef.current as { stop?: () => void; abort?: () => void } | null;
    if (r) {
      try {
        r.stop?.();
        r.abort?.();
      } catch {
        /* ignore */
      }
    }
    recRef.current = null;
    setMicLive(false);
  }, []);

  useEffect(() => () => stopVoice(), [stopVoice]);

  const toggleVoice = useCallback(() => {
    if (micLive) {
      stopVoice();
      return;
    }
    // Web Speech API — typings vary; keep construction loose.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) {
      toast.error("Voice input is not available in this browser. Try Chrome or Edge.");
      return;
    }
    stopVoice();
    dictationPrefixRef.current = input;
    dictationCommittedRef.current = "";
    const r = new SR();
    r.lang = "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      let interim = "";
      const results = e.results as Array<{ 0: { transcript: string }; isFinal: boolean }>;
      for (let i = e.resultIndex ?? 0; i < results.length; i++) {
        const res = results[i];
        const piece = String(res?.[0]?.transcript ?? "");
        if (res?.isFinal) {
          dictationCommittedRef.current += piece;
        } else {
          interim += piece;
        }
      }
      const base = dictationPrefixRef.current.trimEnd();
      const tail = (dictationCommittedRef.current + interim).trim();
      const merged = [base, tail].filter(Boolean).join(base && tail ? " " : "");
      onChange(merged);
    };
    r.onerror = () => {
      setMicLive(false);
    };
    r.onend = () => {
      setMicLive(false);
      recRef.current = null;
    };
    recRef.current = r;
    setMicLive(true);
    try {
      r.start();
    } catch {
      setMicLive(false);
      toast.error("Could not start microphone dictation.");
    }
  }, [micLive, stopVoice, input, onChange]);

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

  const liveDock = photoDockLayout === "live_voice";

  return (
    <div
      className={cn(
        "shrink-0 border-t border-white/[0.07] bg-gradient-to-t from-black/95 via-black/80 to-black/40 backdrop-blur-2xl",
        liveDock
          ? "px-2.5 pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] sm:px-3 sm:pt-2"
          : "px-3 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] sm:px-4 sm:pt-3.5",
      )}
    >
      <div className={cn("flex items-center justify-between gap-2 px-0.5", liveDock ? "mb-1" : "mb-2.5")}>
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

      {userLoggedIn ? (
        <StillStylePicker
          companionName={companionName}
          disabled={mediaMenuDisabled}
          videoDisabled={videoMenuDisabled}
          onRequest={onMediaRequest}
          onStyledStillRequest={onStyledStillRequest}
          onGalleryClipRequest={onGalleryClipRequest}
          isAdminUser={isAdminUser}
          chatImageLewdFc={chatImageLewdFc}
          videoClipFc={videoClipFc}
          photoDockLayout={photoDockLayout}
        />
      ) : null}

      <form
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className={liveDock ? "space-y-1.5" : "space-y-2.5"}
      >
        <div
          className={cn(
            "flex items-stretch gap-2 rounded-[1.15rem] border p-1.5 transition-[box-shadow,background,border-color]",
            liveDock ? "min-h-[3.35rem] sm:min-h-[3.5rem]" : "min-h-[3.75rem] sm:min-h-16",
            focused
              ? "border-primary/45 bg-gradient-to-r from-fuchsia-950/45 to-black/55 shadow-[0_0_0_1px_hsl(320_85%_50%_/_0.25),0_0_40px_hsl(320_85%_50%_/_0.15)]"
              : "border-white/11 bg-black/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
            disabled && "opacity-50",
          )}
        >
          <div className="flex shrink-0 items-center gap-1 pl-0.5">
            <button
              type="button"
              onClick={() => toggleVoice()}
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#00ffd4] transition-colors sm:h-11 sm:w-11",
                "hover:bg-[#00ffd4]/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ffd4]/40",
                (loading || disabled) && !micLive && "pointer-events-none opacity-40",
                micLive && "bg-[#00ffd4]/15 ring-1 ring-[#00ffd4]/35",
              )}
              title={micLive ? "Stop dictation" : "Dictate (continuous — tap again to stop)"}
              aria-label={micLive ? "Stop voice dictation" : "Start voice dictation"}
            >
              {micLive ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-5 w-5" />}
            </button>
            <MicWaveBars active={micLive} />
            {micLive ? (
              <span className="hidden text-[9px] font-semibold uppercase tracking-wider text-[#00ffd4]/90 sm:inline">
                Mic live
              </span>
            ) : null}
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
        </div>

        <div className="flex items-center justify-end gap-2 pt-0.5">
          <motion.button
            type="submit"
            whileTap={{ scale: 0.99 }}
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

      <p
        className={cn(
          "text-[9px] leading-relaxed text-muted-foreground/85 text-center px-0.5 sm:text-[10px]",
          liveDock ? "mt-1.5" : "mt-2.5",
        )}
      >
        Safe: <span className="text-destructive font-bold">{safeWord}</span> ·{" "}
        {isAdminUser ? (
          "Admin session · "
        ) : (
          <>
            {mediaDraftKind === "text" && textQuotaRemaining != null ? (
              <span>
                {textQuotaRemaining} free text left today (UTC) · next line{" "}
                {tokenCost <= 0 ? "0 FC" : `${CHAT_MESSAGE_FC_AFTER_DAILY_FREE} FC`} ·{" "}
              </span>
            ) : mediaDraftKind === "text" && tokenCost > 0 ? (
              <span>
                {CHAT_MESSAGE_FC_AFTER_DAILY_FREE} FC/text line ·{" "}
              </span>
            ) : tokenCost <= 0 ? (
              <span>Text line free · </span>
            ) : (
              <span>{tokenCost} FC/msg · </span>
            )}
            {imageTokenCost} still
            {CHAT_IN_SESSION_VIDEO_CLIPS_COMING_SOON ? "" : ` / ${videoTokenCost} clip`} ·{" "}
          </>
        )}
        18+ only · {CHAT_VIDEO_FOOTER_SECONDARY_NOTE}
        {!isAdminUser && tokensBalance <= 0 ? (
          <>
            {" "}
            <Link to="/buy-credits" className="text-primary underline">
              Top up FC
            </Link>{" "}
            for stills & live voice · classic text stays free
          </>
        ) : null}
      </p>
    </div>
  );
}

type StillTab = "selfies" | "lewd";

function StillStylePicker({
  companionName,
  disabled,
  videoDisabled,
  onRequest,
  onStyledStillRequest,
  onGalleryClipRequest,
  isAdminUser,
  chatImageLewdFc,
  videoClipFc,
  photoDockLayout = "full",
}: {
  companionName: string;
  disabled: boolean;
  videoDisabled: boolean;
  onRequest: (a: ChatMediaBarAction) => void;
  onStyledStillRequest: (p: { tier: FabSelfieTier; userLine: string; sceneExtension: string }) => void;
  onGalleryClipRequest?: (p: { mood: "sfw" | "lewd" | "nude"; motionHint: string }) => void;
  isAdminUser: boolean;
  chatImageLewdFc: number;
  videoClipFc: number;
  photoDockLayout?: "full" | "live_voice";
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<StillTab>("selfies");
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [clipMood, setClipMood] = useState<"sfw" | "lewd" | "nude" | null>(null);

  const fmtFc = (n: number) => (isAdminUser ? "Included" : `${n} FC`);
  const stillPrice = fmtFc(chatImageLewdFc);
  const clipPrice = fmtFc(videoClipFc);

  const categories = useMemo(
    () => (tab === "selfies" ? CHAT_SELFIE_STILL_CATEGORIES : CHAT_LEWD_STILL_CATEGORIES),
    [tab],
  );

  const pickStill = (cat: ChatStillMenuCategory) => {
    onStyledStillRequest({
      tier: cat.tier,
      userLine: `${companionName} — "${cat.label}" still for me?`,
      sceneExtension: cat.imagePrompt,
    });
    setOpen(false);
  };

  const runClip = () => {
    if (!clipMood) return;
    const motionHint =
      clipMood === "sfw"
        ? "Flattering SFW vertical clip — selfie energy, safe wardrobe, smooth handheld motion."
        : clipMood === "lewd"
          ? "Tasteful spicy vertical clip — lingerie / silhouette tease, editorial motion."
          : "Explicit adult vertical clip — fine-art boudoir motion, intimate framing.";
    if (onGalleryClipRequest) {
      onGalleryClipRequest({ mood: clipMood, motionHint });
    } else {
      onRequest(clipMood === "sfw" ? "selfie_video" : clipMood === "lewd" ? "lewd_video" : "nude_video");
    }
    setClipMood(null);
    setOpen(false);
  };

  const galleryTrigger = (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      disabled={disabled}
      onClick={() => setOpen(true)}
      title="Selfies & lewd stills"
      aria-label="Open still gallery — selfies or lewd inside"
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-xl border border-fuchsia-400/35 bg-gradient-to-br from-fuchsia-500/25 via-[#FF2D7B]/20 to-cyan-500/20 text-white shadow-[0_0_20px_rgba(255,45,123,0.18)] transition-[border-color,box-shadow,transform] hover:border-primary/45 hover:shadow-[0_0_26px_rgba(255,45,123,0.28)] sm:h-9 sm:w-9",
        disabled && "pointer-events-none opacity-40",
      )}
    >
      <Aperture className="h-[1.05rem] w-[1.05rem] sm:h-[1.15rem] sm:w-[1.15rem]" strokeWidth={2.25} aria-hidden />
    </motion.button>
  );

  return (
    <>
      <div
        className={cn(
          "flex flex-wrap items-center justify-end gap-2",
          photoDockLayout === "full" ? "mb-2" : "mb-1",
        )}
      >
        {CHAT_IN_SESSION_VIDEO_CLIPS_COMING_SOON ? (
          <span className="order-first mr-auto rounded-full border border-cyan-400/25 bg-cyan-950/35 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-cyan-100/85 sm:text-[9px]">
            Clips soon
          </span>
        ) : null}
        {galleryTrigger}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[min(92vh,44rem)] w-[min(100vw-0.75rem,26rem)] gap-0 overflow-hidden border border-white/[0.1] bg-[hsl(280_18%_6%)]/[0.98] p-0 text-foreground shadow-[0_28px_100px_rgba(0,0,0,0.72)] backdrop-blur-2xl sm:max-w-md">
          <DialogHeader className="space-y-2 border-b border-white/[0.08] bg-gradient-to-br from-fuchsia-950/25 via-black/40 to-cyan-950/20 px-3 py-3 sm:px-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/45">
                  Grok stills · {CHAT_IN_SESSION_VIDEO_CLIPS_COMING_SOON ? "clips soon" : "clips below"}
                </p>
                <DialogTitle className="font-gothic text-lg font-normal tracking-tight text-white sm:text-xl">
                  Selfies & Lewd
                </DialogTitle>
                <DialogDescription className="text-[11px] leading-snug text-muted-foreground/95">
                  Tap a tile — she replies first, then the still lands. Dozens of scenes; each changes outfit, pose, and set while face, species marks, and body type stay locked to her.
                </DialogDescription>
              </div>
              <button
                type="button"
                className="mt-0.5 shrink-0 rounded-lg border border-white/10 bg-black/30 p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
                title="About results & pricing"
                aria-expanded={showDisclaimer}
                onClick={() => setShowDisclaimer((v) => !v)}
              >
                <CircleHelp className="h-4 w-4" aria-hidden />
                <span className="sr-only">Gallery disclaimer</span>
              </button>
            </div>
            {showDisclaimer ? (
              <p className="rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-[11px] leading-snug text-muted-foreground/95">
                {GALLERY_RESULT_DISCLAIMER}
              </p>
            ) : null}

            <div className="flex rounded-lg border border-white/10 bg-black/35 p-0.5">
              <button
                type="button"
                onClick={() => setTab("selfies")}
                className={cn(
                  "relative flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors sm:text-[11px]",
                  tab === "selfies" ? "text-white" : "text-muted-foreground hover:text-foreground/90",
                )}
              >
                <Camera className="h-3 w-3 opacity-80" aria-hidden />
                Selfies
                {tab === "selfies" ? (
                  <motion.span
                    layoutId="stillTabGlow"
                    className="absolute inset-0 -z-10 rounded-md bg-emerald-500/20 ring-1 ring-emerald-400/25"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => setTab("lewd")}
                className={cn(
                  "relative flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors sm:text-[11px]",
                  tab === "lewd" ? "text-white" : "text-muted-foreground hover:text-foreground/90",
                )}
              >
                <Flame className="h-3 w-3 opacity-80" aria-hidden />
                Lewd
                {tab === "lewd" ? (
                  <motion.span
                    layoutId="stillTabGlow"
                    className="absolute inset-0 -z-10 rounded-md bg-rose-500/20 ring-1 ring-rose-400/30"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                ) : null}
              </button>
            </div>
          </DialogHeader>

          <div className="max-h-[min(62vh,28rem)] overflow-y-auto overscroll-contain px-2.5 pb-2.5 pt-2 sm:max-h-[min(60vh,30rem)] sm:px-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, x: tab === "selfies" ? -14 : 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: tab === "selfies" ? 10 : -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5"
              >
                {categories.map((cat, i) => (
                  <motion.button
                    key={cat.id}
                    type="button"
                    disabled={disabled}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.018, 0.22), duration: 0.2 }}
                    onClick={() => pickStill(cat)}
                    className={cn(
                      "min-h-[4.75rem] rounded-xl border border-white/[0.1] bg-gradient-to-b from-white/[0.09] to-white/[0.03] px-2.5 py-2.5 text-left text-xs font-semibold leading-snug text-foreground/95 shadow-sm transition-all duration-200 sm:min-h-[5rem] sm:py-3 sm:text-[13px]",
                      "hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_12px_32px_rgba(0,0,0,0.45)] active:translate-y-0 active:scale-[0.99]",
                      tab === "selfies" && "hover:border-emerald-400/30",
                      tab === "lewd" && "hover:border-rose-400/35",
                      disabled && "pointer-events-none opacity-40",
                    )}
                  >
                    <span className="line-clamp-3">{cat.label}</span>
                    <span className="mt-1.5 block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/85 sm:text-[10px]">
                      Still · {stillPrice}
                    </span>
                  </motion.button>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="border-t border-white/[0.07] bg-black/40 px-2.5 py-2 sm:px-3">
            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/90">Clips</p>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                disabled={disabled || videoDisabled}
                onClick={() => setClipMood("sfw")}
                className="rounded-md border border-emerald-500/25 bg-emerald-950/20 px-2 py-1 text-[9px] font-medium text-emerald-100/95 hover:bg-emerald-950/35 disabled:opacity-40"
              >
                SFW · {clipPrice}
              </button>
              <button
                type="button"
                disabled={disabled || videoDisabled}
                onClick={() => setClipMood("lewd")}
                className="rounded-md border border-rose-500/25 bg-rose-950/20 px-2 py-1 text-[9px] font-medium text-rose-100/95 hover:bg-rose-950/35 disabled:opacity-40"
              >
                Spicy · {clipPrice}
              </button>
              <button
                type="button"
                disabled={disabled || videoDisabled}
                onClick={() => setClipMood("nude")}
                className="rounded-md border border-violet-500/25 bg-violet-950/25 px-2 py-1 text-[9px] font-medium text-violet-100/95 hover:bg-violet-950/40 disabled:opacity-40"
              >
                Explicit · {clipPrice}
              </button>
            </div>
            {CHAT_IN_SESSION_VIDEO_CLIPS_COMING_SOON ? (
              <p className="mt-1.5 text-[8px] text-cyan-200/75">Clips are coming soon — button will queue when live.</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={clipMood != null} onOpenChange={(o) => !o && setClipMood(null)}>
        <AlertDialogContent className="border-white/10 bg-[hsl(280_18%_8%)] text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Queue this clip?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground/95">
              {CLIP_PURCHASE_DISCLAIMER}
              {!isAdminUser ? (
                <>
                  {" "}
                  This run bills <span className="font-semibold text-foreground">{videoClipFc} FC</span>.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction disabled={disabled || videoDisabled || !clipMood} onClick={runClip}>
              Yes — use {clipPrice}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
