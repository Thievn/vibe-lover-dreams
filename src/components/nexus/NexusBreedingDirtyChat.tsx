import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { DbCompanion } from "@/hooks/useCompanions";
import { galleryStaticPortraitUrl } from "@/lib/companionMedia";
import {
  getNexusBreedingPoolWeights,
  nextNexusBreedingUtterance,
} from "@/lib/nexusBreedingDirtyTalk";
import { cn } from "@/lib/utils";

const NEON = "#FF2D7B";
const EMIT_MS = 4800;
const MAX_LINES = 14;

export function NexusBreedingDirtyChat({
  parentA,
  parentB,
  active,
  className,
}: {
  parentA: DbCompanion;
  parentB: DbCompanion;
  active: boolean;
  className?: string;
}) {
  const weights = useMemo(() => getNexusBreedingPoolWeights(parentA, parentB), [parentA, parentB]);
  const recent = useRef(new Set<string>());
  const [lines, setLines] = useState<{ id: string; speaker: 0 | 1; text: string }[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const aUrl = galleryStaticPortraitUrl(parentA, parentA.id);
  const bUrl = galleryStaticPortraitUrl(parentB, parentB.id);
  const aName = parentA.name.split(/\s+/)[0] ?? "I";
  const bName = parentB.name.split(/\s+/)[0] ?? "II";

  useEffect(() => {
    if (!active) {
      setLines([]);
      recent.current.clear();
      return;
    }
    const pushLine = () => {
      setLines((prev) => {
        const { speaker, text } = nextNexusBreedingUtterance(weights, recent.current);
        const row = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, speaker, text };
        const next = [...prev, row];
        if (next.length > MAX_LINES) return next.slice(-MAX_LINES);
        return next;
      });
    };
    const t0 = window.setTimeout(pushLine, 350);
    const id = window.setInterval(pushLine, EMIT_MS);
    return () => {
      clearTimeout(t0);
      clearInterval(id);
    };
  }, [active, weights]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines.length]);

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-white/[0.1] bg-black/45 backdrop-blur-xl overflow-hidden min-h-0",
        className,
      )}
    >
      <p className="shrink-0 text-[10px] uppercase tracking-[0.3em] text-muted-foreground px-4 py-2.5 border-b border-white/[0.07]">
        Private thread · vanishes when the merge ends
      </p>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.05] bg-black/30">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden ring-2 ring-primary/50">
            {aUrl ? (
              <img src={aUrl} alt="" className="h-full w-full object-cover object-top" />
            ) : (
              <div
                className="h-full w-full"
                style={{ background: `linear-gradient(135deg, ${parentA.gradient_from}, ${parentA.gradient_to})` }}
              />
            )}
          </div>
          <span className="text-[11px] font-semibold text-primary truncate" style={{ color: NEON }}>
            {aName}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0 px-1">&amp;</span>
        <div className="flex items-center gap-2 min-w-0 flex-1 flex-row-reverse">
          <div className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden ring-2 ring-accent/45">
            {bUrl ? (
              <img src={bUrl} alt="" className="h-full w-full object-cover object-top" />
            ) : (
              <div
                className="h-full w-full"
                style={{ background: `linear-gradient(135deg, ${parentB.gradient_from}, ${parentB.gradient_to})` }}
              />
            )}
          </div>
          <span className="text-[11px] font-semibold text-accent truncate text-right">{bName}</span>
        </div>
      </div>

      <div className="flex-1 min-h-[140px] max-h-[220px] overflow-y-auto px-3 py-3 space-y-2.5">
        <AnimatePresence initial={false}>
          {lines.map((line) => (
            <motion.div
              key={line.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                "flex",
                line.speaker === 0 ? "justify-start" : "justify-end",
              )}
            >
              <div
                className={cn(
                  "max-w-[92%] rounded-2xl px-3 py-2 text-[13px] leading-snug shadow-lg",
                  line.speaker === 0
                    ? "bg-primary/15 text-foreground/95 border border-primary/25 rounded-tl-sm"
                    : "bg-accent/12 text-foreground/95 border border-accent/25 rounded-tr-sm",
                )}
              >
                {line.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={endRef} />
      </div>
    </div>
  );
}
