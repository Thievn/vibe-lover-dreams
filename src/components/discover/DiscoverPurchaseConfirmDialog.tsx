import { AnimatePresence, motion } from "framer-motion";
import { Crown, Gem, Loader2 } from "lucide-react";
import type { CompanionRarity } from "@/lib/companionRarity";
import { discoverCardPriceFc } from "@/lib/forgeEconomy";

const NEON_PINK = "#FF2D7B";

export function tierGlowForDiscoverCard(rarity: CompanionRarity): { border: string; glow: string; accent: string } {
  switch (rarity) {
    case "abyssal":
      return { border: "rgba(168,85,247,0.7)", glow: "0 0 88px rgba(168,85,247,0.45)", accent: "#a855f7" };
    case "mythic":
      return { border: "rgba(244,114,182,0.7)", glow: "0 0 78px rgba(244,114,182,0.4)", accent: "#f472b6" };
    case "legendary":
      return { border: "rgba(251,191,36,0.65)", glow: "0 0 68px rgba(251,191,36,0.36)", accent: "#fbbf24" };
    case "epic":
      return { border: "rgba(34,211,238,0.6)", glow: "0 0 56px rgba(34,211,238,0.3)", accent: "#22d3ee" };
    case "rare":
      return { border: "rgba(125,211,252,0.5)", glow: "0 0 44px rgba(125,211,252,0.22)", accent: "#7dd3fc" };
    default:
      return { border: "rgba(148,163,184,0.45)", glow: "0 0 32px rgba(148,163,184,0.16)", accent: "#94a3b8" };
  }
}

type Props = {
  open: boolean;
  name: string;
  tagline: string;
  rarity: CompanionRarity;
  fcBalance: number | null;
  purchasing: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** When set (e.g. first Common unlock), overrides list price in the modal. */
  priceOverrideFc?: number | null;
};

/**
 * Shared confirm modal for Discover card purchases (grid + profile preview).
 */
export function DiscoverPurchaseConfirmDialog({
  open,
  name,
  tagline,
  rarity,
  fcBalance,
  purchasing,
  onClose,
  onConfirm,
  priceOverrideFc,
}: Props) {
  const glow = tierGlowForDiscoverCard(rarity);
  const priceFc = typeof priceOverrideFc === "number" ? priceOverrideFc : discoverCardPriceFc(rarity);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
        >
          <button
            type="button"
            aria-label="Close purchase confirmation"
            onClick={() => (purchasing ? null : onClose())}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 270, damping: 32 }}
            className="relative w-full max-w-md overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-black/90 via-[hsl(300_35%_10%)] to-black/95 p-5"
            style={{
              border: `1px solid ${glow.border}`,
              boxShadow: `0 0 0 1px ${glow.border}22, ${glow.glow}, 0 16px 60px rgba(0,0,0,0.45)`,
            }}
          >
            <div
              className="pointer-events-none absolute -top-16 -right-12 h-40 w-40 rounded-full blur-[80px]"
              style={{ backgroundColor: `${glow.accent}55` }}
            />
            <div className="relative space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Confirm purchase</p>
                  <h3 className="mt-1 font-gothic text-2xl text-white leading-tight line-clamp-2">{name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{tagline}</p>
                </div>
                <motion.div
                  animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
                  transition={{ duration: 3.1, repeat: Infinity, ease: "easeInOut" }}
                  className="shrink-0 rounded-xl p-2"
                  style={{ border: `1px solid ${glow.border}`, background: `${glow.accent}22` }}
                >
                  <Crown className="h-5 w-5" style={{ color: glow.accent }} />
                </motion.div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                <p className="text-[11px] text-muted-foreground">
                  This will unlock this companion into your vault instantly.
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Price</span>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-2.5 py-1 font-gothic text-lg text-primary"
                    style={{ borderColor: `${NEON_PINK}55` }}
                  >
                    <Gem className="h-4 w-4" />
                    {priceFc <= 0 ? "FREE" : `${priceFc} FC`}
                  </span>
                </div>
                {fcBalance !== null ? (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Wallet balance: <span className="font-semibold text-foreground">{fcBalance} FC</span>
                  </p>
                ) : null}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={purchasing}
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-border/70 bg-black/40 px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={purchasing}
                  onClick={onConfirm}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-primary/45 bg-gradient-to-r from-primary/85 to-fuchsia-700/90 px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_0_28px_rgba(255,45,123,0.28)] disabled:opacity-50"
                >
                  {purchasing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gem className="h-4 w-4" />}
                  Confirm buy
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
