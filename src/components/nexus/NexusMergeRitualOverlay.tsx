import { motion } from "framer-motion";
import type { DbCompanion } from "@/hooks/useCompanions";
import { NexusRealmBackdrop } from "@/components/nexus/NexusRealmBackdrop";
import { NexusBreedingDirtyChat } from "@/components/nexus/NexusBreedingDirtyChat";
import { NexusMergeWeaveHero } from "@/components/nexus/NexusMergeWeaveHero";
import { cn } from "@/lib/utils";

export function NexusMergeRitualOverlay({
  parentA,
  parentB,
  mergeSubphase,
  ascendantSealed,
  onDialogueRevealMilestone,
}: {
  parentA: DbCompanion;
  parentB: DbCompanion;
  mergeSubphase: "fusion" | "video";
  /** True once nexus-merge API finished — ascendant exists but reveal may wait on dialogue. */
  ascendantSealed?: boolean;
  onDialogueRevealMilestone?: () => void;
}) {
  const phaseTitle = mergeSubphase === "fusion" ? "Twinned veil" : "Living circuit";
  const phaseSubtitle = ascendantSealed
    ? "The ascendant is sealed in the vault — listen to the threads before they step into the light."
    : mergeSubphase === "fusion"
      ? "The forge drinks two silhouettes down to one spark — nothing surfaces until the weave is sealed."
      : "Still heat wakes into motion — her loop stitches itself to skin under violet glass.";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex flex-col items-center justify-center overflow-y-auto overflow-x-hidden p-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-6 sm:pb-10"
      role="alertdialog"
      aria-live="polite"
      aria-busy="true"
      aria-label="Nexus forge merge in progress"
    >
      <div className="pointer-events-none absolute inset-0 bg-[#030208]/92 backdrop-blur-sm" />
      <NexusRealmBackdrop className="pointer-events-none absolute inset-0 opacity-[0.97]" />

      <div className="relative z-[2] mx-auto w-full max-w-6xl space-y-4 sm:space-y-5">
        <div className="rounded-2xl border border-cyan-500/10 border-b-fuchsia-500/15 bg-[#050308]/72 px-4 py-3 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:px-6 sm:py-4">
          <div className="space-y-1.5 text-center">
            <p className="text-[9px] font-medium uppercase tracking-[0.32em] text-cyan-200/45 sm:text-[10px]">Nexus forge · twin hunger</p>
            <h3 className="font-gothic text-xl text-white/95 sm:text-2xl md:text-3xl">
              <span className="bg-gradient-to-r from-cyan-200/95 via-white to-fuchsia-200/90 bg-clip-text text-transparent">
                {phaseTitle}
              </span>
            </h3>
            <p className="mx-auto max-w-2xl text-xs leading-relaxed text-muted-foreground/90 sm:text-sm">{phaseSubtitle}</p>
          </div>
        </div>

        <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,480px)] lg:gap-8">
          <div className="flex min-h-0 flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-black/30 px-2 py-5 backdrop-blur-md sm:px-4 sm:py-6">
            <NexusMergeWeaveHero parentA={parentA} parentB={parentB} mergeSubphase={mergeSubphase} />
          </div>

          <div className="flex min-h-0 w-full max-w-[480px] justify-self-center lg:max-w-none lg:w-full lg:justify-self-end">
            <NexusBreedingDirtyChat
              parentA={parentA}
              parentB={parentB}
              active
              surface="nexus_merge"
              estimatedDurationSec={300}
              revealMilestoneLines={2}
              onRevealMilestone={onDialogueRevealMilestone}
              className="max-h-[min(52vh,400px)] w-full lg:max-h-[min(56vh,440px)]"
            />
          </div>
        </div>

        <p
          className={cn(
            "mx-auto max-w-2xl px-2 text-center text-[10px] font-normal normal-case leading-relaxed tracking-normal text-muted-foreground/80 sm:text-[11px]",
          )}
        >
          This weave runs on the server — lock your phone, lose signal, or step away. When it finishes, your ascendant
          appears in your vault; if the forge cannot close the weave, your Forge Coins refund automatically the next time
          you open Nexus or your vault refreshes.
        </p>
      </div>
    </motion.div>
  );
}
