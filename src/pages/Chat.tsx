import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useCompanions, dbToCompanion } from "@/hooks/useCompanions";
import { useForgeCompanionOverlay } from "@/hooks/useForgeCompanionOverlay";
import { usePortraitOverrideUrl } from "@/hooks/usePortraitOverride";
import { useCompanionGeneratedImages } from "@/hooks/useCompanionGeneratedImages";
import {
  galleryStaticPortraitUrl,
  profileAnimatedPortraitUrl,
  isVideoPortraitUrl,
  shouldShowProfileLoopVideo,
} from "@/lib/companionMedia";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { invokeGenerateImage } from "@/lib/invokeGenerateImage";
import { isPlatformAdmin } from "@/config/auth";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { ImageViewer } from "@/components/ImageViewer";
import { BreedingRitual } from "@/components/BreedingRitual";
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
  inferStylizedArtFromTags,
} from "@/lib/forgeBodyTypes";
import { ChatPremiumHeader } from "@/components/chat/ChatPremiumHeader";
import { ChatMessageThread } from "@/components/chat/ChatMessageThread";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatQuickActionFab, type FabActionId } from "@/components/chat/ChatQuickActionFab";
import { ChatSmartReplies } from "@/components/chat/ChatSmartReplies";
import { ChatDevicesCollapsible } from "@/components/chat/ChatDevicesCollapsible";
import { FloatingHeartsLayer } from "@/components/chat/FloatingHeartsLayer";
import { ChatVoiceSettingsSheet } from "@/components/chat/ChatVoiceSettingsSheet";
import type { ChatMessage } from "@/components/chat/chatTypes";
import { deriveChatMood } from "@/lib/chatMood";
import { getTtsAutoplay, persistTtsAutoplay } from "@/lib/ttsChatPreferences";
import {
  TTS_UX_LABELS,
  resolveUxVoiceId,
  uxVoiceToXaiVoice,
  type TtsUxVoiceId,
} from "@/lib/ttsVoicePresets";
import { ToyHubPopover } from "@/components/toy/ToyHubPopover";
import { ChatGallerySheet } from "@/components/chat/ChatGallerySheet";
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
  inferChatImageGenerationPrompt,
  isExplicitImageRequest,
  isImageRequestText,
  resolveFabDisplay,
  setChatAutoSpendImages,
} from "@/lib/chatImageSettings";
import { invokeGenerateChatVideo } from "@/lib/invokeGenerateChatVideo";
import { ChatModeToggle } from "@/components/chat/ChatModeToggle";
import { LiveVoicePanel } from "@/components/chat/LiveVoicePanel";
import { ChatMediaRequestBar } from "@/components/chat/ChatMediaRequestBar";
import { ChatAutoSpendImagesToggle } from "@/components/chat/ChatAutoSpendImagesToggle";
import {
  advanceChatAffectionState,
  buildAffectionLevelUpCopy,
  messagesNeededForNextLevel,
  tierToLegacyAffectionPct,
  type AffectionRewardKind,
} from "@/lib/chatAffection";
import { parseAssistantDisplayContent } from "@/lib/chatSignatureBeat";
import { parseLovenseChatCommand } from "@/lib/parseLovenseChatCommand";

const TOKEN_COST = 15;

/** Optional second arg for `sendMessage`: internal image brief (not shown in chat) + skip confirm for + menu. */
type SendMessageOptions = {
  imageGenerationPrompt?: string;
  bypassImageConfirmation?: boolean;
  /** User row already inserted (e.g. live voice transcript) — do not insert again. */
  skipUserMessageInsert?: boolean;
  existingUserMessageId?: string;
};
const IMAGE_TOKEN_COST = 75;

const SMART_FALLBACK = ["Tell me more…", "I want you closer.", "Surprise me."];

const Chat = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: dbCompanions, isLoading: companionsLoading } = useCompanions();
  const { dbComp, forgeLookupBusy } = useForgeCompanionOverlay(id, dbCompanions, companionsLoading);
  const companion = dbComp ? dbToCompanion(dbComp) : null;
  const basePortraitUrl = useMemo(() => galleryStaticPortraitUrl(dbComp, id), [dbComp, id]);
  const headerAnimated = useMemo(() => {
    const raw = profileAnimatedPortraitUrl(dbComp);
    if (shouldShowProfileLoopVideo(dbComp, dbComp?.profile_loop_video_enabled)) return raw ?? null;
    if (raw && !isVideoPortraitUrl(raw)) return raw;
    return null;
  }, [dbComp]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [tokensBalance, setTokensBalance] = useState<number>(0);
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
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>(SMART_FALLBACK);
  const [heartBursts, setHeartBursts] = useState<{ id: number; x: string }[]>([]);
  const heartIdRef = useRef(0);
  const prevChatAffectionTierRef = useRef<number | null>(null);
  const prevLoadingRef = useRef(false);
  const [ttsLoadingId, setTtsLoadingId] = useState<string | null>(null);
  const [ttsPlayingId, setTtsPlayingId] = useState<string | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const [sendingVibrationId, setSendingVibrationId] = useState<string | null>(null);
  const [livePatternId, setLivePatternId] = useState<string | null>(null);
  const sustainedToySessionRef = useRef<{ stop: () => Promise<void> } | null>(null);
  /** When TTS autoplay is on, queue here and run after playback starts in `handleTts` (avoids toy-before-voice). */
  const pendingLovenseForTtsRef = useRef<{ messageId: string; command: unknown } | null>(null);
  const executeDeviceCommandRef = useRef<(command: unknown) => Promise<void>>(async () => {});
  const [toyDriveActive, setToyDriveActive] = useState(false);
  const [sessionMode, setSessionMode] = useState<ChatSessionMode>(() => getChatSessionMode());
  /** Live Voice — Ramp Mode (prompt + Lovense driver, see LiveVoicePanel). */
  const [rampModeActive, setRampModeActive] = useState(false);
  const [rampPreset, setRampPreset] = useState<RampPresetId>("gentle_tease");
  const [toyUtilityBusy, setToyUtilityBusy] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [savingBackupImageId, setSavingBackupImageId] = useState<string | null>(null);
  /** User asked for an image; waiting for "Generate" tap (when auto-spend is off). */
  const [imageGenPending, setImageGenPending] = useState<{ userMessageId: string; prompt: string } | null>(null);
  const [autoSpendChatImages, setAutoSpendChatImages] = useState(false);
  const starterSentRef = useRef(false);
  /** Keeps token checks in sync with async `fetchTokens` before React state flushes (fantasy starters). */
  const tokensBalanceRef = useRef(0);
  const messagesRef = useRef<ChatMessage[]>([]);
  const sendMessageRef = useRef<(text?: string, opts?: SendMessageOptions) => Promise<void>>(async () => {});
  const openingFantasyStarterTitleRef = useRef<string | null>(null);
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { data: portraitOverrideUrl } = usePortraitOverrideUrl(id, user?.id);
  const portraitStillUrl = useMemo(() => {
    if (!id) return basePortraitUrl ?? null;
    if (id.startsWith("cc-")) return basePortraitUrl ?? null;
    return portraitOverrideUrl ?? basePortraitUrl ?? null;
  }, [id, portraitOverrideUrl, basePortraitUrl]);
  const { data: galleryImages = [], isLoading: galleryImagesLoading } = useCompanionGeneratedImages(id, user?.id);

  const isAdminUser = useMemo(() => isPlatformAdmin(user), [user]);

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
    return () => {
      void stopSustainedToy();
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
      setUser(session.user);
      fetchTokens(session.user.id);
      checkDevice(session.user.id);
    });
  }, [navigate]);

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

  const fetchTokens = async (userId: string): Promise<number> => {
    const { data } = await supabase
      .from("profiles")
      .select("tokens_balance, tts_voice_global_override")
      .eq("user_id", userId)
      .maybeSingle();
    const bal =
      typeof data?.tokens_balance === "number" && Number.isFinite(data.tokens_balance) ? data.tokens_balance : 0;
    setTokensBalance(bal);
    tokensBalanceRef.current = bal;
    const g = data?.tts_voice_global_override;
    setProfileTtsGlobal(typeof g === "string" && g.trim() ? g.trim() : null);
    return bal;
  };

  const deductTokens = async (userId: string) => {
    if (isAdminUser) return;
    const { data } = await supabase.from("profiles").select("tokens_balance").eq("user_id", userId).maybeSingle();
    const cur = data?.tokens_balance ?? 0;
    const newBalance = Math.max(0, cur - TOKEN_COST);
    await supabase.from("profiles").update({ tokens_balance: newBalance }).eq("user_id", userId);
    setTokensBalance(newBalance);
    tokensBalanceRef.current = newBalance;
  };

  const lastLiveUserTranscriptRef = useRef<{ t: string; at: number } | null>(null);
  /** Persist user speech to the thread; image-like lines also run the image pipeline (no duplicate user row). */
  const handleLiveUserTranscript = useCallback((text: string) => {
    void (async () => {
      const trimmed = text.trim();
      if (!trimmed || !user?.id || !companion) return;

      const now = Date.now();
      const prev = lastLiveUserTranscriptRef.current;
      if (prev && prev.t === trimmed && now - prev.at < 2800) return;
      lastLiveUserTranscriptRef.current = { t: trimmed, at: now };

      try {
        const { data: insertedUserRow, error: userInsertError } = await supabase
          .from("chat_messages")
          .insert({
            user_id: user.id,
            companion_id: companion.id,
            role: "user",
            content: trimmed,
          })
          .select("id")
          .single();

        if (userInsertError || !insertedUserRow?.id) {
          console.error(userInsertError);
          return;
        }

        const uid = insertedUserRow.id as string;
        const userMsg: ChatMessage = {
          id: uid,
          role: "user",
          content: trimmed,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg]);
        messagesRef.current = [...messagesRef.current, userMsg];

        const wantsImage =
          isImageRequestText(trimmed) || Boolean(inferChatImageGenerationPrompt(trimmed));
        if (wantsImage) {
          await sendMessageRef.current(trimmed, {
            skipUserMessageInsert: true,
            existingUserMessageId: uid,
            bypassImageConfirmation: true,
          });
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [user?.id, companion?.id]);

  const generateImage = async (userRequest: string, userId: string): Promise<any> => {
    if (!companion || !dbComp) return null;

    try {
      const explicit = isExplicitImageRequest(userRequest);
      const freeUsed = getFreeNsfwImagesUsed(userId, companion.id);
      const useFreeNsfwSlot = explicit && freeUsed < FREE_NSFW_CHAT_IMAGES;
      const tokenCost = isAdminUser ? 0 : useFreeNsfwSlot ? 0 : IMAGE_TOKEN_COST;

      /** Raw desire text — `generate-image-tensor` (Tensor) builds the final diffusion prompt; explicit chat requests are allowed within Tensor / product rules. */
      const prompt = `${userRequest}\n\n(Character: ${companion.name}, ${companion.gender}. ${companion.appearance})`.slice(
        0,
        8000,
      );

      const resolvedBodyType =
        inferForgeBodyTypeFromTags(dbComp.tags ?? []) ??
        inferForgeBodyTypeFromAppearance(dbComp.appearance) ??
        "Average Build";
      const artLabel = inferStylizedArtFromTags(dbComp.tags ?? []) ?? "Photorealistic";
      const packSnap = (dbComp.image_prompt || "").trim().slice(0, 900);
      const referenceImageUrl =
        (typeof (dbComp as Record<string, unknown>).static_image_url === "string" &&
          ((dbComp as Record<string, unknown>).static_image_url as string)) ||
        (typeof (dbComp as Record<string, unknown>).image_url === "string" &&
          ((dbComp as Record<string, unknown>).image_url as string)) ||
        null;
      const portraitConsistencyLock = [
        `Roster identity lock: depict the SAME individual as ${companion.name} — not a different person, species, or unrelated stock model.`,
        `Locked forge body type: ${resolvedBodyType}.`,
        `Locked render style: ${artLabel}.`,
        packSnap ? `Packshot / catalog intent (match discipline): ${packSnap}` : "",
        `Appearance continuity (face, hair, skin or fur, silhouette): ${(companion.appearance || "").trim().slice(0, 1500)}`,
        `Forbidden: drifting from the roster look (e.g. anime-style character → unrelated photoreal different body) unless the user's message explicitly requests that alternate.`,
      ]
        .filter(Boolean)
        .join(" ");

      const { data, error } = await invokeGenerateImage({
        prompt,
        userId,
        isPortrait: false,
        tokenCost,
        ...(referenceImageUrl ? { referenceImageUrl } : {}),
        characterData: {
          companionId: companion.id,
          style: "chat-session",
          artStyleLabel: artLabel,
          bodyType: resolvedBodyType,
          silhouetteCategory: forgeBodyCategoryIdForType(resolvedBodyType),
          portraitConsistencyLock,
          tags: dbComp.tags ?? [],
          baseDescription: `portrait of ${companion.name}, ${companion.gender}; ${companion.appearance}`,
          vibe: companion.personality,
          clothing: companion.role ? `fits ${companion.role} energy` : undefined,
        },
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
  const generateAffectionRewardImage = async (kind: AffectionRewardKind) => {
    if (!companion || !dbComp || !user) return null;
    try {
      const tierPrompt = kind === "lewd" ? FAB_SELFIE.lewd.imagePrompt : FAB_SELFIE.nude.imagePrompt;
      const prompt = `${tierPrompt}\n\n(Character: ${companion.name}, ${companion.gender}. ${companion.appearance})`.slice(
        0,
        8000,
      );

      const resolvedBodyType =
        inferForgeBodyTypeFromTags(dbComp.tags ?? []) ??
        inferForgeBodyTypeFromAppearance(dbComp.appearance) ??
        "Average Build";
      const artLabel = inferStylizedArtFromTags(dbComp.tags ?? []) ?? "Photorealistic";
      const packSnap = (dbComp.image_prompt || "").trim().slice(0, 900);
      const referenceImageUrl =
        (typeof (dbComp as Record<string, unknown>).static_image_url === "string" &&
          ((dbComp as Record<string, unknown>).static_image_url as string)) ||
        (typeof (dbComp as Record<string, unknown>).image_url === "string" &&
          ((dbComp as Record<string, unknown>).image_url as string)) ||
        null;
      const portraitConsistencyLock = [
        `Roster identity lock: depict the SAME individual as ${companion.name}.`,
        `Locked forge body type: ${resolvedBodyType}.`,
        `Locked render style: ${artLabel}.`,
        packSnap ? `Packshot / catalog intent: ${packSnap}` : "",
        `Appearance continuity: ${(companion.appearance || "").trim().slice(0, 1500)}`,
      ]
        .filter(Boolean)
        .join(" ");

      const { data, error } = await invokeGenerateImage({
        prompt,
        userId: user.id,
        isPortrait: false,
        tokenCost: 0,
        ...(referenceImageUrl ? { referenceImageUrl } : {}),
        characterData: {
          companionId: companion.id,
          style: "chat-session",
          artStyleLabel: artLabel,
          bodyType: resolvedBodyType,
          silhouetteCategory: forgeBodyCategoryIdForType(resolvedBodyType),
          portraitConsistencyLock,
          tags: dbComp.tags ?? [],
          baseDescription: `portrait of ${companion.name}, ${companion.gender}; ${companion.appearance}`,
          vibe: companion.personality,
          clothing: companion.role ? `fits ${companion.role} energy` : undefined,
        },
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

  const composeGrokSystemPrompt = () => {
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
      safeWord,
      connectedToysSummary: toyBlock,
      openingFantasyStarterTitle: openingFantasyStarterTitleRef.current,
      userToyIntensityPercent: Number.isFinite(pct) ? pct : 100,
      chatAffectionTier: relationship?.chat_affection_level ?? 1,
    });
  };

  const clearOpeningStarterContext = () => {
    openingFantasyStarterTitleRef.current = null;
  };

  const executeDeviceCommand = async (command: any) => {
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

      /** Run queued Lovense command once, after we attempt to start audio (keeps toy aligned with voice). */
      const flushPendingToyForMessage = async () => {
        const pending = pendingLovenseForTtsRef.current;
        if (!pending || pending.messageId !== msg.id) return;
        pendingLovenseForTtsRef.current = null;
        await executeDeviceCommandRef.current(pending.command);
      };

      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current = null;
      }
      if (ttsPlayingId === msg.id) {
        setTtsPlayingId(null);
        return;
      }
      if (msg.tts_audio_url) {
        const a = new Audio(msg.tts_audio_url);
        ttsAudioRef.current = a;
        setTtsPlayingId(msg.id);
        a.onended = () => setTtsPlayingId(null);
        a.onerror = () => {
          setTtsPlayingId(null);
          toast.error("Could not play audio");
        };
        try {
          await a.play();
        } catch {
          toast.error("Could not play audio");
        } finally {
          await flushPendingToyForMessage();
        }
        return;
      }
      setTtsLoadingId(msg.id);
      try {
        const voiceId = uxVoiceToXaiVoice(effectiveUxVoice);
        const ttsText = parseAssistantDisplayContent(msg.content).displayText;
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
        a.onended = () => setTtsPlayingId(null);
        a.onerror = () => {
          setTtsPlayingId(null);
          toast.error("Could not play audio");
        };
        try {
          await a.play();
        } catch {
          toast.error("Could not play audio");
        } finally {
          await flushPendingToyForMessage();
        }
      } catch (e: unknown) {
        const raw = e instanceof Error ? e.message : "TTS failed";
        toast.error(raw.length > 120 ? `${raw.slice(0, 117)}…` : raw);
        await flushPendingToyForMessage();
      } finally {
        setTtsLoadingId(null);
      }
    },
    [user, ttsPlayingId, effectiveUxVoice],
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
            const { data, error } = await supabase.functions.invoke("chat-smart-replies", {
              body: { companionId: companion.id, companionName: companion.name, messages: thread },
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
      if (ttsAutoplay && last && !last.imageUrl && last.content?.trim()) {
        ttsTimer = window.setTimeout(() => {
          void handleTts(last);
        }, 400);
      }

      return () => {
        clearTimeout(t);
        if (ttsTimer !== undefined) clearTimeout(ttsTimer);
      };
    }
  }, [loading, companion, user, historyReady, handleTts, ttsAutoplay]);

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

  const handleEmergencyStop = async () => {
    await stopSustainedToy();
    if (!user) return;
    try {
      const ok = await stopAllUserToys(user.id, connectedToys);
      if (!ok) toast.error("Failed to stop device");
    } catch {
      toast.error("Failed to stop device");
    }
  };

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

  const handleVoiceAssistantTranscript = async (text: string) => {
    const t = text.trim();
    if (!t || !user || !companion) return;
    const { cleanText, command } = parseLovenseChatCommand(t);
    const displayContent = cleanText.trim() ? cleanText : "*Toy command sent.*";
    try {
      const id = await insertAssistantMessage(displayContent, command);
      const assistantMsg: ChatMessage = {
        id,
        role: "assistant",
        content: displayContent,
        lovenseCommand: command ?? undefined,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      if (command && hasDevice) {
        if (ttsAutoplay) {
          pendingLovenseForTtsRef.current = { messageId: id, command };
        } else {
          void executeDeviceCommand(command);
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Could not save voice reply to chat");
    }
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

  const generateChatVideoClip = async () => {
    if (!user || !companion) return;
    const cost = isAdminUser ? 0 : CHAT_VIDEO_TOKEN_COST;
    if (!isAdminUser && tokensBalance < cost) {
      toast.error(`Video clips cost ${cost} forge credits. You have ${tokensBalance}.`, {
        action: { label: "Upgrade", onClick: () => navigate("/") },
      });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await invokeGenerateChatVideo({
        companionId: companion.id,
        userId: user.id,
        tokenCost: cost,
      });
      if (error) throw error;
      const url = data?.videoUrl;
      if (!url) throw new Error("No video returned");
      const caption = `*${companion.name} sent you a steamy clip…*`;
      const clipPrompt =
        "[LustForge chat] Themed lewd 9:16 vertical clip — sensual, flirtatious; exact content varies.";
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
      toast.success("Video ready");
      void queryClient.invalidateQueries({ queryKey: ["companion-generated-images", user.id, companion.id] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not generate video");
    } finally {
      setLoading(false);
    }
  };

  const handleMediaBarRequest = (tier: "selfie_sfw" | "selfie_lewd" | "selfie_nude" | "lewd_video") => {
    if (tier === "lewd_video") {
      void generateChatVideoClip();
      return;
    }
    if (tier === "selfie_sfw") {
      void sendMessage(resolveFabDisplay(FAB_SELFIE.sfw.display), {
        imageGenerationPrompt: FAB_SELFIE.sfw.imagePrompt,
        bypassImageConfirmation: true,
      });
      return;
    }
    if (tier === "selfie_lewd") {
      void sendMessage(resolveFabDisplay(FAB_SELFIE.lewd.display), {
        imageGenerationPrompt: FAB_SELFIE.lewd.imagePrompt,
        bypassImageConfirmation: true,
      });
      return;
    }
    void sendMessage(resolveFabDisplay(FAB_SELFIE.nude.display), {
      imageGenerationPrompt: FAB_SELFIE.nude.imagePrompt,
      bypassImageConfirmation: true,
    });
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
        const imagePromptTag = `[Bond reward · tier ${newLevel} · ${reward}]`;
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
    const { prompt } = imageGenPending;
    const explicit = isExplicitImageRequest(prompt);
    const freeUsed = getFreeNsfwImagesUsed(user.id, companion.id);
    const needTokens = isAdminUser ? 0 : explicit && freeUsed < FREE_NSFW_CHAT_IMAGES ? 0 : IMAGE_TOKEN_COST;
    if (!isAdminUser && tokensBalanceRef.current < needTokens) {
      toast.error(
        `Not enough tokens. You need ${needTokens} forge credits (or use one of ${FREE_NSFW_CHAT_IMAGES} free NSFW generations — ${freeUsed} used).`,
        { action: { label: "Upgrade", onClick: () => navigate("/") } },
      );
      return;
    }
    setLoading(true);
    try {
      const imageResult = await generateImage(prompt, user.id);
      if (imageResult) {
        const rowId = await insertAssistantImageMessage({
          content: `*creates a captivating image just for you*`,
          imageUrl: imageResult.imageUrl,
          imagePrompt: prompt,
          generatedImageId: imageResult.imageId,
        });
        setImageGenPending(null);
        const imageMsg: ChatMessage = {
          id: rowId,
          role: "assistant",
          content: `*creates a captivating image just for you*`,
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
    if (!messageText || loading || !user || !companion) return;

    if (overrideText) {
      setInput("");
    }

    setImageGenPending(null);

    const inferredFromSpeech = inferChatImageGenerationPrompt(messageText);
    const promptForImage = options?.imageGenerationPrompt?.trim() || inferredFromSpeech || messageText;
    const requestingImage =
      Boolean(options?.imageGenerationPrompt?.trim()) ||
      isImageRequestText(messageText);
    const autoSpendImages = getChatAutoSpendImages(companion.id);
    const holdForImageButton =
      requestingImage && !autoSpendImages && !options?.bypassImageConfirmation;
    const explicitReq = isExplicitImageRequest(promptForImage);
    const freeUsed = getFreeNsfwImagesUsed(user.id, companion.id);
    const imageCharge = isAdminUser ? 0 : explicitReq && freeUsed < FREE_NSFW_CHAT_IMAGES ? 0 : IMAGE_TOKEN_COST;
    const requiredTokens = holdForImageButton ? 0 : requestingImage ? imageCharge : TOKEN_COST;

    const balanceNow = tokensBalanceRef.current;
    if (!isAdminUser && balanceNow < requiredTokens) {
      const tokenType = requestingImage ? "image generation" : "messaging";
      toast.error(`Not enough tokens for ${tokenType}. You need ${requiredTokens} but only have ${balanceNow}.`, {
        action: {
          label: "Upgrade",
          onClick: () => navigate("/"),
        },
      });
      return;
    }

    if (messageText.toUpperCase() === safeWord.toUpperCase()) {
      toast.info("🛑 Safe word activated. All activity stopped. You're safe.");
      setInput("");

      if (connectedToys.length > 0) {
        handleEmergencyStop();
      }

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
        setImageGenPending({ userMessageId: savedUserMessageId, prompt: promptForImage });
        return;
      }

      setLoading(true);

      if (requestingImage) {
        const imageResult = await generateImage(promptForImage, user.id);

        if (imageResult) {
          const rowId = await insertAssistantImageMessage({
            content: `*creates a captivating image just for you*`,
            imageUrl: imageResult.imageUrl,
            imagePrompt: promptForImage,
            generatedImageId: imageResult.imageId,
          });
          const imageMsg: ChatMessage = {
            id: rowId,
            role: "assistant",
            content: `*creates a captivating image just for you*`,
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
          /** Image pipeline failed (toast already from `generateImage`). Do NOT call chat with the raw image brief — Grok often refuses and breaks immersion. */
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
        const { data, error } = await supabase.functions.invoke("chat-with-companion", {
          body: {
            companionId: companion.id,
            messages: threadForModel,
            systemPrompt: composeGrokSystemPrompt(),
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

        const { cleanText, command } = parseLovenseChatCommand(
          chatPayload?.response || chatPayload?.message || "",
        );
        const displayContent = cleanText.trim() ? cleanText : "*Toy command sent.*";

        const asstId = await insertAssistantMessage(displayContent, command);
        const assistantMsg: ChatMessage = {
          id: asstId,
          role: "assistant",
          content: displayContent,
          lovenseCommand: command,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMsg]);

        if (command && hasDevice) {
          if (ttsAutoplay) {
            pendingLovenseForTtsRef.current = { messageId: asstId, command };
          } else {
            void executeDeviceCommand(command);
          }
        }

        await deductTokens(user.id);
        clearOpeningStarterContext();
        await applyChatAffectionAfterExchange();
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

  const handleFabAction = (fabId: FabActionId) => {
    if (fabId === "gallery") {
      setGalleryOpen(true);
      return;
    }
    if (fabId === "selfie_sfw") {
      void sendMessage(resolveFabDisplay(FAB_SELFIE.sfw.display), {
        imageGenerationPrompt: FAB_SELFIE.sfw.imagePrompt,
        bypassImageConfirmation: true,
      });
      return;
    }
    if (fabId === "selfie_lewd") {
      void sendMessage(resolveFabDisplay(FAB_SELFIE.lewd.display), {
        imageGenerationPrompt: FAB_SELFIE.lewd.imagePrompt,
        bypassImageConfirmation: true,
      });
      return;
    }
    if (fabId === "selfie_nude") {
      void sendMessage(resolveFabDisplay(FAB_SELFIE.nude.display), {
        imageGenerationPrompt: FAB_SELFIE.nude.imagePrompt,
        bypassImageConfirmation: true,
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

  /** Fantasy starter from profile: first line is the exact scripted USER message; works with new or existing threads. */
  useEffect(() => {
    if (!user || !companion || !historyReady || loading) return;
    const state = location.state as { starterPrompt?: string; starterTitle?: string } | undefined;
    const sp = state?.starterPrompt?.trim();
    const st = state?.starterTitle?.trim();
    if (!sp || starterSentRef.current) return;
    starterSentRef.current = true;

    void (async () => {
      const bal = await fetchTokens(user.id);
      if (!isAdminUser && bal < TOKEN_COST) {
        starterSentRef.current = false;
        toast.error(`Not enough tokens to begin this fantasy. You need ${TOKEN_COST} but have ${bal}.`, {
          action: { label: "Upgrade", onClick: () => navigate("/") },
        });
        return;
      }
      if (st) openingFantasyStarterTitleRef.current = st;
      const prev = location.state as { starterPrompt?: string; starterTitle?: string; from?: string } | undefined;
      navigate(location.pathname, { replace: true, state: { from: prev?.from } });
      queueMicrotask(() => void sendMessageRef.current(sp));
    })();
  }, [user, companion, historyReady, loading, location.pathname, location.state, navigate, isAdminUser]);

  if (companionsLoading || forgeLookupBusy) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!companion) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-muted-foreground">Companion not found.</p>
        <Link to="/" className="text-sm text-primary hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

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

  const freeNsfwUsed = user ? getFreeNsfwImagesUsed(user.id, companion.id) : 0;
  const freeNsfwRemaining = Math.max(0, FREE_NSFW_CHAT_IMAGES - freeNsfwUsed);
  const imageSubmitTitle =
    isAdminUser
      ? "Generate image"
      : isImageRequestText(input) && isExplicitImageRequest(input) && freeNsfwRemaining > 0
        ? `Generate image (free NSFW · ${freeNsfwRemaining} left)`
        : `Generate image (${IMAGE_TOKEN_COST} tokens)`;
  const pendingExplicit = imageGenPending ? isExplicitImageRequest(imageGenPending.prompt) : false;
  const pendingImageButtonLabel =
    isAdminUser
      ? "Generate image"
      : pendingExplicit && freeNsfwRemaining > 0
        ? `Generate image (free NSFW · ${freeNsfwRemaining} left)`
        : `Generate image (${IMAGE_TOKEN_COST} tokens)`;

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden bg-[hsl(280_30%_5%)] text-foreground">
      <FloatingHeartsLayer bursts={heartBursts} />

      <ChatPremiumHeader
        companion={companion}
        dbComp={dbComp}
        imageUrl={portraitStillUrl}
        headerAnimated={headerAnimated}
        mood={mood}
        affectionTier={affectionTier}
        affectionProgress={affectionProgress}
        affectionProgressMax={affectionProgressMax}
        tokensBalance={tokensBalance}
        isAdminUser={isAdminUser}
        safeWord={safeWord}
        onBack={() => {
          const backTo = (location.state as { from?: string } | undefined)?.from;
          if (backTo) navigate(backTo);
          else if (location.key !== "default") navigate(-1);
          else navigate(`/companions/${companion.id}`);
        }}
        onSafeWordInfo={() => {
          toast.info(`🛑 Safe word: "${safeWord}" — Type it anytime to stop everything.`);
        }}
        onCompanionPortraitClick={() => setVoiceSettingsOpen(true)}
        onOpenGallery={user ? () => setGalleryOpen(true) : undefined}
        sessionControls={
          <ChatModeToggle
            mode={sessionMode}
            onChange={(m) => {
              setSessionMode(m);
              persistChatSessionMode(m);
            }}
            disabled={!user}
          />
        }
        rightSlot={
          user ? (
            <ToyHubPopover
              toys={connectedToys}
              loading={toysPanelLoading}
              pairingLoading={pairingLoading}
              pairingQrUrl={pairingQrUrl}
              onCancelPairing={cancelLovensePairing}
              onRefresh={refreshToys}
              onConnect={() => void handleConnectToy()}
              onDisconnectOne={(uid) => void handleDisconnectOneToy(uid)}
              onToggleEnabled={(uid, en) => void handleToggleToyEnabled(uid, en)}
            />
          ) : null
        }
      />

      <ChatDevicesCollapsible
        companionName={companion.name}
        connectedCount={connectedToys.length}
        activeCount={activeToys.length}
        affectionPct={relationship?.affection_level ?? 0}
        breedingStage={relationship?.breeding_stage ?? 0}
        hasDevice={hasDevice}
        pairingQrUrl={pairingQrUrl}
        toyUtilityBusy={toyUtilityBusy}
        pairingLoading={pairingLoading}
        onCancelPairing={cancelLovensePairing}
        onTestToy={() => void handleTestToy()}
        onDisconnectToy={() => void handleDisconnectToy()}
        onStopAll={() => void handleStopAll()}
        onConnectToy={() => void handleConnectToy()}
        onBreedingRitual={handleStartBreedingRitual}
        toys={activeToys}
        primaryToyId={primaryToyUid}
        onSelectPrimaryToy={selectPrimaryToy}
        patterns={vibrationPatterns}
        patternsLoading={vibrationPatternsLoading}
        sendingVibrationId={sendingVibrationId}
        activePatternId={livePatternId}
        onTriggerPattern={(row) => void triggerCompanionVibration(row)}
      />

      {user ? (
        <div className="shrink-0 px-3 pt-1 pb-2 md:px-5 space-y-2">
          <ChatMediaRequestBar
            disabled={!isAdminUser && tokensBalance <= 0}
            videoDisabled={!isAdminUser && tokensBalance < CHAT_VIDEO_TOKEN_COST}
            imageCostLabel={isAdminUser ? "waived" : `${IMAGE_TOKEN_COST} cr`}
            videoCostLabel={isAdminUser ? "waived" : `${CHAT_VIDEO_TOKEN_COST} cr`}
            onRequest={handleMediaBarRequest}
          />
          <ChatAutoSpendImagesToggle
            enabled={autoSpendChatImages}
            onChange={(enabled) => {
              setAutoSpendChatImages(enabled);
              setChatAutoSpendImages(companion.id, enabled);
            }}
          />
        </div>
      ) : null}

      {/* Token warning */}
      {!isAdminUser && tokensBalance < 100 && tokensBalance > 0 && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 text-center text-xs text-destructive">
          ⚠️ Low tokens! You have {tokensBalance} left.{" "}
          <Link to="/" className="underline font-medium">Upgrade for more</Link>
        </div>
      )}

      {!isAdminUser && tokensBalance <= 0 && (
        <div className="bg-destructive/20 border-b border-destructive/30 px-4 py-3 text-center text-sm text-destructive font-medium">
          🔒 Out of tokens!{" "}
          <Link to="/" className="underline">Upgrade now</Link> to keep chatting.
        </div>
      )}

      <ChatMessageThread
        messages={messages}
        companion={companion}
        companionImageUrl={portraitStillUrl}
        userAvatarUrl={userAvatarUrl}
        userInitials={userInitials}
        loading={loading}
        isImageRequest={isImageRequestText}
        inputSnapshot={input}
        hasDevice={hasDevice}
        onImageClick={setViewingImage}
        labelForLovenseCmd={labelForLovenseCmd}
        onTtsClick={handleTts}
        ttsLoadingId={ttsLoadingId}
        ttsPlayingId={ttsPlayingId}
        messagesEndRef={messagesEndRef}
        onSaveImageBackup={user ? handleSaveImageBackup : undefined}
        savingBackupImageId={savingBackupImageId}
        imageGenPending={imageGenPending}
        onConfirmPendingImage={() => void confirmPendingImageGeneration()}
        pendingImageButtonLabel={pendingImageButtonLabel}
        toyDriveActive={toyDriveActive}
        onStopToyDrive={() => void stopSustainedToy()}
      />

      <div className="shrink-0 px-3 pb-1 z-20 bg-gradient-to-t from-black/80 to-transparent">
        <ChatSmartReplies
          suggestions={smartSuggestions}
          disabled={loading || (!isAdminUser && tokensBalance <= 0)}
          loading={loading}
          onPick={(s) => {
            setInput(s);
            void sendMessage(s);
          }}
        />
      </div>

      {sessionMode === "live_voice" ? (
        <div className="shrink-0 px-3 pb-1 z-10 border-t border-white/[0.06] bg-gradient-to-b from-black/40 to-transparent">
          <LiveVoicePanel
            disabled={!isAdminUser && tokensBalance <= 0}
            busy={loading}
            liveInstructions={composeGrokSystemPrompt()}
            xaiVoice={uxVoiceToXaiVoice(effectiveUxVoice)}
            onAssistantTranscriptDone={(text) => void handleVoiceAssistantTranscript(text)}
            onUserSpeechTranscript={handleLiveUserTranscript}
            onSendText={(text) => void sendMessage(text)}
            rampModeActive={rampModeActive}
            onRampModeActiveChange={setRampModeActive}
            rampPreset={rampPreset}
            onRampPresetChange={handleRampPresetChange}
            hasDevice={hasDevice}
            userId={user?.id}
            primaryToyUid={primaryToyUid}
            toyIntensityPercent={parseInt(localStorage.getItem("lustforge-intensity") || "100", 10) || 100}
            prepareToyForRamp={prepareToyForRamp}
          />
        </div>
      ) : null}

      <div
        className={
          sessionMode === "live_voice"
            ? "shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-20 bg-gradient-to-t from-black/85 to-transparent"
            : "shrink-0"
        }
      >
        <ChatComposer
          input={input}
          onChange={setInput}
          onSubmit={() => void sendMessage()}
          disabled={!isAdminUser && tokensBalance <= 0}
          loading={loading}
          placeholder={
            !isAdminUser && tokensBalance <= 0
              ? "Out of tokens — upgrade to continue"
              : sessionMode === "live_voice"
                ? `Type to ${companion.name} or use the mic above…`
                : `Message ${companion.name}… (ask for selfies or pics!)`
          }
          isImageRequest={isImageRequestText}
          isAdminUser={isAdminUser}
          tokensBalance={tokensBalance}
          tokenCost={TOKEN_COST}
          imageTokenCost={IMAGE_TOKEN_COST}
          imageSubmitTitle={imageSubmitTitle}
          safeWord={safeWord}
          companionName={companion.name}
        />
      </div>

      <ChatQuickActionFab
        onAction={handleFabAction}
        isActionDisabled={(actionId) =>
          actionId === "vibration" && (!hasDevice || vibrationPatterns.length === 0)
        }
      />

      <ChatVoiceSettingsSheet
        open={voiceSettingsOpen}
        onOpenChange={setVoiceSettingsOpen}
        companionName={companion.name}
        effectiveLabel={effectiveVoiceLabel}
        globalVoiceActive={Boolean(profileTtsGlobal?.trim())}
        globalVoiceLabel={globalVoiceLabelForSheet}
        relationshipPreset={relationshipVoicePreset}
        onSaveRelationshipPreset={saveRelationshipVoice}
        saving={voicePresetSaving}
        ttsAutoplay={ttsAutoplay}
        onTtsAutoplayChange={onTtsAutoplayChange}
      />

      {/* Image Viewer Modal */}
      {viewingImage && viewingImage.imageUrl && viewingImage.generatedImageId && (
        <ImageViewer
          imageUrl={viewingImage.imageUrl}
          imageId={viewingImage.generatedImageId}
          companionName={companion.name}
          prompt={viewingImage.imagePrompt || "Generated image"}
          companionGalleryAutoSaved={viewingImage.savedToCompanionGallery !== false}
          onSaveToCompanionGallery={saveImageToCompanionGallery}
          onSaveToPersonalGallery={saveImageToPersonalGallery}
          onClose={() => setViewingImage(null)}
        />
      )}

      {user ? (
        <ChatGallerySheet
          open={galleryOpen}
          onOpenChange={setGalleryOpen}
          companionName={companion.name}
          images={galleryImages}
          loading={galleryImagesLoading}
          currentPortraitUrl={portraitStillUrl}
          onSetAsPortrait={handlePortraitFromGallery}
        />
      ) : null}

      {showBreedingRitual && companion && (
        <BreedingRitual
          companionId={companion.id}
          companionName={companion.name}
          onClose={() => setShowBreedingRitual(false)}
          onComplete={handleBreedingComplete}
        />
      )}
    </div>
  );
};

export default Chat;
