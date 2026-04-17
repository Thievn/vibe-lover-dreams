import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

type Phase = "select" | "merging" | "incubate" | "born";

const NEON = "#FF2D7B";

function portraitFor(db: DbCompanion): string | null {
  return galleryStaticPortraitUrl(db, db.id);
}

function NexusParentTile({
  db,
  selected,
  onPick,
  disabled,
}: {
  db: DbCompanion;
  selected: boolean;
  onPick: () => void;
  disabled: boolean;
}) {
  const url = portraitFor(db);
  const coolMs = nexusCooldownRemainingMs(db.nexus_cooldown_until ?? null);
  const locked = coolMs > 0 || disabled;
  return (
    <button
      type="button"
      disabled={locked}
      onClick={onPick}
      className={cn(
        "relative rounded-2xl border overflow-hidden text-left transition-all aspect-[3/4] w-full max-w-[180px]",
        selected
          ? "border-primary ring-2 ring-primary/40 shadow-[0_0_28px_rgba(255,45,123,0.35)]"
          : "border-white/10 hover:border-primary/35",
        locked && "opacity-45 cursor-not-allowed",
      )}
      style={{
        background: url ? undefined : `linear-gradient(160deg, ${db.gradient_from}, ${db.gradient_to})`,
      }}
    >
      {url ? (
        <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover object-top" loading="lazy" />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
      {coolMs > 0 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/65 text-[10px] uppercase tracking-widest text-white/90 px-2 text-center">
          <Lock className="h-5 w-5" />
          <span>Cooldown {formatNexusCooldownShort(coolMs)}</span>
        </div>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 p-2.5">
        <p className="text-xs font-bold text-white truncate">{db.name}</p>
      </div>
    </button>
  );
}

export default function TheNexus({
  userId,
  forgeParents,
  tokensBalance,
  onCreditsChanged,
}: {
  userId: string;
  forgeParents: DbCompanion[];
  tokensBalance: number;
  onCreditsChanged?: () => void;
}) {
  const queryClient = useQueryClient();
  const [alphaId, setAlphaId] = useState<string | null>(null);
  const [omegaId, setOmegaId] = useState<string | null>(null);
  const [infuse, setInfuse] = useState(false);
  const [favorParent, setFavorParent] = useState<"first" | "second" | "balanced">("balanced");
  const [phase, setPhase] = useState<Phase>("select");
  const [meter, setMeter] = useState(0);
  const [born, setBorn] = useState<{ childId: string; name: string; summary: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const byId = useMemo(() => new Map(forgeParents.map((c) => [c.id, c])), [forgeParents]);
  const alpha = alphaId ? byId.get(alphaId) : undefined;
  const omega = omegaId ? byId.get(omegaId) : undefined;

  const compatibility = alpha && omega ? computeNexusCompatibility(alpha, omega) : null;
  const fusionPreview = alpha && omega ? buildTraitFusionPreview(alpha, omega) : "";

  const totalCost = NEXUS_MERGE_BASE_COST + (infuse ? NEXUS_INFUSE_EXTRA_COST : 0);
  const canAfford = tokensBalance >= totalCost;
  const canMerge =
    alpha &&
    omega &&
    alpha.id !== omega.id &&
    canAfford &&
    nexusCooldownRemainingMs(alpha.nexus_cooldown_until ?? null) <= 0 &&
    nexusCooldownRemainingMs(omega.nexus_cooldown_until ?? null) <= 0;

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
    setBorn(null);
    setBusy(false);
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
      };

      setMeter(100);
      setBorn({
        childId: payload.childId,
        name: payload.name,
        summary: payload.trait_fusion_summary?.trim() || "A new signature awakens in your vault.",
      });
      setPhase("incubate");
      await new Promise((r) => setTimeout(r, 2600));
      setPhase("born");
      void queryClient.invalidateQueries({ queryKey: ["companions"] });
      void queryClient.invalidateQueries({ queryKey: [...VAULT_COLLECTION_QUERY_KEY, userId] });
      onCreditsChanged?.();
      toast.success("The Nexus has bound a new companion to your vault.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Merge failed.");
      setPhase("select");
      setMeter(0);
    } finally {
      setBusy(false);
    }
  };

  if (forgeParents.length < 2) {
    return (
      <div className="max-w-2xl mx-auto py-10 px-4 text-center space-y-6">
        <Orbit className="h-14 w-14 mx-auto text-primary opacity-90" style={{ color: NEON }} />
        <h2 className="font-gothic text-3xl gradient-vice-text">The Nexus</h2>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
          You need at least two forged companions in your vault to open a merge. Create another in Companion Forge, then
          return — the ritual waits.
        </p>
        <Link
          to="/create-companion"
          className="inline-flex items-center gap-2 rounded-xl px-8 py-3 font-bold text-primary-foreground glow-pink"
          style={{ backgroundColor: NEON }}
        >
          <Sparkles className="h-5 w-5" />
          Companion Forge
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-16 px-4 sm:px-6 space-y-10">
      <div className="relative overflow-hidden rounded-[2rem] border border-primary/25 bg-black/40 backdrop-blur-2xl p-8 sm:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${NEON}44, transparent 55%), radial-gradient(circle at 100% 100%, hsl(170 100% 45% / 0.12), transparent 45%)`,
          }}
        />
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground mb-2">Premium merge</p>
            <h2 className="font-gothic text-3xl sm:text-4xl flex items-center gap-3">
              <Orbit className="h-9 w-9 shrink-0" style={{ color: NEON }} />
              <span className="gradient-vice-text">The Nexus</span>
            </h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-lg leading-relaxed">
              Select two of your forged selves. Compatibility hums in the dark; conception charges the veil; a hybrid
              walks out carrying both lineages — and a twenty-four hour rest claims each parent afterward.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/50 px-5 py-4 text-right shrink-0">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Forge credits</p>
            <p className="font-gothic text-3xl tabular-nums" style={{ color: NEON }}>
              {tokensBalance}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              This merge: {totalCost}{infuse ? ` (${NEXUS_MERGE_BASE_COST} + ${NEXUS_INFUSE_EXTRA_COST} infuse)` : ""}
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === "select" && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid lg:grid-cols-[1fr_320px] gap-10"
          >
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-widest text-primary/90 mb-3">
                  First essence
                </h3>
                <div className="flex flex-wrap gap-3">
                  {forgeParents.map((c) => (
                    <NexusParentTile
                      key={`a-${c.id}`}
                      db={c}
                      selected={alphaId === c.id}
                      disabled={omegaId === c.id}
                      onPick={() => {
                        setAlphaId(c.id);
                        if (omegaId === c.id) setOmegaId(null);
                      }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-widest text-accent mb-3">Second essence</h3>
                <div className="flex flex-wrap gap-3">
                  {forgeParents.map((c) => (
                    <NexusParentTile
                      key={`b-${c.id}`}
                      db={c}
                      selected={omegaId === c.id}
                      disabled={alphaId === c.id}
                      onPick={() => {
                        setOmegaId(c.id);
                        if (alphaId === c.id) setAlphaId(null);
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-card/30 backdrop-blur-xl p-6 space-y-5 h-fit lg:sticky lg:top-24">
              {alpha && omega ? (
                <>
                  <div className="text-center space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Compatibility</p>
                    <p className="font-gothic text-5xl tabular-nums gradient-vice-text">{compatibility}%</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{fusionPreview}</p>
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-white/10 bg-black/30 p-4 hover:border-primary/30 transition-colors">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-border accent-[#FF2D7B]"
                      checked={infuse}
                      onChange={(e) => setInfuse(e.target.checked)}
                    />
                    <span>
                      <span className="text-sm font-semibold text-foreground">Infuse (+{NEXUS_INFUSE_EXTRA_COST})</span>
                      <span className="block text-xs text-muted-foreground mt-1">
                        Spend extra credits to bias which parent&apos;s traits dominate the fusion.
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
                    Awaken in The Nexus — {totalCost} credits
                  </motion.button>
                  {!canAfford ? (
                    <p className="text-center text-xs text-destructive">Insufficient forge credits for this merge.</p>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Choose two different companions to read the weave.
                </p>
              )}
            </div>
          </motion.div>
        )}

        {(phase === "merging" || phase === "incubate") && (
          <motion.div
            key="ritual"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-[2rem] border border-primary/30 bg-black/60 backdrop-blur-2xl p-10 sm:p-16 text-center space-y-8 relative overflow-hidden"
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
                {phase === "merging" ? "Conception surges" : "Incubation veil"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {phase === "merging"
                  ? "Credits lock, essences entwine, and the model writes your hybrid into being."
                  : "Shaping voice, silhouette, and appetite beneath velvet static…"}
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

        {phase === "born" && born && (
          <motion.div
            key="born"
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
              <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground mb-2">Born from The Nexus</p>
              <h3 className="font-gothic text-3xl sm:text-4xl gradient-vice-text">{born.name}</h3>
              <p className="mt-4 text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">{born.summary}</p>
            </div>
            <div className="relative flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to={`/companions/${born.childId}`}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
