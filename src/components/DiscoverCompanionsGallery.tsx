import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, Loader2, Search, Sparkles, UserRound, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import type { Companion } from "@/data/companions";
import { useCompanions, dbToCompanion, type DbCompanion } from "@/hooks/useCompanions";
import { cn } from "@/lib/utils";
import type { CompanionRarity } from "@/lib/companionRarity";
import { COMPANION_RARITIES, normalizeCompanionRarity, rarityTierCaptionColor } from "@/lib/companionRarity";
import { galleryStaticPortraitUrl } from "@/lib/companionMedia";
import { TierHaloPortraitFrame } from "@/components/rarity/TierHaloPortraitFrame";
import { CompanionVibeTraitStrip } from "@/components/traits/CompanionVibeTraitStrip";
import { resolveDisplayTraitsForCompanion } from "@/lib/vibeDisplayTraits";
import { VAULT_COLLECTION_QUERY_KEY } from "@/hooks/useVaultCollection";
import { supabase } from "@/integrations/supabase/client";
import { discoverCardPriceFc } from "@/lib/forgeEconomy";
import { purchaseDiscoverCompanion } from "@/lib/forgeCoinsClient";

const NEON_PINK = "#FF2D7B";

export type CommunityGalleryRow = Companion & {
  rarity: CompanionRarity;
  vibe: string;
  imageUrl: string | null;
  galleryCredit: string | null;
  rarityBorderOverlayUrl: string | null;
};

function rowsFromDb(dbList: DbCompanion[]): CommunityGalleryRow[] {
  return dbList.map((db) => {
    const c = dbToCompanion(db);
    const imageUrl = galleryStaticPortraitUrl(db, db.id) ?? null;
    return {
      ...c,
      rarity: normalizeCompanionRarity(db.rarity),
      vibe: c.tags[0] ?? c.role,
      imageUrl,
      galleryCredit: db.gallery_credit_name ?? null,
      rarityBorderOverlayUrl: db.rarity_border_overlay_url ?? null,
    };
  });
}

export default function DiscoverCompanionsGallery() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: dbRows, isLoading } = useCompanions();
  const pool = useMemo(() => (dbRows?.length ? rowsFromDb(dbRows) : []), [dbRows]);

  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [fcBalance, setFcBalance] = useState<number | null>(null);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const refreshSessionWallet = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      setSessionUserId(null);
      setFcBalance(null);
      return;
    }
    setSessionUserId(session.user.id);
    const { data: profile } = await supabase
      .from("profiles")
      .select("tokens_balance")
      .eq("user_id", session.user.id)
      .maybeSingle();
    setFcBalance(typeof profile?.tokens_balance === "number" ? profile.tokens_balance : null);
  }, []);

  useEffect(() => {
    void refreshSessionWallet();
  }, [refreshSessionWallet]);

  const [search, setSearch] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [rarity, setRarity] = useState<CompanionRarity | null>(null);
  const [vibe, setVibe] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "name" | "rarity">("newest");
  const [visibleCount, setVisibleCount] = useState(24);

  const genders = useMemo(() => [...new Set(pool.map((p) => p.gender))].sort(), [pool]);
  const vibes = useMemo(() => {
    const set = new Set(pool.map((p) => p.vibe));
    return [...set].sort().slice(0, 20);
  }, [pool]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = pool.filter((c) => {
      const matchQ =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.tagline.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q)) ||
        (c.galleryCredit?.toLowerCase().includes(q) ?? false);
      const matchG = !gender || c.gender === gender;
      const matchR = !rarity || c.rarity === rarity;
      const matchV = !vibe || c.vibe === vibe || c.tags.includes(vibe);
      return matchQ && matchG && matchR && matchV;
    });
    if (sortBy === "name") {
      base.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "rarity") {
      const rank: Record<CompanionRarity, number> = {
        common: 1,
        rare: 2,
        epic: 3,
        legendary: 4,
        mythic: 5,
        abyssal: 6,
      };
      base.sort((a, b) => rank[b.rarity] - rank[a.rarity]);
    } else {
      base.sort((a, b) => new Date((b as Companion).createdAt).getTime() - new Date((a as Companion).createdAt).getTime());
    }
    return base;
  }, [pool, search, gender, rarity, vibe, sortBy]);

  useEffect(() => {
    setVisibleCount(24);
  }, [search, gender, rarity, vibe, sortBy, pool.length]);

  const clearAll = () => {
    setSearch("");
    setGender(null);
    setRarity(null);
    setVibe(null);
    setSortBy("newest");
  };

  const handleBuyCard = async (c: CommunityGalleryRow) => {
    if (!sessionUserId) {
      navigate("/auth", { state: { from: `${location.pathname}${location.search}` } });
      return;
    }
    const price = discoverCardPriceFc(c.rarity);
    if (fcBalance !== null && fcBalance < price) {
      toast.error(`Not enough Forge Coins. This card is ${price} FC — you have ${fcBalance} FC.`);
      return;
    }
    setPurchasingId(c.id);
    try {
      const r = await purchaseDiscoverCompanion(c.id);
      if (!r.ok) {
        if (r.err === "insufficient_funds") {
          toast.error(`Need ${r.priceFc} FC. You have ${r.newBalance} FC.`);
        } else {
          toast.error(r.err || "Could not complete purchase.");
        }
        setFcBalance((b) => (b !== null ? r.newBalance : b));
        return;
      }
      setFcBalance(r.newBalance);
      void queryClient.invalidateQueries({ queryKey: [...VAULT_COLLECTION_QUERY_KEY, sessionUserId] });
      if (r.alreadyOwned) {
        toast.message("Already in your collection", { description: c.name });
      } else {
        toast.success(`Added to your vault — ${r.priceFc} FC`, { description: c.name });
      }
    } finally {
      setPurchasingId(null);
    }
  };

  const hasFilters = search || gender || rarity || vibe;
  const showFilterEmpty = filtered.length === 0 && pool.length > 0;
  const showDataEmpty = !isLoading && pool.length === 0;

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-8 overflow-x-hidden pb-8">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-black/40 backdrop-blur-2xl px-5 py-6 sm:px-8 sm:py-8 shadow-[0_0_60px_rgba(255,45,123,0.08),inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div
          className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full blur-[100px] opacity-50"
          style={{ background: `radial-gradient(circle, ${NEON_PINK}66, transparent 70%)` }}
        />
        <div className="pointer-events-none absolute bottom-0 left-0 h-40 w-64 rounded-full bg-accent/10 blur-[90px]" />
        <div className="relative">
          <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground mb-2">Community vault</p>
          <h2 className="font-gothic text-3xl sm:text-4xl md:text-5xl font-bold gradient-vice-text leading-tight">
            Discover companions
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
            Live catalog — stock personas plus public forge creations. Preview here; full sheets open on tap.
          </p>
          {!isLoading && pool.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground/90">
              <span className="text-primary font-medium" style={{ color: NEON_PINK }}>
                {pool.length}
              </span>{" "}
              {pool.length === 1 ? "persona" : "personas"} in the vault
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card/30 backdrop-blur-xl p-4 sm:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              placeholder="Search companions, kinks, vibes, creators…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={isLoading || pool.length === 0}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-border/80 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all disabled:opacity-50"
              aria-label="Search companions"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "newest" | "name" | "rarity")}
              className="rounded-xl border border-border/80 bg-black/30 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <option value="newest">Newest</option>
              <option value="name">Name A–Z</option>
              <option value="rarity">Rarity</option>
            </select>
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              disabled={pool.length === 0}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm border transition-colors disabled:opacity-40",
                filtersOpen || hasFilters
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/80 bg-black/30 text-muted-foreground hover:text-foreground hover:border-border",
              )}
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
            {hasFilters && (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            )}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {filtersOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-border/60 flex flex-col gap-5">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Gender</p>
                  <div className="flex flex-wrap gap-2">
                    {genders.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(gender === g ? null : g)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs border transition-colors",
                          gender === g
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/40 border-border text-muted-foreground hover:border-primary/40",
                        )}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Rarity</p>
                  <div className="flex flex-wrap gap-2">
                    {COMPANION_RARITIES.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRarity(rarity === r ? null : r)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs border transition-colors capitalize",
                          rarity === r
                            ? "bg-velvet-purple/30 border-accent text-accent"
                            : "bg-muted/40 border-border text-muted-foreground hover:border-accent/40",
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Vibe</p>
                  <div className="flex flex-wrap gap-2">
                    {vibes.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setVibe(vibe === v ? null : v)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs border transition-colors max-w-full truncate",
                          vibe === v
                            ? "bg-accent/15 border-accent text-accent"
                            : "bg-muted/40 border-border text-muted-foreground hover:border-accent/40",
                        )}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-2xl border border-border/60 bg-black/30">
          <Loader2 className="h-9 w-9 animate-spin text-primary" style={{ color: NEON_PINK }} />
          <p className="text-sm text-muted-foreground">Syncing the vault…</p>
        </div>
      )}

      {!isLoading && (
        <AnimatePresence mode="popLayout">
          {showDataEmpty ? (
            <motion.div
              key="empty-data"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="relative overflow-hidden rounded-[1.75rem] border border-border/50 bg-black/40 backdrop-blur-2xl px-6 py-14 text-center"
            >
              <div className="relative max-w-md mx-auto space-y-4">
                <Sparkles className="h-10 w-10 mx-auto text-muted-foreground" />
                <h3 className="font-gothic text-2xl gradient-vice-text">The vault is empty</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  No companions are available yet. Forge the first persona in Forge Studio, or check back after the
                  catalog syncs.
                </p>
                <Link
                  to="/create-companion"
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-primary-foreground glow-pink shadow-lg shadow-primary/20"
                  style={{ backgroundColor: NEON_PINK }}
                >
                  <Wand2 className="h-4 w-4" />
                  Open Forge Studio
                </Link>
              </div>
            </motion.div>
          ) : showFilterEmpty ? (
            <motion.div
              key="empty-filter"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="relative overflow-hidden rounded-[1.75rem] border border-primary/25 bg-gradient-to-br from-black/60 via-[hsl(280_40%_12%)]/80 to-black/60 backdrop-blur-2xl px-6 py-14 text-center"
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-40"
                style={{
                  background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${NEON_PINK}44, transparent), radial-gradient(circle at 100% 100%, hsl(170 100% 50% / 0.15), transparent 45%)`,
                }}
              />
              <div className="relative max-w-md mx-auto space-y-4">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_30px_rgba(255,45,123,0.2)]">
                  <Sparkles className="h-7 w-7 text-primary" style={{ color: NEON_PINK }} />
                </div>
                <h3 className="font-gothic text-2xl sm:text-3xl gradient-vice-text">Nothing matched that hunger</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The vault is quiet — forge someone who fits your exact fantasy in{" "}
                  <span className="text-foreground/90 font-medium">Forge Studio</span>, then bring them into the
                  gallery when you are ready to share.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <Link
                    to="/create-companion"
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-primary-foreground glow-pink shadow-lg shadow-primary/20"
                    style={{ backgroundColor: NEON_PINK }}
                  >
                    <Wand2 className="h-4 w-4" />
                    Open Forge Studio
                  </Link>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold border border-accent/40 text-accent hover:bg-accent/10 transition-colors"
                  >
                    Reset filters
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.slice(0, visibleCount).map((c, i) => {
                const img = c.imageUrl;
                const buyFc = discoverCardPriceFc(c.rarity);
                const rarityPriceStyle = { color: rarityTierCaptionColor(c.rarity) };
                const buyBusy = purchasingId === c.id;
                const discoverTraits = resolveDisplayTraitsForCompanion(c);
                return (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.35), type: "spring", stiffness: 380, damping: 28 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="relative text-left rounded-2xl border border-transparent bg-card/50 backdrop-blur-md overflow-visible group shadow-lg shadow-black/30 transition-all hover:shadow-[0_0_28px_rgba(255,45,123,0.15)] p-1.5 max-md:p-1"
                  >
                    <Link
                      to={`/companions/${c.id}`}
                      state={{ from: `${location.pathname}${location.search}` }}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-3.5 right-2.5 z-[4] text-[9px] font-semibold uppercase tracking-wider px-2 py-1 rounded-lg bg-black/65 border border-white/15 text-white/90 hover:border-primary/50 hover:text-white transition-colors"
                    >
                      Profile
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleBuyCard(c)}
                      disabled={buyBusy}
                      className="w-full text-left h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-2xl overflow-visible disabled:opacity-70"
                    >
                      <TierHaloPortraitFrame
                        variant="card"
                        frameStyle="clean"
                        rarity={c.rarity}
                        gradientFrom={c.gradientFrom}
                        gradientTo={c.gradientTo}
                        overlayUrl={c.rarityBorderOverlayUrl}
                        rarityFrameBleed
                      >
                        <div
                          className="absolute inset-0 z-0"
                          style={{
                            background: img ? undefined : `linear-gradient(160deg, ${c.gradientFrom}, ${c.gradientTo})`,
                          }}
                        />
                        {img ? (
                          <img
                            src={img}
                            alt=""
                            className="absolute inset-0 z-[1] w-full h-full object-cover object-top"
                            loading="lazy"
                          />
                        ) : null}
                        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/95 via-black/25 to-transparent pointer-events-none" />
                        {c.isNexusHybrid ? (
                          <div className="absolute top-2 left-2 z-[3] text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border border-fuchsia-500/40 bg-fuchsia-950/50 text-fuchsia-100/90">
                            Nexus
                          </div>
                        ) : null}
                        {discoverTraits.length > 0 ? (
                          <div
                            className="absolute bottom-24 left-0 right-0 z-[3] px-2 pointer-events-auto"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <CompanionVibeTraitStrip
                              traits={discoverTraits}
                              className="justify-center"
                              size="sm"
                              max={4}
                            />
                          </div>
                        ) : null}
                        <div className="absolute inset-x-0 bottom-0 z-[3] p-3 space-y-0.5">
                          <p className="text-xs font-bold text-white truncate leading-tight font-gothic">{c.name}</p>
                          <p className="text-[10px] text-white/75 truncate">{c.tagline}</p>
                          <p className="text-[9px] text-teal-300/90 truncate pt-0.5">{c.vibe}</p>
                          {c.galleryCredit ? (
                            <p className="text-[9px] text-[hsl(170_100%_65%)] mt-1 flex items-center gap-1 truncate">
                              <UserRound className="h-3 w-3 shrink-0" />
                              <span className="truncate">by {c.galleryCredit}</span>
                            </p>
                          ) : null}
                          <div className="pt-1">
                            <div
                              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 shadow-[0_0_24px_rgba(255,45,123,0.18)]"
                              style={{
                                ...rarityPriceStyle,
                                borderColor: `${rarityTierCaptionColor(c.rarity)}55`,
                                background: "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(0,0,0,0.28))",
                              }}
                              aria-label={`${buyFc} Forge Coins`}
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              <span className="font-gothic text-base tabular-nums leading-none">{buyFc}</span>
                              <span className="text-[10px] uppercase tracking-wider text-white/85">FC</span>
                            </div>
                          </div>
                        </div>
                        <div className="absolute inset-0 z-[3] opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-tr from-transparent via-white/[0.07] to-primary/10 pointer-events-none" />
                      </TierHaloPortraitFrame>
                      <div className="px-3 py-2 flex items-center justify-between border-t border-border/60 bg-black/50">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                          {buyBusy ? "Unlocking…" : "Tap to buy"}
                        </span>
                        {buyBusy ? (
                          <Loader2 className="h-3.5 w-3.5 text-accent animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 text-accent" style={rarityPriceStyle} />
                        )}
                      </div>
                    </button>
                  </motion.div>
                );
              })}
              </div>
              {filtered.length > visibleCount ? (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((v) => v + 24)}
                    className="rounded-xl border border-primary/35 bg-primary/10 px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary/20"
                  >
                    Load more companions ({filtered.length - visibleCount} remaining)
                  </button>
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
