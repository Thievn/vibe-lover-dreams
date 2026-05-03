import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Send,
  ImageIcon,
  Video,
  Mic,
  Square,
  Camera,
  Aperture,
  Loader2,
  CircleHelp,
  Sparkles,
  Flame,
  Layers,
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
  chatImageNudeFc: number;
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
  chatImageNudeFc,
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
          chatImageNudeFc={chatImageNudeFc}
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

      <p className="text-[9px] leading-relaxed text-muted-foreground/85 text-center mt-2.5 px-0.5 sm:text-[10px]">
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
  chatImageNudeFc,
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
  chatImageNudeFc: number;
  videoClipFc: number;
  photoDockLayout?: "full" | "live_voice";
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<StillTab>("selfies");
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [clipMood, setClipMood] = useState<"sfw" | "lewd" | "nude" | null>(null);

  const fmtFc = (n: number) => (isAdminUser ? "Included" : `${n} FC`);
  const stillPrice = fmtFc(chatImageLewdFc);
  const nudePrice = fmtFc(chatImageNudeFc);
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

  const openGallery = (next: StillTab) => {
    setTab(next);
    setOpen(true);
  };

  const galleryRow = (
    <div
      className={cn(
        "flex flex-wrap items-stretch gap-2",
        photoDockLayout === "full" && "border-t border-white/[0.08] pt-2.5",
      )}
    >
      <motion.button
        type="button"
        whileTap={{ scale: 0.99 }}
        disabled={disabled}
        onClick={() => openGallery("selfies")}
        className={cn(
          "inline-flex min-h-[2.5rem] flex-1 min-w-[10rem] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-sm font-semibold text-white/95 shadow-inner hover:border-primary/40 hover:bg-white/[0.09]",
          photoDockLayout === "live_voice" && "min-h-[2.25rem] min-w-0 text-xs py-1.5",
          disabled && "pointer-events-none opacity-40",
        )}
      >
        <Layers className="h-4 w-4 shrink-0 text-emerald-200/90" aria-hidden />
        Selfie pose gallery
      </motion.button>
      <motion.button
        type="button"
        whileTap={{ scale: 0.99 }}
        disabled={disabled}
        onClick={() => openGallery("lewd")}
        className={cn(
          "inline-flex min-h-[2.5rem] flex-1 min-w-[10rem] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-sm font-semibold text-white/95 shadow-inner hover:border-primary/40 hover:bg-white/[0.09]",
          photoDockLayout === "live_voice" && "min-h-[2.25rem] min-w-0 text-xs py-1.5",
          disabled && "pointer-events-none opacity-40",
        )}
      >
        <Aperture className="h-4 w-4 shrink-0 text-rose-200/90" aria-hidden />
        Lewd pose gallery
      </motion.button>
    </div>
  );

  return (
    <>
      {photoDockLayout === "live_voice" ? (
        <div className="relative mb-2 overflow-hidden rounded-xl border border-white/[0.1] bg-black/45 px-2.5 py-2 sm:px-3">
          <div className="relative flex flex-col gap-1.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary/90">Photos</p>
            {galleryRow}
          </div>
        </div>
      ) : (
        <div className="relative mb-3 overflow-hidden rounded-2xl border border-white/[0.12] bg-gradient-to-br from-fuchsia-950/40 via-black/60 to-cyan-950/25 px-3 py-3 shadow-[0_0_40px_rgba(255,45,123,0.14),inset_0_1px_0_rgba(255,255,255,0.07)] sm:px-4 sm:py-3.5">
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl opacity-[0.45] blur-2xl bg-gradient-to-tr from-primary/25 via-transparent to-[#00ffd4]/15"
            aria-hidden
          />
          <div className="relative flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary sm:text-[11px]">Photos</p>
                <p className="text-xs font-medium text-white/95 sm:text-sm">Ask {companionName} for a still or pick a pose</p>
                <p className="text-[11px] leading-snug text-muted-foreground/90 max-w-xl">
                  One tap sends a themed line + still. Gallery has every sub-style for selfies, lewd, and clips.
                </p>
              </div>
              {CHAT_IN_SESSION_VIDEO_CLIPS_COMING_SOON ? (
                <span className="shrink-0 rounded-full border border-cyan-400/30 bg-cyan-950/40 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-cyan-100/90">
                  Clips soon
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                disabled={disabled}
                onClick={() => onRequest("selfie_picture")}
                className={cn(
                  "inline-flex min-h-[2.75rem] flex-1 min-w-[7.5rem] flex-col items-start justify-center gap-0.5 rounded-xl border border-emerald-400/35 bg-gradient-to-br from-emerald-950/50 via-black/50 to-teal-950/30 px-3 py-2 text-left shadow-[0_0_24px_rgba(52,211,153,0.12)] transition-[box-shadow,border-color,transform] hover:border-emerald-300/50 hover:shadow-[0_0_32px_rgba(52,211,153,0.2)] sm:min-w-[8.5rem] sm:px-3.5",
                  disabled && "pointer-events-none opacity-40",
                )}
              >
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-50">
                  <Camera className="h-4 w-4 shrink-0 text-emerald-200" aria-hidden />
                  SFW selfie
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-200/80">{stillPrice}</span>
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                disabled={disabled}
                onClick={() => onRequest("lewd_picture")}
                className={cn(
                  "inline-flex min-h-[2.75rem] flex-1 min-w-[7.5rem] flex-col items-start justify-center gap-0.5 rounded-xl border border-rose-400/40 bg-gradient-to-br from-rose-950/55 via-black/50 to-fuchsia-950/35 px-3 py-2 text-left shadow-[0_0_26px_rgba(244,63,94,0.14)] transition-[box-shadow,border-color,transform] hover:border-rose-300/55 hover:shadow-[0_0_34px_rgba(244,63,94,0.22)] sm:min-w-[8.5rem] sm:px-3.5",
                  disabled && "pointer-events-none opacity-40",
                )}
              >
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-rose-50">
                  <Flame className="h-4 w-4 shrink-0 text-rose-200" aria-hidden />
                  Lewd still
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-rose-200/85">{stillPrice}</span>
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                disabled={disabled}
                onClick={() => onRequest("nude_picture")}
                className={cn(
                  "inline-flex min-h-[2.75rem] flex-1 min-w-[7.5rem] flex-col items-start justify-center gap-0.5 rounded-xl border border-violet-400/40 bg-gradient-to-br from-violet-950/55 via-black/50 to-indigo-950/35 px-3 py-2 text-left shadow-[0_0_26px_rgba(167,139,250,0.16)] transition-[box-shadow,border-color,transform] hover:border-violet-300/55 hover:shadow-[0_0_34px_rgba(167,139,250,0.24)] sm:min-w-[8.5rem] sm:px-3.5",
                  disabled && "pointer-events-none opacity-40",
                )}
              >
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-violet-50">
                  <Sparkles className="h-4 w-4 shrink-0 text-violet-200" aria-hidden />
                  Explicit still
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-violet-200/85">{nudePrice}</span>
              </motion.button>
            </div>

            {galleryRow}
          </div>
        </div>
      )}

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
                  Tap a tile — she replies first, then the still lands. Identity follows her portrait.
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
                <Aperture className="h-3 w-3 opacity-80" aria-hidden />
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

          <div className="max-h-[min(58vh,24rem)] overflow-y-auto overscroll-contain px-2.5 pb-2.5 pt-2 sm:max-h-[min(56vh,26rem)] sm:px-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, x: tab === "selfies" ? -14 : 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: tab === "selfies" ? 10 : -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="grid grid-cols-2 gap-1.5 sm:grid-cols-3"
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
                      "rounded-xl border border-white/[0.1] bg-gradient-to-b from-white/[0.09] to-white/[0.03] px-2.5 py-2.5 text-left text-xs font-semibold leading-snug text-foreground/95 shadow-sm transition-[transform,box-shadow,border-color] sm:py-3 sm:text-[13px]",
                      "hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_12px_32px_rgba(0,0,0,0.45)] active:translate-y-0",
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
