import { Sparkles, ChevronDown, Waves } from "lucide-react";
import { toast } from "sonner";
import type { CompanionVibrationPatternRow } from "@/hooks/useCompanionVibrationPatterns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Props = {
  companionName: string;
  patterns: CompanionVibrationPatternRow[];
  patternsLoading: boolean;
  hasDevice: boolean;
  disabled?: boolean;
  activePatternId: string | null;
  onTriggerPattern: (row: CompanionVibrationPatternRow) => void;
  className?: string;
};

/**
 * Subtle header control: run forge-defined vibration patterns (including abyssal signature) on demand.
 */
export function ChatSignatureMovesDropdown({
  companionName,
  patterns,
  patternsLoading,
  hasDevice,
  disabled,
  activePatternId,
  onTriggerPattern,
  className,
}: Props) {
  if (!patterns.length && !patternsLoading) return null;

  const trigger = (row: CompanionVibrationPatternRow) => {
    if (!hasDevice) {
      toast.message("Link a Lovense toy in Preferences to feel signature moves.");
      return;
    }
    onTriggerPattern(row);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled || patternsLoading || (!patterns.length && !patternsLoading)}
          title="Signature moves & vibration patterns"
          aria-haspopup="menu"
          aria-label="Open signature moves menu"
          className={cn(
            "inline-flex h-9 max-w-[10.5rem] items-center gap-1 rounded-lg border border-fuchsia-500/25 bg-gradient-to-r from-fuchsia-950/50 via-black/50 to-violet-950/40 px-2 text-[10px] font-semibold uppercase tracking-wide text-fuchsia-100/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-fuchsia-400/40 hover:from-fuchsia-900/55 hover:to-violet-900/45 disabled:pointer-events-none disabled:opacity-40",
            className,
          )}
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-200/90" aria-hidden />
          <span className="truncate">Moves</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[min(18rem,calc(100vw-2rem))] border-fuchsia-500/20 bg-[hsl(285_25%_8%)]/98 text-foreground backdrop-blur-xl"
      >
        <DropdownMenuLabel className="font-gothic text-sm font-normal tracking-tight text-white">
          {companionName}
          <span className="mt-0.5 block text-[10px] font-normal uppercase tracking-[0.18em] text-fuchsia-200/70">
            Signature & patterns
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        {patternsLoading ? (
          <div className="px-2 py-2 text-xs text-muted-foreground">Loading patterns…</div>
        ) : (
          patterns.map((row) => (
            <DropdownMenuItem
              key={row.id}
              onSelect={(e) => {
                e.preventDefault();
                trigger(row);
              }}
              className={cn(
                "cursor-pointer gap-2 text-sm focus:bg-fuchsia-500/15 focus:text-fuchsia-50",
                activePatternId === row.id && "bg-fuchsia-500/10",
              )}
            >
              <Waves className="h-3.5 w-3.5 shrink-0 text-cyan-300/80" aria-hidden />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{row.display_name}</span>
                {row.is_abyssal_signature ? (
                  <span className="text-[10px] uppercase tracking-wider text-amber-200/80">Signature</span>
                ) : null}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
