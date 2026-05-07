import { useState } from "react";
import { Loader2, Video } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { invokeGenerateProfileLoopVideo } from "@/lib/invokeGenerateProfileLoopVideo";
import { pickRandomVideoLoadingLine } from "@/lib/chatVisualRouting";
import { profileLoopMotionInvalidReason } from "@/lib/profileLoopVideoSafety";
import { cn } from "@/lib/utils";

type Props = {
  companionId: string;
  className?: string;
  onSuccess?: () => void;
  /** True when companion already has an MP4/WebM loop URL on `animated_image_url`. */
  hasExistingLoopVideo?: boolean;
  /**
   * Optional: extra motion / camera / mood text merged into the I2V prompt (server-capped).
   * Not persisted — use each time you generate.
   */
  showMotionNotes?: boolean;
};

/**
 * `generate-profile-loop-video` — Grok Imagine I2V → Storage MP4.
 * Edge auth: custom-character **owner** or **admin** (catalog rows require admin).
 */
const MOTION_MAX = 800;

export function AdminLoopingVideoBlock({
  companionId,
  className,
  onSuccess,
  hasExistingLoopVideo = false,
  showMotionNotes = true,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [motionNotes, setMotionNotes] = useState("");

  const run = async () => {
    if (!companionId.trim()) return;
    const invalid = profileLoopMotionInvalidReason(motionNotes);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    setBusy(true);
    const loadId = toast.loading(pickRandomVideoLoadingLine());
    try {
      const trimmed = motionNotes.trim().slice(0, MOTION_MAX);
      await invokeGenerateProfileLoopVideo({
        companionId: companionId.trim(),
        motionNotes: trimmed || undefined,
      });
      toast.success(hasExistingLoopVideo ? "Loop video updated" : "Looping profile video saved", {
        id: loadId,
        description:
          "Profile-page prompt + safety filter on custom notes. Forge clips are also inserted into the companion gallery.",
        duration: 6000,
      });
      onSuccess?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Generation failed", { id: loadId });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "space-y-2 rounded-xl border border-primary/25 bg-gradient-to-br from-black/60 via-primary/[0.06] to-black/50 p-4",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary/90">
        <Video className="h-4 w-4" />
        Looping portrait video
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Same engine as Discover: current still as reference, optional tasteful custom notes (blocked words rejected
        client + server). Successful clips are written to the owner&apos;s companion gallery when applicable.
      </p>
      {showMotionNotes ? (
        <div className="space-y-1.5">
          <Label htmlFor={`loop-motion-${companionId}`} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Custom instructions (optional)
          </Label>
          <Textarea
            id={`loop-motion-${companionId}`}
            value={motionNotes}
            onChange={(e) => setMotionNotes(e.target.value.slice(0, MOTION_MAX))}
            rows={3}
            placeholder="e.g. candlelight, silk sheets, slow hair sway — tasteful / suggestive only."
            className="min-h-[72px] resize-y border-border/80 bg-background/60 text-xs"
            disabled={busy}
          />
          <p className="text-[10px] text-muted-foreground/90">Max {MOTION_MAX} characters.</p>
        </div>
      ) : null}
      <button
        type="button"
        disabled={busy || !companionId.trim()}
        onClick={() => void run()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/15 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/25 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
        {hasExistingLoopVideo ? "Regenerate looping video" : "Generate looping video"}
      </button>
    </div>
  );
}
