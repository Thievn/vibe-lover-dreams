import { Bluetooth, BluetoothOff } from "lucide-react";
import { VibrationPatternButtons } from "@/components/toy/VibrationPatternButtons";
import type { CompanionVibrationPatternRow } from "@/hooks/useCompanionVibrationPatterns";
import type { LovenseToy } from "@/lib/lovense";
import { cn } from "@/lib/utils";

type Props = {
  toys: LovenseToy[];
  primaryToyId: string | null;
  onSelectPrimaryToy: (deviceUid: string) => void;
  patterns: CompanionVibrationPatternRow[];
  patternsLoading: boolean;
  disabled: boolean;
  sendingId: string | null;
  onTrigger: (row: CompanionVibrationPatternRow) => void;
  className?: string;
};

/**
 * Cyber-goth toy control — only meaningful when a Lovense device is connected (`disabled` false).
 */
export function ToyControlPanel({
  toys,
  primaryToyId,
  onSelectPrimaryToy,
  patterns,
  patternsLoading,
  disabled,
  sendingId,
  onTrigger,
  className,
}: Props) {
  const active = toys.filter((t) => t.enabled);
  const primary = active.find((t) => t.id === primaryToyId) ?? active[0];

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.08] bg-gradient-to-br from-black/70 via-[hsl(280_30%_8%)]/90 to-black/80 backdrop-blur-xl p-4 shadow-[0_0_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.04)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 min-w-0">
          {disabled ? (
            <BluetoothOff className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <Bluetooth className="h-4 w-4 text-[#00ffd4] shrink-0 drop-shadow-[0_0_8px_rgba(0,255,212,0.35)]" />
          )}
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Toy control</p>
            <p className="text-sm font-gothic text-foreground truncate">
              {disabled ? "Connect a device to feel these patterns" : primary?.name ?? "Linked toy"}
            </p>
          </div>
        </div>
        {!disabled && (
          <span className="shrink-0 rounded-full border border-[#00ffd4]/30 bg-[#00ffd4]/10 px-2 py-0.5 text-[10px] font-medium text-[#00ffd4]">
            Live
          </span>
        )}
      </div>

      {!disabled && active.length > 1 && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Patterns target</p>
          <div className="flex flex-wrap gap-1.5">
            {active.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectPrimaryToy(t.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors",
                  (primaryToyId === t.id || (!primaryToyId && t.id === active[0]?.id))
                    ? "border-[#00ffd4]/50 bg-[#00ffd4]/10 text-[#00ffd4]"
                    : "border-white/10 bg-black/30 text-muted-foreground hover:border-white/20",
                )}
              >
                <span className="h-6 w-6 overflow-hidden rounded bg-black/50 shrink-0">
                  <img src={t.imageUrl} alt="" className="h-full w-full object-cover" />
                </span>
                <span className="truncate max-w-[7rem]">{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {patternsLoading ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Loading signature patterns…</p>
      ) : (
        <VibrationPatternButtons
          patterns={patterns}
          disabled={disabled}
          sendingId={sendingId}
          onTrigger={onTrigger}
          variant="chat"
        />
      )}
    </div>
  );
}
