import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Images, Loader2, Sparkles, Video, X } from "lucide-react";
import { toast } from "sonner";
import {
  cancelProfileLoopVideo,
  clearProfileLoopJobId,
  hasPendingProfileLoopJob,
  invokeGenerateProfileLoopVideo,
  loadProfileLoopJob,
  markProfileLoopResumeStarted,
  profileLoopToastId,
  resumePendingProfileLoopJob,
} from "@/lib/invokeGenerateProfileLoopVideo";
import { PROFILE_LOOP_VIDEO_FC } from "@/lib/forgeEconomy";
import { profileLoopMotionInvalidReason } from "@/lib/profileLoopVideoSafety";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const MOTION_MAX = 800;

type Props = {
  companionId: string;
  /** True when an MP4/WebM/MOV is already stored on the companion (regenerate vs first generate). */
  hasExistingLoopVideo?: boolean;
  className?: string;
  disabled?: boolean;
  tokensBalance: number | null;
  isAdminUser: boolean;
  onSuccess?: (result?: { publicUrl?: string }) => void;
  onBalanceMaybeChanged?: () => void;
  /** Opens / closes the inline gallery panel under this card. */
  onToggleGallery?: () => void;
  /** When set, I2V uses this `generated_images` row (still) instead of the DB portrait URL. */
  sourceGeneratedImageId?: string | null;
  onClearLoopSource?: () => void;
};

/** Paid profile looping MP4 from the current portrait still (Grok Imagine I2V). */
export function ProfileLoopingVideoUpsell({
  companionId,
  hasExistingLoopVideo = false,
  className,
  disabled = false,
  tokensBalance,
  isAdminUser,
  onSuccess,
  onBalanceMaybeChanged,
  onToggleGallery,
  sourceGeneratedImageId = null,
  onClearLoopSource,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [motionNotes, setMotionNotes] = useState("");
  const [open, setOpen] = useState(false);
  const [pendingJob, setPendingJob] = useState(() => hasPendingProfileLoopJob(companionId));
  const abortRef = useRef<AbortController | null>(null);
  const toastId = profileLoopToastId(companionId);

  const pollStatusToast = useCallback(
    (status: "starting" | "rendering" | "saving" | "complete") => {
      const msg =
        status === "starting"
          ? "Starting loop video on Grok…"
          : status === "rendering"
            ? "Rendering motion (often 3–8 min)…"
            : status === "saving"
              ? "Saving loop to your profile…"
              : "Loop ready.";
      toast.loading(msg, { id: toastId });
    },
    [toastId],
  );

  useEffect(() => {
    setPendingJob(hasPendingProfileLoopJob(companionId));
  }, [companionId]);

  const runGeneration = useCallback(
    async (body: Record<string, unknown>) => {
      pollStatusToast("starting");
      const controller = new AbortController();
      abortRef.current = controller;
      setBusy(true);
      setPendingJob(true);
      try {
        const result = await invokeGenerateProfileLoopVideo(body, {
          signal: controller.signal,
          onPollStatus: pollStatusToast,
        });
        toast.success(hasExistingLoopVideo ? "Loop video updated" : "Looping portrait video saved", {
          id: toastId,
          description: "Your profile portrait should update now.",
          duration: 6000,
        });
        onSuccess?.({ publicUrl: result.publicUrl });
        onBalanceMaybeChanged?.();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Generation failed";
        if (!/cancelled/i.test(msg)) {
          toast.error(msg, { id: toastId });
        } else {
          toast.dismiss(toastId);
        }
      } finally {
        abortRef.current = null;
        setBusy(false);
        setPendingJob(hasPendingProfileLoopJob(companionId));
      }
    },
    [companionId, hasExistingLoopVideo, onBalanceMaybeChanged, onSuccess, pollStatusToast, toastId],
  );

  const run = async () => {
    if (!companionId.trim() || disabled) return;
    const invalid = profileLoopMotionInvalidReason(motionNotes);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    if (!isAdminUser && tokensBalance !== null && tokensBalance < PROFILE_LOOP_VIDEO_FC) {
      toast.error(`You need ${PROFILE_LOOP_VIDEO_FC} FC — you have ${tokensBalance} FC.`);
      return;
    }
    const trimmed = motionNotes.trim().slice(0, MOTION_MAX);
    const body: Record<string, unknown> = {
      companionId: companionId.trim(),
      motionNotes: trimmed || undefined,
    };
    const srcId = sourceGeneratedImageId?.trim();
    if (srcId) body.sourceGeneratedImageId = srcId;
    if (!isAdminUser) {
      body.tokenCost = PROFILE_LOOP_VIDEO_FC;
    }
    await runGeneration(body);
  };

  const cancelPoll = () => {
    abortRef.current?.abort();
    const stored = loadProfileLoopJob(companionId);
    void (async () => {
      try {
        if (stored) {
          await cancelProfileLoopVideo(companionId, stored.jobId);
        } else {
          clearProfileLoopJobId(companionId);
        }
        toast.info("Loop generation cancelled. You can start a new one when ready.");
      } catch (e: unknown) {
        clearProfileLoopJobId(companionId);
        const msg = e instanceof Error ? e.message : "Could not cancel server job";
        toast.error(msg);
      } finally {
        setBusy(false);
        setPendingJob(false);
        toast.dismiss(toastId);
      }
    })();
  };

  useEffect(() => {
    if (!companionId.trim() || disabled) return;
    if (!hasPendingProfileLoopJob(companionId)) return;
    if (!markProfileLoopResumeStarted(companionId)) return;
    setOpen(true);
    pollStatusToast("starting");
    void (async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      setBusy(true);
      try {
        const result = await resumePendingProfileLoopJob(companionId, {
          signal: controller.signal,
          onPollStatus: pollStatusToast,
        });
        if (result) {
          toast.success("Looping portrait video saved", {
            id: toastId,
            description: "Your profile portrait should update now.",
          });
          onSuccess?.({ publicUrl: result.publicUrl });
          onBalanceMaybeChanged?.();
        } else {
          toast.dismiss(toastId);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Resume failed";
        if (!/cancelled/i.test(msg)) toast.error(msg, { id: toastId });
        else toast.dismiss(toastId);
      } finally {
        abortRef.current = null;
        setBusy(false);
        setPendingJob(hasPendingProfileLoopJob(companionId));
      }
    })();
  }, [companionId, disabled, onBalanceMaybeChanged, onSuccess, pollStatusToast, toastId]);

  const costSuffix = isAdminUser ? "" : ` — ${PROFILE_LOOP_VIDEO_FC} FC`;
  const primaryCta = hasExistingLoopVideo
    ? isAdminUser
      ? "Regenerate loop video"
      : `Regenerate loop video${costSuffix}`
    : isAdminUser
      ? "Generate loop video"
      : `Generate loop video${costSuffix}`;

  const generateDisabled = busy || disabled || !companionId.trim();

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn("min-w-0", className)}>
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-violet-500/35 bg-gradient-to-br from-violet-950/50 via-black/55 to-fuchsia-950/30 shadow-[0_0_36px_rgba(139,92,246,0.14)] ring-1 ring-white/[0.06] backdrop-blur-md",
        )}
      >
        <div className="flex flex-wrap items-stretch gap-0 border-b border-white/[0.07] sm:flex-nowrap">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              disabled={busy}
              className="flex min-h-[3rem] min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04] disabled:opacity-60"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-400/35 bg-violet-500/15 text-violet-200">
                <Video className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-violet-100/95">
                    Looping portrait video
                  </span>
                  {hasExistingLoopVideo ? (
                    <span className="shrink-0 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-200/95">
                      Clip on file
                    </span>
                  ) : pendingJob ? (
                    <span className="shrink-0 rounded-full border border-amber-400/35 bg-amber-500/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-200/95">
                      Rendering
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground/90">
                  {busy
                    ? "Grok is rendering — usually 3–8 min"
                    : pendingJob
                      ? "Job in progress — reopen to resume"
                      : open
                        ? "Hide"
                        : "Open"}{" "}
                  options · {sourceGeneratedImageId ? "gallery still" : "portrait"} · ~8s
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-violet-200/80 transition-transform duration-200",
                  open && "rotate-180",
                )}
                aria-hidden
              />
            </button>
          </CollapsibleTrigger>
          {onToggleGallery ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onToggleGallery();
              }}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 border-t border-white/[0.07] px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-fuchsia-100/90 transition-colors hover:bg-fuchsia-500/10 sm:border-l sm:border-t-0"
            >
              <Images className="h-3.5 w-3.5 opacity-90" aria-hidden />
              Gallery
            </button>
          ) : null}
        </div>

        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
          <div className="space-y-3 px-4 pb-4 pt-3">
            {sourceGeneratedImageId ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-400/35 bg-violet-950/35 px-3 py-2 text-[11px] text-violet-100/95">
                <span>Loop will use your selected gallery still (not the profile portrait).</span>
                {onClearLoopSource ? (
                  <button
                    type="button"
                    onClick={onClearLoopSource}
                    className="shrink-0 rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide hover:bg-white/10"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            ) : null}
            <p className="text-[11px] leading-relaxed text-muted-foreground/90">
              Uses your{" "}
              <span className="font-medium text-foreground/85">
                {sourceGeneratedImageId ? "selected gallery still" : "current portrait"}
              </span>{" "}
              as the I2V reference. Optional notes: outfit, pose, mood, setting — keep it{" "}
              <span className="text-foreground/85">tasteful and suggestive</span> (hard NSFW wording is blocked).
            </p>
            <div className="space-y-1.5">
              <Label
                htmlFor={`profile-loop-motion-${companionId}`}
                className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Custom instructions <span className="normal-case font-normal text-muted-foreground/70">(optional)</span>
              </Label>
              <Textarea
                id={`profile-loop-motion-${companionId}`}
                value={motionNotes}
                onChange={(e) => setMotionNotes(e.target.value.slice(0, MOTION_MAX))}
                rows={3}
                placeholder="e.g. silk robe slipping off one shoulder, candlelit room, slow hair sway…"
                className="min-h-[72px] resize-y border-violet-500/25 bg-black/50 text-xs text-foreground placeholder:text-muted-foreground/55"
                disabled={busy || disabled}
              />
              <p className="text-[10px] text-muted-foreground/75">Max {MOTION_MAX} characters.</p>
            </div>
            {busy ? (
              <button
                type="button"
                onClick={cancelPoll}
                className="flex w-full min-h-[40px] items-center justify-center gap-2 rounded-xl border border-white/20 bg-black/50 px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-white/10"
              >
                <X className="h-4 w-4" />
                Cancel waiting (job may still finish)
              </button>
            ) : null}
            <button
              type="button"
              disabled={generateDisabled}
              onClick={() => void run()}
              className={cn(
                "flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl border border-violet-400/50 bg-gradient-to-r from-violet-600/90 via-fuchsia-600/85 to-violet-700/90 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-900/35 transition-opacity",
                "hover:opacity-95 active:scale-[0.99] touch-manipulation disabled:cursor-not-allowed disabled:opacity-45",
              )}
            >
              {busy ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" /> : <Sparkles className="h-5 w-5 shrink-0" />}
              {primaryCta}
            </button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
