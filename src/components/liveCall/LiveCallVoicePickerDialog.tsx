import { useState } from "react";
import { Check, Headphones, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TTS_UX_LABELS, TTS_UX_VOICE_IDS, type TtsUxVoiceId } from "@/lib/ttsVoicePresets";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The voice used for the active call. */
  active: TtsUxVoiceId;
  onConfirm: (v: TtsUxVoiceId) => void;
  onPlaySample: (v: TtsUxVoiceId) => Promise<void>;
  playingId: TtsUxVoiceId | null;
  savePending?: boolean;
};

/**
 * Presents every UX voice preset (same list as chat) with a Play Sample action
 * and explicit confirmation to apply the voice to this companion.
 */
export function LiveCallVoicePickerDialog({
  open,
  onOpenChange,
  active,
  onConfirm,
  onPlaySample,
  playingId,
  savePending,
}: Props) {
  const [err, setErr] = useState<string | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setErr(null);
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[min(90dvh,520px)] w-[min(100%,24rem)] gap-0 overflow-y-auto border-white/10 bg-[hsl(280_30%_8%)]/95 p-0 text-foreground sm:max-w-md">
        <DialogHeader className="border-b border-white/10 px-4 py-3 text-left">
          <DialogTitle className="text-base">Companion voice</DialogTitle>
          <DialogDescription className="text-xs text-white/60">
            Preview each voice, then use one for this call. The choice is saved for this companion.
          </DialogDescription>
        </DialogHeader>

        {err && (
          <p className="px-4 pt-1 text-center text-xs text-amber-300" role="alert">
            {err}
          </p>
        )}

        <ul className="space-y-0 divide-y divide-white/[0.06] px-0 pb-2">
          {TTS_UX_VOICE_IDS.map((id) => {
            const selected = active === id;
            return (
              <li key={id} className="px-3 py-2.5 sm:px-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p
                      className={cn("truncate text-sm font-semibold", selected ? "text-pink-200" : "text-white/90")}
                    >
                      {TTS_UX_LABELS[id]}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-white/35">{id.replace(/_/g, " ")}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-8 min-w-0 border border-white/10 bg-white/5 text-[11px] text-white/80 hover:bg-white/10"
                      onClick={async () => {
                        setErr(null);
                        try {
                          await onPlaySample(id);
                        } catch (e) {
                          setErr(e instanceof Error ? e.message : "Could not play sample");
                        }
                      }}
                      disabled={!!playingId || savePending}
                    >
                      {playingId === id ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : <Headphones className="h-3.5 w-3.5" />}
                      <span className="ml-0.5 hidden min-[400px]:inline">Play</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 min-w-0 text-[11px] font-semibold"
                      onClick={() => onConfirm(id)}
                      disabled={savePending}
                    >
                      {selected ? <Check className="h-3.5 w-3.5" /> : "Use"}
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
