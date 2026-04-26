import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { VibeDisplayTrait } from "@/lib/vibeTraitCatalog";
import { vibeTraitIcon } from "@/lib/vibeTraitIcons";

type Props = {
  traits: VibeDisplayTrait[];
  className?: string;
  size?: "sm" | "md";
  max?: number;
};

/**
 * Small icon row under a portrait: one themed word on hover, full line in tooltip.
 */
export function CompanionVibeTraitStrip({ traits, className, size = "sm", max = 8 }: Props) {
  const list = traits.slice(0, max);
  if (list.length === 0) return null;
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const pad = size === "sm" ? "h-7 w-7" : "h-8 w-8";

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("flex flex-wrap items-center justify-center gap-1", className)}>
        {list.map((t) => {
          const Icon = vibeTraitIcon(t.id);
          return (
            <Tooltip key={t.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center justify-center rounded-lg border border-primary/22 bg-black/50 text-primary/90",
                    "hover:border-primary/35 hover:bg-primary/10 hover:text-primary transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    pad,
                  )}
                  aria-label={`${t.label}. ${t.shortDescription}`}
                >
                  <Icon className={cn(iconSize, "shrink-0")} />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-[220px] border-primary/20 bg-zinc-950/95 text-left text-xs"
              >
                <p className="font-semibold text-primary">{t.word}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{t.shortDescription}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
