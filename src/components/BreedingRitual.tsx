import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Baby, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { sendCommand, LovenseCommand } from "@/lib/lovense";
import { saveBreedingRitualResult, BreedingOffspringData } from "@/lib/breedingRitualPersistence";
import { formatSupabaseError } from "@/lib/supabaseError";

interface BreedingRitualProps {
  companionId: string;
  companionName: string;
  onComplete: (offspringData: BreedingOffspringData) => void;
  onClose: () => void;
  userId?: string;
  hasConnectedToys?: boolean;
}

const BREEDING_STAGES = [
  {
    id: 1,
    title: "Courtship",
    description: "Building intimacy and connection",
    duration: 30000,
    icon: Heart,
    color: "text-pink-400",
    toyCommand: { command: "vibrate" as const, intensity: 5, duration: 30000, pattern: "tease" },
  },
  {
    id: 2,
    title: "Union",
    description: "Deepening the bond through pleasure",
    duration: 45000,
    icon: Sparkles,
    color: "text-purple-400",
    toyCommand: { command: "vibrate" as const, intensity: 10, duration: 45000, pattern: "pulse" },
  },
  {
    id: 3,
    title: "Creation",
    description: "Bringing new life into existence",
    duration: 30000,
    icon: Baby,
    color: "text-blue-400",
    toyCommand: { command: "vibrate" as const, intensity: 15, duration: 30000, pattern: "wave" },
  },
];

export const BreedingRitual = ({
  companionId,
  companionName,
  onComplete,
  onClose,
  userId,
  hasConnectedToys,
}: BreedingRitualProps) => {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const completeRitual = useCallback(async () => {
    setIsActive(false);

    const offspringTypes = [
      { name: "Hybrid", description: "A perfect blend of both parents", rarity: "common" },
      { name: "Dominant", description: "Strong traits from the dominant parent", rarity: "uncommon" },
      { name: "Recessive", description: "Hidden traits emerge", rarity: "rare" },
      { name: "Mutant", description: "Something completely new", rarity: "legendary" },
    ];

    const selectedType = offspringTypes[Math.floor(Math.random() * offspringTypes.length)];

    const offspringData: BreedingOffspringData = {
      id: `offspring-${Date.now()}`,
      name: `${companionName}'s ${selectedType.name} Offspring`,
      type: selectedType.name,
      description: selectedType.description,
      rarity: selectedType.rarity,
      traits: ["Affectionate", "Playful", "Curious", "Seductive"][Math.floor(Math.random() * 4)],
      createdAt: new Date(),
    };

    try {
      await saveBreedingRitualResult({ companionId, offspringData });
      toast.success("🎉 Breeding ritual complete! A new offspring has been created!");
      onComplete(offspringData);
    } catch (error) {
      console.error("Failed to save breeding result:", error);
      toast.error(`Could not save breeding result: ${formatSupabaseError(error)}`);
    }
  }, [companionId, companionName, onComplete]);

  useEffect(() => {
    if (!isActive || currentStage >= BREEDING_STAGES.length) return;

    const stage = BREEDING_STAGES[currentStage];
    const startTime = Date.now();

    // Send toy command for this stage if toys are connected
    if (userId && hasConnectedToys && stage.toyCommand) {
      sendCommand(userId, stage.toyCommand as LovenseCommand).catch(console.error);
    }

    const updateProgress = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const newProgress = Math.min((elapsed / stage.duration) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        if (currentStage < BREEDING_STAGES.length - 1) {
          setTimeout(() => {
            setCurrentStage((prev) => prev + 1);
            setProgress(0);
          }, 800);
        } else {
          setTimeout(completeRitual, 800);
        }
      } else {
        requestAnimationFrame(updateProgress);
      }
    };

    updateProgress();
  }, [completeRitual, currentStage, isActive, userId, hasConnectedToys]);

  const currentStageData = BREEDING_STAGES[currentStage];
  const IconComponent = currentStageData?.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 50 }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-w-md w-full rounded-3xl border border-primary/50 bg-zinc-950 p-8 text-center"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mb-8">
            {IconComponent && (
              <IconComponent className={`mx-auto h-16 w-16 mb-4 ${currentStageData.color}`} />
            )}
            <h2 className="text-2xl font-bold mb-2">Breeding Ritual</h2>
            <p className="text-zinc-400">with {companionName}</p>
          </div>

          {currentStageData && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-primary mb-2">
                Stage {currentStageData.id}: {currentStageData.title}
              </h3>
              <p className="text-zinc-400 text-sm">{currentStageData.description}</p>
            </div>
          )}

          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between text-xs text-zinc-500 mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Stage dots */}
          <div className="flex justify-center gap-3 mb-8">
            {BREEDING_STAGES.map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-all ${
                  i < currentStage ? "bg-primary" : i === currentStage ? "bg-primary animate-pulse scale-125" : "bg-zinc-700"
                }`}
              />
            ))}
          </div>

          <p className="text-sm text-zinc-400">
            {currentStage < BREEDING_STAGES.length - 1
              ? "The ritual is unfolding..."
              : "Final stage — creation begins..."}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};