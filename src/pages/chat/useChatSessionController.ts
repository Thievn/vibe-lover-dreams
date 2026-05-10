import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useCompanions, dbToCompanion, type DbCompanion } from "@/hooks/useCompanions";
import { useForgeCompanionOverlay } from "@/hooks/useForgeCompanionOverlay";
import { useCompanionDisplayOverride } from "@/hooks/useCompanionDisplayOverride";
import { mergeCompanionDisplayWithUserOverride } from "@/lib/mergeCompanionDisplayOverride";
import { stripDiscoverForgeTemplateCanonicalLoop } from "@/lib/discoverTemplateMedia";
import { prependCanonicalPortraitIfMissing } from "@/lib/companionGalleryWithCanonical";
import { useCompanionGeneratedImages } from "@/hooks/useCompanionGeneratedImages";
import {
  galleryStaticPortraitUrl,
  profileAnimatedPortraitUrl,
  isVideoPortraitUrl,
  shouldShowProfileLoopVideo,
  resolveChatLikenessReferenceHttpsUrl,
} from "@/lib/companionMedia";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { invokeGenerateImage } from "@/lib/invokeGenerateImage";
import { invokeGenerateLiveCallOptions } from "@/lib/invokeGenerateLiveCallOptions";
import { matchesSafeWord } from "@/lib/matchesSafeWord";
import { isPlatformAdmin } from "@/config/auth";
import { isCompanionProfileTeaserMode } from "@/config/publicLaunch";
import { hasUserPurchasedCompanionCard } from "@/lib/hasUserPurchasedCompanionCard";
import { toast } from "sonner";
import { useCompanionRelationship } from "@/hooks/useCompanionRelationship";
import {
  getToys,
  sendCommand,
  testToy,
  disconnectToy,
  stopAllUserToys,
  setToyEnabled,
  LovenseToy,
  LovenseCommand,
} from "@/lib/lovense";
import { buildChatSystemPrompt } from "@/lib/companionSystemPrompts";
import { useCompanionVibrationPatterns, type CompanionVibrationPatternRow } from "@/hooks/useCompanionVibrationPatterns";
import { payloadToLovenseCommand } from "@/lib/vibrationPatternPayload";
import { createSustainedLovenseSession } from "@/lib/sustainedLovenseSession";
import {
  getChatSessionMode,
  setChatSessionMode as persistChatSessionMode,
  type ChatSessionMode,
} from "@/lib/chatSessionMode";
import { buildLiveVoiceSystemPrompt } from "@/lib/liveVoiceSystemPrompt";
import { buildRampModeSystemAppend } from "@/lib/rampModePrompt";
import type { RampPresetId } from "@/lib/rampModePresets";
import { RAMP_PRESET_IDS } from "@/lib/rampModePresets";
import { messageFromFunctionsInvoke } from "@/lib/supabaseFunctionsError";
import {
  forgeBodyCategoryIdForType,
  inferForgeBodyTypeFromAppearance,
  inferForgeBodyTypeFromTags,
} from "@/lib/forgeBodyTypes";
import { resolveChatArtStyleLabel } from "@/lib/chatArtStyle";
import type { FabActionId } from "@/components/chat/ChatQuickActionFab";
import type { ChatMessage } from "@/components/chat/chatTypes";
import { deriveChatMood } from "@/lib/chatMood";
import {
  getLiveVoiceTtsAutoplay,
  getTtsAutoplay,
  persistLiveVoiceTtsAutoplay,
  persistTtsAutoplay,
} from "@/lib/ttsChatPreferences";
import {
  TTS_UX_LABELS,
  resolveUxVoiceId,
  uxVoiceToXaiVoice,
  type TtsUxVoiceId,
} from "@/lib/ttsVoicePresets";
import { CHAT_IMAGE_LEWD_FC, CHAT_IMAGE_NUDE_FC, CHAT_MESSAGE_FC, CHAT_MESSAGE_FC_AFTER_DAILY_FREE } from "@/lib/forgeEconomy";
import { consumeChatMessageQuota, spendForgeCoins } from "@/lib/forgeCoinsClient";
import { nextTextMessageFc, remainingFreeMessages } from "@/lib/chatDailyQuota";
import { LIVE_CALL_CREDITS_PER_MINUTE } from "@/lib/liveCallBilling";
import { stashAndNavigateToLiveCall } from "@/lib/navigateToLiveCall";
import { setCompanionPortraitFromGalleryUrl } from "@/lib/setCompanionPortraitFromGallery";
import { useLovensePairing } from "@/hooks/useLovensePairing";
import { useWindowVisibleRefresh } from "@/hooks/useWindowVisibleRefresh";
import {
  CHAT_VIDEO_TOKEN_COST,
  FAB_SELFIE,
  FREE_NSFW_CHAT_IMAGES,
  getChatAutoSpendImages,
  getFreeNsfwImagesUsed,
  incrementFreeNsfwImagesUsed,
  isExplicitImageRequest,
  resolveChatImageGenerationPrompt,
  resolveFabDisplay,
  setChatAutoSpendImages,
} from "@/lib/chatImageSettings";
import {
  buildMasterChatImagePrompt,
  classifyChatImageMood,
  pickMenuImageTeaserLine,
} from "@/lib/masterChatImagePrompt";
import { resolveEffectiveCharacterReference } from "@/lib/characterReferenceImagePrompt";
import { chatLikenessSameSubjectMandate } from "@/lib/chatLikenessAnchors";
import { fetchChatImageTeaserLine } from "@/lib/fetchChatImageTeaserLine";
import { inferChatMediaRoute, inferClipMoodFromUserText, pickRandomVideoLoadingLine } from "@/lib/chatVisualRouting";
import { invokeGenerateChatVideo } from "@/lib/invokeGenerateChatVideo";
import { type ChatMediaBarAction } from "@/components/chat/ChatMediaRequestBar";
import { CHAT_IN_SESSION_VIDEO_CLIPS_COMING_SOON } from "@/lib/chatVisualRouting";
import {
  advanceChatAffectionState,
  buildAffectionLevelUpCopy,
  messagesNeededForNextLevel,
  tierToLegacyAffectionPct,
  type AffectionRewardKind,
} from "@/lib/chatAffection";
import { pickRandomAffectionStillPreset } from "@/lib/chatStillMenuCategories";
import { parseAssistantDisplayContent } from "@/lib/chatSignatureBeat";
import { parseAssistantStructuredBlocks } from "@/lib/parseAssistantStructuredBlocks";
import type { LustforgeMediaRequest } from "@/lib/parseLustforgeMediaRequest";

/** Optional second arg for `sendMessage`: internal image brief (not shown in chat) + skip confirm for + menu. */
type SendMessageOptions = {
  imageGenerationPrompt?: string;
  /** Smart photo menu: merged into the image scene after the tier base (FAB) prompt. */
  styledSceneExtension?: string;
  bypassImageConfirmation?: boolean;
  /** True for + menu / media bar / FAB — may use free NSFW slots. Typed free-text requests are always charged. */
  imageRequestFromMenu?: boolean;
  /** User row already inserted (e.g. live voice transcript) — do not insert again. */
  skipUserMessageInsert?: boolean;
  existingUserMessageId?: string;
};
/** In-thread caption when a still returns — no “generating” / pipeline language. */
const CHAT_STILL_DELIVERY_CAPTION = "*sends you a still — just for you.*";

const SMART_FALLBACK = ["Tell me more…", "I want you closer.", "Surprise me."];

export function useChatSessionController() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const { data: dbCompanions, isLoading: companionsLoading } = useCompanions();
  const { dbComp, forgeLookupBusy } = useForgeCompanionOverlay(id, dbCompanions, companionsLoading);
  const { data: displayOverride } = useCompanionDisplayOverride(id, user?.id);
  const dbCompStripped = useMemo(() => stripDiscoverForgeTemplateCanonicalLoop(dbComp), [dbComp]);
  const dbCompDisplay = useMemo(
    () => mergeCompanionDisplayWithUserOverride(dbCompStripped, displayOverride ?? undefined) ?? dbCompStripped,
    [dbCompStripped, displayOverride],
  );
  const companion = dbCompDisplay ? dbToCompanion(dbCompDisplay) : null;

  const breedingPartnerDb = useMemo((): DbCompanion | null => {
    if (!dbComp || !dbCompanions?.length) return null;
    const others = dbCompanions.filter((c) => c.id !== dbComp.id);
    if (others.length === 0) return null;
    if (user?.id) {
      const mine = others.filter((c) => c.user_id === user.id);
      if (mine.length > 0) return mine[Math.floor(Math.random() * mine.length)]!;
    }
    return others[Math.floor(Math.random() * others.length)]!;
  }, [dbComp, dbCompanions, user?.id]);
  const basePortraitUrl = useMemo(() => galleryStaticPortraitUrl(dbCompDisplay, id), [dbCompDisplay, id]);
  const headerAnimated = useMemo(() => {
    const raw = profileAnimatedPortraitUrl(dbCompDisplay);
    if (shouldShowProfileLoopVideo(dbCompDisplay, dbCompDisplay?.profile_loop_video_enabled)) return raw ?? null;
    if (raw && !isVideoPortraitUrl(raw)) return raw;
    return null;
  }, [dbCompDisplay]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokensBalance, setTokensBalance] = useState<number>(0);
  /** False until first `fetchTokens` completes — avoids treating initial 0 as broke. */
  const [forgeBalanceReady, setForgeBalanceReady] = useState(false);
  /** UTC date key from `profiles.chat_daily_quota_date` + raw used count (DB resets in `chat_consume_message_quota`). */
  const [chatDailyQuotaDate, setChatDailyQuotaDate] = useState<string | null>(null);
  const [chatDailyQuotaUsed, setChatDailyQuotaUsed] = useState(0);
  const [safeWord] = useState(() => localStorage.getItem("lustforge-safeword") || "RED");
  const [connectedToys, setConnectedToys] = useState<LovenseToy[]>([]);
  const [primaryToyUid, setPrimaryToyUid] = useState<string | null>(null);
  const [toysPanelLoading, setToysPanelLoading] = useState(false);
  const [viewingImage, setViewingImage] = useState<ChatMessage | null>(null);
  const [showBreedingRitual, setShowBreedingRitual] = useState(false);
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);
  const [voicePresetSaving, setVoicePresetSaving] = useState(false);
  const [profileTtsGlobal, setProfileTtsGlobal] = useState<string | null>(null);
  const [ttsAutoplay, setTtsAutoplayState] = useState(() => getTtsAutoplay());
  /** Default ON: Live Voice is a voice session — TTS is independent of classic “auto-play new replies.” */
  const [liveVoiceTtsAutoplay, setLiveVoiceTtsAutoplay] = useState(() => getLiveVoiceTtsAutoplay());
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>(SMART_FALLBACK);
  const [heartBursts, setHeartBursts] = useState<{ id: number; x: string }[]>([]);
  const heartIdRef = useRef(0);
  const prevChatAffectionTierRef = useRef<number | null>(null);
  const prevLoadingRef = useRef(false);
  const [ttsLoadingId, setTtsLoadingId] = useState<string | null>(null);
  const [ttsPlayingId, setTtsPlayingId] = useState<string | null>(null);
  /** Optional word index highlight while TTS plays (driven by audio `timeupdate`). */
  const [ttsWordHighlight, setTtsWordHighlight] = useState<{ messageId: string; wordIndex: number } | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAudioListenerDetachRef = useRef<(() => void) | null>(null);
  const ttsWordUpdateLastMsRef = useRef(0);
  const [sendingVibrationId, setSendingVibrationId] = useState<string | null>(null);
  const [livePatternId, setLivePatternId] = useState<string | null>(null);
  const sustainedToySessionRef = useRef<{ stop: () => Promise<void> } | null>(null);
  /** True when the active sustained Lovense session was started from TTS `playing` (stop when TTS ends or is replaced). */
  const lovenseSustainedFromTtsRef = useRef(false);
  /** When TTS autoplay is on, queue here and run after playback starts in `handleTts` (avoids toy-before-voice). */
  const pendingLovenseForTtsRef = useRef<{ messageId: string; command: unknown } | null>(null);
  const executeDeviceCommandRef = useRef<(command: unknown, opts?: { fromTts?: boolean }) => Promise<void>>(
    async () => {},
  );
  const [toyDriveActive, setToyDriveActive] = useState(false);
  const [sessionMode, setSessionMode] = useState<ChatSessionMode>(() => getChatSessionMode());
  /** Live Voice — Ramp Mode (prompt + Lovense driver, see LiveVoicePanel). */
  const [rampModeActive, setRampModeActive] = useState(false);
  const [rampPreset, setRampPreset] = useState<RampPresetId>("gentle_tease");
  /** Increment to force Live Voice mic cleanup on emergency (safe word, leave chat, etc.). */
  const [liveVoiceStopTick, setLiveVoiceStopTick] = useState(0);
  /** Billable seconds while the Live Voice mic is open (ceil to started minutes on hang-up). */
  const [liveVoiceElapsedSec, setLiveVoiceElapsedSec] = useState(0);
  const liveVoiceBillableSecRef = useRef(0);
  const [liveVoiceMicRecording, setLiveVoiceMicRecording] = useState(false);
  const prevSessionModeForLiveVoiceRef = useRef(sessionMode);
  const [toyUtilityBusy, setToyUtilityBusy] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [savingBackupImageId, setSavingBackupImageId] = useState<string | null>(null);
  /** User asked for an image; waiting for "Generate" tap (when auto-spend is off). */
  const [imageGenPending, setImageGenPending] = useState<{
    userMessageId: string;
    prompt: string;
    rawUserMessage: string;
    fromMenu: boolean;
    menuImagePrompt: string | null;
    /** True when user picked a concrete selfie/lewd preset (styled scene) — scene must not follow portrait/packshot. */
    lockSceneToMenuPreset?: boolean;
  } | null>(null);
  const [autoSpendChatImages, setAutoSpendChatImages] = useState(false);
  const starterSentRef = useRef(false);
  /** Keeps token checks in sync with async `fetchTokens` before React state flushes (fantasy starters). */
  const tokensBalanceRef = useRef(0);
  const messagesRef = useRef<ChatMessage[]>([]);
  const sendMessageRef = useRef<(text?: string, opts?: SendMessageOptions) => Promise<void>>(async () => {});
  const connectedToysRef = useRef(connectedToys);
  const userIdRef = useRef(user?.id);
  useEffect(() => {
    connectedToysRef.current = connectedToys;
  }, [connectedToys]);
  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);
  /** Live Voice: Ramp assist feed + STT use stable `sendMessageRef` / register callback to avoid effect churn. */
  const liveRampAssistFeedRef = useRef<((text: string) => void) | null>(null);
  const liveVoiceSendText = useCallback((text: string) => {
    void sendMessageRef.current(text);
  }, []);
  const registerLiveRampAssistFeed = useCallback((fn: ((text: string) => void) | null) => {
    liveRampAssistFeedRef.current = fn;
  }, []);
  /** Defer Ramp text → driver until her TTS actually starts (syncs with Lovense JSON after `playing`). */
  const rampNarrationPendingRef = useRef<{ messageId: string; text: string } | null>(null);
  const openingFantasyStarterTitleRef = useRef<string | null>(null);
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const portraitStillUrl = id ? basePortraitUrl ?? null : null;
  const { data: galleryImagesRaw = [], isLoading: galleryImagesLoading } = useCompanionGeneratedImages(id, user?.id);
  const canonicalCardStillForGallery = useMemo(
    () => (id && dbCompStripped ? galleryStaticPortraitUrl(dbCompStripped, id) : null),
    [dbCompStripped, id],
  );
  const galleryImages = useMemo(
    () =>
      prependCanonicalPortraitIfMissing(galleryImagesRaw, {
        companionId: id ?? "",
        canonicalStillUrl: canonicalCardStillForGallery,
        sortTimestamp: dbCompStripped?.created_at,
      }),
    [galleryImagesRaw, id, canonicalCardStillForGallery, dbCompStripped?.created_at],
  );

  const isAdminUser = useMemo(() => isPlatformAdmin(user), [user]);

  const isOwnForgeChat = useMemo(
    () => Boolean(user?.id && dbComp?.user_id === user.id && companion?.id?.startsWith("cc-")),
    [user?.id, dbComp?.user_id, companion?.id],
  );

  useEffect(() => {
    if (!user?.id || !companion || !id || companion.id !== id) return;
    if (isOwnForgeChat) return;
    let cancelled = false;
    void (async () => {
      const ok = await hasUserPurchasedCompanionCard(user.id, id);
      if (cancelled || ok) return;
      toast.message("A card must be acquired first", {
        description: "Acquire this companion in their profile to unlock chat and live sessions.",
      });
      navigate(`/companions/${id}?shared=1`, { replace: true, state: { from: `/chat/${id}` } });
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, companion?.id, id, isOwnForgeChat, navigate]);

  const lastAssistantText = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i].content;
    }
    return "";
  }, [messages]);

  const {
    relationship,
    gifts,
    loading: relationshipLoading,
    refresh: refreshRelationship,
  } = useCompanionRelationship(companion?.id || "");

  const mood = useMemo(
    () =>
      deriveChatMood(
        tierToLegacyAffectionPct(relationship?.chat_affection_level ?? 1),
        lastAssistantText,
        companion?.personality ?? "",
      ),
    [relationship?.chat_affection_level, lastAssistantText, companion?.personality],
  );

  const affectionTier = relationship?.chat_affection_level ?? 1;
  const affectionProgress = relationship?.chat_affection_progress ?? 0;
  const affectionProgressMax = useMemo(
    () => messagesNeededForNextLevel(affectionTier) || 1,
    [affectionTier],
  );

  const effectiveUxVoice = useMemo((): TtsUxVoiceId => {
    if (profileTtsGlobal) return resolveUxVoiceId(profileTtsGlobal);
    if (relationship?.tts_voice_preset) return resolveUxVoiceId(relationship.tts_voice_preset);
    if (dbComp?.tts_voice_preset) return resolveUxVoiceId(dbComp.tts_voice_preset);
    return "velvet_whisper";
  }, [profileTtsGlobal, relationship, dbComp]);

  const effectiveVoiceLabel = TTS_UX_LABELS[effectiveUxVoice];

  const relationshipVoicePreset = useMemo(
    () => resolveUxVoiceId(relationship?.tts_voice_preset ?? dbComp?.tts_voice_preset),
    [relationship?.tts_voice_preset, dbComp?.tts_voice_preset],
  );

  const globalVoiceLabelForSheet = useMemo(() => {
    if (!profileTtsGlobal?.trim()) return null;
    return TTS_UX_LABELS[resolveUxVoiceId(profileTtsGlobal)];
  }, [profileTtsGlobal]);

  const onTtsAutoplayChange = useCallback((enabled: boolean) => {
    persistTtsAutoplay(enabled);
    setTtsAutoplayState(enabled);
  }, []);
  const onLiveVoiceTtsAutoplayChange = useCallback((enabled: boolean) => {
    persistLiveVoiceTtsAutoplay(enabled);
    setLiveVoiceTtsAutoplay(enabled);
  }, []);

  const effectiveAssistantTtsAutoplay = useMemo(
    () => (sessionMode === "live_voice" ? liveVoiceTtsAutoplay : ttsAutoplay),
    [sessionMode, liveVoiceTtsAutoplay, ttsAutoplay],
  );

  useEffect(() => {
    if (!voiceSettingsOpen || !user?.id) return;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("tts_voice_global_override")
        .eq("user_id", user.id)
        .maybeSingle();
      const g = data?.tts_voice_global_override;
      setProfileTtsGlobal(typeof g === "string" && g.trim() ? g.trim() : null);
    })();
  }, [voiceSettingsOpen, user?.id]);

  const userAvatarUrl = useMemo(() => {
    const m = user?.user_metadata as Record<string, string | undefined> | undefined;
    return m?.avatar_url?.trim() || null;
  }, [user]);

  const userInitials = useMemo(() => {
    const m = user?.user_metadata as Record<string, string | undefined> | undefined;
    const n = (m?.full_name || m?.name || user?.email?.split("@")[0] || "You").trim();
    const p = n.split(/\s+/).filter(Boolean);
    if (p.length >= 2) return (p[0]![0] + p[1]![0]).toUpperCase();
    return n.slice(0, 2).toUpperCase();
  }, [user]);

  useEffect(() => {
    tokensBalanceRef.current = tokensBalance;
  }, [tokensBalance]);

  useEffect(() => {
    if (companion?.id) {
      setAutoSpendChatImages(getChatAutoSpendImages(companion.id));
      setImageGenPending(null);
    } else {
      setAutoSpendChatImages(false);
    }
  }, [companion?.id]);

  const activeToys = useMemo(() => connectedToys.filter((t) => t.enabled), [connectedToys]);
  const hasDevice = activeToys.length > 0;

  useEffect(() => {
    const enabled = connectedToys.filter((t) => t.enabled);
    if (enabled.length === 0) {
      setPrimaryToyUid(null);
      return;
    }
    const stored = localStorage.getItem("lustforge-primary-toy-uid");
    const next = stored && enabled.some((t) => t.id === stored) ? stored : enabled[0].id;
    setPrimaryToyUid(next);
  }, [connectedToys]);

  const selectPrimaryToy = (uid: string) => {
    localStorage.setItem("lustforge-primary-toy-uid", uid);
    setPrimaryToyUid(uid);
  };

  const { data: vibrationPatterns = [], isLoading: vibrationPatternsLoading } = useCompanionVibrationPatterns(
    companion?.id,
  );

  const stopSustainedToy = useCallback(async () => {
    const s = sustainedToySessionRef.current;
    sustainedToySessionRef.current = null;
    lovenseSustainedFromTtsRef.current = false;
    if (s) await s.stop();
    setLivePatternId(null);
    setToyDriveActive(false);
  }, []);

  const prepareToyForRamp = useCallback(async () => {
    await stopSustainedToy();
  }, [stopSustainedToy]);

  useEffect(() => {
    if (!companion?.id) return;
    try {
      const raw = localStorage.getItem(`lustforge-ramp-preset:${companion.id}`);
      if (raw && RAMP_PRESET_IDS.includes(raw as RampPresetId)) {
        setRampPreset(raw as RampPresetId);
      }
    } catch {
      /* ignore */
    }
  }, [companion?.id]);

  const handleRampPresetChange = useCallback(
    (p: RampPresetId) => {
      setRampPreset(p);
      if (companion?.id) {
        try {
          localStorage.setItem(`lustforge-ramp-preset:${companion.id}`, p);
        } catch {
          /* ignore */
        }
      }
    },
    [companion?.id],
  );

  /** Ramp Mode only applies to Live Voice — clear it when switching to Classic so it doesn’t reappear as “on”. */
  useEffect(() => {
    if (sessionMode !== "live_voice") {
      setRampModeActive(false);
    }
  }, [sessionMode]);

  useEffect(() => {
    const prev = prevSessionModeForLiveVoiceRef.current;
    prevSessionModeForLiveVoiceRef.current = sessionMode;
    if (sessionMode === "live_voice" && prev !== "live_voice") {
      liveVoiceBillableSecRef.current = 0;
      setLiveVoiceElapsedSec(0);
    }
  }, [sessionMode]);

  /** Kick out of Live Voice if balance drops below one started minute. */
  useEffect(() => {
    if (sessionMode !== "live_voice" || !user?.id || isAdminUser) return;
    if (!forgeBalanceReady) return;
    if (tokensBalance < LIVE_CALL_CREDITS_PER_MINUTE) {
      setLiveVoiceElapsedSec(0);
      setSessionMode((m) => {
        if (m !== "live_voice") return m;
        persistChatSessionMode("classic");
        toast.message(`Switched to Classic — need at least ${LIVE_CALL_CREDITS_PER_MINUTE} FC for Live Voice.`);
        return "classic";
      });
    }
  }, [sessionMode, user?.id, isAdminUser, tokensBalance, forgeBalanceReady]);

  /** Tick billable seconds only while the open mic is recording. */
  useEffect(() => {
    if (sessionMode !== "live_voice" || !liveVoiceMicRecording || !user?.id || isAdminUser) return;
    if (!forgeBalanceReady) return;
    if (tokensBalance < LIVE_CALL_CREDITS_PER_MINUTE) return;
    const iv = window.setInterval(() => {
      liveVoiceBillableSecRef.current += 1;
      setLiveVoiceElapsedSec(liveVoiceBillableSecRef.current);
    }, 1000);
    return () => window.clearInterval(iv);
  }, [sessionMode, liveVoiceMicRecording, user?.id, isAdminUser, tokensBalance, forgeBalanceReady]);

  /** Bill accumulated mic-open seconds when leaving Live Voice or switching companion (same formula as `LiveCallPage` hangup). */
  useEffect(() => {
    if (sessionMode !== "live_voice" || !user?.id || isAdminUser) return;
    const companionId = companion?.id ?? "";
    return () => {
      const billSec = liveVoiceBillableSecRef.current;
      liveVoiceBillableSecRef.current = 0;
      setLiveVoiceElapsedSec(0);
      const minutesBilled = billSec > 0 ? Math.max(1, Math.ceil(billSec / 60)) : 0;
      if (minutesBilled <= 0 || !companionId) return;
      const amount = minutesBilled * LIVE_CALL_CREDITS_PER_MINUTE;
      void spendForgeCoins(amount, "live_voice", `Chat Live Voice · ${minutesBilled} min`, {
        companion_id: companionId,
        bill_seconds: billSec,
      }).then((r) => {
        if (r.ok) {
          setTokensBalance(r.newBalance);
          tokensBalanceRef.current = r.newBalance;
        } else {
          toast.error(r.err || "Could not record FC for this Live Voice session.");
        }
      });
    };
  }, [sessionMode, user?.id, companion?.id, isAdminUser]);

  useEffect(() => {
    return () => {
      void (async () => {
        await stopSustainedToy();
        const uid = userIdRef.current;
        if (uid) {
          try {
            await stopAllUserToys(uid, connectedToysRef.current);
          } catch {
            /* unmount */
          }
        }
      })();
    };
  }, [stopSustainedToy]);

  const triggerCompanionVibration = async (row: CompanionVibrationPatternRow) => {
    if (!user || !hasDevice) {
      toast.error("Connect a Lovense toy to use these patterns.");
      return;
    }
    const target = primaryToyUid ?? activeToys[0]?.id;
    if (!target) {
      toast.error("No active toy selected.");
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
      toast.error("Could not read this pattern.");
      return;
    }
    setSendingVibrationId(row.id);
    try {
      await stopSustainedToy();
      const session = createSustainedLovenseSession(user.id, { ...cmd, toyId: target });
      sustainedToySessionRef.current = session;
      setLivePatternId(row.id);
      setToyDriveActive(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send to device.");
    } finally {
      setSendingVibrationId(null);
    }
  };

  useEffect(() => {
    starterSentRef.current = false;
    openingFantasyStarterTitleRef.current = null;
  }, [id]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const state = location.state as { starterPrompt?: string } | undefined;
    if (state?.starterPrompt?.trim()) {
      starterSentRef.current = false;
    }
  }, [location.state]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      if (id && isCompanionProfileTeaserMode() && !isPlatformAdmin(session.user)) {
        toast.message("Coming soon", { description: "Full chat unlocks at launch — browse the profile for now." });
        navigate(`/companions/${id}`, { replace: true });
        return;
      }
      setUser(session.user);
      void fetchTokens(session.user.id);
      checkDevice(session.user.id);
    });
  }, [navigate, id]);

  useEffect(() => {
    if (!user) setForgeBalanceReady(false);
  }, [user]);

  useEffect(() => {
    if (!user?.id || !companion || companion.id !== id) return;
    void loadChatHistory(user.id);
  }, [user?.id, companion?.id, id]);

    useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const checkDevice = useCallback(async (userId: string) => {
    const toys = await getToys(userId);
    setConnectedToys(toys);
  }, []);

  useWindowVisibleRefresh(
    () => {
      if (user?.id) void checkDevice(user.id);
    },
    Boolean(user?.id),
  );

  const refreshToys = async () => {
    if (!user?.id) return;
    setToysPanelLoading(true);
    try {
      await checkDevice(user.id);
    } finally {
      setToysPanelLoading(false);
    }
  };

  const {
    qrImageUrl: pairingQrUrl,
    isLoading: pairingLoading,
    startPairing: startLovensePairing,
    cancelPairing: cancelLovensePairing,
    lastError: pairingError,
    setLastError: setPairingError,
  } = useLovensePairing(user?.id, {
    onConnected: () => {
      if (!user?.id) return;
      void checkDevice(user.id);
      toast.success("Toy linked — haptics are live in this chat.");
    },
  });

  useEffect(() => {
    if (!pairingError) return;
    toast.error(pairingError);
    setPairingError(null);
  }, [pairingError, setPairingError]);

  const handleToggleToyEnabled = async (deviceUid: string, enabled: boolean) => {
    if (!user) return;
    if (!enabled) {
      await stopSustainedToy();
      try {
        await sendCommand(user.id, {
          command: "stop",
          intensity: 0,
          duration: 0,
          toyId: deviceUid,
        });
      } catch (e) {
        console.error("Lovense stop before toy disable:", e);
      }
    }
    const ok = await setToyEnabled(user.id, deviceUid, enabled);
    if (ok) {
      setConnectedToys((prev) =>
        prev.map((t) => (t.id === deviceUid ? { ...t, enabled } : t)),
      );
    } else {
      toast.error("Could not update toy.");
    }
  };

  const handleDisconnectOneToy = async (deviceUid: string) => {
    if (!user) return;
    const ok = await disconnectToy(user.id, deviceUid);
    if (ok) {
      await checkDevice(user.id);
    } else {
      toast.error("Failed to unlink toy.");
    }
  };

  const fetchTokens = async (userId: string): Promise<{ balance: number; nextTextFc: number }> => {
    const { data } = await supabase
      .from("profiles")
      .select("tokens_balance, tts_voice_global_override, chat_daily_quota_date, chat_daily_quota_used")
      .eq("user_id", userId)
      .maybeSingle();
    const bal =
      typeof data?.tokens_balance === "number" && Number.isFinite(data.tokens_balance) ? data.tokens_balance : 0;
    setTokensBalance(bal);
    tokensBalanceRef.current = bal;
    setForgeBalanceReady(true);
    const g = data?.tts_voice_global_override;
    setProfileTtsGlobal(typeof g === "string" && g.trim() ? g.trim() : null);
    const qd = typeof data?.chat_daily_quota_date === "string" ? data.chat_daily_quota_date : null;
    const qu = typeof data?.chat_daily_quota_used === "number" && Number.isFinite(data.chat_daily_quota_used) ? data.chat_daily_quota_used : 0;
    setChatDailyQuotaDate(qd);
    setChatDailyQuotaUsed(qu);
    const nextTextFc = isAdminUser ? 0 : nextTextMessageFc(qd, qu);
    if (!isAdminUser && bal < LIVE_CALL_CREDITS_PER_MINUTE) {
      setSessionMode((m) => {
        if (m !== "live_voice") return m;
        persistChatSessionMode("classic");
        toast.message(`Switched to Classic — Live Voice needs at least ${LIVE_CALL_CREDITS_PER_MINUTE} FC.`);
        return "classic";
      });
    }
    return { balance: bal, nextTextFc };
  };

  const deductMessageForgeCoins = async (userId: string) => {
    if (isAdminUser) return;
    const r = await consumeChatMessageQuota();
    if (!r.ok) {
      if (r.err === "insufficient_funds") {
        toast.error(
          `You've used today's 20 free messages. Each line is ${CHAT_MESSAGE_FC_AFTER_DAILY_FREE} FC — you have ${r.newBalance} FC.`,
          { action: { label: "Buy FC", onClick: () => navigate("/buy-credits") } },
        );
      } else {
        toast.error(r.err || "Could not apply message quota.");
      }
      await fetchTokens(userId);
      return;
    }
    setTokensBalance(r.newBalance);
    tokensBalanceRef.current = r.newBalance;
    await fetchTokens(userId);
  };

  const generateImage = async (
    userRequest: string,
    userId: string,
    genOpts: {
      fromMenu: boolean;
      rawUserMessage: string;
      menuImagePrompt: string | null;
      lockSceneToMenuPreset?: boolean;
    },
  ): Promise<any> => {
    if (!companion || !dbComp) return null;

    try {
      const explicit =
        isExplicitImageRequest(genOpts.rawUserMessage) || isExplicitImageRequest(userRequest);
      const freeUsed = getFreeNsfwImagesUsed(userId, companion.id);
      const useFreeNsfwSlot = genOpts.fromMenu && explicit && freeUsed < FREE_NSFW_CHAT_IMAGES;
      const imageMood = classifyChatImageMood({
        rawUserMessage: genOpts.rawUserMessage,
        menuBasePrompt: genOpts.menuImagePrompt,
      });
      /** Nude tier still bills separately; all chat stills use Grok Imagine + artistic rewriter (Tensor nude path retired). */
      const nudeTier = imageMood === "nude";
      const lewdOrNudeFc = nudeTier ? CHAT_IMAGE_NUDE_FC : CHAT_IMAGE_LEWD_FC;
      const tokenCost = isAdminUser || useFreeNsfwSlot ? 0 : lewdOrNudeFc;

      const menuSceneLock = genOpts.lockSceneToMenuPreset === true;
      const { prompt: masterPrompt, portraitConsistencyLock, visualIdentityCapsule } = buildMasterChatImagePrompt({
        companion,
        dbComp,
        sceneRequest: userRequest,
        rawUserMessage: genOpts.rawUserMessage,
        menuImagePrompt: genOpts.menuImagePrompt,
        variationSeed: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
        lockSceneToMenuPreset: menuSceneLock,
      });
      const prompt = masterPrompt;

      const resolvedBodyType =
        inferForgeBodyTypeFromTags(dbComp.tags ?? []) ??
        inferForgeBodyTypeFromAppearance(dbComp.appearance) ??
        "Average Build";
      const artLabel = resolveChatArtStyleLabel(dbComp);
      const forgeAnchors = (dbComp.image_prompt || "").trim();
      const forgeTail =
        !menuSceneLock && forgeAnchors.length > 0
          ? ` Forge image anchors (text, optional palette/vibe — not a shot list): ${forgeAnchors.slice(0, 720)}${forgeAnchors.length > 720 ? "…" : ""}`
          : "";
      /** Do not paste full `appearance` here — it often describes the roster still (beach, swimsuit) and hijacks Imagine before PRIMARY SCENE. Full prose stays in `prompt` / CHARACTER APPEARANCE only. */
      const ar = (resolveEffectiveCharacterReference(dbComp) ?? "").trim();
      const likenessRefUrl = resolveChatLikenessReferenceHttpsUrl({
        portraitUrl: companion.portraitUrl,
        db: dbComp,
        companionId: companion.id,
      });
      const idLock = chatLikenessSameSubjectMandate(companion.name);
      const baseDescriptionRaw = menuSceneLock
        ? ar
          ? likenessRefUrl
            ? `Single subject — ${companion.name} (${companion.gender}) · ${resolvedBodyType}. **Locked core appearance (text + HTTPS portrait for likeness):** ${ar.slice(0, 1600)}${ar.length > 1600 ? "…" : ""} **Chat gallery preset:** the profile still anchors face/hair/body/tattoos only; **wardrobe, pose, room, light, props** = PRIMARY SCENE / menu — not a remaster of the card photo.`
            : `Single subject — ${companion.name} (${companion.gender}) · ${resolvedBodyType}. **Locked core appearance (text bible — no reference image):** ${ar.slice(0, 1600)}${ar.length > 1600 ? "…" : ""} **Chat gallery preset:** outfit, pose, room, light, and props = PRIMARY SCENE / menu only — never the roster card layout.`
          : likenessRefUrl
            ? `Single subject — ${companion.name} (${companion.gender}) · ${resolvedBodyType}. **Chat gallery preset:** HTTPS portrait anchors likeness (face, hair, skin, build, tattoos); identity details also in CHARACTER APPEARANCE. **Wardrobe, set, pose, light** = PRIMARY SCENE / menu only — not the static still’s outfit or room.`
            : `Single subject — ${companion.name} (${companion.gender}) · ${resolvedBodyType}. **Chat gallery preset:** identity caps = face, hair, skin, species, body scale from CHARACTER APPEARANCE in the prompt body — **not** outfit, pose, room, or palette copied from any static marketing still. Wardrobe, set, pose, light = PRIMARY SCENE / menu only.`
        : likenessRefUrl
          ? `Single subject — ${companion.name} (${companion.gender}). **HTTPS portrait anchors likeness** (face, hair, body, marks); **scene** = PRIMARY SCENE and written profile. Written appearance: ${companion.appearance}.${forgeTail}`
          : `Single subject — ${companion.name} (${companion.gender}). Written appearance: ${companion.appearance}.${forgeTail}`;
      const baseDescription = `${idLock}\n\n${baseDescriptionRaw}`;
      const commonCharacterData = {
        companionId: companion.id,
        style: "chat-session" as const,
        artStyleLabel: artLabel,
        bodyType: resolvedBodyType,
        silhouetteCategory: forgeBodyCategoryIdForType(resolvedBodyType),
        portraitConsistencyLock,
        tags: dbComp.tags ?? [],
        baseDescription,
        subjectName: companion.name,
        subjectGender: companion.gender,
        vibe: companion.personality,
        /** Edge fn: skip tab DNA + forge scene append so menu gallery scenes are not drowned by “portrait card” bias. */
        suppressForgeStyleDnaForChatMenuPreset: menuSceneLock,
        chatMenuSceneLock: menuSceneLock,
        clothing: menuSceneLock
          ? "Wardrobe, undress, pose, and set come **only** from USER SCENE / **Requested framing (from menu)** — not from forge packshots or profile art."
          : "Wardrobe and undress follow PRIMARY SCENE and USER SCENE only. Do not infer outfit from any unstated catalog image — use the written profile + scene text.",
        ...(menuSceneLock && visualIdentityCapsule?.trim()
          ? { visual_identity_capsule: visualIdentityCapsule.trim() }
          : {}),
        ...(likenessRefUrl ? { likeness_reference_image_url: likenessRefUrl } : {}),
        ...(ar ? { character_reference: ar } : {}),
      };

      const { data, error } = await invokeGenerateImage({
        prompt,
        userId,
        name: companion.name,
        isPortrait: false,
        tokenCost,
        contentTier: "full_adult_art",
        characterData: commonCharacterData,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Image generation failed");

      const imageUrl = data.imageUrl;
      const imageId = data.imageId;

      if (!imageUrl) throw new Error("No image generated");

      if (useFreeNsfwSlot) {
        incrementFreeNsfwImagesUsed(userId, companion.id);
      }

      if (typeof data.newTokensBalance === "number") {
        setTokensBalance(data.newTokensBalance);
      } else {
        await fetchTokens(userId);
      }

      return {
        imageUrl,
        imageId,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      console.error("Image generation error:", err);
      const msg =
        err?.message ||
        (typeof err === "object" && err !== null && "error" in err && typeof (err as any).error === "string"
          ? (err as any).error
          : null) ||
        "Failed to generate image";
      toast.error(msg);
      return null;
    }
  };

  /** Free reward image for affection level-up — no forge charge, does not consume free-NSFW slots. */
  const generateAffectionRewardImage = async (_kind: AffectionRewardKind) => {
    if (!companion || !dbComp || !user) return null;
    try {
      const preset = pickRandomAffectionStillPreset();
      const menuBase = FAB_SELFIE[preset.tier].imagePrompt;
      const sceneFused = resolveChatImageGenerationPrompt({
        messageText: preset.label,
        menuImagePrompt: menuBase,
        styledSceneExtension: preset.imagePrompt,
        appearanceReference: companion.appearanceReference ?? null,
        characterReference: companion.characterReference ?? null,
      });
      const { prompt, portraitConsistencyLock, visualIdentityCapsule } = buildMasterChatImagePrompt({
        companion,
        dbComp,
        sceneRequest: sceneFused,
        rawUserMessage: preset.label,
        menuImagePrompt: menuBase,
        variationSeed: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
        lockSceneToMenuPreset: true,
      });

      const resolvedBodyType =
        inferForgeBodyTypeFromTags(dbComp.tags ?? []) ??
        inferForgeBodyTypeFromAppearance(dbComp.appearance) ??
        "Average Build";
      const artLabel = resolveChatArtStyleLabel(dbComp);
      const arReward = (resolveEffectiveCharacterReference(dbComp) ?? "").trim();
      const rewardLikenessUrl = resolveChatLikenessReferenceHttpsUrl({
        portraitUrl: companion.portraitUrl,
        db: dbComp,
        companionId: companion.id,
      });
      const rewardLock = chatLikenessSameSubjectMandate(companion.name);
      const rewardBaseDescriptionRaw = arReward
        ? rewardLikenessUrl
          ? `Single subject — ${companion.name} (${companion.gender}) · ${resolvedBodyType}. **Locked core appearance (text + portrait likeness):** ${arReward.slice(0, 1600)}${arReward.length > 1600 ? "…" : ""} **Reward still:** HTTPS portrait anchors face/body/tattoos; wardrobe, pose, and set = PRIMARY SCENE only — not a card remaster.`
          : `Single subject — ${companion.name} (${companion.gender}) · ${resolvedBodyType}. **Locked core appearance:** ${arReward.slice(0, 1600)}${arReward.length > 1600 ? "…" : ""} **Reward still:** wardrobe, pose, and set = PRIMARY SCENE only.`
        : rewardLikenessUrl
          ? `Single subject — ${companion.name} (${companion.gender}) · ${resolvedBodyType}. **Chat gallery preset (reward):** portrait URL anchors likeness; scene outfit pose set = PRIMARY SCENE only — not the companion’s static still remastered.`
          : `Single subject — ${companion.name} (${companion.gender}) · ${resolvedBodyType}. **Chat gallery preset (reward):** identity from CHARACTER APPEARANCE text only (face/hair/skin/build); scene outfit pose set = PRIMARY SCENE only — not the companion’s static still.`;
      const rewardBaseDescription = `${rewardLock}\n\n${rewardBaseDescriptionRaw}`;
      const cd = {
        companionId: companion.id,
        style: "chat-session" as const,
        artStyleLabel: artLabel,
        bodyType: resolvedBodyType,
        silhouetteCategory: forgeBodyCategoryIdForType(resolvedBodyType),
        portraitConsistencyLock,
        tags: dbComp.tags ?? [],
        baseDescription: rewardBaseDescription,
        subjectName: companion.name,
        subjectGender: companion.gender,
        vibe: companion.personality,
        suppressForgeStyleDnaForChatMenuPreset: true,
        chatMenuSceneLock: true,
        clothing:
          "Wardrobe, undress, pose, and set come **only** from USER SCENE / **Requested framing (from menu)** — not from forge packshots or profile art.",
        ...(visualIdentityCapsule?.trim() ? { visual_identity_capsule: visualIdentityCapsule.trim() } : {}),
        ...(rewardLikenessUrl ? { likeness_reference_image_url: rewardLikenessUrl } : {}),
        ...(arReward ? { character_reference: arReward } : {}),
      };
      const { data, error } = await invokeGenerateImage({
        prompt,
        userId: user.id,
        name: companion.name,
        isPortrait: false,
        tokenCost: 0,
        contentTier: "full_adult_art",
        characterData: cd,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Image generation failed");
      const imageUrl = data.imageUrl;
      const imageId = data.imageId;
      if (!imageUrl || !imageId) throw new Error("No image generated");

      if (typeof data.newTokensBalance === "number") {
        setTokensBalance(data.newTokensBalance);
      } else {
        await fetchTokens(user.id);
      }

      return {
        imageUrl,
        imageId,
        presetId: preset.id,
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      console.error("Affection reward image error:", err);
      return null;
    }
  };

  const saveImageToCompanionGallery = async (imageId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("generated_images")
        .update({ saved_to_companion_gallery: true })
        .eq("id", imageId)
        .eq("user_id", user.id);

      if (error) throw error;

      // Update message state to reflect save
      setMessages(prev =>
        prev.map(msg =>
          msg.generatedImageId === imageId
            ? { ...msg, savedToCompanionGallery: true }
            : msg
        )
      );
    } catch (err) {
      console.error("Failed to save to companion gallery:", err);
      throw err;
    }
  };

  const saveImageToPersonalGallery = async (imageId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("generated_images")
        .update({ saved_to_personal_gallery: true })
        .eq("id", imageId)
        .eq("user_id", user.id);

      if (error) throw error;

      // Update message state to reflect save
      setMessages(prev =>
        prev.map(msg =>
          msg.generatedImageId === imageId
            ? { ...msg, savedToPersonalGallery: true }
            : msg
        )
      );
    } catch (err) {
      console.error("Failed to save to personal gallery:", err);
      throw err;
    }
  };

  const handleSaveImageBackup = async (generatedImageId: string) => {
    setSavingBackupImageId(generatedImageId);
    try {
      await saveImageToPersonalGallery(generatedImageId);
      toast.success("Saved to your personal vault");
    } catch {
      toast.error("Could not save backup");
    } finally {
      setSavingBackupImageId(null);
    }
  };

  const handlePortraitFromGallery = async (imageUrl: string) => {
    if (!user?.id || !id || !dbComp) return;
    const baseAnim = dbComp.animated_image_url?.trim() ?? "";
    await setCompanionPortraitFromGalleryUrl({
      userId: user.id,
      companionId: id,
      imageUrl,
      fallbackLoopVideoUrl: baseAnim && isVideoPortraitUrl(baseAnim) ? baseAnim : null,
      fallbackLoopVideoEnabled: Boolean(dbComp.profile_loop_video_enabled),
    });
    await queryClient.invalidateQueries({ queryKey: ["companions"] });
    await queryClient.invalidateQueries({ queryKey: ["companion-display-override", user.id, id] });
    await queryClient.invalidateQueries({ queryKey: ["companion-generated-images", user.id, id] });
  };

  const getGreeting = () => {
    if (!companion) return "Hey there...";
    const greetings: Record<string, string> = {
      "lilith-vesper": "Well, well... look who wandered into my domain. *adjusts corset and tilts head* Welcome, darling. I've been expecting someone... interesting tonight. Tell me — are you here to be good, or do you need Mommy to teach you how? 🖤",
      "jax-harlan": "Hey there. *leans against the doorframe, arms crossed* You look like you could use some... relaxation. Come on in. I don't bite. *grins* Well, not unless you ask nicely.",
      "kira-lux": "OMG hiii!! 💖✨ *twirls in thigh-high boots* You're finally here! I've been SO bored waiting. Ready to have some fun? And by fun I mean... well, you'll see 😈",
      "finn-blaze": "Oh hey! *waves enthusiastically and accidentally knocks over water bottle* Whoops! Sorry. Uh, hi! I'm Finn! You look... wow. Like, really... *flexes nervously* I work out.",
      "bianca-rose": "*appears in a puff of sparkly smoke, trips over own tail* I AM BIANCA, DEVOURER OF— ow. Hold on. *fixes horn* Okay. Take two. Hey cutie 😅",
    };
    return greetings[companion.id] || `*${companion.name} appears before you* Hey there... I've been waiting for someone like you. Ready to begin?`;
  };

  const loadChatHistory = async (userId: string) => {
    setHistoryReady(false);
    try {
      const { data } = await supabase
        .from("chat_messages")
        .select(
          `
          id,
          role,
          content,
          lovense_command,
          created_at,
          tts_audio_url,
          image_url,
          image_prompt,
          generated_image_id,
          video_url,
          generated_images ( saved_to_companion_gallery, saved_to_personal_gallery )
        `,
        )
        .eq("user_id", userId)
        .eq("companion_id", id)
        .order("created_at", { ascending: true })
        .limit(50);

      if (data && data.length > 0) {
        setMessages(
          data.map((m: any) => {
            const gi = m.generated_images as
              | { saved_to_companion_gallery?: boolean | null; saved_to_personal_gallery?: boolean | null }
              | null
              | undefined;
            const hasImage = Boolean(m.image_url && m.generated_image_id);
            const hasVideoGallery = Boolean(m.video_url && m.generated_image_id);
            const inGallery = hasImage || hasVideoGallery;
            return {
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
              lovenseCommand: m.lovense_command,
              timestamp: new Date(m.created_at),
              tts_audio_url: m.tts_audio_url ?? undefined,
              imageUrl: m.image_url ?? undefined,
              imagePrompt: m.image_prompt ?? undefined,
              generatedImageId: m.generated_image_id ?? undefined,
              imageId: m.generated_image_id ?? undefined,
              savedToCompanionGallery: inGallery ? (gi?.saved_to_companion_gallery ?? true) : undefined,
              savedToPersonalGallery: inGallery ? Boolean(gi?.saved_to_personal_gallery) : undefined,
              videoUrl: m.video_url ?? undefined,
            };
          }),
        );
      } else {
        const greeting: ChatMessage = {
          id: "greeting",
          role: "assistant",
          content: getGreeting(),
          timestamp: new Date(),
        };
        setMessages([greeting]);
      }
    } finally {
      setHistoryReady(true);
    }
  };

  /** Companion text (classic + Live Voice assistant line) → `grok-chat` (xAI). */
  const composeChatSystemPrompt = () => {
    if (!companion) return "";
    const toyBlock =
      connectedToys.length === 0
        ? "None — no toys linked."
        : connectedToys
            .map(
              (t) =>
                `• ${t.enabled ? "ENABLED" : "paused"} — ${t.name} (${t.type}) — device_uid="${t.id}"`,
            )
            .join("\n");
    const pct = parseInt(localStorage.getItem("lustforge-intensity") || "100", 10);
    if (sessionMode === "live_voice") {
      let live = buildLiveVoiceSystemPrompt(companion, {
        safeWord,
        connectedToysSummary: toyBlock,
        userToyIntensityPercent: Number.isFinite(pct) ? pct : 100,
        chatAffectionTier: relationship?.chat_affection_level ?? 1,
        vibrationPatterns,
      });
      if (rampModeActive) {
        live +=
          "\n\n" +
          buildRampModeSystemAppend(companion, {
            safeWord,
            preset: rampPreset,
            userToyIntensityPercent: Number.isFinite(pct) ? pct : 100,
            connectedToysSummary: toyBlock,
          });
      }
      return live;
    }
    return buildChatSystemPrompt(companion, {
      replyStyle: "immersive",
      safeWord,
      connectedToysSummary: toyBlock,
      openingFantasyStarterTitle: openingFantasyStarterTitleRef.current,
      userToyIntensityPercent: Number.isFinite(pct) ? pct : 100,
      chatAffectionTier: relationship?.chat_affection_level ?? 1,
      vibrationPatterns,
    });
  };

  const clearOpeningStarterContext = () => {
    openingFantasyStarterTitleRef.current = null;
  };

  const executeDeviceCommand = async (command: any, opts?: { fromTts?: boolean }) => {
    if (!user || !hasDevice || !command) return;

    const baseCmdEarly = String(command.command || "vibrate").toLowerCase();
    if (baseCmdEarly === "stop") {
      await stopSustainedToy();
      return;
    }

    await stopSustainedToy();

    const intensityLimit = parseInt(localStorage.getItem("lustforge-intensity") || "100", 10);
    let raw = Number(command.intensity ?? 50);
    if (raw <= 20) raw = raw * 5;
    const scaledIntensity = Math.round(raw * (intensityLimit / 100));

    const baseCmd = String(command.command || "vibrate").toLowerCase();
    const deviceUid =
      (typeof command.device_uid === "string" && command.device_uid.trim()) ||
      (typeof command.deviceUid === "string" && command.deviceUid.trim()) ||
      primaryToyUid ||
      activeToys[0]?.id;

    const lovenseCommand: LovenseCommand =
      baseCmd === "pattern" && command.pattern
        ? {
            command: "pattern",
            pattern: String(command.pattern),
            intensity: Math.min(100, Math.max(0, scaledIntensity)),
            duration: command.duration || 5000,
            toyId: deviceUid,
          }
        : {
            command: "vibrate",
            intensity: Math.min(100, Math.max(0, scaledIntensity)),
            duration: command.duration || 5000,
            toyId: deviceUid,
          };

    try {
      const session = createSustainedLovenseSession(user.id, lovenseCommand);
      sustainedToySessionRef.current = session;
      lovenseSustainedFromTtsRef.current = Boolean(opts?.fromTts);
      setToyDriveActive(true);
    } catch (err: unknown) {
      console.error("Device command error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to send command to device");
    }
  };

  executeDeviceCommandRef.current = executeDeviceCommand;

  const handleConnectToy = () => {
    void startLovensePairing();
  };

  const handleDisconnectToy = async () => {
    if (!user) return;
    const uid = primaryToyUid ?? activeToys[0]?.id ?? connectedToys[0]?.id;
    if (!uid) {
      toast.error("No toy to disconnect.");
      return;
    }
    const success = await disconnectToy(user.id, uid);
    if (success) {
      await checkDevice(user.id);
    } else {
      toast.error("Failed to disconnect toy.");
    }
  };

  const handleStopAll = async () => {
    if (!user || !hasDevice) {
      toast.error("No connected device available.");
      return;
    }
    setToyUtilityBusy(true);
    await stopSustainedToy();
    const success = await stopAllUserToys(user.id, connectedToys);
    setToyUtilityBusy(false);
    if (!success) {
      toast.error("Failed to stop patterns.");
    }
  };

  const handleTestToy = async () => {
    if (!user || !hasDevice) {
      toast.error("No connected device available.");
      return;
    }
    const uid = primaryToyUid ?? activeToys[0]?.id;
    if (!uid) {
      toast.error("Select an active toy.");
      return;
    }
    const success = await testToy(user.id, uid);
    if (!success) {
      toast.error("Toy test failed.");
    }
  };

  const handleStartBreedingRitual = () => {
    setShowBreedingRitual(true);
  };

  useEffect(() => {
    const t = relationship?.chat_affection_level ?? 1;
    const prev = prevChatAffectionTierRef.current;
    prevChatAffectionTierRef.current = t;
    if (prev !== null && t > prev) {
      heartIdRef.current += 1;
      const id = heartIdRef.current;
      const x = `${12 + Math.random() * 76}%`;
      setHeartBursts((b) => [...b, { id, x }]);
      window.setTimeout(() => {
        setHeartBursts((b) => b.filter((h) => h.id !== id));
      }, 2600);
    }
  }, [relationship?.chat_affection_level]);

  const saveRelationshipVoice = async (v: TtsUxVoiceId) => {
    if (!user || !companion) return;
    setVoicePresetSaving(true);
    try {
      const { error } = await supabase.from("companion_relationships").upsert(
        {
          user_id: user.id,
          companion_id: companion.id,
          affection_level: relationship?.affection_level ?? 0,
          chat_affection_level: relationship?.chat_affection_level ?? 1,
          chat_affection_progress: relationship?.chat_affection_progress ?? 0,
          breeding_progress: relationship?.breeding_progress ?? 0,
          breeding_stage: relationship?.breeding_stage ?? 0,
          tts_voice_preset: v,
          last_interaction: new Date().toISOString(),
        },
        { onConflict: "user_id,companion_id" },
      );
      if (error) throw error;
      refreshRelationship();
      toast.success("Voice updated");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not save voice");
    } finally {
      setVoicePresetSaving(false);
    }
  };

  const handleTts = useCallback(
    async (msg: ChatMessage) => {
      if (!user || msg.role !== "assistant" || !msg.content?.trim()) return;

      const displayForTts = parseAssistantDisplayContent(msg.content).displayText;
      const ttsWords = displayForTts.split(/\s+/).filter(Boolean);

      const endTtsLovenseIfLinked = () => {
        if (lovenseSustainedFromTtsRef.current) {
          void stopSustainedToy();
        }
        setTtsWordHighlight(null);
      };

      const clearPendingToyForThisMessage = () => {
        if (pendingLovenseForTtsRef.current?.messageId === msg.id) {
          pendingLovenseForTtsRef.current = null;
        }
      };
      const feedRampIfPending = () => {
        const p = rampNarrationPendingRef.current;
        if (p && p.messageId === msg.id) {
          liveRampAssistFeedRef.current?.(p.text);
          rampNarrationPendingRef.current = null;
        }
      };
      /** Lovense JSON command + Ramp driver text only after audio actually starts (or if TTS fails, ramp only). */
      const onAudioPlaying = () => {
        void (async () => {
          const pending = pendingLovenseForTtsRef.current;
          if (pending?.messageId === msg.id) {
            pendingLovenseForTtsRef.current = null;
            await executeDeviceCommandRef.current(pending.command, { fromTts: true });
          }
          feedRampIfPending();
        })();
      };

      const bindAudioUi = (a: HTMLAudioElement) => {
        a.addEventListener("playing", onAudioPlaying, { once: true });
        const onTime = () => {
          if (ttsWords.length <= 1) return;
          const d = a.duration;
          if (!Number.isFinite(d) || d <= 0.05) return;
          const nowTs = performance.now();
          if (nowTs - ttsWordUpdateLastMsRef.current < 110) return;
          ttsWordUpdateLastMsRef.current = nowTs;
          const idx = Math.min(ttsWords.length - 1, Math.floor((a.currentTime / d) * ttsWords.length));
          setTtsWordHighlight({ messageId: msg.id, wordIndex: idx });
        };
        function detach() {
          a.removeEventListener("timeupdate", onTime);
          a.removeEventListener("ended", onEnded);
        }
        function onEnded() {
          detach();
          ttsAudioListenerDetachRef.current = null;
          setTtsPlayingId(null);
          endTtsLovenseIfLinked();
        }
        a.addEventListener("timeupdate", onTime);
        a.addEventListener("ended", onEnded);
        ttsAudioListenerDetachRef.current = detach;
      };

      ttsAudioListenerDetachRef.current?.();
      ttsAudioListenerDetachRef.current = null;
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        if (lovenseSustainedFromTtsRef.current) {
          void stopSustainedToy();
        }
        ttsAudioRef.current = null;
      }
      if (ttsPlayingId === msg.id) {
        ttsAudioListenerDetachRef.current?.();
        ttsAudioListenerDetachRef.current = null;
        ttsAudioRef.current?.pause();
        ttsAudioRef.current = null;
        setTtsPlayingId(null);
        setTtsWordHighlight(null);
        endTtsLovenseIfLinked();
        return;
      }
      if (msg.tts_audio_url) {
        const a = new Audio(msg.tts_audio_url);
        ttsAudioRef.current = a;
        setTtsPlayingId(msg.id);
        a.onerror = () => {
          setTtsPlayingId(null);
          toast.error("Could not play audio");
          clearPendingToyForThisMessage();
          feedRampIfPending();
          endTtsLovenseIfLinked();
        };
        bindAudioUi(a);
        try {
          await a.play();
        } catch {
          toast.error("Could not play audio");
          clearPendingToyForThisMessage();
          feedRampIfPending();
          endTtsLovenseIfLinked();
        }
        return;
      }
      setTtsLoadingId(msg.id);
      try {
        const voiceId = uxVoiceToXaiVoice(effectiveUxVoice);
        const ttsText = displayForTts;
        const { data, error } = await supabase.functions.invoke("grok-tts", {
          body: {
            text: ttsText.slice(0, 3800),
            voiceId,
            messageId:
              /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(msg.id)
                ? msg.id
                : undefined,
          },
        });
        if (error) throw new Error(await messageFromFunctionsInvoke(error, data));
        const url = (data as { audioUrl?: string })?.audioUrl;
        if (!url) throw new Error("No audio URL");
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, tts_audio_url: url } : m)));
        const a = new Audio(url);
        ttsAudioRef.current = a;
        setTtsPlayingId(msg.id);
        a.onerror = () => {
          setTtsPlayingId(null);
          toast.error("Could not play audio");
          clearPendingToyForThisMessage();
          feedRampIfPending();
          endTtsLovenseIfLinked();
        };
        bindAudioUi(a);
        try {
          await a.play();
        } catch {
          toast.error("Could not play audio");
          clearPendingToyForThisMessage();
          feedRampIfPending();
          endTtsLovenseIfLinked();
        }
      } catch (e: unknown) {
        const raw = e instanceof Error ? e.message : "TTS failed";
        toast.error(raw.length > 120 ? `${raw.slice(0, 117)}…` : raw);
        clearPendingToyForThisMessage();
        feedRampIfPending();
        endTtsLovenseIfLinked();
      } finally {
        setTtsLoadingId(null);
      }
    },
    [user, ttsPlayingId, effectiveUxVoice, stopSustainedToy],
  );

  useEffect(() => {
    if (!companion || !user || !historyReady) return;
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = loading;
    if (wasLoading && !loading) {
      const last = messagesRef.current[messagesRef.current.length - 1];
      if (last?.role !== "assistant") {
        return;
      }
      const t = window.setTimeout(() => {
        void (async () => {
          const thread = messagesRef.current.slice(-12).map((m) => ({ role: m.role, content: m.content }));
          try {
            const { data, error } = await supabase.functions.invoke("grok-chat", {
              body: {
                intent: "smart_replies" as const,
                companionId: companion.id,
                companionName: companion.name,
                messages: thread,
              },
            });
            if (error) throw error;
            const sug = (data as { suggestions?: string[] })?.suggestions;
            if (Array.isArray(sug) && sug.length) setSmartSuggestions(sug.slice(0, 3));
            else setSmartSuggestions(SMART_FALLBACK);
          } catch {
            setSmartSuggestions(SMART_FALLBACK);
          }
        })();
      }, 500);

      let ttsTimer: number | undefined;
      if (effectiveAssistantTtsAutoplay && last && !last.imageUrl && last.content?.trim()) {
        ttsTimer = window.setTimeout(() => {
          void handleTts(last);
        }, 400);
      }

      return () => {
        clearTimeout(t);
        if (ttsTimer !== undefined) clearTimeout(ttsTimer);
      };
    }
  }, [loading, companion, user, historyReady, handleTts, effectiveAssistantTtsAutoplay]);

  const handleBreedingComplete = (offspring: any) => {
    setShowBreedingRitual(false);
    refreshRelationship();
    setMessages((prev) => [
      ...prev,
      {
        id: `breeding-${Date.now()}`,
        role: "assistant",
        content: `The ritual is complete. ${companion.name} has gifted you a new offspring: ${offspring.name}.`,
        timestamp: new Date(),
      },
    ]);
  };

  const handleEmergencyStop = useCallback(async () => {
    await stopSustainedToy();
    setRampModeActive(false);
    setLiveVoiceStopTick((n) => n + 1);
    const uid = userIdRef.current;
    if (!uid) return;
    try {
      const ok = await stopAllUserToys(uid, connectedToysRef.current);
      if (!ok) toast.error("Failed to stop device");
    } catch {
      toast.error("Failed to stop device");
    }
  }, [stopSustainedToy]);

  const handleEmergencyStopFromUi = useCallback(async () => {
    await handleEmergencyStop();
    toast.info("🛑 Stopped — all activity.");
  }, [handleEmergencyStop]);

  const toggleToyEnabled = (toyId: string) => {
    setConnectedToys(prevToys =>
      prevToys.map(toy =>
        toy.id === toyId ? { ...toy, enabled: !toy.enabled } : toy
      )
    );
    // Note: Backend support for per-toy enable/disable would be needed for full functionality
  };

  const insertAssistantMessage = async (content: string, command: unknown | null): Promise<string> => {
    if (!user || !companion) throw new Error("Not ready");
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        user_id: user.id,
        companion_id: companion.id,
        role: "assistant",
        content,
        lovense_command: command as Json | null,
      })
      .select("id")
      .single();
    if (error || !data?.id) throw new Error(error?.message || "Could not save reply");
    return data.id as string;
  };

  const insertAssistantImageMessage = async (args: {
    content: string;
    imageUrl: string;
    imagePrompt: string;
    generatedImageId: string;
  }): Promise<string> => {
    if (!user || !companion) throw new Error("Not ready");
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        user_id: user.id,
        companion_id: companion.id,
        role: "assistant",
        content: args.content,
        lovense_command: null,
        image_url: args.imageUrl,
        image_prompt: args.imagePrompt,
        generated_image_id: args.generatedImageId,
      })
      .select("id")
      .single();
    if (error || !data?.id) throw new Error(error?.message || "Could not save image reply");
    return data.id as string;
  };

  const insertAssistantVideoMessage = async (args: {
    content: string;
    videoUrl: string;
    generatedImageId?: string;
  }): Promise<string> => {
    if (!user || !companion) throw new Error("Not ready");
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        user_id: user.id,
        companion_id: companion.id,
        role: "assistant",
        content: args.content,
        lovense_command: null,
        video_url: args.videoUrl,
        generated_image_id: args.generatedImageId ?? null,
      })
      .select("id")
      .single();
    if (error || !data?.id) throw new Error(error?.message || "Could not save video reply");
    return data.id as string;
  };

  /**
   * Grok Imagine I2V from the companion still. Non-silent path shows a fun loading line (never “generating…”) then replaces with success.
   * `silent` = model-appended `lustforge_media_request` (no toasts; immersion-first).
   */
  const generateChatVideoClip = async (opts?: {
    mood?: "sfw" | "lewd" | "nude";
    silent?: boolean;
    motionHint?: string;
  }) => {
    if (!user || !companion) return;
    if (CHAT_IN_SESSION_VIDEO_CLIPS_COMING_SOON) {
      if (!opts?.silent) {
        toast.message("In-chat video clips are coming soon — stills work today.");
      }
      return;
    }
    const mood = opts?.mood ?? "lewd";
    const silent = opts?.silent ?? false;
    const cost = isAdminUser ? 0 : CHAT_VIDEO_TOKEN_COST;
    if (!isAdminUser && tokensBalance < cost) {
      toast.error(`Video clips cost ${cost} FC. You have ${tokensBalance} FC.`, {
        action: { label: "Buy FC", onClick: () => navigate("/buy-credits") },
      });
      return;
    }
    let loadToast: string | number | undefined;
    if (!silent) {
      setLoading(true);
      loadToast = toast.loading(pickRandomVideoLoadingLine());
    }
    try {
      const { data, error } = await invokeGenerateChatVideo({
        companionId: companion.id,
        userId: user.id,
        tokenCost: cost,
        clipMood: mood,
        motionHint: opts?.motionHint?.trim() || undefined,
      });
      if (error) throw error;
      const url = data?.videoUrl;
      if (!url) throw new Error("No video returned");
      const caption =
        mood === "sfw"
          ? `*${companion.name} sent you a flirty clip…*`
          : mood === "nude"
            ? `*${companion.name} sent you an explicit clip…*`
            : `*${companion.name} sent you a steamy clip…*`;
      const clipPrompt = `[LustForge chat] mood=${mood} — 2:3 vertical card clip.`;
      const { data: giRow, error: giErr } = await supabase
        .from("generated_images")
        .insert({
          user_id: user.id,
          companion_id: companion.id,
          image_url: url,
          prompt: clipPrompt,
          saved_to_companion_gallery: true,
          is_video: true,
        })
        .select("id")
        .single();
      if (giErr || !giRow?.id) throw new Error(giErr?.message || "Could not save clip to companion gallery");
      const rowId = await insertAssistantVideoMessage({
        content: caption,
        videoUrl: url,
        generatedImageId: giRow.id,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: rowId,
          role: "assistant",
          content: caption,
          videoUrl: url,
          generatedImageId: giRow.id,
          savedToCompanionGallery: true,
          savedToPersonalGallery: false,
          timestamp: new Date(),
        },
      ]);
      if (typeof data?.newTokensBalance === "number") {
        setTokensBalance(data.newTokensBalance);
        tokensBalanceRef.current = data.newTokensBalance;
      } else {
        await fetchTokens(user.id);
      }
      if (!silent) {
        if (loadToast != null) {
          toast.success("There you go.", { id: loadToast, duration: 4000 });
        } else {
          toast.success("There you go.");
        }
      }
      void queryClient.invalidateQueries({ queryKey: ["companion-generated-images", user.id, companion.id] });
    } catch (e: unknown) {
      if (!silent) {
        const msg = e instanceof Error ? e.message : "Could not generate video";
        if (loadToast != null) toast.error(msg, { id: loadToast });
        else toast.error(msg);
      } else console.error("silent video", e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  /** Phase 3/4: after Grok replies, run deferred still/clip media without breaking immersion. */
  const runDeferredLustforgeMedia = async (req: LustforgeMediaRequest) => {
    if (!user || !companion || !dbComp) return;
    try {
      if (req.kind === "image") {
        const result = await generateImage(req.brief, user.id, {
          fromMenu: false,
          rawUserMessage: req.brief,
          menuImagePrompt: null,
        });
        if (result) {
          const cap = `*${companion.name} sends you a still — just for you.*`;
          const rowId = await insertAssistantImageMessage({
            content: cap,
            imageUrl: result.imageUrl,
            imagePrompt: req.brief,
            generatedImageId: result.imageId,
          });
          setMessages((prev) => [
            ...prev,
            {
              id: rowId,
              role: "assistant",
              content: cap,
              imageUrl: result.imageUrl,
              imageId: result.imageId,
              generatedImageId: result.imageId,
              imagePrompt: req.brief,
              timestamp: new Date(),
              savedToCompanionGallery: true,
              savedToPersonalGallery: false,
            },
          ]);
          void queryClient.invalidateQueries({ queryKey: ["companion-generated-images", user.id, companion.id] });
        }
      } else if (!CHAT_IN_SESSION_VIDEO_CLIPS_COMING_SOON) {
        await generateChatVideoClip({ mood: req.mood ?? "lewd", silent: true });
      }
    } catch (e) {
      console.error("runDeferredLustforgeMedia", e);
    }
  };

  // --- Phase 1: three dropdowns (Selfie / Lewd / Nude) × (Picture | Video) ---
  const handleMediaBarRequest = (action: ChatMediaBarAction) => {
    const videoMood: "sfw" | "lewd" | "nude" =
      action === "selfie_video" ? "sfw" : action === "nude_video" ? "nude" : "lewd";
    if (action.endsWith("_video")) {
      void generateChatVideoClip({ mood: videoMood });
      return;
    }
    if (action === "selfie_picture") {
      void sendMessage(resolveFabDisplay(FAB_SELFIE.sfw.display), {
        imageGenerationPrompt: FAB_SELFIE.sfw.imagePrompt,
        bypassImageConfirmation: true,
        imageRequestFromMenu: true,
      });
      return;
    }
    if (action === "lewd_picture") {
      void sendMessage(resolveFabDisplay(FAB_SELFIE.lewd.display), {
        imageGenerationPrompt: FAB_SELFIE.lewd.imagePrompt,
        bypassImageConfirmation: true,
        imageRequestFromMenu: true,
      });
      return;
    }
    if (action === "nude_picture") {
      void sendMessage(resolveFabDisplay(FAB_SELFIE.nude.display), {
        imageGenerationPrompt: FAB_SELFIE.nude.imagePrompt,
        bypassImageConfirmation: true,
        imageRequestFromMenu: true,
      });
    }
  };

  const deliverAffectionLevelUpRewards = async (newLevel: number, reward: AffectionRewardKind) => {
    if (!user || !companion || !dbComp) return;
    const { celebration, imageCaption } = buildAffectionLevelUpCopy(companion, newLevel, reward);
    try {
      const celebId = await insertAssistantMessage(celebration, null);
      setMessages((prev) => [
        ...prev,
        { id: celebId, role: "assistant", content: celebration, timestamp: new Date() },
      ]);
    } catch (e) {
      console.error(e);
      return;
    }

    const imageResult = await generateAffectionRewardImage(reward);
    if (imageResult?.imageUrl && imageResult.imageId) {
      try {
        const imagePromptTag = `[Bond reward · tier ${newLevel} · ${reward} · ${imageResult.presetId ?? "preset"}]`;
        const rowId = await insertAssistantImageMessage({
          content: imageCaption,
          imageUrl: imageResult.imageUrl,
          imagePrompt: imagePromptTag,
          generatedImageId: imageResult.imageId,
        });
        setMessages((prev) => [
          ...prev,
          {
            id: rowId,
            role: "assistant",
            content: imageCaption,
            imageUrl: imageResult.imageUrl,
            imageId: imageResult.imageId,
            generatedImageId: imageResult.imageId,
            imagePrompt: imagePromptTag,
            timestamp: new Date(),
            savedToCompanionGallery: true,
            savedToPersonalGallery: false,
          },
        ]);
        void queryClient.invalidateQueries({
          queryKey: ["companion-generated-images", user.id, companion.id],
        });
      } catch (e) {
        console.error(e);
        toast.error("Couldn't attach your reward image — try again in a moment.");
      }
    } else {
      toast.error("Bond reward image didn’t generate — check connection or try again in a moment.");
      const fallback = "I wanted to show you something… the pic didn't go through. Ask me again in a sec?";
      try {
        const fid = await insertAssistantMessage(fallback, null);
        setMessages((prev) => [...prev, { id: fid, role: "assistant", content: fallback, timestamp: new Date() }]);
      } catch {
        /* ignore */
      }
    }

    toast.success(`${companion.name} feels even closer…`, { duration: 3500 });
  };

  const applyChatAffectionAfterExchange = async () => {
    if (!user || !companion) return;
    const { data: row, error } = await supabase
      .from("companion_relationships")
      .select("chat_affection_level, chat_affection_progress, breeding_progress, breeding_stage, tts_voice_preset")
      .eq("user_id", user.id)
      .eq("companion_id", companion.id)
      .maybeSingle();
    if (error) {
      console.error(error);
      return;
    }
    const curLevel = row?.chat_affection_level ?? 1;
    const curProg = row?.chat_affection_progress ?? 0;
    const { level, progress, leveledTo, reward } = advanceChatAffectionState({
      level: curLevel,
      progress: curProg,
    });
    const legacyPct = tierToLegacyAffectionPct(level);
    const { error: upErr } = await supabase.from("companion_relationships").upsert(
      {
        user_id: user.id,
        companion_id: companion.id,
        chat_affection_level: level,
        chat_affection_progress: progress,
        affection_level: legacyPct,
        breeding_progress: row?.breeding_progress ?? 0,
        breeding_stage: row?.breeding_stage ?? 0,
        tts_voice_preset: row?.tts_voice_preset ?? null,
        last_interaction: new Date().toISOString(),
      },
      { onConflict: "user_id,companion_id" },
    );
    if (upErr) {
      console.error(upErr);
      return;
    }
    refreshRelationship();
    if (leveledTo && reward) {
      await deliverAffectionLevelUpRewards(leveledTo, reward);
    }
  };

  const confirmPendingImageGeneration = async () => {
    if (!imageGenPending || !user || !companion) return;
    const { prompt, rawUserMessage, fromMenu, menuImagePrompt, lockSceneToMenuPreset } = imageGenPending;
    const explicit = isExplicitImageRequest(prompt) || isExplicitImageRequest(rawUserMessage);
    const freeUsed = getFreeNsfwImagesUsed(user.id, companion.id);
    const menuP = imageGenPending.menuImagePrompt;
    const pendingMood = classifyChatImageMood({
      rawUserMessage: imageGenPending.rawUserMessage,
      menuBasePrompt: menuP,
    });
    const pendingImageFc = pendingMood === "nude" ? CHAT_IMAGE_NUDE_FC : CHAT_IMAGE_LEWD_FC;
    const needTokens = isAdminUser
      ? 0
      : fromMenu && explicit && freeUsed < FREE_NSFW_CHAT_IMAGES
        ? 0
        : pendingImageFc;
    if (!isAdminUser && tokensBalanceRef.current < needTokens) {
      toast.error(
          `Not enough Forge Coins. You need ${needTokens} FC (or use one of ${FREE_NSFW_CHAT_IMAGES} free NSFW stills — ${freeUsed} used).`,
        { action: { label: "Buy FC", onClick: () => navigate("/buy-credits") } },
      );
      return;
    }
    setLoading(true);
    try {
      const imageResult = await generateImage(prompt, user.id, {
        fromMenu,
        rawUserMessage,
        menuImagePrompt,
        lockSceneToMenuPreset: lockSceneToMenuPreset === true,
      });
      if (imageResult) {
        const rowId = await insertAssistantImageMessage({
          content: CHAT_STILL_DELIVERY_CAPTION,
          imageUrl: imageResult.imageUrl,
          imagePrompt: prompt,
          generatedImageId: imageResult.imageId,
        });
        setImageGenPending(null);
        const imageMsg: ChatMessage = {
          id: rowId,
          role: "assistant",
          content: CHAT_STILL_DELIVERY_CAPTION,
          imageUrl: imageResult.imageUrl,
          imageId: imageResult.imageId,
          generatedImageId: imageResult.imageId,
          imagePrompt: prompt,
          timestamp: new Date(),
          savedToCompanionGallery: true,
          savedToPersonalGallery: false,
        };
        setMessages((prev) => [...prev, imageMsg]);
        void queryClient.invalidateQueries({
          queryKey: ["companion-generated-images", user.id, companion.id],
        });
        clearOpeningStarterContext();
        await applyChatAffectionAfterExchange();
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "Could not save image to chat";
      toast.error(raw.length > 200 ? `${raw.slice(0, 197)}…` : raw);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (overrideText?: string, options?: SendMessageOptions) => {
    const messageText = overrideText?.trim() ?? input.trim();
    if (!messageText || !user || !companion) return;

    if (matchesSafeWord(messageText, safeWord)) {
      setInput("");
      setImageGenPending(null);
      await handleEmergencyStop();
      toast.info("🛑 Stopped — safe word.");
      const safeMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content:
          "*immediately stops everything* Of course. Everything stops right now. You're safe. Take all the time you need. I'm here when and if you want to continue. No pressure, no judgment. 💛",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, safeMsg]);
      return;
    }

    if (loading) {
      const menuForcesImageConcurrent = Boolean(options?.imageGenerationPrompt?.trim());
      const routeConcurrent = inferChatMediaRoute(messageText, menuForcesImageConcurrent);
      if (routeConcurrent === "image" || routeConcurrent === "video") {
        toast.info("Still generating — wait for this one to finish, then start another still or clip.");
        return;
      }
    }

    if (overrideText) {
      setInput("");
    }

    setImageGenPending(null);

    const menuForcesImage = Boolean(options?.imageGenerationPrompt?.trim());
    const mediaRoute = inferChatMediaRoute(messageText, menuForcesImage);
    const promptForImage = resolveChatImageGenerationPrompt({
      messageText,
      menuImagePrompt: options?.imageGenerationPrompt ?? null,
      styledSceneExtension: options?.styledSceneExtension ?? null,
      appearanceReference: companion.appearanceReference ?? null,
      characterReference: companion.characterReference ?? null,
    });
    const styledExt = options?.styledSceneExtension?.trim();
    const requestingImage = mediaRoute === "image";
    const requestingVideo = mediaRoute === "video" && !CHAT_IN_SESSION_VIDEO_CLIPS_COMING_SOON;
    const typedVideoButComingSoon = mediaRoute === "video" && CHAT_IN_SESSION_VIDEO_CLIPS_COMING_SOON;
    const autoSpendImages = getChatAutoSpendImages(companion.id);
    const holdForImageButton =
      requestingImage && !autoSpendImages && !options?.bypassImageConfirmation;
    const imageRequestFromMenu = options?.imageRequestFromMenu === true;
    /** FAB / media bar pass tier `imageGenerationPrompt` without `styledSceneExtension` — still must lock scene + identity capsule. */
    const lockSceneToMenuPreset =
      Boolean(styledExt) || (imageRequestFromMenu && menuForcesImage);
    const explicitReq =
      isExplicitImageRequest(promptForImage) || isExplicitImageRequest(messageText);
    const freeUsed = getFreeNsfwImagesUsed(user.id, companion.id);
    const menuForCharge = options?.imageGenerationPrompt ?? null;
    const imageMoodForCharge = classifyChatImageMood({
      rawUserMessage: messageText,
      menuBasePrompt: menuForCharge,
    });
    const imagePerGenFc = imageMoodForCharge === "nude" ? CHAT_IMAGE_NUDE_FC : CHAT_IMAGE_LEWD_FC;
    const imageCharge = isAdminUser
      ? 0
      : imageRequestFromMenu && explicitReq && freeUsed < FREE_NSFW_CHAT_IMAGES
        ? 0
        : imagePerGenFc;
    const videoCharge = isAdminUser ? 0 : CHAT_VIDEO_TOKEN_COST;
    const nextTextMsgFc = isAdminUser ? 0 : nextTextMessageFc(chatDailyQuotaDate, chatDailyQuotaUsed);
    const requiredTokens = holdForImageButton
      ? 0
      : requestingImage
        ? imageCharge
        : requestingVideo
          ? videoCharge
          : nextTextMsgFc;

    const balanceNow = tokensBalanceRef.current;
    if (!isAdminUser && balanceNow < requiredTokens) {
      const tokenType = requestingImage
        ? "image generation"
        : requestingVideo
          ? "video generation"
          : "messaging";
      toast.error(`Not enough FC for ${tokenType}. You need ${requiredTokens} FC but only have ${balanceNow}.`, {
        action: {
          label: "Buy FC",
          onClick: () => navigate("/buy-credits"),
        },
      });
      return;
    }

    if (typedVideoButComingSoon) {
      toast.message("In-chat video clips are coming soon — stills work today.");
    }

    const skipUserInsert = Boolean(
      options?.skipUserMessageInsert && options?.existingUserMessageId?.trim(),
    );
    const priorThread = messagesRef.current;
    const threadForModel = (
      skipUserInsert
        ? priorThread
        : [...priorThread, { role: "user" as const, content: messageText }]
    )
      .slice(-20)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    setInput("");

    let savedUserMessageId: string | null = null;
    let userMsg: ChatMessage | null = null;

    try {
      if (skipUserInsert && options?.existingUserMessageId) {
        savedUserMessageId = options.existingUserMessageId;
        userMsg = {
          id: savedUserMessageId,
          role: "user",
          content: messageText,
          timestamp: new Date(),
        };
      } else {
        const { data: insertedUserRow, error: userInsertError } = await supabase
          .from("chat_messages")
          .insert({
            user_id: user.id,
            companion_id: companion.id,
            role: "user",
            content: messageText,
          })
          .select("id")
          .single();

        if (userInsertError) {
          throw new Error(userInsertError.message || "Could not save your message.");
        }
        savedUserMessageId = insertedUserRow?.id ?? null;
        if (!savedUserMessageId) throw new Error("Could not save your message.");

        userMsg = {
          id: savedUserMessageId,
          role: "user",
          content: messageText,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg!]);
      }

      if (holdForImageButton) {
        setImageGenPending({
          userMessageId: savedUserMessageId,
          prompt: promptForImage,
          rawUserMessage: messageText,
          fromMenu: imageRequestFromMenu,
          menuImagePrompt: options?.imageGenerationPrompt ?? null,
          lockSceneToMenuPreset,
        });
        return;
      }

      if (requestingImage) {
        const menuImagePrompt = options?.imageGenerationPrompt ?? null;
        const teaserUserRequest = imageRequestFromMenu
          ? [
              `They chose a chat still preset: "${messageText}".`,
              styledExt ? `Scene direction: ${styledExt.slice(0, 720)}` : "",
              menuImagePrompt ? `Tier anchor (internal): ${menuImagePrompt.slice(0, 400)}` : "",
            ]
              .filter(Boolean)
              .join("\n")
          : messageText;
        const teaser =
          (await fetchChatImageTeaserLine({
            companionId: companion.id,
            systemPrompt: composeChatSystemPrompt(),
            userRequest: teaserUserRequest,
          })) ||
          pickMenuImageTeaserLine(
            classifyChatImageMood({ rawUserMessage: messageText, menuBasePrompt: menuImagePrompt }),
          );
        const teaserId = await insertAssistantMessage(teaser, null);
        setMessages((prev) => [
          ...prev,
          { id: teaserId, role: "assistant", content: teaser, timestamp: new Date() },
        ]);
        setLoading(true);
        const imageResult = await generateImage(promptForImage, user.id, {
          fromMenu: imageRequestFromMenu,
          rawUserMessage: messageText,
          menuImagePrompt,
          lockSceneToMenuPreset,
        });

        if (imageResult) {
          const rowId = await insertAssistantImageMessage({
            content: CHAT_STILL_DELIVERY_CAPTION,
            imageUrl: imageResult.imageUrl,
            imagePrompt: promptForImage,
            generatedImageId: imageResult.imageId,
          });
          const imageMsg: ChatMessage = {
            id: rowId,
            role: "assistant",
            content: CHAT_STILL_DELIVERY_CAPTION,
            imageUrl: imageResult.imageUrl,
            imageId: imageResult.imageId,
            generatedImageId: imageResult.imageId,
            imagePrompt: promptForImage,
            timestamp: new Date(),
            savedToCompanionGallery: true,
            savedToPersonalGallery: false,
          };

          setMessages((prev) => [...prev, imageMsg]);

          void queryClient.invalidateQueries({
            queryKey: ["companion-generated-images", user.id, companion.id],
          });

          clearOpeningStarterContext();
          await applyChatAffectionAfterExchange();
        } else {
          /** Image pipeline failed (toast already from `generateImage`). Do NOT call chat with the raw image brief — it breaks immersion. */
          const fallback =
            "*The picture didn't come through — try the + menu again, or ask in your own words.*";
          const asstId = await insertAssistantMessage(fallback, null);
          const assistantMsg: ChatMessage = {
            id: asstId,
            role: "assistant",
            content: fallback,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
          clearOpeningStarterContext();
          await applyChatAffectionAfterExchange();
        }
      } else {
        setLoading(true);
        if (requestingVideo) {
          const mood = inferClipMoodFromUserText(messageText);
          await generateChatVideoClip({ mood, silent: false });
          clearOpeningStarterContext();
          await applyChatAffectionAfterExchange();
        } else {
        const { data, error } = await supabase.functions.invoke("grok-chat", {
          body: {
            intent: sessionMode === "live_voice" ? ("live_voice" as const) : ("classic_chat" as const),
            companionId: companion.id,
            messages: threadForModel,
            systemPrompt: composeChatSystemPrompt(),
            companionName: companion.name,
            connectedToys: connectedToys,
          },
        });

        if (error) {
          throw new Error(await messageFromFunctionsInvoke(error, data));
        }
        const chatPayload = data as { response?: string; message?: string; error?: string } | undefined;
        if (chatPayload?.error && !chatPayload?.response && !chatPayload?.message) {
          throw new Error(chatPayload.error);
        }

        const { displayText, lovenseCommand: command, mediaRequest } = parseAssistantStructuredBlocks(
          chatPayload?.response ?? chatPayload?.message,
        );
        const displayContent = displayText.trim() ? displayText : "*Toy command sent.*";

        const asstId = await insertAssistantMessage(displayContent, command);
        const assistantMsg: ChatMessage = {
          id: asstId,
          role: "assistant",
          content: displayContent,
          lovenseCommand: command,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMsg]);

        if (mediaRequest) {
          void runDeferredLustforgeMedia(mediaRequest);
        }

        if (sessionMode === "live_voice") {
          if (effectiveAssistantTtsAutoplay) {
            rampNarrationPendingRef.current = { messageId: asstId, text: displayContent };
          } else {
            liveRampAssistFeedRef.current?.(displayContent);
          }
        }

        if (command && hasDevice) {
          if (effectiveAssistantTtsAutoplay) {
            pendingLovenseForTtsRef.current = { messageId: asstId, command };
          } else {
            void executeDeviceCommand(command);
          }
        }

        await deductMessageForgeCoins(user.id);
        clearOpeningStarterContext();
        await applyChatAffectionAfterExchange();
        }
      }
    } catch (err: unknown) {
      console.error("Chat error:", err);
      if (savedUserMessageId) {
        await supabase.from("chat_messages").delete().eq("id", savedUserMessageId);
      }
      if (userMsg) {
        setMessages((prev) => prev.filter((m) => m.id !== userMsg!.id));
      }
      setImageGenPending(null);
      setInput(messageText);
      if (overrideText) starterSentRef.current = false;
      const raw = err instanceof Error ? err.message : "Failed to process your request.";
      toast.error(raw.length > 240 ? `${raw.slice(0, 237)}…` : raw);
    } finally {
      setLoading(false);
    }
  };

  sendMessageRef.current = sendMessage;

  const requestSimilarStillFromGallery = useCallback(
    (imageUrl: string) => {
      if (!user || !companion) {
        toast.error("Sign in to generate a new still.");
        return;
      }
      const brief =
        "New in-session still: **same character** from CHARACTER APPEARANCE (face, hair, skin, build) — **invent a different outfit, pose, and room** than any roster/profile shot. Boudoir / tease energy, upper body or three-quarter OK, but **not** a remaster of the previous image’s composition or wardrobe.";
      void sendMessage("New still with the same heat as that pick — upper body, lingerie or tease.", {
        imageGenerationPrompt: brief,
        bypassImageConfirmation: true,
        imageRequestFromMenu: false,
      });
    },
    [user, companion, sendMessage],
  );

  const handleFabAction = (fabId: FabActionId) => {
    if (fabId === "gallery") {
      setGalleryOpen(true);
      return;
    }
    if (fabId === "selfie_sfw") {
      void sendMessage(resolveFabDisplay(FAB_SELFIE.sfw.display), {
        imageGenerationPrompt: FAB_SELFIE.sfw.imagePrompt,
        bypassImageConfirmation: true,
        imageRequestFromMenu: true,
      });
      return;
    }
    if (fabId === "selfie_lewd") {
      void sendMessage(resolveFabDisplay(FAB_SELFIE.lewd.display), {
        imageGenerationPrompt: FAB_SELFIE.lewd.imagePrompt,
        bypassImageConfirmation: true,
        imageRequestFromMenu: true,
      });
      return;
    }
    if (fabId === "selfie_nude") {
      void sendMessage(resolveFabDisplay(FAB_SELFIE.nude.display), {
        imageGenerationPrompt: FAB_SELFIE.nude.imagePrompt,
        bypassImageConfirmation: true,
        imageRequestFromMenu: true,
      });
      return;
    }
    if (fabId === "vibration") {
      if (!hasDevice) {
        toast.error("Connect a Lovense toy first.");
        return;
      }
      const sig =
        vibrationPatterns.find((p) => p.is_abyssal_signature) ?? vibrationPatterns[0];
      if (sig) void triggerCompanionVibration(sig);
      else toast.error("No vibration patterns for this companion yet.");
      return;
    }
    if (fabId === "praise") void sendMessage("Praise me. I need to hear I'm good.");
    if (fabId === "tease") void sendMessage("Tease me until I'm begging.");
    if (fabId === "rough") void sendMessage("Be rough with me — consensually, no holding back.");
    if (fabId === "breeding") setShowBreedingRitual(true);
  };

  const goLiveCallFromChat = useCallback(() => {
    if (!companion) return;
    if (!user) {
      navigate("/auth", { state: { from: `/chat/${companion.id}` } });
      return;
    }
    const ok = stashAndNavigateToLiveCall(navigate, companion.id, companion);
    if (!ok) {
      toast.error("No call style available right now.");
      return;
    }
    void invokeGenerateLiveCallOptions(companion.id).then((res) => {
      if (!res.ok && res.error !== "timeout") {
        const errText = "error" in res ? res.error : "Could not reach the call designer.";
        toast.message("Using offline call themes", {
          description: errText || "Could not reach the call designer.",
        });
      }
    });
  }, [companion, user, navigate]);

  const handleRampPill = useCallback(() => {
    if (!user) {
      navigate("/auth", { state: { from: location.pathname } });
      return;
    }
    if (sessionMode !== "live_voice") {
      setSessionMode("live_voice");
      persistChatSessionMode("live_voice");
      setRampModeActive(true);
    } else {
      setRampModeActive((a) => !a);
    }
    requestAnimationFrame(() => {
      document.getElementById("lf-ramp-block")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [user, navigate, sessionMode, setRampModeActive, setSessionMode, location.pathname]);

  /** Fantasy starter from profile: first line is the exact scripted USER message; works with new or existing threads. */
  useEffect(() => {
    if (!user || !companion || !historyReady || loading) return;
    const state = location.state as { starterPrompt?: string; starterTitle?: string } | undefined;
    const sp = state?.starterPrompt?.trim();
    const st = state?.starterTitle?.trim();
    if (!sp || starterSentRef.current) return;
    starterSentRef.current = true;

    void (async () => {
      const { balance: bal, nextTextFc } = await fetchTokens(user.id);
      if (!isAdminUser && nextTextFc > 0 && bal < nextTextFc) {
        starterSentRef.current = false;
        toast.error(
          `Not enough Forge Coins to begin this fantasy. You need ${nextTextFc} FC per line after your free daily messages — you have ${bal} FC.`,
          { action: { label: "Buy FC", onClick: () => navigate("/buy-credits") } },
        );
        return;
      }
      if (st) openingFantasyStarterTitleRef.current = st;
      const prev = location.state as { starterPrompt?: string; starterTitle?: string; from?: string } | undefined;
      navigate(location.pathname, { replace: true, state: { from: prev?.from } });
      queueMicrotask(() => void sendMessageRef.current(sp));
    })();
  }, [user, companion, historyReady, loading, location.pathname, location.state, navigate, isAdminUser]);
  const labelForLovenseCmd = (cmd: Record<string, unknown> | null | undefined) => {
    if (!cmd) return "Toy";
    const id =
      typeof cmd.device_uid === "string"
        ? cmd.device_uid
        : typeof cmd.deviceUid === "string"
          ? cmd.deviceUid
          : null;
    if (id) {
      const t = connectedToys.find((x) => x.id === id);
      return t?.name ?? id.slice(0, 10);
    }
    return activeToys[0]?.name ?? "Toy";
  };

  const freeNsfwUsed = user && companion ? getFreeNsfwImagesUsed(user.id, companion.id) : 0;
  const freeNsfwRemaining = Math.max(0, FREE_NSFW_CHAT_IMAGES - freeNsfwUsed);
  const draftImagePrompt = input.trim()
    ? resolveChatImageGenerationPrompt({
        messageText: input,
        menuImagePrompt: null,
        appearanceReference: companion?.appearanceReference ?? null,
        characterReference: companion?.characterReference ?? null,
      })
    : "";
  const rawDraftMediaRoute = input.trim() ? inferChatMediaRoute(input, false) : "text";
  const draftMediaRoute =
    CHAT_IN_SESSION_VIDEO_CLIPS_COMING_SOON && rawDraftMediaRoute === "video" ? "text" : rawDraftMediaRoute;
  const draftImageStillFc =
    draftMediaRoute === "image" &&
    classifyChatImageMood({ rawUserMessage: input, menuBasePrompt: null }) === "nude"
      ? CHAT_IMAGE_NUDE_FC
      : CHAT_IMAGE_LEWD_FC;
  const imageSubmitTitle =
    isAdminUser
      ? "Send still"
      : draftMediaRoute === "image" &&
          isExplicitImageRequest(draftImagePrompt || input) &&
          freeNsfwRemaining > 0
        ? `Send still (free NSFW · ${freeNsfwRemaining} left)`
        : draftMediaRoute === "image"
          ? `Send still (${draftImageStillFc} FC)`
          : "Send still";
  const videoSubmitTitle = isAdminUser ? "Send clip" : `Send clip (${CHAT_VIDEO_TOKEN_COST} FC)`;
  const pendingExplicit = imageGenPending ? isExplicitImageRequest(imageGenPending.prompt) : false;
  const pendingGenFc = imageGenPending
    ? classifyChatImageMood({
        rawUserMessage: imageGenPending.rawUserMessage,
        menuBasePrompt: imageGenPending.menuImagePrompt,
      }) === "nude"
      ? CHAT_IMAGE_NUDE_FC
      : CHAT_IMAGE_LEWD_FC
    : CHAT_IMAGE_LEWD_FC;
  const pendingImageButtonLabel =
    isAdminUser
      ? "Generate image"
      : pendingExplicit && freeNsfwRemaining > 0
        ? `Generate image (free NSFW · ${freeNsfwRemaining} left)`
        : `Generate image (${pendingGenFc} FC)`;

  const chatDailyQuotaUi = useMemo(
    () => ({
      remainingFree: remainingFreeMessages(chatDailyQuotaDate, chatDailyQuotaUsed),
      nextMessageFc: isAdminUser ? 0 : nextTextMessageFc(chatDailyQuotaDate, chatDailyQuotaUsed),
    }),
    [isAdminUser, chatDailyQuotaDate, chatDailyQuotaUsed],
  );

  return {
    id,
    navigate,
    location,
    companionsLoading,
    forgeLookupBusy,
    companion,
    dbComp,
    dbCompDisplay,
    breedingPartnerDb,
    basePortraitUrl,
    headerAnimated,
    messages,
    input,
    setInput,
    loading,
    user,
    tokensBalance,
    chatDailyQuotaUi,
    forgeBalanceReady,
    safeWord,
    connectedToys,
    primaryToyUid,
    toysPanelLoading,
    viewingImage,
    setViewingImage,
    showBreedingRitual,
    setShowBreedingRitual,
    voiceSettingsOpen,
    setVoiceSettingsOpen,
    voicePresetSaving,
    profileTtsGlobal,
    ttsAutoplay,
    liveVoiceTtsAutoplay,
    smartSuggestions,
    heartBursts,
    messagesEndRef,
    ttsLoadingId,
    ttsPlayingId,
    ttsWordHighlight,
    sendingVibrationId,
    livePatternId,
    toyDriveActive,
    sessionMode,
    setSessionMode,
    rampModeActive,
    setRampModeActive,
    rampPreset,
    liveVoiceStopTick,
    liveVoiceElapsedSec,
    liveVoiceMicRecording,
    setLiveVoiceMicRecording,
    toyUtilityBusy,
    historyReady,
    galleryOpen,
    setGalleryOpen,
    savingBackupImageId,
    imageGenPending,
    autoSpendChatImages,
    setAutoSpendChatImages,
    portraitStillUrl,
    galleryImages,
    galleryImagesLoading,
    isAdminUser,
    mood,
    affectionTier,
    affectionProgress,
    affectionProgressMax,
    effectiveVoiceLabel,
    relationshipVoicePreset,
    globalVoiceLabelForSheet,
    onTtsAutoplayChange,
    onLiveVoiceTtsAutoplayChange,
    userAvatarUrl,
    userInitials,
    activeToys,
    hasDevice,
    selectPrimaryToy,
    vibrationPatterns,
    vibrationPatternsLoading,
    stopSustainedToy,
    prepareToyForRamp,
    handleRampPresetChange,
    relationship,
    queryClient,
    handlePortraitFromGallery,
    refreshToys,
    pairingQrUrl,
    pairingLoading,
    cancelLovensePairing,
    handleToggleToyEnabled,
    handleConnectToy,
    handleDisconnectOneToy,
    triggerCompanionVibration,
    handleTestToy,
    handleDisconnectToy,
    handleStopAll,
    handleStartBreedingRitual,
    labelForLovenseCmd,
    draftMediaRoute,
    imageSubmitTitle,
    videoSubmitTitle,
    pendingImageButtonLabel,
    handleTts,
    handleSaveImageBackup,
    confirmPendingImageGeneration,
    sendMessage,
    registerLiveRampAssistFeed,
    liveVoiceSendText,
    handleRampPill,
    goLiveCallFromChat,
    handleEmergencyStopFromUi,
    handleEmergencyStop,
    handleFabAction,
    handleMediaBarRequest,
    generateChatVideoClip,
    saveRelationshipVoice,
    saveImageToCompanionGallery,
    saveImageToPersonalGallery,
    handleBreedingComplete,
    tokensBalanceRef,
    requestSimilarStillFromGallery,
  };
}

export type UseChatSessionControllerReturn = ReturnType<typeof useChatSessionController>;
