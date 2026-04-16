import { useParams, useNavigate, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useCompanions, dbToCompanion } from "@/hooks/useCompanions";
import { VAULT_COLLECTION_QUERY_KEY } from "@/hooks/useVaultCollection";
import Navbar from "@/components/Navbar";
import ParticleBackground from "@/components/ParticleBackground";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bookmark,
  Heart,
  MessageCircle,
  Sparkles,
  Loader2,
  Flame,
  ChevronRight,
  ThumbsDown,
  ThumbsUp,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useMemo } from "react";
import { getCompanionBackstoryParagraphs } from "@/lib/companionBackstory";
import { profileAnimatedPortraitUrl, profileStillPortraitUrl, isVideoPortraitUrl } from "@/lib/companionMedia";
import type { CompanionRarity } from "@/lib/companionRarity";
import { RarityBorderOverlay } from "@/components/rarity/RarityBorderOverlay";
import { AbyssalProfileParticles } from "@/components/rarity/AbyssalProfileParticles";
import { cn } from "@/lib/utils";
import { getToys, sendCommand, type LovenseToy } from "@/lib/lovense";
import { useCompanionVibrationPatterns, type CompanionVibrationPatternRow } from "@/hooks/useCompanionVibrationPatterns";
import { VibrationPatternButtons } from "@/components/toy/VibrationPatternButtons";
import { payloadToLovenseCommand } from "@/lib/vibrationPatternPayload";

const RARITY_BADGE: Record<
  CompanionRarity,
  { label: string; className: string; sub?: string }
> = {
  common: {
    label: "Common",
    className:
      "border-[#c8c8dc]/55 bg-gradient-to-r from-white/[0.12] to-white/[0.04] text-white/90 shadow-[0_0_20px_rgba(200,200,220,0.15)]",
  },
  rare: {
    label: "Rare",
    className:
      "border-sky-400/45 bg-sky-500/15 text-sky-100 shadow-[0_0_22px_rgba(56,189,248,0.28)]",
  },
  epic: {
    label: "Epic",
    className:
      "border-violet-400/50 bg-violet-600/20 text-violet-100 shadow-[0_0_24px_rgba(168,85,247,0.3)]",
  },
  legendary: {
    label: "Legendary",
    className:
      "border-amber-300/55 bg-amber-500/20 text-amber-50 shadow-[0_0_26px_rgba(251,191,36,0.28)]",
  },
  mythic: {
    label: "Mythic",
    className:
      "border-rose-500/55 bg-rose-600/25 text-rose-50 shadow-[0_0_28px_rgba(244,63,94,0.35)]",
  },
  abyssal: {
    label: "Abyssal",
    sub: "0.1% forge",
    className:
      "border-[#ff2d7b]/70 bg-gradient-to-r from-[#ff2d7b]/25 via-fuchsia-600/30 to-[#00ffd4]/20 text-white shadow-[0_0_40px_rgba(255,45,123,0.45),0_0_70px_rgba(168,85,247,0.25)]",
  },
};

const CompanionProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: dbCompanions, isLoading } = useCompanions();
  const [user, setUser] = useState<any>(null);
  const [myVote, setMyVote] = useState<1 | -1 | null>(null);
  const [pinned, setPinned] = useState(false);
  const [voteBusy, setVoteBusy] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);
  const [connectedToys, setConnectedToys] = useState<LovenseToy[]>([]);
  const [sendingVibrationId, setSendingVibrationId] = useState<string | null>(null);

  const { data: vibrationPatterns = [], isLoading: vibrationPatternsLoading } = useCompanionVibrationPatterns(id);

  const dbComp = useMemo(
    () => (dbCompanions || []).find((c) => c.id === id),
    [dbCompanions, id],
  );
  const companion = dbComp ? dbToCompanion(dbComp) : null;
  const rarity: CompanionRarity = companion?.rarity ?? "common";
  const animatedPortrait = profileAnimatedPortraitUrl(dbComp);
  const stillForProfile = profileStillPortraitUrl(dbComp, id);
  const backstoryParagraphs = companion
    ? getCompanionBackstoryParagraphs(companion, dbComp)
    : [];
  const starters = companion?.fantasyStarters?.slice(0, 5) ?? [];
  const isAbyssal = rarity === "abyssal";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setConnectedToys([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const toys = await getToys(user.id);
      if (!cancelled) setConnectedToys(toys);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const activeToys = useMemo(() => connectedToys.filter((t) => t.enabled), [connectedToys]);
  const hasLovenseToy = activeToys.length > 0;

  const triggerProfileVibration = async (row: CompanionVibrationPatternRow) => {
    if (!user) {
      navigate("/auth", { state: { from: `/companions/${companion?.id}` } });
      return;
    }
    if (!hasLovenseToy) {
      toast.message("Pair a Lovense toy in Settings to feel these patterns.", {
        action: { label: "Settings", onClick: () => navigate("/settings") },
      });
      return;
    }
    const cmd = payloadToLovenseCommand(row.vibration_pattern_pool?.payload);
    if (!cmd) {
      toast.error("Invalid pattern.");
      return;
    }
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem("lustforge-primary-toy-uid") : null;
    const target =
      (stored && activeToys.some((t) => t.id === stored) ? stored : null) ?? activeToys[0]?.id;
    if (!target) {
      toast.error("No active toy.");
      return;
    }
    setSendingVibrationId(row.id);
    try {
      const ok = await sendCommand(user.id, { ...cmd, toyId: target });
      const tn = activeToys.find((t) => t.id === target)?.name ?? "device";
      if (ok) toast.success(`${row.display_name} sent to ${tn}.`);
      else toast.error("Could not reach your toy.");
    } finally {
      setSendingVibrationId(null);
    }
  };

  useEffect(() => {
    if (!id || !user?.id) {
      setMyVote(null);
      setPinned(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [voteRes, pinRes] = await Promise.all([
        supabase
          .from("companion_discovery_votes")
          .select("vote")
          .eq("user_id", user.id)
          .eq("companion_id", id)
          .maybeSingle(),
        supabase
          .from("user_discover_pins")
          .select("companion_id")
          .eq("user_id", user.id)
          .eq("companion_id", id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      const v = voteRes.data?.vote;
      setMyVote(v === 1 ? 1 : v === -1 ? -1 : null);
      setPinned(!!pinRes.data?.companion_id);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, user?.id]);

  const submitVote = async (next: 1 | -1) => {
    if (!id) return;
    if (!user) {
      navigate("/auth", { state: { from: `/companions/${id}` } });
      return;
    }
    setVoteBusy(true);
    try {
      if (myVote === next) {
        const { error } = await supabase
          .from("companion_discovery_votes")
          .delete()
          .eq("user_id", user.id)
          .eq("companion_id", id);
        if (error) throw error;
        setMyVote(null);
        toast.message("Vote cleared.");
      } else {
        const { error } = await supabase.from("companion_discovery_votes").upsert(
          { user_id: user.id, companion_id: id, vote: next },
          { onConflict: "user_id,companion_id" },
        );
        if (error) throw error;
        setMyVote(next);
        toast.success(next === 1 ? "Marked as like." : "Marked as meh.");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not save vote.");
    } finally {
      setVoteBusy(false);
    }
  };

  const togglePin = async () => {
    if (!id) return;
    if (!user) {
      navigate("/auth", { state: { from: `/companions/${id}` } });
      return;
    }
    setPinBusy(true);
    try {
      if (pinned) {
        const { error } = await supabase
          .from("user_discover_pins")
          .delete()
          .eq("user_id", user.id)
          .eq("companion_id", id);
        if (error) throw error;
        setPinned(false);
        toast.message("Removed from your collection.");
      } else {
        const { error } = await supabase.from("user_discover_pins").insert({
          user_id: user.id,
          companion_id: id,
        });
        if (error) throw error;
        setPinned(true);
        toast.success("Saved to My Collection.");
      }
      void queryClient.invalidateQueries({ queryKey: VAULT_COLLECTION_QUERY_KEY });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not update collection.");
    } finally {
      setPinBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center pt-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!companion) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 pt-20 px-4 text-center">
          <p className="text-muted-foreground">Companion not found.</p>
          <Link to="/" className="text-sm text-primary hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const handleStartChat = (starterPrompt?: string, starterTitle?: string) => {
    if (!user) {
      navigate("/auth", { state: { from: `/companions/${companion.id}` } });
      return;
    }
    const prompt = starterPrompt?.trim();
    navigate(`/chat/${companion.id}`, {
      state: {
        starterPrompt: prompt || undefined,
        starterTitle: starterTitle || undefined,
      },
    });
  };

  const badge = RARITY_BADGE[rarity];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative overflow-x-hidden">
      <ParticleBackground />
      <div
        className="pointer-events-none fixed inset-0 z-[1]"
        aria-hidden
        style={{
          background: `
            radial-gradient(ellipse 120% 55% at 50% -15%, hsl(330 100% 58% / 0.11), transparent 52%),
            radial-gradient(ellipse 70% 45% at 100% 35%, hsl(170 100% 50% / 0.06), transparent 50%),
            radial-gradient(ellipse 55% 40% at 0% 60%, hsl(280 50% 45% / 0.07), transparent 48%),
            linear-gradient(to bottom, hsl(240 18% 6%) 0%, hsl(240 20% 4.2%) 45%, hsl(240 22% 3.5%) 100%)
          `,
        }}
      />
      <Navbar />

      <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-[max(5.25rem,calc(3.25rem+env(safe-area-inset-top,0px)))] sm:pt-[max(5.5rem,calc(3.5rem+env(safe-area-inset-top,0px)))] pb-16 sm:pb-20">
        <motion.button
          type="button"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-primary text-sm mb-8 transition-colors touch-manipulation"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Back
        </motion.button>

        <div className="grid lg:grid-cols-[minmax(0,380px)_1fr] gap-10 lg:gap-14 items-start">
          {/* Portrait column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="mx-auto w-full max-w-[min(100%,380px)] lg:mx-0 lg:max-w-none"
          >
            <div
              className={cn(
                "relative rounded-[1.35rem] p-[3px] overflow-hidden",
                isAbyssal
                  ? "shadow-[0_0_60px_rgba(255,45,123,0.35),0_0_100px_rgba(168,85,247,0.2),inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "shadow-[0_0_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.05)]",
              )}
              style={{
                background: isAbyssal
                  ? "linear-gradient(135deg, rgba(255,45,123,0.5), rgba(168,85,247,0.35), rgba(0,255,212,0.25))"
                  : `linear-gradient(135deg, ${companion.gradientFrom}55, ${companion.gradientTo}44)`,
              }}
            >
              <div
                className={cn(
                  "relative aspect-[3/4] w-full overflow-hidden rounded-[1.2rem] bg-black/50",
                  isAbyssal && "ring-1 ring-[#ff2d7b]/25",
                )}
              >
                {isAbyssal && <AbyssalProfileParticles />}
                <div
                  className="absolute inset-0 z-0"
                  style={{
                    background: `linear-gradient(160deg, ${companion.gradientFrom}66, ${companion.gradientTo}55)`,
                  }}
                />
                {animatedPortrait && isVideoPortraitUrl(animatedPortrait) ? (
                  <video
                    key={animatedPortrait}
                    className="absolute inset-0 z-[1] h-full w-full object-cover object-top"
                    src={animatedPortrait}
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : animatedPortrait ? (
                  <img
                    src={animatedPortrait}
                    alt=""
                    className="absolute inset-0 z-[1] h-full w-full object-cover object-top"
                  />
                ) : stillForProfile ? (
                  <img
                    src={stillForProfile}
                    alt=""
                    className="absolute inset-0 z-[1] h-full w-full object-cover object-top"
                  />
                ) : (
                  <div className="absolute inset-0 z-[1] flex items-center justify-center">
                    <span className="font-gothic text-7xl font-bold text-white/90">{companion.name.charAt(0)}</span>
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/90 via-black/15 to-transparent" />
                <RarityBorderOverlay
                  rarity={rarity}
                  overlayUrl={dbComp?.rarity_border_overlay_url}
                  abyssal={isAbyssal}
                />
                <div className="absolute left-3 top-3 z-[4] flex flex-col gap-2">
                  <span
                    className={cn(
                      "inline-flex flex-col gap-0 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] border backdrop-blur-md",
                      badge.className,
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 shrink-0 opacity-90" />
                      {badge.label}
                    </span>
                    {badge.sub ? (
                      <span className="text-[9px] font-medium normal-case tracking-normal opacity-90 pl-5">
                        {badge.sub}
                      </span>
                    ) : null}
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-4 text-center text-[11px] text-muted-foreground/80 lg:text-left">
              {animatedPortrait
                ? "Live portrait — motion plays here only, never on gallery cards."
                : "Forge an animated portrait URL in admin to unlock motion on this sheet."}
            </p>
          </motion.div>

          {/* Copy + actions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06, type: "spring", stiffness: 300, damping: 28 }}
            className="min-w-0 space-y-6"
          >
            <div>
              <h1 className="font-gothic text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                <span className="gradient-vice-text">{companion.name}</span>
              </h1>
              <p className="mt-2 text-lg sm:text-xl text-primary/95 italic">{companion.tagline}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1 text-xs text-foreground/90">
                  {companion.gender}
                </span>
                <span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1 text-xs text-foreground/90">
                  {companion.orientation}
                </span>
                <span className="rounded-full border border-primary/35 bg-primary/[0.12] px-3 py-1 text-xs text-primary">
                  {companion.role}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleStartChat()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-primary px-6 py-3.5 text-base font-bold text-primary-foreground shadow-lg shadow-primary/30 glow-pink touch-manipulation"
              >
                <MessageCircle className="h-5 w-5 shrink-0" />
                Start chat
              </motion.button>
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-card/60 px-5 py-3.5 text-sm font-semibold text-muted-foreground backdrop-blur-md hover:border-primary/35 hover:text-primary transition-colors"
              >
                <Flame className="h-4 w-4" />
                Browse forge
              </Link>
            </div>

            <div className="flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-black/35 px-4 py-3 backdrop-blur-md sm:flex-row sm:flex-wrap sm:items-center">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground shrink-0">
                Discover
              </span>
              <div className="flex flex-wrap gap-2 sm:ml-auto">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={voteBusy}
                  onClick={() => void submitVote(1)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50",
                    myVote === 1
                      ? "border-primary/50 bg-primary/20 text-primary"
                      : "border-white/10 bg-white/[0.04] text-muted-foreground hover:border-primary/35 hover:text-foreground",
                  )}
                >
                  {voteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4 shrink-0" />}
                  Like
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={voteBusy}
                  onClick={() => void submitVote(-1)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50",
                    myVote === -1
                      ? "border-amber-500/45 bg-amber-500/15 text-amber-100"
                      : "border-white/10 bg-white/[0.04] text-muted-foreground hover:border-white/25 hover:text-foreground",
                  )}
                >
                  {voteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsDown className="h-4 w-4 shrink-0" />}
                  Meh
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={pinBusy}
                  onClick={() => void togglePin()}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50",
                    pinned
                      ? "border-accent/45 bg-accent/15 text-accent"
                      : "border-white/10 bg-white/[0.04] text-muted-foreground hover:border-accent/35 hover:text-foreground",
                  )}
                >
                  {pinBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Bookmark className={cn("h-4 w-4 shrink-0", pinned && "fill-current")} />
                  )}
                  {pinned ? "In my collection" : "Save to my collection"}
                </motion.button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.08] bg-card/70 p-5 shadow-lg shadow-black/25 ring-1 ring-white/[0.04] backdrop-blur-xl">
                <h3 className="mb-2 flex items-center gap-2 font-gothic text-lg font-bold text-foreground">
                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                  Appearance
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground/90">{companion.appearance}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-card/70 p-5 shadow-lg shadow-black/25 ring-1 ring-white/[0.04] backdrop-blur-xl">
                <h3 className="mb-2 flex items-center gap-2 font-gothic text-lg font-bold text-foreground">
                  <Heart className="h-4 w-4 text-primary shrink-0" />
                  Personality
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground/90">{companion.personality}</p>
              </div>
            </div>

            {companion.kinks.length > 0 ? (
              <div className="rounded-2xl border border-white/[0.08] bg-card/60 p-5 backdrop-blur-xl ring-1 ring-white/[0.03]">
                <h3 className="mb-3 font-gothic text-lg font-bold text-foreground">Kinks &amp; interests</h3>
                <div className="flex flex-wrap gap-2">
                  {companion.kinks.map((kink) => (
                    <span
                      key={kink}
                      className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs text-primary"
                    >
                      {kink}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {id && vibrationPatterns.length > 0 ? (
              <div className="rounded-[1.35rem] border border-[#ff2d7b]/25 bg-gradient-to-br from-black/55 via-[hsl(280_28%_9%)]/95 to-black/50 p-5 sm:p-6 shadow-[0_0_48px_rgba(255,45,123,0.08),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#ff2d7b]/80">
                      Haptic signature
                    </h3>
                    <p className="mt-1 font-gothic text-xl text-white flex items-center gap-2">
                      <Zap className="h-5 w-5 text-[#00ffd4] shrink-0 drop-shadow-[0_0_10px_rgba(0,255,212,0.35)]" />
                      Lovense patterns
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      {hasLovenseToy
                        ? `Tap to send ${companion.name}'s curated patterns to your linked toy.`
                        : "Connect a Lovense device in Settings to feel these patterns live."}
                    </p>
                  </div>
                  {!hasLovenseToy ? (
                    <Link
                      to="/settings"
                      className="text-[11px] font-semibold uppercase tracking-wider text-primary hover:underline shrink-0"
                    >
                      Pair toy
                    </Link>
                  ) : (
                    <span className="rounded-full border border-[#00ffd4]/30 bg-[#00ffd4]/10 px-2.5 py-1 text-[10px] font-medium text-[#00ffd4]">
                      Linked
                    </span>
                  )}
                </div>
                {vibrationPatternsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  </div>
                ) : (
                  <VibrationPatternButtons
                    patterns={vibrationPatterns}
                    disabled={!hasLovenseToy}
                    sendingId={sendingVibrationId}
                    onTrigger={(row) => void triggerProfileVibration(row)}
                    variant="profile"
                  />
                )}
              </div>
            ) : null}
          </motion.div>
        </div>

        {/* Backstory */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-14 sm:mt-16 rounded-[1.5rem] border border-white/[0.08] bg-black/35 p-6 sm:p-10 shadow-[0_0_50px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.04] backdrop-blur-2xl"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-muted-foreground mb-3">
            Chronicle
          </p>
          <h2 className="font-gothic text-2xl sm:text-3xl font-bold text-foreground mb-6">Backstory</h2>
          <div className="space-y-5 text-sm sm:text-base leading-relaxed text-muted-foreground/92">
            {backstoryParagraphs.map((p, i) => (
              <p key={i} className="first-letter:text-primary first-letter:font-gothic first-letter:text-3xl first-letter:float-left first-letter:mr-2 first-letter:leading-none">
                {p}
              </p>
            ))}
          </div>
        </motion.section>

        {/* Fantasy starters */}
        <section className="mt-12 sm:mt-14">
          <h2 className="font-gothic text-2xl sm:text-3xl font-bold text-foreground mb-2">Fantasy starters</h2>
          <p className="mb-8 max-w-2xl text-sm text-muted-foreground/88">
            Tap a scene — we open chat and send your opening line exactly as written, so the companion meets you in
            that moment.
          </p>
          {starters.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-card/40 p-10 text-center text-sm text-muted-foreground backdrop-blur-md">
              No scripted openers yet. Use <strong className="text-foreground">Start chat</strong> and set the scene
              yourself.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {starters.map((starter, i) => (
                <motion.button
                  type="button"
                  key={`${starter.title}-${i}`}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i, type: "spring", stiffness: 380, damping: 26 }}
                  whileHover={{ scale: 1.015, y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleStartChat(starter.description, starter.title)}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.1] bg-gradient-to-br from-card/90 via-card/70 to-black/40 p-5 sm:p-6 text-left shadow-lg shadow-black/30 ring-1 ring-white/[0.04] backdrop-blur-xl transition-[border-color,box-shadow] hover:border-primary/45 hover:shadow-[0_0_36px_rgba(255,45,123,0.18)] touch-manipulation"
                >
                  <div
                    className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-30 blur-3xl transition-opacity group-hover:opacity-50"
                    style={{
                      background: `radial-gradient(circle, ${companion.gradientFrom}, transparent 65%)`,
                    }}
                  />
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-gothic text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                        {starter.title}
                      </p>
                      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground/90">{starter.description}</p>
                    </div>
                    <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-primary/60 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                  <span className="relative mt-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-primary/80">
                    Begin this fantasy
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                </motion.button>
              ))}
            </div>
          )}
        </section>

        {/* Tags */}
        <div className="mt-10 flex flex-wrap gap-2">
          {companion.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </main>
    </div>
  );
};

export default CompanionProfile;
