import { useState } from "react";
import { Loader2, Video } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getEdgeFunctionInvokeMessage } from "@/lib/edgeFunction";
import { CHAT_VIDEO_TIMING_USER_NOTE, pickRandomVideoLoadingLine } from "@/lib/chatVisualRouting";
import { cn } from "@/lib/utils";

type Props = {
  companionId: string;
  className?: string;
  onSuccess?: () => void;
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

export function AdminLoopingVideoBlock({ companionId, className, onSuccess, showMotionNotes = true }: Props) {
  const [busy, setBusy] = useState(false);
  const [motionNotes, setMotionNotes] = useState("");

  const run = async () => {
    if (!companionId.trim()) return;
    setBusy(true);
    const loadId = toast.loading(pickRandomVideoLoadingLine());
    try {
      const trimmed = motionNotes.trim().slice(0, MOTION_MAX);
      const { data, error } = await supabase.functions.invoke("generate-profile-loop-video", {
        body: { companionId: companionId.trim(), motionNotes: trimmed || undefined },
      });
      if (error) throw new Error(await getEdgeFunctionInvokeMessage(error, data));
      const errMsg = (data as { error?: string })?.error;
      if (errMsg) throw new Error(errMsg);
      const url = (data as { publicUrl?: string })?.publicUrl;
      toast.success("Looping profile video saved", {
        id: loadId,
        description: url ? String(url).slice(0, 120) : "Enable on profile if needed.",
        duration: 8000,
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
        "rounded-xl border border-primary/25 bg-gradient-to-br from-black/60 via-primary/[0.06] to-black/50 p-4 space-y-2",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary/90">
        <Video className="h-4 w-4" />
        Looping portrait video
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Primary path after save: generate here or in Character management (forge no longer queues this automatically — faster saves).
        Uses the current still as first frame — Grok Imagine I2V; motion follows profile fields. {CHAT_VIDEO_TIMING_USER_NOTE}{" "}
        Use the row checkbox “Show looping MP4 on companion profile and chat” when the animated URL is the MP4.
      </p>
      {showMotionNotes ? (
        <div className="space-y-1.5">
          <Label htmlFor={`loop-motion-${companionId}`} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Motion & camera (optional)
          </Label>
          <Textarea
            id={`loop-motion-${companionId}`}
            value={motionNotes}
            onChange={(e) => setMotionNotes(e.target.value.slice(0, MOTION_MAX))}
            rows={3}
            placeholder="e.g. slow hair toss, smirk, subtle lean forward, soft idle sway — no dialogue."
            className="resize-y min-h-[72px] text-xs bg-background/60 border-border/80"
            disabled={busy}
          />
          <p className="text-[10px] text-muted-foreground/90">
            When set, the model treats this as mandatory direction (highest priority in the prompt). Max {MOTION_MAX} chars. Leave blank for profile-driven defaults only.
          </p>
        </div>
      ) : null}
      <button
        type="button"
        disabled={busy || !companionId.trim()}
        onClick={() => void run()}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/15 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/25 transition-colors disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
        Generate looping video
      </button>
    </div>
  );
}
