import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { usePortraitOverrideUrl } from "@/hooks/usePortraitOverride";
import { useCompanionGeneratedImages } from "@/hooks/useCompanionGeneratedImages";
import { useCompanions, dbToCompanion } from "@/hooks/useCompanions";
import { useForgeCompanionOverlay } from "@/hooks/useForgeCompanionOverlay";
import { VAULT_COLLECTION_QUERY_KEY } from "@/hooks/useVaultCollection";
import { PURCHASED_COMPANION_IDS_QUERY_KEY } from "@/hooks/usePurchasedCompanionIds";
import Navbar from "@/components/Navbar";
import ParticleBackground from "@/components/ParticleBackground";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bookmark,
  Crown,
  Gem,
  GitBranch,
  Heart,
  Images,
  MessageCircle,
  Phone,
  Sparkles,
  Loader2,
  Flame,
  ChevronRight,
  ThumbsDown,
  ThumbsUp,
  Waves,
  Zap,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useMemo, useCallback, useRef, type ReactNode } from "react";
import { getCompanionBackstoryParagraphs } from "@/lib/companionBackstory";
import {
  profileAnimatedPortraitUrl,
  profileStillPortraitUrl,
  isVideoPortraitUrl,
  shouldShowProfileLoopVideo,
} from "@/lib/companionMedia";
import { setCompanionPortraitFromGalleryUrl } from "@/lib/setCompanionPortraitFromGallery";
import { CompanionGalleryGrid } from "@/components/companion/CompanionGalleryGrid";
import type { CompanionRarity } from "@/lib/companionRarity";
import { RarityTierCaption } from "@/components/rarity/RarityTierCaption";
import { TierHaloPortraitFrame } from "@/components/rarity/TierHaloPortraitFrame";
import { profileTierHaloInnerRoundClass } from "@/lib/profilePortraitTierHalo";
import { RarityBadgeIcon } from "@/components/rarity/RarityBadgeIcon";
import { AbyssalProfileParticles } from "@/components/rarity/AbyssalProfileParticles";
import { cn } from "@/lib/utils";
import { getToys, type LovenseToy } from "@/lib/lovense";
import { useCompanionVibrationPatterns, type CompanionVibrationPatternRow } from "@/hooks/useCompanionVibrationPatterns";
import { VibrationPatternButtons } from "@/components/toy/VibrationPatternButtons";
import { payloadToLovenseCommand } from "@/lib/vibrationPatternPayload";
import { createSustainedLovenseSession } from "@/lib/sustainedLovenseSession";
import { formatNexusCooldownShort, nexusCooldownRemainingMs } from "@/lib/nexusMerge";
import { splitProseIntoParagraphs } from "@/lib/profileProseSplit";
import { buildProfileSearchTags } from "@/lib/companionSearchTags";
import { getChatAutoSpendImages, setChatAutoSpendImages } from "@/lib/chatImageSettings";
import { discoverCardPriceFc } from "@/lib/forgeEconomy";
import { purchaseDiscoverCompanion } from "@/lib/forgeCoinsClient";
import { DiscoverPurchaseConfirmDialog } from "@/components/discover/DiscoverPurchaseConfirmDialog";
import { PORTRAIT_CARD_ASPECT_CLASS, PROFILE_LOOP_VIDEO_ASPECT_CLASS } from "@/lib/portraitAspect";
import { ChatAutoSpendImagesToggle } from "@/components/chat/ChatAutoSpendImagesToggle";
import { CompanionVibeTraitStrip } from "@/components/traits/CompanionVibeTraitStrip";
import { VibeTraitProfilePanel } from "@/components/traits/VibeTraitProfilePanel";
import { resolveDisplayTraitsForCompanion } from "@/lib/vibeDisplayTraits";
import { PortraitViewLightbox } from "@/components/PortraitViewLightbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLovensePairing } from "@/hooks/useLovensePairing";
import { useWindowVisibleRefresh } from "@/hooks/useWindowVisibleRefresh";
import { LovensePairingQrBlock } from "@/components/toy/LovensePairingQrBlock";
import { LiveCallTypePanel } from "@/components/liveCall/LiveCallTypePanel";
import { ProfileLoopingVideoUpsell } from "@/components/companion/ProfileLoopingVideoUpsell";
import { isPlatformAdmin } from "@/config/auth";
import { invokeGenerateLiveCallOptions } from "@/lib/invokeGenerateLiveCallOptions";
import { stashAndNavigateToLiveCall } from "@/lib/navigateToLiveCall";
import { ensureCompanionCallNotifications } from "@/lib/companionCallNotifications";
import { hasUserPurchasedCompanionCard } from "@/lib/hasUserPurchasedCompanionCard";
import {
  getPublicCompanionProfileShareUrl,
  getPublicSiteOrigin,
  absoluteUrlWithPublicSite,
} from "@/lib/publicCompanionShareUrl";

function PremiumDisabledButton({
  label,
  hint,
  className = "",
  icon,
}: {
  label: string;
  hint: string;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <div className={`relative group ${className}`}>
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-card/40 px-5 py-3.5 text-sm font-semibold text-muted-foreground/70 cursor-not-allowed"
      >
        {icon}
        {label}
      </button>
      <div className="pointer-events-none absolute left-1/2 top-[calc(100%+10px)] z-30 w-56 -translate-x-1/2 rounded-lg border border-white/10 bg-black/85 px-3 py-2 text-[11px] leading-relaxed text-white/85 opacity-0 shadow-xl backdrop-blur-md transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
        {hint}
      </div>
    </div>
  );
}

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
  const [livePatternId, setLivePatternId] = useState<string | null>(null);
  const sustainedToySessionRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const [profileTab, setProfileTab] = useState<"profile" | "gallery" | "live">("profile");
  const [bioExpanded, setBioExpanded] = useState(false);
  const [autoSpendChatImages, setAutoSpendChatImagesState] = useState(false);
  const [dropClickTracked, setDropClickTracked] = useState(false);
  const [fcBalanceProfile, setFcBalanceProfile] = useState<number | null>(null);
  const [discoverFreeCommonClaimed, setDiscoverFreeCommonClaimed] = useState<boolean | null>(null);
  const [buyConfirmProfileOpen, setBuyConfirmProfileOpen] = useState(false);
  const [purchasingDiscoverProfile, setPurchasingDiscoverProfile] = useState(false);
  /** Paid Discover / catalog unlock (see `purchase_discover_companion` → `user_transactions.card_purchase`). */
  const [paidCardQueryDone, setPaidCardQueryDone] = useState(false);
  const [hasPaidForThisCard, setHasPaidForThisCard] = useState(false);

  const isAdminUser = useMemo(() => (user ? isPlatformAdmin(user) : false), [user]);

  const { data: vibrationPatterns = [], isLoading: vibrationPatternsLoading } = useCompanionVibrationPatterns(id);

  const { dbComp, forgeLookupBusy: forgeRowFetching } = useForgeCompanionOverlay(id, dbCompanions, isLoading);

  const companion = dbComp ? dbToCompanion(dbComp) : null;
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const isDropLanding = searchParams.get("drop") === "1";
  const weeklyDropId = searchParams.get("wd");
  const discoverPreviewFromState =
    (location.state as { discoverPreview?: boolean } | null)?.discoverPreview === true;
  const discoverPreviewFromQuery = searchParams.get("discover") === "1";
  const discoverPreview = discoverPreviewFromState || discoverPreviewFromQuery;
  const isSharedProfileLink = searchParams.get("shared") === "1";
  const isOwnForge = Boolean(
    user?.id && dbComp?.user_id === user.id && companion?.id?.startsWith("cc-"),
  );
  /**
   * Chat, live call, gallery, Lovense, and FC spend toggles require owning this card
   * (Forge creator or a `card_purchase` ledger row). Admins use the same rules here as everyone else.
   */
  const profileFeatureLocked = Boolean(
    companion &&
      !isDropLanding &&
      !isOwnForge &&
      (!paidCardQueryDone || !hasPaidForThisCard),
  );

  useEffect(() => {
    if (!user?.id || !id) {
      setPaidCardQueryDone(true);
      setHasPaidForThisCard(false);
      return;
    }
    if (isOwnForge) {
      setPaidCardQueryDone(true);
      setHasPaidForThisCard(false);
      return;
    }
    let cancelled = false;
    setPaidCardQueryDone(false);
    setHasPaidForThisCard(false);
    void (async () => {
      const ok = await hasUserPurchasedCompanionCard(user.id, id);
      if (cancelled) return;
      setHasPaidForThisCard(ok);
      setPaidCardQueryDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, id, isOwnForge]);

  /** e.g. Chat “Live call” can deep-link here with `state: { profileTab: "live" }`. */
  useEffect(() => {
    const st = location.state as { profileTab?: "profile" | "gallery" | "live"; discoverPreview?: boolean } | null;
    const tab = st?.profileTab;
    if (tab !== "profile" && tab !== "gallery" && tab !== "live") return;
    if (profileFeatureLocked && tab !== "profile") return;
    setProfileTab(tab);
  }, [location.state, location.search, profileFeatureLocked]);
  const vibeTraits = useMemo(
    () => (companion ? resolveDisplayTraitsForCompanion(companion) : []),
    [companion],
  );
  const rarity: CompanionRarity = companion?.rarity ?? "common";
  const discoverListFc = discoverCardPriceFc(rarity);
  const discoverEffectiveFc = useMemo(() => {
    if (!user?.id || rarity !== "common") return discoverListFc;
    if (discoverFreeCommonClaimed !== false) return discoverListFc;
    return 0;
  }, [user?.id, rarity, discoverListFc, discoverFreeCommonClaimed]);
  const animatedPortrait = profileAnimatedPortraitUrl(dbComp);
  const showLoopVideo = shouldShowProfileLoopVideo(dbComp, dbComp?.profile_loop_video_enabled);
  const lightboxAnimated =
    showLoopVideo && animatedPortrait && isVideoPortraitUrl(animatedPortrait)
      ? animatedPortrait
      : animatedPortrait && !isVideoPortraitUrl(animatedPortrait)
        ? animatedPortrait
        : undefined;
  const { data: portraitOverrideUrl } = usePortraitOverrideUrl(id, user?.id);
  const { data: galleryImages = [], isLoading: galleryImagesLoading } = useCompanionGeneratedImages(id, user?.id);
  const stillForProfile = useMemo(() => {
    const base = profileStillPortraitUrl(dbComp, id);
    if (id?.startsWith("cc-")) return base;
    return portraitOverrideUrl ?? base;
  }, [dbComp, id, portraitOverrideUrl]);

  const loopVideoActive = Boolean(
    showLoopVideo && animatedPortrait && isVideoPortraitUrl(animatedPortrait),
  );
  const portraitAspectClass = loopVideoActive
    ? PROFILE_LOOP_VIDEO_ASPECT_CLASS
    : PORTRAIT_CARD_ASPECT_CLASS;

  const lockedPreviewBannerText = useMemo(() => {
    if (!companion) return "";
    if (isSharedProfileLink) {
      return `A friend shared this LustForge card — meet ${companion.name}. Browse everything below, then acquire the card to unlock chat, live voice, your gallery, and Lovense patterns.`;
    }
    if (discoverPreview) {
      return "Preview from Discover — browse everything below. Acquire this card to unlock chat, live calls, your gallery, and Lovense patterns.";
    }
    return "Preview — browse everything below. Acquire this card to unlock chat, live calls, your gallery, and Lovense patterns.";
  }, [companion, isSharedProfileLink, discoverPreview]);

  useEffect(() => {
    if (typeof document === "undefined" || !companion?.id) return;
    const prevTitle = document.title;
    const shareCanonical = getPublicCompanionProfileShareUrl(companion.id);
    const absoluteImage = absoluteUrlWithPublicSite(stillForProfile);
    const title = `${companion.name} · LustForge`;
    const desc = isSharedProfileLink
      ? `Your friend linked you to ${companion.name} on LustForge — preview the card, then forge your fantasies. (18+)`
      : `${companion.tagline ? `${companion.tagline} ` : ""}Preview on LustForge.`;

    document.title = title;

    const metaRows: { attr: "name" | "property"; key: string; value: string }[] = [
      { attr: "property", key: "og:type", value: "website" },
      { attr: "property", key: "og:title", value: title },
      { attr: "property", key: "og:description", value: desc },
      { attr: "property", key: "og:url", value: shareCanonical },
      { attr: "name", key: "twitter:card", value: "summary_large_image" },
      { attr: "name", key: "twitter:title", value: title },
      { attr: "name", key: "twitter:description", value: desc },
    ];
    if (absoluteImage) {
      metaRows.push(
        { attr: "property", key: "og:image", value: absoluteImage },
        { attr: "property", key: "og:image:secure_url", value: absoluteImage },
        { attr: "name", key: "twitter:image", value: absoluteImage },
      );
    }

    const created: Element[] = [];
    for (const row of metaRows) {
      const el = document.createElement("meta");
      el.setAttribute("data-lf-profile-og", "1");
      el.setAttribute(row.attr, row.key);
      el.setAttribute("content", row.value);
      document.head.appendChild(el);
      created.push(el);
    }
    const descPlain = document.createElement("meta");
    descPlain.setAttribute("data-lf-profile-og", "1");
    descPlain.setAttribute("name", "description");
    descPlain.setAttribute("content", desc);
    document.head.appendChild(descPlain);
    created.push(descPlain);

    return () => {
      document.title = prevTitle;
      created.forEach((n) => n.remove());
    };
  }, [companion?.id, companion?.name, companion?.tagline, stillForProfile, isSharedProfileLink]);

  useEffect(() => {
    if (companion?.id) setAutoSpendChatImagesState(getChatAutoSpendImages(companion.id));
  }, [companion?.id]);

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

  useWindowVisibleRefresh(refreshConnectedToys, Boolean(user?.id));

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

  const stopSustainedToy = useCallback(async () => {
    const s = sustainedToySessionRef.current;
    sustainedToySessionRef.current = null;
    if (s) await s.stop();
    setLivePatternId(null);
  }, []);

  useEffect(() => {
    return () => {
      void stopSustainedToy();
    };
  }, [stopSustainedToy]);

  const triggerProfileVibration = async (row: CompanionVibrationPatternRow) => {
    if (profileFeatureLocked) {
      toast.message("A card must be acquired first", {
        description: "Acquire this card to use Lovense patterns with your toys.",
      });
      return;
    }
    if (!user) {
      navigate("/auth", { state: { from: `/companions/${companion?.id}` } });
      return;
    }
    if (!hasLovenseToy) {
      toast.error("Connect a Lovense toy to use these patterns.");
      return;
    }
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem("lustforge-primary-toy-uid") : null;
    const target =
      (stored && activeToys.some((t) => t.id === stored) ? stored : null) ?? activeToys[0]?.id;
    if (!target) {
      toast.error("No active toy.");
      return;
    }

    if (livePatternId === row.id) {
      setSendingVibrationId(row.id);
      try {
        await stopSustainedToy();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not stop the pattern.");
      } finally {
        setSendingVibrationId(null);
      }
      return;
    }

    const cmd = payloadToLovenseCommand(row.vibration_pattern_pool?.payload);
    if (!cmd) {
      toast.error("Invalid pattern.");
      return;
    }
    setSendingVibrationId(row.id);
    try {
      await stopSustainedToy();
      const session = createSustainedLovenseSession(user.id, { ...cmd, toyId: target });
      sustainedToySessionRef.current = session;
      setLivePatternId(row.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reach your toy.");
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

  useEffect(() => {
    if (!user?.id) {
      setFcBalanceProfile(null);
      setDiscoverFreeCommonClaimed(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("tokens_balance, discover_free_common_claimed")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) {
        setFcBalanceProfile(typeof profile?.tokens_balance === "number" ? profile.tokens_balance : null);
        setDiscoverFreeCommonClaimed(
          typeof profile?.discover_free_common_claimed === "boolean" ? profile.discover_free_common_claimed : null,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!profileFeatureLocked) return;
    setProfileTab((t) => (t !== "profile" ? "profile" : t));
  }, [profileFeatureLocked]);

  useEffect(() => {
    if (!isDropLanding || !weeklyDropId || dropClickTracked) return;
    setDropClickTracked(true);
    void supabase.functions.invoke("zernio-social", {
      body: { mode: "track_drop_click", dropId: weeklyDropId },
    });
  }, [isDropLanding, weeklyDropId, dropClickTracked]);

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

  const copyCompanionShareLink = useCallback(async () => {
    if (!id) return;
    const url = getPublicCompanionProfileShareUrl(id);
    const name = companion?.name ?? "this companion";
    const shareText = `Open ${name}'s card on LustForge — preview the profile, then forge your fantasies. (18+)`;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: `LustForge · ${name}`,
          text: shareText,
          url,
        });
        toast.success("Shared from LustForge");
        return;
      }
    } catch {
      /* user cancelled share sheet */
    }
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied", { description: shareText });
        return;
      }
    } catch {
      /* ignore */
    }
    toast.error("Could not share or copy the link.");
  }, [id, companion?.name]);

  if (isLoading || forgeRowFetching) {
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
    if (profileFeatureLocked) {
      toast.message("A card must be acquired first", {
        description: "Acquire this card to unlock chat and fantasies.",
      });
      return;
    }
    if (!user) {
      navigate("/auth", { state: { from: `/companions/${companion.id}` } });
      return;
    }
    const prompt = starterPrompt?.trim();
    const profileEntry = location.state as { from?: string } | undefined;
    navigate(`/chat/${companion.id}`, {
      state: {
        from: `/companions/${companion.id}`,
        profileBackTarget: profileEntry?.from ?? "/discover",
        starterPrompt: prompt || undefined,
        starterTitle: starterTitle || undefined,
      },
    });
  };

  const handleQuickLiveCall = () => {
    if (profileFeatureLocked) {
      toast.message("A card must be acquired first", {
        description: "Acquire this card to unlock live voice.",
      });
      return;
    }
    if (!user) {
      navigate("/auth", { state: { from: `/companions/${companion.id}` } });
      return;
    }
    void ensureCompanionCallNotifications();
    const ok = stashAndNavigateToLiveCall(navigate, companion.id, companion);
    if (!ok) {
      toast.error("No call style available right now.");
      return;
    }
    void invokeGenerateLiveCallOptions(companion.id);
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

  const handleDiscoverPurchase = async () => {
    if (!id || !companion) return;
    if (!user) {
      navigate("/auth", { state: { from: `/companions/${id}` } });
      return;
    }
    const listPrice = discoverCardPriceFc(rarity);
    const effective = rarity === "common" && discoverFreeCommonClaimed === false ? 0 : listPrice;
    if (fcBalanceProfile !== null && effective > 0 && fcBalanceProfile < effective) {
      toast.error(`Not enough Forge Coins. This card is ${effective} FC — you have ${fcBalanceProfile} FC.`);
      return;
    }
    setPurchasingDiscoverProfile(true);
    try {
      const r = await purchaseDiscoverCompanion(id);
      if (!r.ok) {
        if (r.err === "insufficient_funds") {
          toast.error(`Need ${r.priceFc} FC. You have ${r.newBalance} FC.`);
        } else {
          toast.error(r.err || "Could not complete purchase.");
        }
        setFcBalanceProfile((b) => (b !== null ? r.newBalance : b));
        return;
      }
      setFcBalanceProfile(r.newBalance);
      setPinned(true);
      setHasPaidForThisCard(true);
      void queryClient.invalidateQueries({ queryKey: [...VAULT_COLLECTION_QUERY_KEY, user.id] });
      void queryClient.invalidateQueries({ queryKey: [...PURCHASED_COMPANION_IDS_QUERY_KEY, user.id] });
      if (r.alreadyOwned) {
        toast.message("Already in your collection", { description: companion.name });
      } else {
        toast.success(
          r.priceFc <= 0 ? "Added to your vault — free first Common" : `Added to your vault — ${r.priceFc} FC`,
          { description: companion.name },
        );
        if (r.priceFc <= 0 && rarity === "common") setDiscoverFreeCommonClaimed(true);
      }
      const from = (location.state as { from?: string } | null)?.from;
      navigate({ pathname: `/companions/${id}`, search: "" }, { replace: true, state: from ? { from } : {} });
    } finally {
      setPurchasingDiscoverProfile(false);
      setBuyConfirmProfileOpen(false);
    }
  };

  const badge = RARITY_BADGE[rarity];

  function ProfileDiscoverRow({
    className,
    hideCollectionPin,
  }: {
    className?: string;
    hideCollectionPin?: boolean;
  }) {
    return (
      <div
        className={cn(
          "flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-black/35 px-4 py-3 backdrop-blur-md sm:flex-row sm:flex-wrap sm:items-center",
          className,
        )}
      >
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
          {!hideCollectionPin ? (
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
          ) : null}
        </div>
        {user && companion && !profileFeatureLocked && !isDropLanding && id ? (
          <div className="mt-3 w-full min-w-0 border-t border-white/[0.06] pt-3">
            <ProfileLoopingVideoUpsell
              companionId={companion.id}
              hasExistingLoopVideo={Boolean(
                companion.animated_image_url?.trim() &&
                  isVideoPortraitUrl(companion.animated_image_url),
              )}
              disabled={false}
              tokensBalance={fcBalanceProfile}
              isAdminUser={isAdminUser}
              onViewGallery={() => setProfileTab("gallery")}
              onSuccess={() => {
                void queryClient.invalidateQueries({ queryKey: ["companions"] });
                void queryClient.invalidateQueries({ queryKey: ["portrait-override", user?.id, id] });
                if (user?.id && companion.id) {
                  void queryClient.invalidateQueries({
                    queryKey: ["companion-generated-images", user.id, companion.id],
                  });
                }
              }}
              onBalanceMaybeChanged={() => {
                if (!user?.id) return;
                void supabase
                  .from("profiles")
                  .select("tokens_balance")
                  .eq("user_id", user.id)
                  .maybeSingle()
                  .then(({ data }) => {
                    setFcBalanceProfile(typeof data?.tokens_balance === "number" ? data.tokens_balance : null);
                  });
              }}
            />
          </div>
        ) : null}
      </div>
    );
  }

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
          user && !profileFeatureLocked && !isDropLanding
            ? "max-md:pb-[max(9.25rem,calc(5.75rem+env(safe-area-inset-bottom,0px)+3.25rem))] md:pb-20"
            : user
              ? "pb-mobile-nav md:pb-20"
              : "pb-16 sm:pb-20",
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
            navigate("/discover");
          }}
          className="flex items-center gap-2 text-muted-foreground hover:text-primary text-sm mb-8 transition-colors touch-manipulation"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Back
        </motion.button>

        <div className="grid lg:grid-cols-[minmax(0,460px)_1fr] gap-10 lg:gap-14 items-start">
          {/* Still portrait: 2:3. Looping MP4: 9:16 frame to match typical I2V output; single video layer + object-cover. */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="mx-auto w-full max-w-[min(100%,460px)] lg:mx-0 lg:max-w-none"
          >
            <TierHaloPortraitFrame
              variant="card"
              frameStyle="clean"
              rarity={rarity}
              gradientFrom={companion.gradientFrom}
              gradientTo={companion.gradientTo}
              overlayUrl={dbComp?.rarity_border_overlay_url}
              aspectClassName={cn(portraitAspectClass, "w-full")}
              rarityFrameBleed
              profilePolish={loopVideoActive}
              neonEdgeBreathing={false}
            >
              <PortraitViewLightbox
                alt={companion.name}
                stillSrc={stillForProfile}
                animatedSrc={lightboxAnimated}
                triggerClassName={cn("w-full", profileTierHaloInnerRoundClass("card", "clean"))}
              >
                <div
                  className={cn(
                    "relative h-full min-h-0 w-full overflow-hidden",
                    profileTierHaloInnerRoundClass("card", "clean"),
                    loopVideoActive ? "bg-black" : "bg-black/15",
                  )}
                >
                  {isAbyssal && <AbyssalProfileParticles />}
                  <div
                    className="absolute inset-0 z-0"
                    style={
                      loopVideoActive
                        ? { background: "#000" }
                        : {
                            background: `linear-gradient(160deg, ${companion.gradientFrom}66, ${companion.gradientTo}55)`,
                          }
                    }
                  />
                  {loopVideoActive && animatedPortrait ? (
                    <video
                      key={animatedPortrait}
                      className="absolute inset-0 z-[2] h-full w-full object-cover object-center ring-0 outline-none"
                      src={animatedPortrait}
                      poster={stillForProfile ?? undefined}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="auto"
                    />
                  ) : animatedPortrait && !isVideoPortraitUrl(animatedPortrait) ? (
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
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent",
                      loopVideoActive ? "z-[3]" : "z-[1]",
                    )}
                  />
                  <RarityTierCaption rarity={rarity} />
                </div>
              </PortraitViewLightbox>
            </TierHaloPortraitFrame>
            {profileFeatureLocked ? (
              <div className="mt-4 rounded-2xl border border-primary/35 bg-gradient-to-br from-primary/15 via-black/40 to-fuchsia-950/25 px-4 py-3 space-y-2 shadow-[0_0_28px_rgba(255,45,123,0.12)]">
                <p className="text-[11px] text-muted-foreground leading-relaxed">{lockedPreviewBannerText}</p>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (!user) {
                      navigate("/auth", { state: { from: `/companions/${companion.id}` } });
                      return;
                    }
                    setBuyConfirmProfileOpen(true);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-primary/50 bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25"
                >
                  <Crown className="h-4 w-4 shrink-0" />
                  Acquire card · {discoverEffectiveFc <= 0 ? "FREE" : `${discoverListFc} FC`}
                  <Gem className="h-4 w-4 shrink-0 opacity-90" />
                </motion.button>
              </div>
            ) : null}
            {vibeTraits.length > 0 ? (
              <div className="mt-4 flex justify-center px-1 pointer-events-auto">
                <CompanionVibeTraitStrip traits={vibeTraits} size="md" max={8} />
              </div>
            ) : null}
            <div className="mt-6 hidden lg:block">
              <ProfileDiscoverRow />
            </div>
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
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => void copyCompanionShareLink()}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-foreground/90 hover:border-primary/40 hover:text-primary touch-manipulation"
                >
                  <Share2 className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                  Share {companion.name}&apos;s profile
                </motion.button>
                <span className="text-[10px] text-muted-foreground leading-snug max-w-[14rem] sm:max-w-md">
                  Uses your public site URL ({getPublicSiteOrigin().replace(/^https?:\/\//, "")}), not this browser
                  tab&apos;s host — friends land on this companion&apos;s profile; chat and live stay locked until they
                  acquire the card.
                </span>
              </div>
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
                <span className="inline-flex items-center gap-2">
                  <RarityBadgeIcon rarity={rarity} className="shrink-0" />
                  <span className="font-semibold tracking-wide text-foreground/88">{badge.label}</span>
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
                <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-muted-foreground/72">
                  {companion.id.startsWith("cc-") ? (
                    <>
                      <span className="tracking-[0.12em] uppercase text-[10px] text-muted-foreground/88">
                        Forge creation
                      </span>
                      {companion.galleryCredit ? (
                        <>
                          <span className="text-muted-foreground/40" aria-hidden>
                            ·
                          </span>
                          <span className="text-foreground/78">
                            created by <span className="font-medium text-foreground/90">{companion.galleryCredit}</span>
                          </span>
                        </>
                      ) : null}
                    </>
                  ) : (
                    <span>Catalog</span>
                  )}
                  {companion.isNexusHybrid ? (
                    <>
                      <span className="text-muted-foreground/40" aria-hidden>
                        ·
                      </span>
                      <span className="text-fuchsia-200/85">Nexus hybrid</span>
                    </>
                  ) : null}
                </span>
              </p>
            </div>

            {user && companion && !profileFeatureLocked ? (
              <ChatAutoSpendImagesToggle
                variant="profile"
                enabled={autoSpendChatImages}
                onChange={(enabled) => {
                  setAutoSpendChatImagesState(enabled);
                  setChatAutoSpendImages(companion.id, enabled);
                }}
              />
            ) : null}

            <div
              className={cn(
                "flex max-w-2xl rounded-2xl border border-white/[0.08] bg-black/45 p-1 gap-0.5",
                "max-md:snap-x max-md:snap-mandatory max-md:overflow-x-auto max-md:pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              )}
            >
              <button
                type="button"
                disabled={isDropLanding}
                onClick={() => setProfileTab("profile")}
                className={cn(
                  "flex-1 min-w-0 rounded-xl py-2.5 text-xs sm:text-sm font-semibold transition-colors touch-manipulation",
                  "max-md:min-h-[48px] max-md:min-w-[33%] max-md:snap-start max-md:shrink-0 max-md:px-1",
                  isDropLanding && "cursor-not-allowed opacity-60",
                  profileTab === "profile"
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Profile
              </button>
              <button
                type="button"
                disabled={isDropLanding}
                title={profileFeatureLocked ? "Acquire this card to use your gallery" : undefined}
                onClick={() => {
                  if (isDropLanding) return;
                  if (profileFeatureLocked) {
                    toast.message("A card must be acquired first", {
                      description: "Acquire this card to open your gallery and chat saves.",
                    });
                    return;
                  }
                  setProfileTab("gallery");
                }}
                className={cn(
                  "flex-1 min-w-0 inline-flex items-center justify-center gap-1 sm:gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-semibold transition-colors touch-manipulation",
                  "max-md:min-h-[48px] max-md:min-w-[33%] max-md:snap-start max-md:shrink-0 max-md:px-1",
                  isDropLanding && "cursor-not-allowed opacity-60",
                  profileTab === "gallery"
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Images className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="truncate">Gallery</span>
              </button>
              <button
                type="button"
                disabled={isDropLanding}
                title={profileFeatureLocked ? "Acquire this card for live calls" : undefined}
                onClick={() => {
                  if (isDropLanding) return;
                  if (profileFeatureLocked) {
                    toast.message("A card must be acquired first", {
                      description: "Acquire this card to unlock live voice.",
                    });
                    return;
                  }
                  if (!user) {
                    navigate("/auth", { state: { from: `/companions/${companion.id}` } });
                    return;
                  }
                  setProfileTab("live");
                }}
                className={cn(
                  "flex-1 min-w-0 inline-flex items-center justify-center gap-1 sm:gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-semibold transition-colors touch-manipulation",
                  "max-md:min-h-[48px] max-md:min-w-[33%] max-md:snap-start max-md:shrink-0 max-md:px-1",
                  isDropLanding && "cursor-not-allowed opacity-60",
                  profileTab === "live"
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="truncate">Live call</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              {isDropLanding ? (
                <>
                  <PremiumDisabledButton
                    label="Start chat"
                    hint="Chat unlocks full in-character conversation with this companion."
                    icon={<MessageCircle className="h-5 w-5 shrink-0" />}
                  />
                  <PremiumDisabledButton
                    label="Live call"
                    hint="Live call opens real-time voice sessions with adaptive responses."
                    icon={<Phone className="h-4 w-4 shrink-0" />}
                  />
                  <PremiumDisabledButton
                    label="Selfie studio"
                    hint="Selfie studio generates custom portraits in this companion’s style."
                    icon={<Images className="h-4 w-4 shrink-0" />}
                  />
                </>
              ) : profileFeatureLocked ? (
                <>
                  <PremiumDisabledButton
                    label="Start chat"
                    hint="A card must be acquired first — then chat and fantasies unlock for this companion."
                    icon={<MessageCircle className="h-5 w-5 shrink-0" />}
                  />
                  <PremiumDisabledButton
                    label="Live call"
                    hint="A card must be acquired first to unlock live voice with this companion."
                    icon={<Phone className="h-4 w-4 shrink-0" />}
                  />
                  <Link
                    to="/discover"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-card/60 px-5 py-3.5 text-sm font-semibold text-muted-foreground backdrop-blur-md hover:border-primary/35 hover:text-primary transition-colors"
                  >
                    <Flame className="h-4 w-4" />
                    Discover
                  </Link>
                </>
              ) : (
                <>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleStartChat()}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-primary px-5 py-3 text-base font-bold text-primary-foreground shadow-lg shadow-primary/30 glow-pink touch-manipulation max-md:min-h-[48px]"
                  >
                    <MessageCircle className="h-5 w-5 shrink-0" />
                    Start chat
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleQuickLiveCall()}
                    className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-card/70 px-5 py-3 text-sm font-bold text-primary backdrop-blur-md touch-manipulation max-md:min-h-[48px]"
                  >
                    <Phone className="h-5 w-5 shrink-0" />
                    Live call
                  </motion.button>
                  <Link
                    to="/discover"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-card/60 px-5 py-3.5 text-sm font-semibold text-muted-foreground backdrop-blur-md hover:border-primary/35 hover:text-primary transition-colors"
                  >
                    <Flame className="h-4 w-4" />
                    Discover
                  </Link>
                </>
              )}
            </div>

            {(companion.appearance?.trim() || companion.personality?.trim()) ? (
              <section className="rounded-2xl border border-white/[0.08] bg-black/35 p-4 sm:p-5 ring-1 ring-white/[0.05] backdrop-blur-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary/85">Look &amp; voice</p>
                  <button
                    type="button"
                    onClick={() => setBioExpanded((v) => !v)}
                    className="text-[11px] font-semibold text-primary/90 hover:underline touch-manipulation"
                  >
                    {bioExpanded ? "Show less" : "Show full"}
                  </button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                  <div>
                    <h3 className="mb-1.5 flex items-center gap-1.5 font-gothic text-sm font-bold text-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                      Appearance
                    </h3>
                    <div
                      className={cn(
                        "space-y-2 text-[13px] leading-snug text-muted-foreground/92",
                        !bioExpanded && "line-clamp-6",
                      )}
                    >
                      {appearanceParagraphs.length > 0 ? (
                        appearanceParagraphs.map((p, i) => (
                          <p key={i}>{p}</p>
                        ))
                      ) : (
                        <p>{companion.appearance}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-1.5 flex items-center gap-1.5 font-gothic text-sm font-bold text-foreground">
                      <Heart className="h-3.5 w-3.5 text-primary shrink-0" />
                      Personality
                    </h3>
                    <div
                      className={cn(
                        "space-y-2 text-[13px] leading-snug text-muted-foreground/92",
                        !bioExpanded && "line-clamp-6",
                      )}
                    >
                      {personalityParagraphs.length > 0 ? (
                        personalityParagraphs.map((p, i) => (
                          <p key={i}>{p}</p>
                        ))
                      ) : (
                        <p>{companion.personality}</p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {backstoryParagraphs.length > 0 ? (
              <details className="group rounded-2xl border border-primary/20 bg-gradient-to-b from-black/55 via-black/40 to-black/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-white/[0.06] open:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_28px_rgba(168,85,247,0.06)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0 text-left">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary/85 mb-1">Chronicle</p>
                    <h2 className="font-gothic text-lg sm:text-xl font-bold text-foreground">Their story</h2>
                    <p className="mt-1 text-xs text-muted-foreground/85 sm:hidden">Tap to expand</p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>
                <div className="space-y-4 border-t border-white/[0.06] px-5 pb-5 pt-4 text-sm sm:text-[15px] leading-relaxed text-muted-foreground/95 sm:px-6 sm:pb-6 max-w-prose">
                  {backstoryParagraphs.map((p, i) => (
                    <p
                      key={i}
                      className="first-letter:text-primary first-letter:font-gothic first-letter:text-2xl sm:first-letter:text-3xl first-letter:float-left first-letter:mr-2 first-letter:leading-none"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </details>
            ) : null}

            {profileTab === "live" ? (
              <section className="rounded-2xl border border-white/[0.1] bg-black/45 backdrop-blur-xl p-5 sm:p-6 ring-1 ring-primary/15">
                <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-primary mb-1">Live call</h2>
                {user ? (
                  <LiveCallTypePanel companion={companion} className="mt-2" />
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground py-6 text-center border border-dashed border-white/15 rounded-xl">
                    <Link to="/auth" state={{ from: `/companions/${companion.id}` }} className="text-primary font-semibold hover:underline">
                      Sign in
                    </Link>{" "}
                    for voice sessions with {companion.name}.
                  </p>
                )}
              </section>
            ) : null}

            {profileTab === "gallery" ? (
              <section className="rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-5 sm:p-6">
                <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-primary mb-1">Saved from chat</h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-xl">
                  Chat selfies and scenes live here, plus looping portrait videos after you generate them. Tap any{" "}
                  <span className="text-foreground/90 font-medium">still</span> and use{" "}
                  <span className="text-foreground/90 font-medium">Set as portrait</span> to make it {companion.name}
                  &apos;s main profile image (videos are for viewing only).
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

            <div className="lg:hidden">
              <ProfileDiscoverRow />
            </div>

            <VibeTraitProfilePanel traits={vibeTraits} isNexus={Boolean(companion.isNexusHybrid)} />

            {companion.kinks.length > 0 ? (
              <div className="rounded-2xl border border-primary/20 bg-black/40 p-5 backdrop-blur-xl ring-1 ring-primary/10">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/90 mb-1">
                  Kinks &amp; interests
                </p>
                <h3 className="mb-4 font-gothic text-xl font-bold text-foreground">Signature cravings</h3>
                <div className="flex flex-wrap gap-2">
                  {companion.kinks.map((kink) => (
                    <span
                      key={kink}
                      className="rounded-full border border-primary/28 bg-black/35 px-3 py-1 text-xs font-medium text-foreground/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
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
                      {profileFeatureLocked
                        ? "Acquire this card to send patterns to your toy."
                        : hasLovenseToy
                          ? `Tap to send ${companion.name}'s curated patterns to your linked toy.`
                          : "Tap Pair toy to scan the QR, or use Settings → Device connection."}
                    </p>
                  </div>
                  {profileFeatureLocked ? null : !hasLovenseToy ? (
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
                    disabled={!hasLovenseToy || profileFeatureLocked}
                    sendingId={sendingVibrationId}
                    activePatternId={livePatternId}
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
        <section className="mt-8 sm:mt-10">
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
                  onClick={() => {
                    if (isDropLanding) return;
                    if (profileFeatureLocked) {
                      toast.message("A card must be acquired first", {
                        description: "Acquire this card to begin this fantasy in chat.",
                      });
                      return;
                    }
                    handleStartChat(starter.description, starter.title);
                  }}
                  disabled={isDropLanding}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border border-white/[0.1] bg-gradient-to-br from-card/90 via-card/70 to-black/40 p-5 sm:p-6 text-left shadow-lg shadow-black/30 ring-1 ring-white/[0.04] backdrop-blur-xl transition-[border-color,box-shadow] touch-manipulation",
                    isDropLanding
                      ? "cursor-not-allowed opacity-65"
                      : profileFeatureLocked
                        ? "opacity-80 hover:border-primary/35"
                        : "hover:border-primary/45 hover:shadow-[0_0_36px_rgba(255,45,123,0.18)]",
                  )}
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
                    {isDropLanding ? "Feature preview" : profileFeatureLocked ? "Unlock to begin" : "Begin this fantasy"}
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  {isDropLanding ? (
                    <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <div className="rounded-lg border border-white/10 bg-black/85 px-3 py-2 text-[11px] text-white/85 backdrop-blur-md">
                        Fantasy starters launch straight into immersive chat scenes.
                      </div>
                    </div>
                  ) : null}
                </motion.button>
              ))}
            </div>
          )}
        </section>

        {/* Tags — merged for search (gender, orientation, role, forge tags) */}
        <div className="mt-6 flex flex-wrap gap-2">
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

        {user && !profileFeatureLocked && !isDropLanding && companion ? (
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[55] md:hidden px-3 pt-2 pb-[max(5.75rem,calc(4.75rem+env(safe-area-inset-bottom,0px)))] bg-gradient-to-t from-black via-black/90 to-transparent">
            <div className="pointer-events-auto mx-auto max-w-lg">
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => handleStartChat()}
                className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl border border-primary/35 bg-primary px-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/25 touch-manipulation"
              >
                <MessageCircle className="h-5 w-5 shrink-0" />
                Start chat
              </motion.button>
            </div>
          </div>
        ) : null}
      </main>

      <DiscoverPurchaseConfirmDialog
        open={buyConfirmProfileOpen}
        name={companion.name}
        tagline={companion.tagline}
        rarity={rarity}
        fcBalance={fcBalanceProfile}
        purchasing={purchasingDiscoverProfile}
        priceOverrideFc={user && rarity === "common" && discoverFreeCommonClaimed === false ? 0 : undefined}
        onClose={() => {
          if (purchasingDiscoverProfile) return;
          setBuyConfirmProfileOpen(false);
        }}
        onConfirm={() => void handleDiscoverPurchase()}
      />

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
