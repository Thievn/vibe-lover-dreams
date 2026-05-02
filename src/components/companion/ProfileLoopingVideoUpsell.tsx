import { useState } from "react";
import { Loader2, Video, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getEdgeFunctionInvokeMessage } from "@/lib/edgeFunction";
import { pickRandomVideoLoadingLine } from "@/lib/chatVisualRouting";
import { PROFILE_LOOP_VIDEO_FC } from "@/lib/forgeEconomy";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const MOTION_MAX = 800;

type Props = {
  companionId: string;
  className?: string;
  disabled?: boolean;
  tokensBalance: number | null;
  isAdminUser: boolean;
  onSuccess?: () => void;
  onBalanceMaybeChanged?: () => void;
};

/** Paid profile looping MP4 from the current portrait still (Grok Imagine I2V). */
export function ProfileLoopingVideoUpsell({
  companionId,
  className,
  disabled = false,
  tokensBalance,
  isAdminUser,
  onSuccess,
  onBalanceMaybeChanged,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [motionNotes, setMotionNotes] = useState("");

  const run = async () => {
    if (!companionId.trim() || disabled) return;
    if (!isAdminUser && tokensBalance !== null && tokensBalance < PROFILE_LOOP_VIDEO_FC) {
      toast.error(`You need ${PROFILE_LOOP_VIDEO_FC} FC — you have ${tokensBalance} FC.`);
      return;
    }
    setBusy(true);
    const loadId = toast.loading(pickRandomVideoLoadingLine());
    try {
      const trimmed = motionNotes.trim().slice(0, MOTION_MAX);
      const body: Record<string, unknown> = {
        companionId: companionId.trim(),
        motionNotes: trimmed || undefined,
      };
      if (!isAdminUser) {
        body.tokenCost = PROFILE_LOOP_VIDEO_FC;
      }
      const { data, error } = await supabase.functions.invoke("generate-profile-loop-video", { body });
      if (error) throw new Error(await getEdgeFunctionInvokeMessage(error, data));
      const errMsg = (data as { error?: string })?.error;
      if (errMsg) throw new Error(errMsg);
      const url = (data as { publicUrl?: string })?.publicUrl;
      toast.success("Looping portrait video saved", {
        id: loadId,
        description: url ? "It may take a moment to show everywhere." : undefined,
        duration: 6000,
      });
      onSuccess?.();
      onBalanceMaybeChanged?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Generation failed", { id: loadId });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-950/40 via-black/50 to-fuchsia-950/25 p-5 shadow-[0_0_40px_rgba(139,92,246,0.12)] backdrop-blur-md ring-1 ring-white/[0.06]",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-violet-200/95">
        <Video className="h-4 w-4 text-violet-300" />
        Looping portrait video
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/90">
        Turns your current portrait into a short seamless loop — typically about{" "}
        <span className="text-foreground/90 font-medium">8–10 seconds</span> of motion once it finishes.{" "}
        <span className="text-amber-200/90">Results vary</span> with pose, lighting, and your hint — motion is inferred,
        not guaranteed frame-perfect. Rendering can take a few minutes; hang tight.
      </p>
      <div className="mt-3 space-y-1.5">
        <Label htmlFor={`profile-loop-motion-${companionId}`} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Motion hint <span className="normal-case font-normal text-muted-foreground/70">(optional)</span>
        </Label>
        <Textarea
          id={`profile-loop-motion-${companionId}`}
          value={motionNotes}
          onChange={(e) => setMotionNotes(e.target.value.slice(0, MOTION_MAX))}
          rows={3}
          placeholder="e.g. slow hair sway, soft smile, subtle lean — keep it short."
          className="resize-y min-h-[72px] border-violet-500/25 bg-black/50 text-xs text-foreground placeholder:text-muted-foreground/60"
          disabled={busy || disabled}
        />
        <p className="text-[10px] text-muted-foreground/80">Max {MOTION_MAX} characters.</p>
      </div>
      <button
        type="button"
        disabled={busy || disabled || !companionId.trim()}
        onClick={() => void run()}
        className={cn(
          "mt-4 flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl border border-violet-400/50 bg-gradient-to-r from-violet-600/90 via-fuchsia-600/85 to-violet-700/90 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-900/40 transition-opacity",
          "hover:opacity-95 active:scale-[0.99] touch-manipulation disabled:cursor-not-allowed disabled:opacity-45",
        )}
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin shrink-0" /> : <Sparkles className="h-5 w-5 shrink-0" />}
        {isAdminUser ? "Generate looping video" : `Generate looping video — ${PROFILE_LOOP_VIDEO_FC} FC`}
      </button>
    </div>
  );
}
