import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { Orbit, Sparkles, Heart, Waves, Zap, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { DbCompanion } from "@/hooks/useCompanions";
import { VAULT_COLLECTION_QUERY_KEY } from "@/hooks/useVaultCollection";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { galleryStaticPortraitUrl } from "@/lib/companionMedia";
import { NEXUS_INFUSE_EXTRA_COST, NEXUS_MERGE_BASE_COST } from "@/lib/nexusCredits";
import {
  buildTraitFusionPreview,
  computeNexusCompatibility,
  formatNexusCooldownShort,
  nexusCooldownRemainingMs,
} from "@/lib/nexusMerge";
import { messageFromFunctionsInvoke } from "@/lib/supabaseFunctionsError";
import { normalizeCompanionRarity } from "@/lib/companionRarity";
import { TierHaloPortraitFrame } from "@/components/rarity/TierHaloPortraitFrame";
import { AdminLoopingVideoBlock } from "@/components/admin/AdminLoopingVideoBlock";

export type TheNexusMode = "user" | "admin";

type Phase = "select" | "merging" | "synthesis" | "revealed";

const NEON = "#FF2D7B";

function portraitFor(db: DbCompanion): string | null {
  return galleryStaticPortraitUrl(db, db.id);
}

function NexusCard({
  db,
  orderMark,
  onToggle,
  mode,
  operatorUserId,
}: {
  db: DbCompanion;
  orderMark: 0 | 1 | 2;
  onToggle: () => void;
  mode: TheNexusMode;
  operatorUserId: string;
}) {
  const url = portraitFor(db);
  const coolMs = mode === "user" ? nexusCooldownRemainingMs(db.nexus_cooldown_until ?? null) : 0;
  const locked = coolMs > 0;
  const isOperatorForge = Boolean(db.user_id && db.user_id === operatorUserId);
  const rarity = normalizeCompanionRarity(db.rarity);
  return (
    <button
      type="button"
      disabled={locked}
      onClick={onToggle}
      className={cn(
        "group relative rounded-2xl border overflow-visible text-left transition-all aspect-[9/16] w-full p-0 m-0.5 max-sm:m-0",
        orderMark === 1 &&
          "border-primary ring-2 ring-primary/50 shadow-[0_0_32px_rgba(255,45,123,0.38)] z-[1] scale-[1.02]",
        orderMark === 2 &&
          "border-accent ring-2 ring-accent/45 shadow-[0_0_28px_rgba(45,212,191,0.22)] z-[1] scale-[1.02]",
        orderMark === 0 && "border-white/[0.08] hover:border-primary/35 hover:shadow-lg hover:shadow-black/40",
        locked && "opacity-40 cursor-not-allowed scale-100",
      )}
    >
      <TierHaloPortraitFrame
        className="absolute inset-0 h-full w-full"
        variant="card"
        frameStyle="clean"
        rarity={rarity}
        gradientFrom={db.gradient_from}
        gradientTo={db.gradient_to}
        overlayUrl={db.rarity_border_overlay_url}
        aspectClassName="aspect-[9/16] h-full w-full"
        rarityFrameBleed
      >
        {!url ? (
          <div
            className="absolute inset-0 z-0"
            style={{ background: `linear-gradient(160deg, ${db.gradient_from}, ${db.gradient_to})` }}
          />
        ) : null}
        {url ? (
          <img
            src={url}
            alt=""
            className="absolute inset-0 z-[1] w-full h-full object-cover object-top"
            loading="lazy"
          />
        ) : null}
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/95 via-black/25 to-transparent" />
        {orderMark > 0 ? (
          <div
            className={cn(
              "absolute top-2 left-2 z-[3] h-8 w-8 rounded-full flex items-center justify-center text-xs font-black border backdrop-blur-md",
              orderMark === 1
                ? "border-primary/60 bg-primary/25 text-primary-foreground"
                : "border-accent/50 bg-accent/20 text-accent",
            )}
          >
            {orderMark === 1 ? "I" : "II"}
          </div>
        ) : null}
        {mode === "admin" && isOperatorForge ? (
          <span className="absolute top-2 right-2 z-[3] text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-white/80">
            Yours
          </span>
        ) : mode === "admin" ? (
          <span className="absolute top-2 right-2 z-[3] text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/60 border border-emerald-500/30 text-emerald-200/90">
            Gallery
          </span>
        ) : null}
        {locked ? (
          <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center gap-1 bg-black/70 text-[10px] uppercase tracking-widest text-white/90 px-2 text-center">
            <Lock className="h-5 w-5" />
            <span>Cooldown {formatNexusCooldownShort(coolMs)}</span>
          </div>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 z-[3] p-2.5 pt-8">
          <p className="text-xs font-bold text-white truncate drop-shadow-md">{db.name}</p>
          <p className="text-[10px] text-white/65 truncate">{db.tagline || db.role}</p>
        </div>
      </TierHaloPortraitFrame>
    </button>
  );
}

function togglePickOrder(prev: string[], id: string): string[] {
  const i = prev.indexOf(id);
  if (i >= 0) return prev.filter((x) => x !== id);
  if (prev.length < 2) return [...prev, id];
  return [prev[0]!, id];
}

export default function TheNexus({
  userId,
  forgeParents,
  tokensBalance = 0,
  onCreditsChanged,
  mode = "user",
}: {
  userId: string;
  forgeParents: DbCompanion[];
  tokensBalance?: number;
  onCreditsChanged?: () => void;
  mode?: TheNexusMode;
}) {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [picked, setPicked] = useState<string[]>([]);
  const [infuse, setInfuse] = useState(false);
  const [favorParent, setFavorParent] = useState<"first" | "second" | "balanced">("balanced");
  const [phase, setPhase] = useState<Phase>("select");
  const [meter, setMeter] = useState(0);
  const [reveal, setReveal] = useState<{ childId: string; name: string; summary: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const byId = useMemo(() => new Map(forgeParents.map((c) => [c.id, c])), [forgeParents]);
  const alphaId = picked[0] ?? null;
  const omegaId = picked[1] ?? null;
  const alpha = alphaId ? byId.get(alphaId) : undefined;
  const omega = omegaId ? byId.get(omegaId) : undefined;

  const compatibility = alpha && omega ? computeNexusCompatibility(alpha, omega) : null;
  const fusionPreview = alpha && omega ? buildTraitFusionPreview(alpha, omega) : "";

  const isAdmin = mode === "admin";
  const totalCost = isAdmin ? 0 : NEXUS_MERGE_BASE_COST + (infuse ? NEXUS_INFUSE_EXTRA_COST : 0);
  const canAfford = isAdmin || tokensBalance >= totalCost;
  const canMerge =
    alpha &&
    omega &&
    alpha.id !== omega.id &&
    canAfford &&
    (isAdmin ||
      (nexusCooldownRemainingMs(alpha.nexus_cooldown_until ?? null) <= 0 &&
        nexusCooldownRemainingMs(omega.nexus_cooldown_until ?? null) <= 0));

  useEffect(() => {
    if (phase !== "merging") return;
    const id = window.setInterval(() => {
      setMeter((m) => (m >= 94 ? m : m + 3 + Math.random() * 5));
    }, 380);
    return () => clearInterval(id);
  }, [phase]);

  const resetFlow = useCallback(() => {
    setPhase("select");
    setMeter(0);
    setReveal(null);
    setBusy(false);
    setPicked([]);
  }, []);

  const runMerge = async () => {
    if (!alpha || !omega || !canMerge) return;
    setBusy(true);
    setPhase("merging");
    setMeter(8);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error("Session expired — sign in again.");
        setPhase("select");
        setBusy(false);
        return;
      }

      const favor =
        !infuse || favorParent === "balanced"
          ? null
          : favorParent === "first"
            ? ("first" as const)
            : ("second" as const);

      const { data, error } = await supabase.functions.invoke("nexus-merge", {
        headers: { Authorization: `Bearer ${token}` },
        body: {
          parentAId: alpha.id,
          parentBId: omega.id,
          infuse,
          favorParent: favor,
          adminMerge: isAdmin,
        },
      });

      if (error || !data || (data as { success?: boolean }).success !== true) {
        const msg = await messageFromFunctionsInvoke(error, data);
        toast.error(msg);
        setPhase("select");
        setMeter(0);
        setBusy(false);
        return;
      }

      const payload = data as {
        childId: string;
        name: string;
        trait_fusion_summary?: string;
        portraitGenerated?: boolean;
        portraitError?: string | null;
      };

      if (payload.portraitGenerated === false && payload.portraitError) {
        toast.error(
          `Portrait did not render: ${payload.portraitError.slice(0, 120)}${payload.portraitError.length > 120 ? "…" : ""}`,
        );
      }

      setMeter(100);
      setReveal({
        childId: payload.childId,
        name: payload.name,
        summary:
          payload.trait_fusion_summary?.trim() ||
          "A third ascendant steps forward — adult, deliberate, and entirely their own.",
      });
      setPhase("synthesis");
      await new Promise((r) => setTimeout(r, 2600));
      setPhase("revealed");
      void queryClient.invalidateQueries({ queryKey: ["companions"] });
      void queryClient.invalidateQueries({ queryKey: [...VAULT_COLLECTION_QUERY_KEY, userId] });
      onCreditsChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Merge failed.");
      setPhase("select");
      setMeter(0);
    } finally {
      setBusy(false);
    }
  };

  const orderForId = (id: string): 0 | 1 | 2 => {
    if (picked[0] === id) return 1;
    if (picked[1] === id) return 2;
    return 0;
  };

  if (forgeParents.length < 2) {
    return (
      <div className="mx-auto w-full min-w-0 max-w-2xl overflow-x-hidden px-4 py-10 text-center space-y-6">
        <Orbit className="h-14 w-14 mx-auto text-primary opacity-90" style={{ color: NEON }} />
        <h2 className="font-gothic text-3xl gradient-vice-text">The Nexus</h2>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
          {isAdmin
            ? "You need at least two eligible cards (your forges and/or approved gallery) in the pool."
            : "You need at least two forged companions in your vault. Create another in Companion Forge, then return — the veil waits."}
        </p>
        {!isAdmin ? (
          <Link
            to="/create-companion"
            className="inline-flex items-center gap-2 rounded-xl px-8 py-3 font-bold text-primary-foreground glow-pink"
            style={{ backgroundColor: NEON }}
          >
            <Sparkles className="h-5 w-5" />
            Companion Forge
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-10 overflow-x-hidden px-4 pb-16 sm:px-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-primary/25 bg-gradient-to-br from-black/60 via-card/40 to-black/50 backdrop-blur-2xl p-8 sm:p-12 shadow-[0_0_80px_rgba(0,0,0,0.45)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-45"
          style={{
            background: `radial-gradient(ellipse 90% 70% at 50% -10%, ${NEON}38, transparent 55%), radial-gradient(circle at 100% 100%, hsl(170 100% 42% / 0.1), transparent 42%)`,
          }}
        />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
          <div className="max-w-xl">
            <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground mb-2">
              {isAdmin ? "Admin lab · no charge" : "Premium merge"}
            </p>
            <h2 className="font-gothic text-3xl sm:text-4xl flex items-center gap-3">
              <Orbit className="h-9 w-9 shrink-0" style={{ color: NEON }} />
              <span className="gradient-vice-text">The Nexus</span>
            </h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {isAdmin
                ? "Tap two ascendants in the grid — order is I then II. Fused output is an adult hybrid bound to your vault for QA. Gallery picks are public-approved only."
                : "Tap two of your forged cards below. First tap is the primary thread (I), second is the counter-thread (II). Compatibility reads the weave; fusion writes a third consenting adult — parents rest twenty-four hours after."}
            </p>
          </div>
          {!isAdmin ? (
            <div className="rounded-2xl border border-white/10 bg-black/55 px-6 py-4 text-right shrink-0 backdrop-blur-md">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Forge credits</p>
              <p className="font-gothic text-3xl tabular-nums" style={{ color: NEON }}>
                {tokensBalance}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                This merge: {totalCost}
                {infuse ? ` (${NEXUS_MERGE_BASE_COST} + ${NEXUS_INFUSE_EXTRA_COST} infuse)` : ""}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-accent/30 bg-accent/10 px-6 py-4 text-right shrink-0">
              <p className="text-[10px] uppercase tracking-widest text-accent">Admin</p>
              <p className="font-gothic text-2xl text-accent">Unlimited</p>
              <p className="text-[11px] text-muted-foreground mt-1">No credits · no cooldown</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === "select" && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid xl:grid-cols-[1fr_340px] gap-10 items-start"
          >
            <div className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-primary/90">Your collection</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Multi-select: choose <span className="text-primary font-medium">I</span> then{" "}
                    <span className="text-accent font-medium">II</span>. Tap again to clear a slot.
                  </p>
                </div>
                {picked.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setPicked([])}
                    className="text-xs uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
                  >
                    Clear selection
                  </button>
                ) : null}
              </div>
              <div className="rounded-[1.5rem] border border-white/[0.07] bg-black/25 p-4 sm:p-6 backdrop-blur-sm">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
                  {forgeParents.map((c) => (
                    <NexusCard
                      key={c.id}
                      db={c}
                      orderMark={orderForId(c.id)}
                      mode={mode}
                      operatorUserId={userId}
                      onToggle={() => setPicked((p) => togglePickOrder(p, c.id))}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.1] bg-gradient-to-b from-card/40 to-black/40 backdrop-blur-xl p-6 space-y-5 h-fit xl:sticky xl:top-24 shadow-xl shadow-black/30">
              {alpha && omega ? (
                <>
                  <div className="rounded-xl border border-white/5 bg-black/30 p-3 space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">First thread · I</p>
                    <p className="text-sm font-semibold text-foreground truncate">{alpha.name}</p>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground pt-2">Second thread · II</p>
                    <p className="text-sm font-semibold text-foreground truncate">{omega.name}</p>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Compatibility</p>
                    <p className="font-gothic text-5xl tabular-nums gradient-vice-text">{compatibility}%</p>
                    <p className="text-xs text-muted-foreground leading-relaxed text-left">{fusionPreview}</p>
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-white/10 bg-black/30 p-4 hover:border-primary/30 transition-colors">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-border accent-[#FF2D7B]"
                      checked={infuse}
                      onChange={(e) => setInfuse(e.target.checked)}
                    />
                    <span>
                      <span className="text-sm font-semibold text-foreground">
                        Infuse{isAdmin ? "" : ` (+${NEXUS_INFUSE_EXTRA_COST})`}
                      </span>
                      <span className="block text-xs text-muted-foreground mt-1">
                        {isAdmin
                          ? "Bias which parent’s silhouette and voice dominate the fusion (no charge)."
                          : "Spend extra credits to bias which parent’s traits dominate the fusion."}
                      </span>
                    </span>
                  </label>
                  {infuse ? (
                    <div className="space-y-2 text-xs">
                      <p className="text-muted-foreground uppercase tracking-wider">Inheritance bias</p>
                      <div className="flex flex-col gap-2">
                        {(
                          [
                            ["balanced", "Balanced tension"],
                            ["first", `Favor ${alpha.name.split(" ")[0] ?? "first"}`],
                            ["second", `Favor ${omega.name.split(" ")[0] ?? "second"}`],
                          ] as const
                        ).map(([v, label]) => (
                          <label key={v} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="favor"
                              checked={favorParent === v}
                              onChange={() => setFavorParent(v)}
                              className="accent-[#FF2D7B]"
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <motion.button
                    type="button"
                    whileHover={{ scale: canMerge ? 1.02 : 1 }}
                    whileTap={{ scale: canMerge ? 0.98 : 1 }}
                    disabled={!canMerge || busy}
                    onClick={() => void runMerge()}
                    className={cn(
                      "w-full rounded-xl py-3.5 font-bold text-primary-foreground shadow-lg transition-opacity",
                      canMerge ? "glow-pink" : "opacity-40 cursor-not-allowed",
                    )}
                    style={{ background: `linear-gradient(135deg, ${NEON}, hsl(280 45% 38%))` }}
                  >
                    {isAdmin
                      ? "Run admin fusion"
                      : `Awaken in The Nexus — ${totalCost} credits`}
                  </motion.button>
                  {!canAfford && !isAdmin ? (
                    <p className="text-center text-xs text-destructive">Insufficient forge credits for this merge.</p>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-10 leading-relaxed">
                  Select two cards from the grid — first choice anchors the weave, second completes the pair.
                </p>
              )}
            </div>
          </motion.div>
        )}

        {(phase === "merging" || phase === "synthesis") && (
          <motion.div
            key="ritual"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-[2rem] border border-primary/30 bg-black/60 backdrop-blur-2xl p-10 sm:p-16 text-center space-y-8 relative overflow-hidden min-h-[320px]"
          >
            <motion.div
              className="absolute inset-0 pointer-events-none opacity-50"
              style={{
                background: `conic-gradient(from 180deg at 50% 50%, transparent, ${NEON}33, transparent 70%)`,
              }}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 14, ease: "linear" }}
            />
            <Orbit className="h-16 w-16 mx-auto relative animate-pulse" style={{ color: NEON }} />
            <div className="relative space-y-2">
              <h3 className="font-gothic text-2xl sm:text-3xl gradient-vice-text">
                {phase === "merging" ? "Fusion pulse" : "The veil thins"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {phase === "merging"
                  ? isAdmin
                    ? "Essences entwine while the model writes your hybrid ascendant."
                    : "Credits lock, essences entwine, and the model writes your third ascendant."
                  : "Carving voice, silhouette, and appetite into a new adult signature beneath velvet static…"}
              </p>
            </div>
            <div className="relative max-w-md mx-auto space-y-2">
              <div className="flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                <span>Conception meter</span>
                <span>{Math.round(Math.min(100, meter))}%</span>
              </div>
              <Progress value={Math.min(100, meter)} className="h-3 bg-black/50" />
            </div>
          </motion.div>
        )}

        {phase === "revealed" && reveal && (
          <motion.div
            key="revealed"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-[2rem] border border-accent/35 bg-gradient-to-b from-card/80 to-black/60 backdrop-blur-2xl p-10 sm:p-14 text-center space-y-6 relative overflow-hidden"
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 50% 20%, ${NEON}22, transparent 50%)`,
              }}
            />
            <Sparkles className="h-12 w-12 mx-auto text-accent relative" />
            <div className="relative">
              <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground mb-2">
                Emerges from The Nexus
              </p>
              <h3 className="font-gothic text-3xl sm:text-4xl gradient-vice-text">{reveal.name}</h3>
              <p className="mt-4 text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">{reveal.summary}</p>
            </div>
            <div className="relative flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to={`/companions/${reveal.childId}`}
                state={{ from: `${location.pathname}${location.search}` }}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3 font-bold text-primary-foreground glow-pink"
                style={{ backgroundColor: NEON }}
              >
                Open profile
              </Link>
              <button
                type="button"
                onClick={resetFlow}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3 font-semibold border border-white/15 hover:bg-white/5 transition-colors"
              >
                Merge again
              </button>
            </div>
            {isAdmin ? (
              <div className="relative max-w-md mx-auto text-left">
                <AdminLoopingVideoBlock
                  companionId={reveal.childId}
                  onSuccess={() => {
                    void queryClient.invalidateQueries({ queryKey: ["companions"] });
                    void queryClient.invalidateQueries({ queryKey: ["admin-companions"] });
                    void queryClient.invalidateQueries({ queryKey: ["admin-custom-characters"] });
                  }}
                />
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
