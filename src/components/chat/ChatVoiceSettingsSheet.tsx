import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TTS_UX_LABELS, TTS_UX_VOICE_IDS, type TtsUxVoiceId } from "@/lib/ttsVoicePresets";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companionName: string;
  effectiveLabel: string;
  /** When set, Account → Voice overrides per-companion picks for every chat. */
  globalVoiceActive: boolean;
  globalVoiceLabel: string | null;
  relationshipPreset: TtsUxVoiceId;
  onSaveRelationshipPreset: (v: TtsUxVoiceId) => Promise<void>;
  saving: boolean;
  ttsAutoplay: boolean;
  onTtsAutoplayChange: (enabled: boolean) => void;
};

export function ChatVoiceSettingsSheet({
  open,
  onOpenChange,
  companionName,
  effectiveLabel,
  globalVoiceActive,
  globalVoiceLabel,
  relationshipPreset,
  onSaveRelationshipPreset,
  saving,
  ttsAutoplay,
  onTtsAutoplayChange,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border-border/80 bg-[hsl(280_25%_8%)]/98 p-0 backdrop-blur-xl sm:max-w-md">
        <DialogHeader className="space-y-2 border-b border-white/[0.07] px-5 pb-4 pt-5">
          <DialogTitle className="font-gothic text-xl tracking-tight">Voice · {companionName}</DialogTitle>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Grok reads {companionName}&apos;s lines aloud. Right now you&apos;re hearing{" "}
            <span className="font-medium text-foreground">{effectiveLabel}</span>.
          </p>
        </DialogHeader>

        <div className="space-y-5 px-5 py-5">
          {globalVoiceActive ? (
            <div className="rounded-xl border border-primary/20 bg-primary/[0.06] px-3.5 py-3 text-sm leading-relaxed text-foreground/90">
              <span className="font-medium text-primary">Account default is on.</span> Every chat uses{" "}
              <span className="font-medium">{globalVoiceLabel ?? "your chosen voice"}</span>. Turn that off in{" "}
              <Link to="/settings" className="text-primary underline-offset-4 hover:underline">
                Account → Voice
              </Link>{" "}
              if you want this companion&apos;s voice below to apply here instead.
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              This companion uses the voice you pick below. Optional: set one voice for{" "}
              <em>all</em> chats in{" "}
              <Link to="/settings" className="text-primary underline-offset-4 hover:underline">
                Account → Voice
              </Link>
              .
            </p>
          )}

          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/90">
              Voice for {companionName}
            </p>
            <Select
              value={relationshipPreset}
              onValueChange={(v) => void onSaveRelationshipPreset(v as TtsUxVoiceId)}
              disabled={saving}
            >
              <SelectTrigger className="w-full border-border/70 bg-muted/40">
                <SelectValue placeholder="Voice preset" />
              </SelectTrigger>
              <SelectContent>
                {TTS_UX_VOICE_IDS.map((id) => (
                  <SelectItem key={id} value={id}>
                    {TTS_UX_LABELS[id]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {saving ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </p>
            ) : null}
          </div>

          <div className="flex items-start justify-between gap-4 rounded-xl border border-white/[0.08] bg-black/45 px-3.5 py-3">
            <div className="min-w-0 space-y-0.5">
              <Label htmlFor="tts-autoplay" className="text-sm font-medium leading-snug text-foreground">
                Auto-play new replies
              </Label>
              <p className="text-xs leading-relaxed text-muted-foreground">
                After you send a message, play {companionName}&apos;s reply automatically (tap the speaker to stop).
              </p>
            </div>
            <Switch
              id="tts-autoplay"
              checked={ttsAutoplay}
              onCheckedChange={onTtsAutoplayChange}
              className="shrink-0 data-[state=checked]:bg-primary"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
