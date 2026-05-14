import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { DbCompanion } from "@/hooks/useCompanions";
import { galleryStaticPortraitUrl } from "@/lib/companionMedia";
import { invokeNexusBreedingDialogue, type NexusBreedingScriptLineDto } from "@/lib/invokeNexusBreedingDialogue";
import { cn } from "@/lib/utils";

export type NexusBreedingChatPacing = "merge" | "ritual";

/** `nexus_merge` — glass + cyan/fuchsia accents for the full-screen merge weave (distinct from breeding ritual). */
export type NexusBreedingChatSurface = "standard" | "nexus_merge";

type RevealedLine = NexusBreedingScriptLineDto & { id: string };

export function NexusBreedingDirtyChat({
  parentA,
  parentB,
  active,
  className,
  pacing = "merge",
  surface = "standard",
  /** Total seconds the UI expects the ritual to run — drives stagger so lines last through the animation. */
  estimatedDurationSec = 160,
  /** Optional override for Grok line count (40–170 server clamp). */
  targetLineCount: targetLineCountProp,
}: {
  parentA: DbCompanion;
  parentB: DbCompanion;
  active: boolean;
  className?: string;
  pacing?: NexusBreedingChatPacing;
  surface?: NexusBreedingChatSurface;
  estimatedDurationSec?: number;
  targetLineCount?: number;
}) {
  const [fetchState, setFetchState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [shown, setShown] = useState<RevealedLine[]>([]);
  const scriptRef = useRef<NexusBreedingScriptLineDto[]>([]);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const aUrl = galleryStaticPortraitUrl(parentA, parentA.id);
  const bUrl = galleryStaticPortraitUrl(parentB, parentB.id);
  const aName = parentA.name.split(/\s+/)[0] ?? "I";
  const bName = parentB.name.split(/\s+/)[0] ?? "II";
  const isRitual = pacing === "ritual";
  const isMergeWeave = !isRitual && surface === "nexus_merge";

  const resolvedTargetCount = useMemo(() => {
    if (typeof targetLineCountProp === "number" && Number.isFinite(targetLineCountProp)) {
      return Math.round(targetLineCountProp);
    }
    return Math.min(165, Math.max(48, Math.ceil(estimatedDurationSec / 1.42)));
  }, [targetLineCountProp, estimatedDurationSec]);

  useEffect(() => {
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    if (!active) {
      setFetchState("idle");
      setErrMsg(null);
      setShown([]);
      scriptRef.current = [];
      return;
    }

    let cancelled = false;
    setFetchState("loading");
    setErrMsg(null);
    setShown([]);
    scriptRef.current = [];

    void (async () => {
      const res = await invokeNexusBreedingDialogue({
        parentAId: parentA.id,
        parentBId: parentB.id,
        targetLineCount: resolvedTargetCount,
      });
      if (cancelled) return;
      if ("error" in res) {
        setFetchState("error");
        setErrMsg(res.error);
        return;
      }
      scriptRef.current = res.lines;
      setFetchState("ready");

      const script = res.lines;
      let i = 0;

      const runStep = () => {
        if (cancelled) return;
        if (i >= script.length) return;
        const row = script[i]!;
        const id = `ln-${i}-${row.kind}-${Date.now().toString(36)}`;
        i += 1;
        setShown((prev) => [...prev, { ...row, id }].slice(-220));
        const baseMs =
          script.length > 0 ? (estimatedDurationSec * 1000) / script.length : 2400;
        const delay = Math.max(900, Math.min(5600, baseMs * (0.78 + Math.random() * 0.42)));
        revealTimerRef.current = window.setTimeout(runStep, delay);
      };

      revealTimerRef.current = window.setTimeout(runStep, 420);
    })();

    return () => {
      cancelled = true;
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
        revealTimerRef.current = null;
      }
    };
  }, [active, parentA.id, parentB.id, resolvedTargetCount, estimatedDurationSec]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [shown.length]);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden border backdrop-blur-xl",
        isRitual && "rounded-2xl border-fuchsia-500/15 bg-black/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        !isRitual && !isMergeWeave && "rounded-2xl border-white/[0.1] bg-black/45",
        isMergeWeave &&
          "rounded-xl border-cyan-500/12 border-t-fuchsia-500/15 bg-[#050308]/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_12px_48px_rgba(0,0,0,0.35)]",
        className,
      )}
    >
      <p
        className={cn(
          "shrink-0 border-b px-3 py-2.5 sm:px-4",
          isRitual && "border-white/[0.06] text-[9px] uppercase tracking-[0.26em] text-fuchsia-200/40",
          !isRitual && !isMergeWeave && "border-white/[0.07] text-[10px] uppercase tracking-[0.3em] text-muted-foreground",
          isMergeWeave &&
            "border-white/[0.06] text-[9px] uppercase tracking-[0.28em] text-cyan-200/40 sm:text-[10px]",
        )}
      >
        {isRitual
          ? "Live weave · Grok-scripted · vanishes when the rite ends"
          : isMergeWeave
            ? "Twin-thread chatter · Grok · not saved to chat history"
            : "Private thread · Grok · vanishes when the merge ends"}
      </p>
      <div
        className={cn(
          "flex items-center gap-2 border-b px-3 py-2",
          isRitual && "border-white/[0.05] bg-black/35",
          !isRitual && !isMergeWeave && "border-white/[0.05] bg-black/30",
          isMergeWeave && "border-white/[0.05] bg-black/40",
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div
            className={cn(
              "relative h-9 w-9 shrink-0 overflow-hidden rounded-full sm:h-10 sm:w-10",
              isRitual && "ring-2 ring-fuchsia-500/40",
              !isRitual && !isMergeWeave && "ring-2 ring-primary/50",
              isMergeWeave && "ring-2 ring-cyan-400/40",
            )}
          >
            {aUrl ? (
              <img src={aUrl} alt="" className="h-full w-full object-cover object-top" />
            ) : (
              <div
                className="h-full w-full"
                style={{ background: `linear-gradient(135deg, ${parentA.gradient_from}, ${parentA.gradient_to})` }}
              />
            )}
          </div>
          <span
            className={cn(
              "truncate text-[11px] font-semibold",
              isRitual && "text-fuchsia-200/90",
              !isRitual && !isMergeWeave && "text-[#FF2D7B]",
              isMergeWeave && "text-cyan-100/90",
            )}
          >
            {aName}
          </span>
        </div>
        <span className="shrink-0 px-1 text-[10px] text-muted-foreground/70">&amp;</span>
        <div className="flex min-w-0 flex-1 flex-row-reverse items-center gap-2">
          <div
            className={cn(
              "relative h-9 w-9 shrink-0 overflow-hidden rounded-full sm:h-10 sm:w-10",
              isRitual && "ring-2 ring-cyan-400/35",
              !isRitual && !isMergeWeave && "ring-2 ring-accent/45",
              isMergeWeave && "ring-2 ring-fuchsia-500/45",
            )}
          >
            {bUrl ? (
              <img src={bUrl} alt="" className="h-full w-full object-cover object-top" />
            ) : (
              <div
                className="h-full w-full"
                style={{ background: `linear-gradient(135deg, ${parentB.gradient_from}, ${parentB.gradient_to})` }}
              />
            )}
          </div>
          <span
            className={cn(
              "truncate text-right text-[11px] font-semibold",
              isRitual && "text-cyan-200/85",
              !isRitual && !isMergeWeave && "text-accent",
              isMergeWeave && "text-fuchsia-200/85",
            )}
          >
            {bName}
          </span>
        </div>
      </div>

      <div className="min-h-[140px] flex-1 space-y-2.5 overflow-y-auto px-3 py-3 sm:space-y-3 sm:px-4">
        {fetchState === "loading" ? (
          <p className="text-center text-[12px] text-muted-foreground/80 animate-pulse">
            Spinning a private script between them…
          </p>
        ) : null}
        {fetchState === "error" && errMsg ? (
          <p className="text-center text-[12px] text-destructive/90">{errMsg}</p>
        ) : null}

        <AnimatePresence initial={false}>
          {shown.map((line) => {
            if (line.kind === "narration") {
              return (
                <motion.p
                  key={line.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mx-auto max-w-[95%] text-center text-[12px] leading-snug sm:text-[13px]"
                >
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-purple-300 to-fuchsia-500 font-medium italic tracking-wide drop-shadow-[0_0_12px_rgba(192,38,211,0.35)]">
                    {line.text}
                  </span>
                </motion.p>
              );
            }
            const sp = line.speaker;
            const alignLeft = sp === 0;
            return (
              <motion.div
                key={line.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: 28,
                }}
                className={cn("flex", alignLeft ? "justify-start" : "justify-end")}
              >
                <div
                  className={cn(
                    "max-w-[min(100%,18rem)] text-[13px] leading-snug shadow-lg sm:max-w-[85%] sm:text-[14px]",
                    isRitual &&
                      (alignLeft
                        ? "rounded-2xl rounded-tl-sm border border-white/[0.07] border-l-[3px] border-l-fuchsia-500/55 bg-[hsl(270_28%_8%/0.72)] px-3.5 py-2.5 text-foreground/95 backdrop-blur-md"
                        : "rounded-2xl rounded-tr-sm border border-fuchsia-500/25 bg-gradient-to-br from-[hsl(300_48%_16%)] to-[hsl(280_45%_10%)] px-3.5 py-2.5 text-primary-foreground/95 shadow-[0_0_24px_rgba(236,72,153,0.18)] backdrop-blur-md"),
                    isMergeWeave &&
                      (alignLeft
                        ? "rounded-xl rounded-tl-md border border-white/[0.08] border-l-2 border-l-cyan-400/55 bg-black/55 px-3.5 py-2.5 text-foreground/95 backdrop-blur-md"
                        : "rounded-xl rounded-tr-md border border-fuchsia-500/20 bg-gradient-to-bl from-violet-950/80 to-fuchsia-950/50 px-3.5 py-2.5 text-foreground/95 shadow-[0_0_20px_rgba(139,92,246,0.12)] backdrop-blur-md"),
                    !isRitual &&
                      !isMergeWeave &&
                      (alignLeft
                        ? "rounded-2xl rounded-tl-sm border border-primary/25 bg-primary/15 px-3 py-2 text-foreground/95"
                        : "rounded-2xl rounded-tr-sm border border-accent/25 bg-accent/12 px-3 py-2 text-foreground/95"),
                  )}
                >
                  {line.text}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={endRef} />
      </div>
    </div>
  );
}
