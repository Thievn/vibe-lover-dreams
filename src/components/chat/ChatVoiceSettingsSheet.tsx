import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TTS_UX_LABELS, TTS_UX_VOICE_IDS, type TtsUxVoiceId } from "@/lib/ttsVoicePresets";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companionName: string;
  effectiveLabel: string;
  relationshipPreset: TtsUxVoiceId;
  onSaveRelationshipPreset: (v: TtsUxVoiceId) => Promise<void>;
  saving: boolean;
};

export function ChatVoiceSettingsSheet({
  open,
  onOpenChange,
  companionName,
  effectiveLabel,
  relationshipPreset,
  onSaveRelationshipPreset,
  saving,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border/80 bg-[hsl(280_25%_8%)]/98 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-gothic text-xl">Voice for {companionName}</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Playback uses Grok TTS. Effective voice: <span className="text-foreground font-medium">{effectiveLabel}</span>{" "}
            (global override in Settings wins if set.)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">This companion</p>
          <Select
            value={relationshipPreset}
            onValueChange={(v) => void onSaveRelationshipPreset(v as TtsUxVoiceId)}
            disabled={saving}
          >
            <SelectTrigger className="w-full bg-muted/40 border-border/70">
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
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving…
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground pt-1">
            Global default for all chats:{" "}
            <Link to="/settings" className="text-primary hover:underline">
              Settings → Voice
            </Link>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
