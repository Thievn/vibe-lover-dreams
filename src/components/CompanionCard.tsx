import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { Companion } from "@/data/companions";

interface CompanionCardProps {
  companion: Companion;
  index: number;
}

const CompanionCard = ({ companion, index }: CompanionCardProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      onClick={() => navigate(`/companion/${companion.id}`)}
      className="group cursor-pointer rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-all duration-300 hover:glow-pink"
    >
      {/* Avatar gradient */}
      <div
        className="relative h-48 flex items-center justify-center overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${companion.gradientFrom}, ${companion.gradientTo})`,
        }}
      >
        <div className="absolute inset-0 bg-background/20" />
        <span className="relative text-5xl font-gothic font-bold text-white/90 drop-shadow-lg">
          {companion.name.charAt(0)}
        </span>
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-background/70 text-[10px] text-muted-foreground backdrop-blur-sm">
          {companion.role}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-gothic text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
          {companion.name}
        </h3>
        <p className="text-xs text-primary/80 italic mb-2 truncate">{companion.tagline}</p>
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{companion.personality.slice(0, 100)}...</p>
        <div className="flex flex-wrap gap-1">
          {companion.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full text-[10px] bg-secondary/50 text-secondary-foreground border border-border"
            >
              {tag}
            </span>
          ))}
          {companion.tags.length > 3 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] text-muted-foreground">
              +{companion.tags.length - 3}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default CompanionCard;
