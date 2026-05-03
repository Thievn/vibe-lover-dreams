import { useCallback, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Send,
  ImageIcon,
  Video,
  Mic,
  ChevronDown,
  Camera,
  Aperture,
  Sparkles,
  Loader2,
  CircleHelp,
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
import { FAB_SELFIE, resolveFabDisplay, type FabSelfieTier } from "@/lib/chatImageSettings";
import {
  cardGradientForOption,
  smartPhotoStylesForTier,
  type SmartChatPhotoStyleOption,
} from "@/lib/smartChatPhotoMenus";
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
  /** Smart still menus (Selfie / Lewd / Nude) — tier base + styled scene extension. */
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
};

const GALLERY_DND = "application/lustforge-gallery";

const GALLERY_RESULT_DISCLAIMER =
  "Stills and clips are tailored to the moment — lighting, wardrobe, or motion can land a touch softer or wilder than you pictured. That’s part of the tease; Forge coins still apply when you confirm.";

const CLIP_PURCHASE_DISCLAIMER =
  "Short clips are built from her portrait plus the vibe you chose; every now and then framing or motion comes out a little unexpected. Forge coins still apply. Continue?";

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
          : tokenCost <= 0
            ? "Send (free)"
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
                "inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#00ffd4] transition-colors sm:h-11 sm:w-11",
                "hover:bg-[#00ffd4]/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ffd4]/40",
                (loading || disabled || listening) && "pointer-events-none opacity-40",
              )}
              title={listening ? "Listening…" : "Dictate (browser voice)"}
              aria-label="Voice input"
            >
              {listening ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mic className="h-5 w-5" />}
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
            <div className="hidden shrink-0 flex-col items-end gap-0.5 pr-0.5 sm:flex">
              <MoodMediaDropdowns
                disabled={mediaMenuDisabled}
                videoDisabled={videoMenuDisabled}
                onRequest={onMediaRequest}
                onStyledStillRequest={onStyledStillRequest}
                onGalleryClipRequest={onGalleryClipRequest}
                isAdminUser={isAdminUser}
                chatImageLewdFc={chatImageLewdFc}
                chatImageNudeFc={chatImageNudeFc}
                videoClipFc={videoClipFc}
              />
              {CHAT_IN_SESSION_VIDEO_CLIPS_COMING_SOON ? (
                <span className="text-[8px] font-medium uppercase tracking-wider text-cyan-300/80">Clips · soon</span>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Mobile: media row under field */}
        {userLoggedIn ? (
          <div className="flex flex-col gap-0.5 sm:hidden">
            <MoodMediaDropdowns
              disabled={mediaMenuDisabled}
              videoDisabled={videoMenuDisabled}
              onRequest={onMediaRequest}
              onStyledStillRequest={onStyledStillRequest}
              onGalleryClipRequest={onGalleryClipRequest}
              isAdminUser={isAdminUser}
              chatImageLewdFc={chatImageLewdFc}
              chatImageNudeFc={chatImageNudeFc}
              videoClipFc={videoClipFc}
              compact
            />
            {CHAT_IN_SESSION_VIDEO_CLIPS_COMING_SOON ? (
              <span className="text-[8px] font-medium uppercase tracking-wider text-cyan-300/80">Clips · soon</span>
            ) : null}
          </div>
        ) : null}

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
            {tokenCost <= 0 ? "Free msgs" : `${tokenCost} FC/msg`} / {imageTokenCost} still
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

function MoodMediaDropdowns({
  disabled,
  videoDisabled,
  onRequest,
  onStyledStillRequest,
  onGalleryClipRequest,
  isAdminUser,
  chatImageLewdFc,
  chatImageNudeFc,
  videoClipFc,
  compact,
}: {
  disabled: boolean;
  videoDisabled: boolean;
  onRequest: (a: ChatMediaBarAction) => void;
  onStyledStillRequest: (p: { tier: FabSelfieTier; userLine: string; sceneExtension: string }) => void;
  onGalleryClipRequest?: (p: { mood: "sfw" | "lewd" | "nude"; motionHint: string }) => void;
  isAdminUser: boolean;
  chatImageLewdFc: number;
  chatImageNudeFc: number;
  videoClipFc: number;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-end gap-0.5", compact && "w-full justify-start")}>
      <PhotoMoodMenu
        label="Selfie"
        icon={Camera}
        accent="border-white/10 bg-white/[0.04]"
        tier="sfw"
        which="selfie"
        disabled={disabled}
        videoDisabled={videoDisabled}
        onRequest={onRequest}
        onStyledStillRequest={onStyledStillRequest}
        onGalleryClipRequest={onGalleryClipRequest}
        isAdminUser={isAdminUser}
        chatImageLewdFc={chatImageLewdFc}
        chatImageNudeFc={chatImageNudeFc}
        videoClipFc={videoClipFc}
      />
      <PhotoMoodMenu
        label="Lewd"
        icon={Aperture}
        accent="border-primary/25 bg-primary/[0.08] text-primary/95"
        tier="lewd"
        which="lewd"
        disabled={disabled}
        videoDisabled={videoDisabled}
        onRequest={onRequest}
        onStyledStillRequest={onStyledStillRequest}
        onGalleryClipRequest={onGalleryClipRequest}
        isAdminUser={isAdminUser}
        chatImageLewdFc={chatImageLewdFc}
        chatImageNudeFc={chatImageNudeFc}
        videoClipFc={videoClipFc}
      />
      <PhotoMoodMenu
        label="Nude"
        icon={Sparkles}
        accent="border-fuchsia-500/30 bg-fuchsia-950/30 text-fuchsia-100"
        tier="nude"
        which="nude"
        disabled={disabled}
        videoDisabled={videoDisabled}
        onRequest={onRequest}
        onStyledStillRequest={onStyledStillRequest}
        onGalleryClipRequest={onGalleryClipRequest}
        isAdminUser={isAdminUser}
        chatImageLewdFc={chatImageLewdFc}
        chatImageNudeFc={chatImageNudeFc}
        videoClipFc={videoClipFc}
      />
    </div>
  );
}

type Which = "selfie" | "lewd" | "nude";

function buildQuickSceneExtension(tier: FabSelfieTier): string {
  if (tier === "nude") {
    return "Artistic nude still: fine-art boudoir pose, soft cinematic light, **fresh environment** — match the roster portrait **exactly** for face, hair, skin tone, age read, and silhouette; same personality matrix; **editorial / tasteful** adult framing only; **no pasted-on swimsuit from the card.**";
  }
  if (tier === "lewd") {
    return "Lewd still: editorial teasing heat — lingerie, sheer, wet fabric, silhouette, tasteful undressing that fits personality and era; **new wardrobe + backdrop each time**, not a reshoot of their roster swimsuit unless swim is the vibe; **same face and body** as the roster portrait — no look-alike drift.";
  }
  return "SFW still: creative flattering selfie — **distinct outfit and location** from their catalog portrait when possible; era-appropriate clothes; fully clothed; **same face, hair, and body** as the roster portrait (no substitute model).";
}

function PhotoMoodMenu({
  label,
  icon: Icon,
  accent,
  tier,
  which,
  onRequest,
  onStyledStillRequest,
  onGalleryClipRequest,
  disabled,
  videoDisabled,
  isAdminUser,
  chatImageLewdFc,
  chatImageNudeFc,
  videoClipFc,
}: {
  label: string;
  icon: typeof Camera;
  accent: string;
  tier: FabSelfieTier;
  which: Which;
  onRequest: (a: ChatMediaBarAction) => void;
  onStyledStillRequest: (p: { tier: FabSelfieTier; userLine: string; sceneExtension: string }) => void;
  onGalleryClipRequest?: (p: { mood: "sfw" | "lewd" | "nude"; motionHint: string }) => void;
  disabled: boolean;
  videoDisabled: boolean;
  isAdminUser: boolean;
  chatImageLewdFc: number;
  chatImageNudeFc: number;
  videoClipFc: number;
}) {
  const [open, setOpen] = useState(false);
  const [showGalleryDisclaimer, setShowGalleryDisclaimer] = useState(false);
  const [clipConfirmOpt, setClipConfirmOpt] = useState<SmartChatPhotoStyleOption | null>(null);

  const vid: ChatMediaBarAction = which === "selfie" ? "selfie_video" : which === "lewd" ? "lewd_video" : "nude_video";
  const clipMood: "sfw" | "lewd" | "nude" = which === "selfie" ? "sfw" : which === "nude" ? "nude" : "lewd";
  const stillFcNum = tier === "nude" ? chatImageNudeFc : chatImageLewdFc;
  const fmtFc = (n: number) => (isAdminUser ? "Included" : `${n} FC`);
  const stillPrice = fmtFc(stillFcNum);
  const clipPrice = fmtFc(videoClipFc);

  const styleOptions = useMemo((): SmartChatPhotoStyleOption[] => {
    const quick: SmartChatPhotoStyleOption = {
      id: `${which}-quick`,
      label: "Surprise me",
      hint: "Pose, set, and light matched to their personality — you still pick the tier.",
      userLine: resolveFabDisplay(FAB_SELFIE[tier].display),
      sceneExtension: buildQuickSceneExtension(tier),
      paletteIndex: 7,
    };
    return [quick, ...smartPhotoStylesForTier(tier)];
  }, [which, tier]);

  const title =
    which === "selfie" ? "Selfie studio" : which === "lewd" ? "Lewd gallery" : "Nude gallery";
  const description =
    which === "selfie"
      ? "Flattering SFW stills — identity matches their portrait; each preset uses its own outfit and backdrop."
      : which === "lewd"
        ? "Tasteful adult heat — wardrobe and scene follow each card (not a copy of their catalog swimsuit)."
        : "Explicit stills — uncensored where allowed; same face & body, fresh sets per preset. FC follows tier.";
  const tierShell =
    which === "selfie"
      ? "border-emerald-500/15 shadow-[0_0_0_1px_rgba(16,185,129,0.12)]"
      : which === "lewd"
        ? "border-rose-500/20 shadow-[0_0_0_1px_rgba(244,63,94,0.14)]"
        : "border-violet-500/20 shadow-[0_0_0_1px_rgba(139,92,246,0.14)]";
  const tierHeroGlow =
    which === "selfie"
      ? "from-emerald-500/12 via-transparent to-cyan-950/25"
      : which === "lewd"
        ? "from-rose-500/15 via-transparent to-fuchsia-950/30"
        : "from-violet-500/15 via-transparent to-purple-950/35";

  const pickStill = (opt: SmartChatPhotoStyleOption) => {
    onStyledStillRequest({ tier, userLine: opt.userLine, sceneExtension: opt.sceneExtension });
    setOpen(false);
  };

  const runClipForOpt = (opt: SmartChatPhotoStyleOption) => {
    const motionHint = [opt.label, opt.hint, opt.sceneExtension].filter(Boolean).join(" — ").slice(0, 480);
    if (onGalleryClipRequest) {
      onGalleryClipRequest({ mood: clipMood, motionHint });
    } else {
      onRequest(vid);
    }
    setClipConfirmOpt(null);
    setOpen(false);
  };

  return (
    <>
      <motion.button
        type="button"
        whileTap={{ scale: 0.99 }}
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label} photo styles`}
        className={cn(
          "inline-flex items-center gap-0.5 rounded-md border px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide touch-manipulation shadow-sm transition-[box-shadow,transform] sm:gap-0.5 sm:px-1.5 sm:text-[9px]",
          accent,
          which === "selfie" && "ring-1 ring-emerald-400/15 hover:ring-emerald-400/30",
          which === "lewd" && "ring-1 ring-rose-400/15 hover:ring-rose-400/35",
          which === "nude" && "ring-1 ring-violet-400/15 hover:ring-violet-400/35",
        )}
      >
        <Icon className="h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3" />
        {label}
        <ChevronDown className="h-2 w-2 opacity-70 text-muted-foreground" aria-hidden />
      </motion.button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            "max-h-[min(92vh,44rem)] w-[min(100vw-1rem,40rem)] gap-0 overflow-hidden border bg-[hsl(280_18%_6%)]/[0.98] p-0 text-foreground shadow-[0_28px_100px_rgba(0,0,0,0.72)] backdrop-blur-2xl sm:max-w-2xl",
            tierShell,
          )}
        >
          <DialogHeader
            className={cn(
              "space-y-2 border-b border-white/[0.08] bg-gradient-to-br px-5 py-4 text-left",
              tierHeroGlow,
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                  {which === "selfie" ? "SFW" : which === "lewd" ? "Spicy" : "Explicit"} ·{" "}
                  {CHAT_IN_SESSION_VIDEO_CLIPS_COMING_SOON ? "Stills (clips soon)" : "Stills & clips"}
                </p>
                <DialogTitle className="font-gothic text-xl font-normal tracking-tight text-white sm:text-2xl">
                  {title}
                </DialogTitle>
                <DialogDescription className="text-[13px] leading-relaxed text-muted-foreground/95">
                  {description}
                </DialogDescription>
              </div>
              <button
                type="button"
                className="mt-0.5 shrink-0 rounded-lg border border-white/10 bg-black/30 p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
                title="About results & pricing"
                aria-expanded={showGalleryDisclaimer}
                onClick={() => setShowGalleryDisclaimer((v) => !v)}
              >
                <CircleHelp className="h-4 w-4" aria-hidden />
                <span className="sr-only">Gallery disclaimer</span>
              </button>
            </div>
            {showGalleryDisclaimer ? (
              <p className="rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-[11px] leading-snug text-muted-foreground/95">
                {GALLERY_RESULT_DISCLAIMER}
              </p>
            ) : null}
          </DialogHeader>

          <div className="max-h-[min(62vh,28rem)] overflow-y-auto overscroll-contain px-4 pb-4 pt-3 sm:max-h-[min(58vh,30rem)] sm:px-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {styleOptions.map((opt) => {
                const isQuick = opt.id.endsWith("-quick");
                return (
                  <div
                    key={opt.id}
                    className={cn(
                      "group relative flex flex-col overflow-hidden rounded-xl border text-left transition-all duration-300",
                      "border-white/[0.09] bg-gradient-to-b from-white/[0.06] to-white/[0.02] hover:-translate-y-0.5 hover:border-white/25 hover:from-white/[0.09] hover:to-white/[0.04]",
                      "hover:shadow-[0_20px_56px_rgba(0,0,0,0.55)]",
                      isQuick && "ring-1 ring-amber-400/45 border-amber-500/40 shadow-[0_12px_40px_rgba(251,191,36,0.08)]",
                      !isQuick &&
                        which === "selfie" &&
                        "hover:border-emerald-400/25 hover:shadow-[0_20px_56px_rgba(16,185,129,0.07)]",
                      !isQuick && which === "lewd" && "hover:border-rose-400/28 hover:shadow-[0_20px_56px_rgba(244,63,94,0.08)]",
                      !isQuick && which === "nude" && "hover:border-violet-400/28 hover:shadow-[0_20px_56px_rgba(139,92,246,0.09)]",
                    )}
                  >
                    <div
                      className={cn(
                        "relative h-[5.4rem] shrink-0 sm:h-[6.4rem]",
                        cardGradientForOption(tier, opt.paletteIndex),
                      )}
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_-10%,rgba(255,255,255,0.22),transparent_55%)]" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                      <ImageIcon
                        className="pointer-events-none absolute right-2 top-2 h-4 w-4 text-white/20 transition-transform duration-300 group-hover:scale-105 group-hover:text-white/28 sm:right-2.5 sm:top-2.5 sm:h-5 sm:w-5"
                        aria-hidden
                      />
                      <div className="absolute bottom-0 left-0 right-0 p-2 pt-5 sm:p-2.5 sm:pt-6">
                        <p className="text-[11px] font-semibold leading-tight text-white drop-shadow-md sm:text-[12px]">
                          {opt.label}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-2.5 sm:p-3">
                      <p className="text-[10px] leading-snug text-muted-foreground/90 line-clamp-3 sm:text-[11px]">
                        {opt.hint}
                      </p>
                      <div className="mt-auto flex flex-col gap-1 sm:flex-row sm:gap-1.5">
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => pickStill(opt)}
                          className={cn(
                            "flex-1 rounded-lg border border-white/12 bg-black/40 px-2 py-1.5 text-center text-[9px] font-semibold text-foreground/95 transition-colors",
                            "hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                            disabled && "pointer-events-none opacity-40",
                          )}
                        >
                          Still · {stillPrice}
                        </button>
                        <button
                          type="button"
                          disabled={disabled || videoDisabled}
                          onClick={() => setClipConfirmOpt(opt)}
                          className={cn(
                            "flex-1 rounded-lg border border-cyan-500/30 bg-cyan-950/25 px-2 py-1.5 text-center text-[9px] font-semibold text-cyan-100/95 transition-colors",
                            "hover:bg-cyan-950/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/35",
                            (disabled || videoDisabled) && "pointer-events-none opacity-40",
                          )}
                        >
                          {CHAT_IN_SESSION_VIDEO_CLIPS_COMING_SOON ? (
                            <span className="block leading-tight">
                              Clip
                              <span className="mt-0.5 block text-[8px] font-normal text-cyan-200/75">Coming soon</span>
                            </span>
                          ) : (
                            <>Clip · {clipPrice}</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={clipConfirmOpt != null} onOpenChange={(o) => !o && setClipConfirmOpt(null)}>
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
            <AlertDialogAction
              disabled={disabled || videoDisabled || !clipConfirmOpt}
              onClick={() => clipConfirmOpt && runClipForOpt(clipConfirmOpt)}
            >
              Yes — use {clipPrice}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
