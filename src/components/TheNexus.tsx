import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { Orbit, Sparkles, Lock, Percent, Heart, Waves, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { DbCompanion } from "@/hooks/useCompanions";
import { mapSupabaseCustomCharacterRow, dbToCompanion } from "@/hooks/useCompanions";
import { VAULT_COLLECTION_QUERY_KEY } from "@/hooks/useVaultCollection";
import { cn } from "@/lib/utils";
import { NexusMergeRitualOverlay } from "@/components/nexus/NexusMergeRitualOverlay";
import { galleryStaticPortraitUrl, isVideoPortraitUrl, shouldShowProfileLoopVideo } from "@/lib/companionMedia";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  formatNexusOddsPercent,
  getNexusRarityOutcomesTable,
  nexusParentPairKey,
} from "@/lib/nexusRarityOutcomesTable";
import { COMPANION_RARITIES, rarityDisplayLabel } from "@/lib/companionRarity";
import { CompanionVibeTraitStrip } from "@/components/traits/CompanionVibeTraitStrip";
import { resolveDisplayTraitsForDb } from "@/lib/vibeDisplayTraits";

export type TheNexusMode = "user" | "admin";

type Phase = "select" | "merging" | "revealed";

type MergeSubphase = "fusion" | "video";
type NexusVarianceStrength = "low" | "medium" | "high";

function parseMergeStatsNexus(raw: Record<string, unknown> | null | undefined): {
  compatibility: number;
  resonance: number;
  pulse: number;
  affinity: number;
} {
  const c = (k: string) => {
    const v = raw?.[k];
    return typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 0;
  };
  return {
    compatibility: c("compatibility"),
    resonance: c("resonance"),
    pulse: c("pulse"),
    affinity: c("affinity"),
  };
}

const NEON = "#FF2D7B";
const NEXUS_PENDING_MERGE_KEY = "lustforge:nexus:pending-merge";
const NEXUS_LAST_REVEAL_KEY = "lustforge:nexus:last-reveal";

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
  const nexusPoolTraits = useMemo(
    () =>
      resolveDisplayTraitsForDb({
        id: db.id,
        tags: db.tags,
        kinks: db.kinks,
        personality: db.personality,
        bio: db.bio,
        is_nexus_hybrid: db.is_nexus_hybrid,
        rarity: db.rarity,
        display_traits: db.display_traits,
      }),
    [db],
  );
  return (
    <button
      type="button"
      disabled={locked}
      onClick={onToggle}
      className={cn(
        "group relative rounded-2xl border overflow-visible text-left transition-all aspect-[2/3] w-full p-0 m-0.5 max-sm:m-0",
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
        aspectClassName="aspect-[2/3] h-full w-full"
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
            className="absolute inset-0 z-[1] h-full w-full origin-center scale-[1.02] object-cover object-top"
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
        {nexusPoolTraits.length > 0 && !locked ? (
          <div className="absolute bottom-12 left-0 right-0 z-[3] px-1.5 pointer-events-auto">
            <CompanionVibeTraitStrip traits={nexusPoolTraits} className="justify-center" size="sm" max={8} />
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

function NexusRevealPanel({
  revealChild,
  revealFallback,
  profileFrom,
  onReset,
  isAdmin,
  queryClient,
}: {
  revealChild: DbCompanion | null;
  revealFallback: { childId: string; name: string; summary: string; merge_stats?: Record<string, unknown> };
  profileFrom: string;
  onReset: () => void;
  isAdmin: boolean;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const stats = parseMergeStatsNexus(revealChild?.merge_stats ?? revealFallback.merge_stats);
  const companionUi = revealChild ? dbToCompanion(revealChild) : null;
  const stillUrl = revealChild ? galleryStaticPortraitUrl(revealChild, revealChild.id) : null;
  const animUrl = revealChild?.animated_image_url?.trim() || null;
  const showLoop =
    Boolean(revealChild) &&
    shouldShowProfileLoopVideo(revealChild!, revealChild!.profile_loop_video_enabled) &&
    Boolean(animUrl && isVideoPortraitUrl(animUrl));

  return (
    <motion.div
      key="revealed"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-[2rem] border border-accent/35 bg-gradient-to-b from-card/85 to-black/65 backdrop-blur-2xl p-8 sm:p-12 relative overflow-hidden"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 12%, ${NEON}26, transparent 52%), radial-gradient(circle at 80% 90%, hsl(170 100% 42% / 0.08), transparent 45%)`,
        }}
      />
      <div className="relative grid lg:grid-cols-[minmax(0,280px)_1fr] gap-10 items-start text-left">
        <div className="mx-auto w-full max-w-[280px] space-y-4">
          {companionUi && stillUrl ? (
            <TierHaloPortraitFrame
              variant="card"
              frameStyle="clean"
              rarity={companionUi.rarity}
              gradientFrom={companionUi.gradientFrom}
              gradientTo={companionUi.gradientTo}
              overlayUrl={companionUi.rarityBorderOverlayUrl}
              aspectClassName="aspect-[2/3] w-full"
              rarityFrameBleed
              className="w-full"
            >
              <img src={stillUrl} alt="" className="absolute inset-0 z-[1] h-full w-full object-cover object-top" />
              <div className="absolute inset-0 z-[2] bg-gradient-to-t from-black/85 via-transparent to-transparent pointer-events-none" />
            </TierHaloPortraitFrame>
          ) : (
            <div
              className="aspect-[2/3] rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-2 p-4 text-center bg-black/50"
              style={{
                background: `linear-gradient(160deg, ${NEON}22, hsl(280 40% 18%))`,
              }}
            >
              <p className="text-xs text-white/80">Portrait still syncing.</p>
              <p className="text-[10px] text-muted-foreground">Open their profile if this stays blank.</p>
            </div>
          )}
          {showLoop && animUrl ? (
            <video
              src={animUrl}
              className="w-full rounded-xl border border-white/10 shadow-lg shadow-black/40"
              autoPlay
              loop
              muted
              playsInline
            />
          ) : companionUi ? (
            <p className="text-[11px] text-muted-foreground text-center">
              Looping portrait video will appear here when generation completes — check the profile if it&apos;s still
              processing.
            </p>
          ) : null}
        </div>

        <div className="space-y-6 min-w-0">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground mb-2">Emerges from The Nexus</p>
            <h3 className="font-gothic text-3xl sm:text-4xl gradient-vice-text break-words">{revealFallback.name}</h3>
            {companionUi ? (
              <p className="text-sm text-primary/90 mt-2 font-medium">{companionUi.tagline}</p>
            ) : null}
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{revealFallback.summary}</p>
            <p className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground/90">
              Tier · {rarityDisplayLabel(companionUi?.rarity ?? "common")}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(
              [
                ["Compatibility", stats.compatibility, Heart],
                ["Resonance", stats.resonance, Waves],
                ["Pulse", stats.pulse, Zap],
                ["Affinity", stats.affinity, Sparkles],
              ] as const
            ).map(([label, val, Icon]) => (
              <div
                key={label}
                className="rounded-xl border border-white/[0.08] bg-black/35 px-3 py-3 text-center backdrop-blur-sm"
              >
                <Icon className="h-4 w-4 mx-auto mb-1 text-primary opacity-90" style={{ color: NEON }} />
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="font-gothic text-2xl tabular-nums gradient-vice-text mt-0.5">{val}</p>
              </div>
            ))}
          </div>

          {companionUi?.bio ? (
            <div className="rounded-xl border border-white/[0.06] bg-black/25 p-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Bio</p>
              <p className="text-sm text-foreground/90 leading-relaxed line-clamp-[12] whitespace-pre-wrap">
                {companionUi.bio}
              </p>
            </div>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              to={`/companions/${revealFallback.childId}`}
              state={{ from: profileFrom }}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3 font-bold text-primary-foreground glow-pink text-center"
              style={{ backgroundColor: NEON }}
            >
              Open full profile
            </Link>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3 font-semibold border border-white/15 hover:bg-white/5 transition-colors"
            >
              Merge again
            </button>
          </div>

          {isAdmin ? (
            <div className="pt-4 border-t border-white/10">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Admin · loop tools</p>
              <AdminLoopingVideoBlock
                companionId={revealFallback.childId}
                onSuccess={() => {
                  void queryClient.invalidateQueries({ queryKey: ["companions"] });
                  void queryClient.invalidateQueries({ queryKey: ["admin-companions"] });
                  void queryClient.invalidateQueries({ queryKey: ["admin-custom-characters"] });
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
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
  const [varianceStrength, setVarianceStrength] = useState<NexusVarianceStrength>("medium");
  const [phase, setPhase] = useState<Phase>("select");
  const [mergeSubphase, setMergeSubphase] = useState<MergeSubphase>("fusion");
  const [revealChild, setRevealChild] = useState<DbCompanion | null>(null);
  const [revealFallback, setRevealFallback] = useState<{
    childId: string;
    name: string;
    summary: string;
    merge_stats?: Record<string, unknown>;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [nexusRarityInfoOpen, setNexusRarityInfoOpen] = useState(false);
  const recoverAttemptedRef = useRef(false);

  const nexusRarityTableRows = useMemo(() => {
    const arr = getNexusRarityOutcomesTable();
    return [...arr].sort(
      (a, b) =>
        COMPANION_RARITIES.indexOf(a.parentA) - COMPANION_RARITIES.indexOf(b.parentA) ||
        COMPANION_RARITIES.indexOf(a.parentB) - COMPANION_RARITIES.indexOf(b.parentB),
    );
  }, []);

  const byId = useMemo(() => new Map(forgeParents.map((c) => [c.id, c])), [forgeParents]);
  const alphaId = picked[0] ?? null;
  const omegaId = picked[1] ?? null;
  const alpha = alphaId ? byId.get(alphaId) : undefined;
  const omega = omegaId ? byId.get(omegaId) : undefined;

  const compatibility = alpha && omega ? computeNexusCompatibility(alpha, omega) : null;
  const fusionPreview = alpha && omega ? buildTraitFusionPreview(alpha, omega) : "";
  const selectedPairKey =
    alpha && omega
      ? nexusParentPairKey(normalizeCompanionRarity(alpha.rarity), normalizeCompanionRarity(omega.rarity))
      : null;

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

  const resetFlow = useCallback(() => {
    setPhase("select");
    setMergeSubphase("fusion");
    setRevealChild(null);
    setRevealFallback(null);
    setBusy(false);
    setPicked([]);
    try {
      localStorage.removeItem(NEXUS_LAST_REVEAL_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!busy || phase !== "merging") return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [busy, phase]);

  useEffect(() => {
    if (recoverAttemptedRef.current) return;
    recoverAttemptedRef.current = true;
    const rawPending = localStorage.getItem(NEXUS_PENDING_MERGE_KEY);
    const rawReveal = localStorage.getItem(NEXUS_LAST_REVEAL_KEY);

    if (rawReveal && phase === "select") {
      try {
        const parsed = JSON.parse(rawReveal) as {
          userId: string;
          childId: string;
          name: string;
          summary: string;
          merge_stats?: Record<string, unknown>;
          ts: number;
        };
        const freshEnough = Date.now() - (parsed.ts || 0) < 1000 * 60 * 60 * 8;
        if (parsed.userId === userId && freshEnough) {
          setRevealFallback({
            childId: parsed.childId,
            name: parsed.name,
            summary: parsed.summary,
            merge_stats: parsed.merge_stats,
          });
          setPhase("revealed");
        }
      } catch {
        /* ignore */
      }
    }

    if (!rawPending) return;
    let pending: {
      userId: string;
      parentAId: string;
      parentBId: string;
      startedAtMs: number;
    } | null = null;
    try {
      pending = JSON.parse(rawPending) as typeof pending;
    } catch {
      localStorage.removeItem(NEXUS_PENDING_MERGE_KEY);
      return;
    }
    if (!pending || pending.userId !== userId) return;
    const ageMs = Date.now() - pending.startedAtMs;
    if (ageMs < 10_000) return;

    void (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("nexus-merge", {
          body: {
            reconcile: true,
            parentAId: pending.parentAId,
            parentBId: pending.parentBId,
            startedAtMs: pending.startedAtMs,
          },
        });
        if (error) throw error;
        const payload = data as {
          success?: boolean;
          status?: string;
          childId?: string;
          refunded?: number;
        };
        if (payload.status === "completed" && payload.childId) {
          const uuid = payload.childId.replace(/^cc-/, "");
          const { data: row } = await supabase.from("custom_characters").select("*").eq("id", uuid).maybeSingle();
          if (row) {
            const db = mapSupabaseCustomCharacterRow(row as Record<string, unknown>);
            const summary =
              typeof db.trait_fusion_summary === "string" && db.trait_fusion_summary.trim()
                ? db.trait_fusion_summary.trim()
                : "A third ascendant steps forward — adult, deliberate, and entirely their own.";
            setRevealChild(db);
            setRevealFallback({
              childId: payload.childId,
              name: db.name,
              summary,
              merge_stats: db.merge_stats as Record<string, unknown> | undefined,
            });
            setPhase("revealed");
            toast.success("Recovered your Nexus merge.");
          }
          localStorage.removeItem(NEXUS_PENDING_MERGE_KEY);
          return;
        }
        if (payload.status === "refunded" && (payload.refunded ?? 0) > 0) {
          toast.success(`Recovered interrupted merge and refunded ${payload.refunded} FC.`);
          onCreditsChanged?.();
          localStorage.removeItem(NEXUS_PENDING_MERGE_KEY);
          return;
        }
      } catch {
        /* ignore; keep pending marker for a later return */
      }
    })();
  }, [onCreditsChanged, phase, userId, recoverAttemptedRef]);

  const runMerge = async () => {
    if (!alpha || !omega || !canMerge) return;
    setBusy(true);
    setMergeSubphase("fusion");
    setRevealChild(null);
    setRevealFallback(null);
    setPhase("merging");
    const startedAtMs = Date.now();
    try {
      localStorage.setItem(
        NEXUS_PENDING_MERGE_KEY,
        JSON.stringify({
          userId,
          parentAId: alpha.id,
          parentBId: omega.id,
          startedAtMs,
        }),
      );
    } catch {
      /* ignore */
    }
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
          varianceStrength,
          adminMerge: isAdmin,
        },
      });

      if (error || !data || (data as { success?: boolean }).success !== true) {
        const msg = await messageFromFunctionsInvoke(error, data);
        toast.error(msg);
        setPhase("select");
        setBusy(false);
        return;
      }

      const payload = data as {
        childId: string;
        name: string;
        trait_fusion_summary?: string;
        portraitGenerated?: boolean;
        portraitError?: string | null;
        merge_stats?: Record<string, unknown>;
        rarity?: string;
      };

      const summaryFallback =
        payload.trait_fusion_summary?.trim() ||
        "A third ascendant steps forward — adult, deliberate, and entirely their own.";

      setRevealFallback({
        childId: payload.childId,
        name: payload.name,
        summary: summaryFallback,
        merge_stats: payload.merge_stats,
      });
      try {
        localStorage.setItem(
          NEXUS_LAST_REVEAL_KEY,
          JSON.stringify({
            userId,
            childId: payload.childId,
            name: payload.name,
            summary: summaryFallback,
            merge_stats: payload.merge_stats,
            ts: Date.now(),
          }),
        );
      } catch {
        /* ignore */
      }

      if (payload.portraitGenerated === false && payload.portraitError) {
        toast.error(
          `Portrait did not render: ${payload.portraitError.slice(0, 120)}${payload.portraitError.length > 120 ? "…" : ""}`,
        );
      }

      const portraitReady = payload.portraitGenerated !== false;

      if (portraitReady) {
        setMergeSubphase("video");
        try {
          const { data: vidData, error: vidErr } = await supabase.functions.invoke("generate-profile-loop-video", {
            headers: { Authorization: `Bearer ${token}` },
            body: { companionId: payload.childId },
          });
          if (vidErr || (vidData as { error?: string })?.error) {
            const vm = await messageFromFunctionsInvoke(vidErr, vidData);
            toast.message(`Loop video: ${vm.slice(0, 140)}${vm.length > 140 ? "…" : ""} — open profile to retry.`);
          }
        } catch (ve) {
          toast.message(
            ve instanceof Error
              ? `${ve.message.slice(0, 120)}… Open their profile to generate the loop when ready.`
              : "Loop video pending — open profile to finish.",
          );
        }
      }

      const uuid = payload.childId.replace(/^cc-/, "");
      const { data: row, error: rowErr } = await supabase
        .from("custom_characters")
        .select("*")
        .eq("id", uuid)
        .maybeSingle();

      if (!rowErr && row) {
        setRevealChild(mapSupabaseCustomCharacterRow(row as Record<string, unknown>));
      } else {
        setRevealChild(null);
      }

      setPhase("revealed");
      try {
        localStorage.removeItem(NEXUS_PENDING_MERGE_KEY);
      } catch {
        /* ignore */
      }
      void queryClient.invalidateQueries({ queryKey: ["companions"] });
      void queryClient.invalidateQueries({ queryKey: [...VAULT_COLLECTION_QUERY_KEY, userId] });
      onCreditsChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Merge failed.");
      setPhase("select");
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
    <>
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
            <div className="flex items-start gap-3">
              <h2 className="font-gothic text-3xl sm:text-4xl flex items-center gap-3 flex-1 min-w-0">
                <Orbit className="h-9 w-9 shrink-0" style={{ color: NEON }} />
                <span className="gradient-vice-text">The Nexus</span>
              </h2>
              <Dialog open={nexusRarityInfoOpen} onOpenChange={setNexusRarityInfoOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-violet-500/35 bg-gradient-to-br from-violet-950/70 to-black/60 text-violet-100/90 shadow-[0_0_18px_rgba(139,92,246,0.25)] hover:border-fuchsia-400/50 hover:text-white transition-colors"
                    title="Official Nexus rarity odds"
                    aria-label="Open Nexus rarity outcome table"
                  >
                    <Percent className="h-4 w-4" strokeWidth={2.25} />
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-[min(100vw-1.5rem,56rem)] max-h-[85vh] flex flex-col gap-0 p-0 border-white/10 bg-zinc-950/95 text-foreground">
                  <DialogHeader className="px-5 py-4 border-b border-white/10 shrink-0 text-left">
                    <DialogTitle className="font-gothic text-lg sm:text-xl pr-6">
                      Nexus · official rarity odds
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground font-normal leading-relaxed mt-1.5 max-w-2xl">
                      When you merge, the server rolls the ascendant&apos;s tier from this table (parent order does not
                      matter). Each row sums to 100%. All parent rarity combinations are explicitly defined here. Trait
                      chips = rolled ascendant tier (1–6) plus one Nexus bonus line.
                    </p>
                  </DialogHeader>
                  <div className="overflow-x-auto overflow-y-auto px-0 pb-4 -mx-0 min-h-0">
                    <table className="w-full min-w-[640px] text-left text-[10px] sm:text-[11px]">
                      <thead>
                        <tr className="border-b border-white/10 bg-black/50">
                          <th className="sticky left-0 z-[1] bg-zinc-950/98 px-3 py-2 font-semibold text-muted-foreground">
                            Parent pair
                          </th>
                          {COMPANION_RARITIES.map((r) => (
                            <th
                              key={r}
                              className="px-1.5 py-2 text-center font-semibold text-muted-foreground whitespace-nowrap"
                            >
                              {rarityDisplayLabel(r)}%
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {nexusRarityTableRows.map((row) => {
                          const rk = `${row.parentA}::${row.parentB}`;
                          const highlighted = selectedPairKey === rk;
                          return (
                            <tr
                              key={rk}
                              className={cn(
                                "border-b border-white/[0.06] hover:bg-white/[0.03]",
                                highlighted && "bg-fuchsia-500/[0.12] ring-1 ring-inset ring-fuchsia-500/25",
                              )}
                            >
                              <td className="sticky left-0 z-[1] bg-zinc-950/98 px-3 py-1.5 font-medium text-foreground whitespace-nowrap">
                                {rarityDisplayLabel(row.parentA)} + {rarityDisplayLabel(row.parentB)}
                                {highlighted ? (
                                  <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-fuchsia-300/90">
                                    Your pair
                                  </span>
                                ) : null}
                              </td>
                              {COMPANION_RARITIES.map((r) => (
                                <td key={r} className="px-1.5 py-1.5 text-center tabular-nums text-muted-foreground">
                                  {formatNexusOddsPercent(row.childChancePct[r] ?? 0)}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {isAdmin
                ? "Tap two ascendants in the grid — order is I then II. Fused output is an adult hybrid bound to your vault for QA. Gallery picks are public-approved only."
                : "Tap two of your forged cards below. First tap is the primary thread (I), second is the counter-thread (II). Compatibility reads the weave; fusion writes a third consenting adult — parents rest twenty-four hours after."}
            </p>
          </div>
          {!isAdmin ? (
            <div className="rounded-2xl border border-white/10 bg-black/55 px-6 py-4 text-right shrink-0 backdrop-blur-md">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Forge Coins (FC)</p>
              <p className="font-gothic text-3xl tabular-nums" style={{ color: NEON }}>
                {tokensBalance}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                This merge: {totalCost} FC
                {infuse ? ` (${NEXUS_MERGE_BASE_COST} + ${NEXUS_INFUSE_EXTRA_COST} infuse)` : ""}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-accent/30 bg-accent/10 px-6 py-4 text-right shrink-0">
              <p className="text-[10px] uppercase tracking-widest text-accent">Admin</p>
              <p className="font-gothic text-2xl text-accent">Unlimited</p>
              <p className="text-[11px] text-muted-foreground mt-1">No FC charge · no cooldown</p>
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
                    <p className="text-[10px] text-violet-200/80 leading-snug text-left pt-1">
                      Tap the violet <span className="font-semibold text-violet-100">% odds</span> orb — your parent
                      pair row highlights in the matrix. The server rolls rarity on merge; trait chips follow that tier
                      (1–6) plus one Nexus bonus line.
                    </p>
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
                        Infuse{isAdmin ? "" : ` (+${NEXUS_INFUSE_EXTRA_COST} FC)`}
                      </span>
                      <span className="block text-xs text-muted-foreground mt-1">
                        {isAdmin
                          ? "Bias which parent’s silhouette and voice dominate the fusion (no charge)."
                          : "Spend extra FC to bias which parent’s traits dominate the fusion."}
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
                  <div className="space-y-2 text-xs">
                    <p className="text-muted-foreground uppercase tracking-wider">Variance strength</p>
                    <p className="text-[11px] text-muted-foreground/85 leading-relaxed">
                      Controls how different the child&apos;s outfit/background should be from both parents while keeping
                      face/body lineage cues.
                    </p>
                    <div className="flex flex-col gap-2">
                      {(
                        [
                          ["low", "Low — closer stylistic blend"],
                          ["medium", "Medium — balanced divergence"],
                          ["high", "High — strong outfit/scene variety"],
                        ] as const
                      ).map(([v, label]) => (
                        <label key={v} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="variance-strength"
                            checked={varianceStrength === v}
                            onChange={() => setVarianceStrength(v)}
                            className="accent-[#FF2D7B]"
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
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
                      : `Awaken in The Nexus — ${totalCost} FC`}
                  </motion.button>
                  {!canAfford && !isAdmin ? (
                    <p className="text-center text-xs text-destructive">Insufficient Forge Coins (FC) for this merge.</p>
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

        {phase === "revealed" && revealFallback && (
          <NexusRevealPanel
            revealChild={revealChild}
            revealFallback={revealFallback}
            profileFrom={`${location.pathname}${location.search}`}
            onReset={resetFlow}
            isAdmin={isAdmin}
            queryClient={queryClient}
          />
        )}
      </AnimatePresence>
      </div>
      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence mode="wait">
              {phase === "merging" && alpha && omega ? (
                <NexusMergeRitualOverlay
                  key="nexus-ritual"
                  parentA={alpha}
                  parentB={omega}
                  mergeSubphase={mergeSubphase}
                />
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
