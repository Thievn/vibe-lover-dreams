import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Baby, Heart, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendCommand, type LovenseCommand } from "@/lib/lovense";
import type { DbCompanion } from "@/hooks/useCompanions";
import { NexusRealmBackdrop } from "@/components/nexus/NexusRealmBackdrop";
import { BreedingRitualCovenantVisual } from "@/components/nexus/BreedingRitualCovenantVisual";
import { NexusBreedingDirtyChat } from "@/components/nexus/NexusBreedingDirtyChat";
import { cn } from "@/lib/utils";

interface BreedingRitualProps {
  parentA: DbCompanion;
  parentB: DbCompanion;
  onComplete: (offspringData: unknown) => void;
  onClose: () => void;
  userId?: string;
  hasConnectedToys?: boolean;
}

const BREEDING_STAGES = [
  {
    id: 1,
    title: "Courtship",
    description: "Threads of want tighten between you both",
    duration: 30000,
    icon: Heart,
    toyCommand: { command: "vibrate" as const, intensity: 5, duration: 30000, pattern: "tease" },
  },
  {
    id: 2,
    title: "Union",
    description: "The covenant deepens — pulse through the veil",
    duration: 45000,
    icon: Sparkles,
    toyCommand: { command: "vibrate" as const, intensity: 10, duration: 45000, pattern: "pulse" },
  },
  {
    id: 3,
    title: "Creation",
    description: "Something new strains to be born",
    duration: 30000,
    icon: Baby,
    toyCommand: { command: "vibrate" as const, intensity: 15, duration: 30000, pattern: "wave" },
  },
];

export const BreedingRitual = ({
  parentA,
  parentB,
  onComplete,
  onClose,
  userId,
  hasConnectedToys,
}: BreedingRitualProps) => {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const rafRef = useRef<number | null>(null);
  const stageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef = useRef(false);

  const completeRitual = useCallback(async () => {
    setIsActive(false);
    doneRef.current = true;

    const offspringTypes = [
      { name: "Hybrid", description: "A perfect blend of both parents", rarity: "common" },
      { name: "Dominant", description: "Strong traits from the dominant parent", rarity: "uncommon" },
      { name: "Recessive", description: "Hidden traits emerge", rarity: "rare" },
      { name: "Mutant", description: "Something completely new", rarity: "legendary" },
    ];

    const selectedType = offspringTypes[Math.floor(Math.random() * offspringTypes.length)]!;
    const aStem = parentA.name.trim().split(/\s+/)[0] ?? parentA.name;
    const bStem = parentB.name.trim().split(/\s+/)[0] ?? parentB.name;

    const offspringData = {
      id: `offspring-${Date.now()}`,
      name: `${aStem} × ${bStem} — ${selectedType.name}`,
      type: selectedType.name,
      description: selectedType.description,
      rarity: selectedType.rarity,
      traits: ["Affectionate", "Playful", "Curious", "Seductive"][Math.floor(Math.random() * 4)],
      createdAt: new Date(),
    };

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("companion_relationships").upsert({
          user_id: user.id,
          companion_id: parentA.id,
          breeding_progress: 100,
          affection_level: 75,
          last_interaction: new Date(),
        });

        await supabase.from("companion_gifts").insert({
          user_id: user.id,
          companion_id: parentA.id,
          gift_type: "offspring",
          gift_data: offspringData,
        });
      }
    } catch (error) {
      console.error("Failed to save breeding result:", error);
    }

    toast.success("Breeding covenant sealed — a new thread awakens in the forge.");
    onComplete(offspringData);
  }, [onComplete, parentA.id, parentA.name, parentB.name]);

  useEffect(() => {
    if (!isActive || currentStage >= BREEDING_STAGES.length) return;

    const stage = BREEDING_STAGES[currentStage]!;
    const startTime = Date.now();
    doneRef.current = false;

    if (userId && hasConnectedToys && stage.toyCommand) {
      void sendCommand(userId, stage.toyCommand as LovenseCommand).catch(console.error);
    }

    const tick = () => {
      if (doneRef.current) return;
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / stage.duration) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        doneRef.current = true;
        if (stageTimeoutRef.current) clearTimeout(stageTimeoutRef.current);
        stageTimeoutRef.current = window.setTimeout(() => {
          stageTimeoutRef.current = null;
          setCurrentStage((s) => {
            if (s < BREEDING_STAGES.length - 1) {
              setProgress(0);
              doneRef.current = false;
              return s + 1;
            }
            void completeRitual();
            return s;
          });
        }, 800);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      doneRef.current = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (stageTimeoutRef.current != null) {
        clearTimeout(stageTimeoutRef.current);
        stageTimeoutRef.current = null;
      }
    };
  }, [currentStage, isActive, userId, hasConnectedToys, completeRitual]);

  const currentStageData = BREEDING_STAGES[currentStage];
  const IconComponent = currentStageData?.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col bg-[#030208]/95 backdrop-blur-xl"
        onClick={onClose}
      >
        <NexusRealmBackdrop className="pointer-events-none absolute inset-0" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: "spring", stiffness: 280, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-[1] mx-auto flex h-[100dvh] w-full max-w-lg flex-col px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.35rem,env(safe-area-inset-top))] sm:max-w-xl sm:px-4"
        >
          <header className="mb-2 flex shrink-0 items-center justify-between gap-2 border-b border-fuchsia-500/10 pb-2">
            <div className="min-w-0 text-left">
              <h2 className="font-gothic text-lg font-semibold tracking-tight text-white/95 sm:text-xl">Nexus covenant</h2>
              <p className="truncate text-[10px] uppercase tracking-[0.28em] text-fuchsia-200/45">Breeding ritual · private</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-muted-foreground transition-colors hover:border-fuchsia-500/30 hover:bg-white/[0.05] hover:text-foreground"
              aria-label="Close ritual"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch]">
            <BreedingRitualCovenantVisual parentA={parentA} parentB={parentB} className="py-2" />

            {currentStageData && IconComponent ? (
              <div className="mb-3 rounded-xl border border-white/[0.06] bg-black/35 px-3 py-2 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <IconComponent className="h-4 w-4 shrink-0 text-fuchsia-400" aria-hidden />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-fuchsia-200/55">
                    Stage {currentStageData.id} · {currentStageData.title}
                  </p>
                </div>
                <p className="mt-1 text-xs leading-snug text-muted-foreground/90">{currentStageData.description}</p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-fuchsia-600 via-purple-500 to-cyan-400"
                    style={{ width: `${progress}%` }}
                    transition={{ type: "tween", ease: "linear", duration: 0.08 }}
                  />
                </div>
              </div>
            ) : null}

            <div className="flex justify-center gap-2 pb-2">
              {BREEDING_STAGES.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full transition-all",
                    i < currentStage
                      ? "bg-fuchsia-500 shadow-[0_0_10px_rgba(236,72,153,0.6)]"
                      : i === currentStage
                        ? "scale-125 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                        : "bg-white/15",
                  )}
                />
              ))}
            </div>

            <NexusBreedingDirtyChat
              parentA={parentA}
              parentB={parentB}
              active={isActive}
              pacing="ritual"
              className="min-h-[200px] max-h-[min(42vh,380px)] border-fuchsia-500/12"
            />

            <p className="mt-2 pb-2 text-center text-[10px] text-muted-foreground/55">
              {currentStage < BREEDING_STAGES.length - 1
                ? "The weave holds — let the thread run."
                : "Final pulse — creation crests…"}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
