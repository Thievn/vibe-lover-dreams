import { cn } from "@/lib/utils";
import type { ChatSessionMode } from "@/lib/chatSessionMode";
import { LIVE_CHAT_FC_PER_MINUTE, LIVE_VOICE_FC_PER_MINUTE } from "@/lib/forgeEconomy";

type Props = {
  mode: ChatSessionMode;
  onChange: (mode: ChatSessionMode) => void;
  disabled?: boolean;
  className?: string;
};

export function ChatModeToggle({ mode, onChange, disabled, className }: Props) {
  return (
    <div
      className={cn(
        "inline-flex rounded-xl border border-white/[0.1] bg-black/40 p-0.5 shadow-inner",
        className,
      )}
      role="group"
      aria-label="Chat mode"
    >
      <button
        type="button"
        disabled={disabled}
        title="Classic: typed messages + toy patterns from compatible replies — no FC per message."
        onClick={() => onChange("classic")}
        className={cn(
          "rounded-[10px] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors min-h-[36px] touch-manipulation",
          mode === "classic"
            ? "bg-primary/90 text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Classic (free)
      </button>
      <button
        type="button"
        disabled={disabled}
        title={`Live Voice: mic + her voice in chat — ${LIVE_VOICE_FC_PER_MINUTE} FC per started minute (same meter as full-screen Live Call / billed live chat at ${LIVE_CHAT_FC_PER_MINUTE} FC/min).`}
        onClick={() => onChange("live_voice")}
        className={cn(
          "rounded-[10px] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors min-h-[36px] touch-manipulation",
          mode === "live_voice"
            ? "bg-[#00ffd4]/90 text-black shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Live Voice
      </button>
    </div>
  );
}
