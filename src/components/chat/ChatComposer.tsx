import { useCallback, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Send, ImageIcon, Video, Mic, ChevronDown, Camera, Aperture, Sparkles, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type { ChatMediaRoute } from "@/lib/chatVisualRouting";
import { CHAT_VIDEO_TIMING_USER_NOTE } from "@/lib/chatVisualRouting";
import type { ChatMediaBarAction } from "@/components/chat/ChatMediaRequestBar";
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
  onStyledStillRequest,
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
                onStyledStillRequest={onStyledStillRequest}
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
              onStyledStillRequest={onStyledStillRequest}
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
  onStyledStillRequest,
  imageCostLabel,
  videoCostLabel,
  compact,
}: {
  disabled: boolean;
  videoDisabled: boolean;
  onRequest: (a: ChatMediaBarAction) => void;
  onStyledStillRequest: (p: { tier: FabSelfieTier; userLine: string; sceneExtension: string }) => void;
  imageCostLabel: string;
  videoCostLabel: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-end gap-1", compact && "w-full justify-start")}>
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
        imageCostLabel={imageCostLabel}
        videoCostLabel={videoCostLabel}
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
        imageCostLabel={imageCostLabel}
        videoCostLabel={videoCostLabel}
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
        imageCostLabel={imageCostLabel}
        videoCostLabel={videoCostLabel}
      />
    </div>
  );
}

type Which = "selfie" | "lewd" | "nude";

function buildQuickSceneExtension(tier: FabSelfieTier): string {
  if (tier === "nude") {
    return "Explicit nude still: creative pose and lighting chosen to flatter their body type and personality matrix — premium intimate key art, same identity as the roster portrait, uncensored adult framing.";
  }
  if (tier === "lewd") {
    return "Lewd still: creative teasing heat — lingerie, sheer, silhouette, or undressing beats that match personality and era — not generic catalog stock.";
  }
  return "SFW still: creative flattering selfie or portrait-style phone capture — outfit and set plausibly match their appearance, role, and world; fully clothed.";
}

function PhotoMoodMenu({
  label,
  icon: Icon,
  accent,
  tier,
  which,
  onRequest,
  onStyledStillRequest,
  disabled,
  videoDisabled,
  imageCostLabel,
  videoCostLabel,
}: {
  label: string;
  icon: typeof Camera;
  accent: string;
  tier: FabSelfieTier;
  which: Which;
  onRequest: (a: ChatMediaBarAction) => void;
  onStyledStillRequest: (p: { tier: FabSelfieTier; userLine: string; sceneExtension: string }) => void;
  disabled: boolean;
  videoDisabled: boolean;
  imageCostLabel: string;
  videoCostLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const vid: ChatMediaBarAction = which === "selfie" ? "selfie_video" : which === "lewd" ? "lewd_video" : "nude_video";

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
      ? "SFW stills — same face & body as their portrait. Tap a card to send."
      : which === "lewd"
        ? "Spicy stills tuned to who they are — era, voice, and look."
        : "Explicit stills — uncensored, same them. FC follows tier.";

  const pickStill = (opt: SmartChatPhotoStyleOption) => {
    onStyledStillRequest({ tier, userLine: opt.userLine, sceneExtension: opt.sceneExtension });
    setOpen(false);
  };

  const pickVideo = () => {
    onRequest(vid);
    setOpen(false);
  };

  return (
    <>
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label} photo styles`}
        className={cn(
          "inline-flex items-center gap-0.5 rounded-lg border px-1.5 py-1.5 text-[9px] font-bold uppercase tracking-wide touch-manipulation sm:gap-1 sm:px-2.5 sm:text-[10px]",
          accent,
        )}
      >
        <Icon className="h-3 w-3 shrink-0" />
        {label}
        <ChevronDown className="h-2.5 w-2.5 opacity-70 text-muted-foreground" aria-hidden />
      </motion.button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            "max-h-[min(92vh,44rem)] w-[min(100vw-1rem,40rem)] gap-0 overflow-hidden border border-white/[0.1] bg-[hsl(280_20%_7%)]/[0.98] p-0 text-foreground shadow-[0_28px_100px_rgba(0,0,0,0.65)] backdrop-blur-2xl sm:max-w-2xl",
          )}
        >
          <DialogHeader className="space-y-1.5 border-b border-white/[0.08] bg-gradient-to-r from-black/40 via-transparent to-fuchsia-950/20 px-5 py-5 text-left">
            <DialogTitle className="font-gothic text-xl font-normal tracking-tight text-white">{title}</DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-muted-foreground">{description}</DialogDescription>
          </DialogHeader>

          <div className="max-h-[min(62vh,28rem)] overflow-y-auto overscroll-contain px-4 pb-4 pt-3 sm:max-h-[min(58vh,30rem)] sm:px-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {styleOptions.map((opt) => {
                const isQuick = opt.id.endsWith("-quick");
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => pickStill(opt)}
                    className={cn(
                      "group relative flex flex-col overflow-hidden rounded-2xl border text-left transition-all duration-200",
                      "border-white/[0.1] bg-white/[0.025] hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.06]",
                      "hover:shadow-[0_16px_48px_rgba(0,0,0,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                      disabled && "pointer-events-none opacity-40",
                      isQuick && "ring-1 ring-amber-400/40 border-amber-500/35",
                    )}
                  >
                    <div
                      className={cn(
                        "relative h-[7.25rem] shrink-0 sm:h-36",
                        cardGradientForOption(tier, opt.paletteIndex),
                      )}
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_-10%,rgba(255,255,255,0.22),transparent_55%)]" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                      <ImageIcon
                        className="pointer-events-none absolute right-3 top-3 h-9 w-9 text-white/25 transition-transform duration-200 group-hover:scale-105 group-hover:text-white/35"
                        aria-hidden
                      />
                      <div className="absolute bottom-0 left-0 right-0 p-3 pt-8">
                        <p className="text-[13px] font-semibold leading-tight text-white drop-shadow-md">{opt.label}</p>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col gap-1.5 p-3.5 pt-3">
                      <p className="text-[11px] leading-snug text-muted-foreground/95 line-clamp-2">{opt.hint}</p>
                      <p className="mt-auto text-[9px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                        Still · {imageCostLabel}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-white/[0.08] bg-black/35 px-4 py-3.5 sm:px-5">
            <button
              type="button"
              disabled={disabled || videoDisabled}
              onClick={pickVideo}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-950/20 py-2.5 text-sm font-medium text-cyan-100/95 transition-colors",
                "hover:bg-cyan-950/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/30",
                (disabled || videoDisabled) && "pointer-events-none opacity-40",
              )}
            >
              <Video className="h-4 w-4 shrink-0 text-[#00ffd4]" aria-hidden />
              <span>Motion clip instead</span>
              <span className="text-[10px] font-normal text-[#00ffd4]/75">{videoCostLabel}</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
