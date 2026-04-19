import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { usePortraitOverrideUrl } from "@/hooks/usePortraitOverride";
import { useCompanionGeneratedImages } from "@/hooks/useCompanionGeneratedImages";
import { useCompanions, dbToCompanion } from "@/hooks/useCompanions";
import { VAULT_COLLECTION_QUERY_KEY } from "@/hooks/useVaultCollection";
import Navbar from "@/components/Navbar";
import ParticleBackground from "@/components/ParticleBackground";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bookmark,
  GitBranch,
  Heart,
  Images,
  MessageCircle,
  Sparkles,
  Loader2,
  Flame,
  ChevronRight,
  ThumbsDown,
  ThumbsUp,
  Waves,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { getCompanionBackstoryParagraphs } from "@/lib/companionBackstory";
import { profileAnimatedPortraitUrl, profileStillPortraitUrl, isVideoPortraitUrl } from "@/lib/companionMedia";
import { setCompanionPortraitFromGalleryUrl } from "@/lib/setCompanionPortraitFromGallery";
import { CompanionGalleryGrid } from "@/components/companion/CompanionGalleryGrid";
import type { CompanionRarity } from "@/lib/companionRarity";
import { RarityBorderOverlay } from "@/components/rarity/RarityBorderOverlay";
import { RarityTierCaption } from "@/components/rarity/RarityTierCaption";
import { ProfilePortraitTierHalo } from "@/components/rarity/ProfilePortraitTierHalo";
import { RarityBadgeIcon } from "@/components/rarity/RarityBadgeIcon";
import { AbyssalProfileParticles } from "@/components/rarity/AbyssalProfileParticles";
import { cn } from "@/lib/utils";
import { getToys, sendCommand, type LovenseToy } from "@/lib/lovense";
import { useCompanionVibrationPatterns, type CompanionVibrationPatternRow } from "@/hooks/useCompanionVibrationPatterns";
import { VibrationPatternButtons } from "@/components/toy/VibrationPatternButtons";
import { payloadToLovenseCommand } from "@/lib/vibrationPatternPayload";
import { formatNexusCooldownShort, nexusCooldownRemainingMs } from "@/lib/nexusMerge";
import { splitProseIntoParagraphs } from "@/lib/profileProseSplit";
import { buildProfileSearchTags } from "@/lib/companionSearchTags";
import { TcgProfilePanel } from "@/components/tcg/TcgStatDisplay";
import { PortraitViewLightbox } from "@/components/PortraitViewLightbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLovensePairing } from "@/hooks/useLovensePairing";
import { LovensePairingQrBlock } from "@/components/toy/LovensePairingQrBlock";

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
  const location = useLocation();
  const queryClient = useQueryClient();
  const { data: dbCompanions, isLoading } = useCompanions();
  const [user, setUser] = useState<any>(null);
  const [myVote, setMyVote] = useState<1 | -1 | null>(null);
  const [pinned, setPinned] = useState(false);
  const [voteBusy, setVoteBusy] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);
  const [connectedToys, setConnectedToys] = useState<LovenseToy[]>([]);
  const [pairDialogOpen, setPairDialogOpen] = useState(false);
  const [sendingVibrationId, setSendingVibrationId] = useState<string | null>(null);
  const [profileTab, setProfileTab] = useState<"profile" | "gallery">("profile");

  const { data: vibrationPatterns = [], isLoading: vibrationPatternsLoading } = useCompanionVibrationPatterns(id);

  const dbComp = useMemo(
    () => (dbCompanions || []).find((c) => c.id === id),
    [dbCompanions, id],
  );
  const companion = dbComp ? dbToCompanion(dbComp) : null;
  const rarity: CompanionRarity = companion?.rarity ?? "common";
  const animatedPortrait = profileAnimatedPortraitUrl(dbComp);
  const { data: portraitOverrideUrl } = usePortraitOverrideUrl(id, user?.id);
  const { data: galleryImages = [], isLoading: galleryImagesLoading } = useCompanionGeneratedImages(id, user?.id);
  const stillForProfile = useMemo(() => {
    const base = profileStillPortraitUrl(dbComp, id);
    if (id?.startsWith("cc-")) return base;
    return portraitOverrideUrl ?? base;
  }, [dbComp, id, portraitOverrideUrl]);
  const backstoryParagraphs = companion
    ? getCompanionBackstoryParagraphs(companion, dbComp)
    : [];
  const starters = companion?.fantasyStarters?.slice(0, 5) ?? [];
  const isAbyssal = rarity === "abyssal";

  const appearanceParagraphs = useMemo(
    () => (companion ? splitProseIntoParagraphs(companion.appearance, 3) : []),
    [companion?.appearance],
  );
  const personalityParagraphs = useMemo(
    () => (companion ? splitProseIntoParagraphs(companion.personality, 3) : []),
    [companion?.personality],
  );
  const profileSearchTags = useMemo(
    () => (companion ? buildProfileSearchTags(companion) : []),
    [companion],
  );

  const lineageParents = useMemo(() => {
    const ids = companion?.lineageParentIds;
    if (!ids?.length || !dbCompanions) return [];
    return ids.map((pid) => {
      const row = dbCompanions.find((x) => x.id === pid);
      return { id: pid, name: row?.name ?? "Lineage parent" };
    });
  }, [companion?.lineageParentIds, dbCompanions]);

  const nexusCooldownMs =
    dbComp?.id.startsWith("cc-") && user?.id && dbComp.user_id === user.id
      ? nexusCooldownRemainingMs(dbComp.nexus_cooldown_until ?? null)
      : 0;

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

  const refreshConnectedToys = useCallback(async () => {
    if (!user?.id) return;
    const toys = await getToys(user.id);
    setConnectedToys(toys);
  }, [user?.id]);

  const {
    qrImageUrl: pairQrUrl,
    isLoading: pairLoading,
    startPairing: startLovensePairing,
    cancelPairing: cancelLovensePairing,
    lastError: pairErr,
    setLastError: setPairErr,
  } = useLovensePairing(user?.id, {
    onConnected: () => {
      void refreshConnectedToys();
      setPairDialogOpen(false);
      toast.success("Toy linked — try a pattern below.");
    },
  });

  useEffect(() => {
    if (!pairErr) return;
    toast.error(pairErr);
    setPairErr(null);
  }, [pairErr, setPairErr]);

  const triggerProfileVibration = async (row: CompanionVibrationPatternRow) => {
    if (!user) {
      navigate("/auth", { state: { from: `/companions/${companion?.id}` } });
      return;
    }
    if (!hasLovenseToy) return;
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
      if (!ok) toast.error("Could not reach your toy.");
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
      } else {
        const { error } = await supabase.from("companion_discovery_votes").upsert(
          { user_id: user.id, companion_id: id, vote: next },
          { onConflict: "user_id,companion_id" },
        );
        if (error) throw error;
        setMyVote(next);
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
      } else {
        const { error } = await supabase.from("user_discover_pins").insert({
          user_id: user.id,
          companion_id: id,
        });
        if (error) throw error;
        setPinned(true);
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
        from: `/companions/${companion.id}`,
        starterPrompt: prompt || undefined,
        starterTitle: starterTitle || undefined,
      },
    });
  };

  const handlePortraitFromGallery = async (imageUrl: string) => {
    if (!user?.id || !id) return;
    await setCompanionPortraitFromGalleryUrl({
      userId: user.id,
      companionId: id,
      imageUrl,
    });
    await queryClient.invalidateQueries({ queryKey: ["companions"] });
    await queryClient.invalidateQueries({ queryKey: ["portrait-override", user.id, id] });
    await queryClient.invalidateQueries({ queryKey: ["companion-generated-images", user.id, id] });
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

      <main
        className={cn(
          "relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-[max(5.25rem,calc(3.25rem+env(safe-area-inset-top,0px)))] sm:pt-[max(5.5rem,calc(3.5rem+env(safe-area-inset-top,0px)))]",
          user ? "pb-mobile-nav md:pb-20" : "pb-16 sm:pb-20",
        )}
      >
        <motion.button
          type="button"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            const st = location.state as { from?: string } | undefined;
            if (st?.from) {
              navigate(st.from);
              return;
            }
            if (location.key !== "default") navigate(-1);
            else navigate("/dashboard");
          }}
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
            <ProfilePortraitTierHalo
              rarity={rarity}
              isAbyssal={isAbyssal}
              gradientFrom={companion.gradientFrom}
              gradientTo={companion.gradientTo}
            >
              <PortraitViewLightbox
                alt={companion.name}
                stillSrc={stillForProfile}
                animatedSrc={animatedPortrait}
                triggerClassName="rounded-[1.35rem]"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[1.35rem] bg-black/15">
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
                      className="absolute inset-0 z-[1] h-full w-full origin-center scale-[1.08] object-cover object-top"
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
                      className="absolute inset-0 z-[1] h-full w-full origin-center scale-[1.08] object-cover object-top"
                    />
                  ) : stillForProfile ? (
                    <img
                      src={stillForProfile}
                      alt=""
                      className="absolute inset-0 z-[1] h-full w-full origin-center scale-[1.08] object-cover object-top"
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
                    profilePolish
                    gradientFrom={companion.gradientFrom}
                    gradientTo={companion.gradientTo}
                  />
                  <RarityTierCaption rarity={rarity} />
                </div>
              </PortraitViewLightbox>
            </ProfilePortraitTierHalo>
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
              <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground/80">
                <span className="inline-flex items-center gap-1.5">
                  <RarityBadgeIcon rarity={rarity} className="h-3.5 w-3.5 opacity-80 shrink-0" />
                  <span className="text-foreground/75">{badge.label}</span>
                </span>
                {badge.sub ? (
                  <>
                    <span className="text-muted-foreground/35" aria-hidden>
                      ·
                    </span>
                    <span className="text-muted-foreground/70">{badge.sub}</span>
                  </>
                ) : null}
                <span className="text-muted-foreground/35" aria-hidden>
                  ·
                </span>
                <span className="text-muted-foreground/70">
                  {companion.id.startsWith("cc-") ? "Forge creation" : "Catalog"}
                  {companion.isNexusHybrid ? " · Nexus hybrid" : ""}
                </span>
              </p>
            </div>

            {backstoryParagraphs.length > 0 ? (
              <section className="rounded-2xl border border-primary/20 bg-gradient-to-b from-black/55 via-black/40 to-black/35 p-5 sm:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-white/[0.06]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary/85 mb-2">
                  Chronicle
                </p>
                <h2 className="font-gothic text-xl sm:text-2xl font-bold text-foreground mb-4">Their story</h2>
                <div className="space-y-4 text-sm sm:text-[15px] leading-relaxed text-muted-foreground/95 max-w-prose">
                  {backstoryParagraphs.map((p, i) => (
                    <p
                      key={i}
                      className="first-letter:text-primary first-letter:font-gothic first-letter:text-2xl sm:first-letter:text-3xl first-letter:float-left first-letter:mr-2 first-letter:leading-none"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </section>
            ) : null}

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

            <div className="flex rounded-2xl border border-white/[0.08] bg-black/45 p-1 gap-1 max-w-md">
              <button
                type="button"
                onClick={() => setProfileTab("profile")}
                className={cn(
                  "flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors touch-manipulation",
                  profileTab === "profile"
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Profile
              </button>
              <button
                type="button"
                onClick={() => setProfileTab("gallery")}
                className={cn(
                  "flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors touch-manipulation",
                  profileTab === "gallery"
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Images className="h-4 w-4 shrink-0" />
                Gallery
              </button>
            </div>

            {profileTab === "gallery" ? (
              <section className="rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-5 sm:p-6">
                <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-primary mb-1">Saved from chat</h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-xl">
                  Generated selfies and scenes are stored here. Pick one as {companion.name}&apos;s portrait — it updates
                  chat and this profile.
                </p>
                {user ? (
                  <CompanionGalleryGrid
                    companionName={companion.name}
                    images={galleryImages}
                    loading={galleryImagesLoading}
                    currentPortraitUrl={stillForProfile}
                    onSetAsPortrait={handlePortraitFromGallery}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center border border-dashed border-white/15 rounded-xl">
                    <Link to="/auth" state={{ from: `/companions/${companion.id}` }} className="text-primary font-semibold hover:underline">
                      Sign in
                    </Link>{" "}
                    to view and manage your gallery.
                  </p>
                )}
              </section>
            ) : null}

            {profileTab === "profile" ? (
              <>
            {nexusCooldownMs > 0 ? (
              <p className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-100/95 leading-relaxed">
                Nexus recovery: this companion rests{" "}
                <span className="font-semibold tabular-nums">{formatNexusCooldownShort(nexusCooldownMs)}</span>{" "}
                longer before they can enter another merge.
              </p>
            ) : null}

            {(companion.isNexusHybrid || companion.mergeStats || lineageParents.length > 0) && (
              <section className="rounded-2xl border border-primary/25 bg-black/40 backdrop-blur-md p-5 sm:p-6 space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-primary flex items-center gap-2">
                  <GitBranch className="h-4 w-4 shrink-0" />
                  The Nexus
                </h2>
                {lineageParents.length > 0 ? (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Lineage</p>
                    <ul className="flex flex-wrap gap-2">
                      {lineageParents.map((p) => (
                        <li key={p.id}>
                          <Link
                            to={`/companions/${p.id}`}
                            state={{ from: `${location.pathname}${location.search}` }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-foreground/90 hover:border-primary/40 hover:text-primary transition-colors"
                          >
                            {p.name}
                            <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {companion.mergeStats ? (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">Merge signature</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(
                        [
                          ["Compatibility", companion.mergeStats.compatibility, Heart],
                          ["Resonance", companion.mergeStats.resonance, Waves],
                          ["Pulse", companion.mergeStats.pulse, Zap],
                          ["Affinity", companion.mergeStats.affinity, Sparkles],
                        ] as const
                      ).map(([label, val, Icon], i) => (
                        <div
                          key={`${label}-${i}`}
                          className="rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2.5 space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
                            <Icon className="h-3.5 w-3.5 text-primary/80 shrink-0" />
                          </div>
                          <p className="font-gothic text-2xl tabular-nums text-foreground">{val}</p>
                          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                              style={{ width: `${val}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : companion.isNexusHybrid ? (
                  <p className="text-sm text-muted-foreground">
                    Emerged from The Nexus — merge metrics will appear here.
                  </p>
                ) : null}
              </section>
            )}

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
                      : "border-stone-400/20 bg-stone-400/[0.12] text-stone-200/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-primary/35 hover:bg-stone-400/[0.16] hover:text-white",
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
                      : "border-stone-400/20 bg-stone-400/[0.12] text-stone-200/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-stone-300/30 hover:bg-stone-500/[0.14] hover:text-white",
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
                      : "border-stone-400/20 bg-stone-400/[0.12] text-stone-200/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-accent/35 hover:bg-stone-500/[0.14] hover:text-white",
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

            <div className="grid gap-4 sm:grid-cols-2 items-start">
              <div className="rounded-2xl border border-white/[0.08] bg-card/70 p-5 shadow-lg shadow-black/25 ring-1 ring-white/[0.04] backdrop-blur-xl">
                <h3 className="mb-2 flex items-center gap-2 font-gothic text-lg font-bold text-foreground">
                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                  Appearance
                </h3>
                <div className="space-y-4">
                  {appearanceParagraphs.length > 0 ? (
                    appearanceParagraphs.map((p, i) => (
                      <p
                        key={i}
                        className="text-sm leading-relaxed text-muted-foreground/90 first-letter:text-primary first-letter:font-gothic first-letter:text-2xl first-letter:float-left first-letter:mr-1.5 first-letter:leading-none"
                      >
                        {p}
                      </p>
                    ))
                  ) : (
                    <p className="text-sm leading-relaxed text-muted-foreground/90">{companion.appearance}</p>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-card/70 p-5 shadow-lg shadow-black/25 ring-1 ring-white/[0.04] backdrop-blur-xl">
                <h3 className="mb-2 flex items-center gap-2 font-gothic text-lg font-bold text-foreground">
                  <Heart className="h-4 w-4 text-primary shrink-0" />
                  Personality
                </h3>
                <div className="space-y-4">
                  {personalityParagraphs.length > 0 ? (
                    personalityParagraphs.map((p, i) => (
                      <p
                        key={i}
                        className="text-sm leading-relaxed text-muted-foreground/90 first-letter:text-primary first-letter:font-gothic first-letter:text-2xl first-letter:float-left first-letter:mr-1.5 first-letter:leading-none"
                      >
                        {p}
                      </p>
                    ))
                  ) : (
                    <p className="text-sm leading-relaxed text-muted-foreground/90">{companion.personality}</p>
                  )}
                </div>
              </div>
            </div>

            <TcgProfilePanel stats={companion.tcgStats} />

            {companion.kinks.length > 0 ? (
              <div className="rounded-2xl border border-fuchsia-500/20 bg-black/40 p-5 backdrop-blur-xl ring-1 ring-fuchsia-500/10">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/90 mb-1">
                  Kinks &amp; interests
                </p>
                <h3 className="mb-4 font-gothic text-xl font-bold text-foreground">Signature cravings</h3>
                <div className="flex flex-wrap gap-2">
                  {companion.kinks.map((kink) => (
                    <span
                      key={kink}
                      className="rounded-full border border-fuchsia-400/40 bg-fuchsia-950/25 px-3 py-1 text-xs font-medium text-fuchsia-100/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
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
                        : "Tap Pair toy to scan the QR, or use Settings → Device connection."}
                    </p>
                  </div>
                  {!hasLovenseToy ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!user) {
                          navigate("/auth", { state: { from: location.pathname } });
                          return;
                        }
                        setPairDialogOpen(true);
                      }}
                      className="text-[11px] font-semibold uppercase tracking-wider text-primary hover:underline shrink-0"
                    >
                      Pair toy
                    </button>
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
              </>
            ) : null}
          </motion.div>
        </div>

        {profileTab === "profile" ? (
        <>
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

        {/* Tags — merged for search (gender, orientation, role, forge tags) */}
        <div className="mt-10 flex flex-wrap gap-2">
          {profileSearchTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/[0.1] bg-white/[0.05] px-3 py-1 text-xs text-muted-foreground/95"
            >
              {tag}
            </span>
          ))}
        </div>
        </>
        ) : null}
      </main>

      <Dialog open={pairDialogOpen} onOpenChange={setPairDialogOpen}>
        <DialogContent className="border-border/80 bg-[hsl(280_25%_8%)]/98 p-0 backdrop-blur-xl sm:max-w-md">
          <DialogHeader className="border-b border-white/[0.07] px-5 pb-3 pt-5">
            <DialogTitle className="font-gothic text-xl">Pair Lovense</DialogTitle>
            <p className="text-xs text-muted-foreground font-normal leading-relaxed pt-1">
              Same device link as Settings — scan with Lovense Remote. You can also use{" "}
              <Link to="/settings#device-connection" className="text-primary underline-offset-4 hover:underline">
                Account → Device connection
              </Link>
              .
            </p>
          </DialogHeader>
          <div className="space-y-4 px-5 pb-5">
            <LovensePairingQrBlock
              qrImageUrl={pairQrUrl}
              loading={pairLoading}
              onCancel={() => {
                cancelLovensePairing();
                setPairDialogOpen(false);
              }}
            />
            {!pairQrUrl ? (
              <button
                type="button"
                onClick={() => void startLovensePairing()}
                disabled={pairLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {pairLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Show QR code
              </button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanionProfile;
