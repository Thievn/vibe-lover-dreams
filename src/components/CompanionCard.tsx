import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { UserRound } from "lucide-react";
import type { Companion } from "@/data/companions";
import { getStaticRarityForCatalog } from "@/lib/companionRarity";
import { TierHaloPortraitFrame } from "@/components/rarity/TierHaloPortraitFrame";

interface CompanionCardProps {
  companion: Companion;
  index: number;
  imageOverride?: string;
  /** Shown on community-forged public cards when creator opted in */
  galleryCredit?: string | null;
}

export default function CompanionCard({ companion, index, imageOverride, galleryCredit }: CompanionCardProps) {
  const location = useLocation();
  const img = imageOverride;
  const isCommunity = companion.id.startsWith("cc-");
  const to = `/companions/${companion.id}`;
  const rarity = companion.rarity ?? getStaticRarityForCatalog(companion.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: Math.min(index * 0.04, 0.4), type: "spring", stiffness: 380, damping: 26 }}
    >
      <Link
        to={to}
        state={{
          from: `${location.pathname}${location.search}`,
          ...(isCommunity ? { fromGallery: true as const } : {}),
        }}
        className="block rounded-2xl border border-transparent bg-card/60 backdrop-blur-sm overflow-hidden transition-colors group h-full touch-manipulation"
      >
        <motion.div whileHover={{ y: -3, transition: { type: "spring", stiffness: 400, damping: 18 } }} whileTap={{ scale: 0.98 }} className="h-full">
        <TierHaloPortraitFrame
          variant="card"
          frameStyle="clean"
          rarity={rarity}
          gradientFrom={companion.gradientFrom}
          gradientTo={companion.gradientTo}
          overlayUrl={companion.rarityBorderOverlayUrl}
        >
          <div
            className="absolute inset-0 z-0"
            style={{
              background: img ? undefined : `linear-gradient(135deg, ${companion.gradientFrom}, ${companion.gradientTo})`,
            }}
          />
          {img ? (
            <img
              src={img}
              alt={companion.name}
              className="absolute inset-0 z-[1] w-full h-full object-cover object-top"
              loading="lazy"
            />
          ) : null}
          <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />
          {isCommunity && (
            <span className="absolute top-2 left-2 z-[3] text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/60 border border-[#FF2D7B]/40 text-[#FF2D7B]">
              Forged
            </span>
          )}
          <div className="absolute bottom-0 left-0 right-0 z-[3] p-3 text-left">
            <h3 className="font-gothic text-sm font-bold text-white leading-tight line-clamp-2 drop-shadow-md">{companion.name}</h3>
            <p className="text-[11px] text-white/80 line-clamp-2 mt-0.5">{companion.tagline}</p>
            {galleryCredit ? (
              <p className="text-[10px] text-[hsl(170_100%_65%)] mt-1.5 flex items-center gap-1">
                <UserRound className="h-3 w-3 shrink-0" />
                <span className="truncate">by {galleryCredit}</span>
              </p>
            ) : null}
          </div>
        </TierHaloPortraitFrame>
        </motion.div>
      </Link>
    </motion.div>
  );
}
