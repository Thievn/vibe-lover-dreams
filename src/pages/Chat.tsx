import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useCompanions, dbToCompanion } from "@/hooks/useCompanions";
import { usePortraitOverrideUrl } from "@/hooks/usePortraitOverride";
import { useCompanionGeneratedImages } from "@/hooks/useCompanionGeneratedImages";
import { galleryStaticPortraitUrl, profileAnimatedPortraitUrl } from "@/lib/companionMedia";
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
  generatePairingQR,
  disconnectToy,
  stopAllUserToys,
  setToyEnabled,
  LovenseToy,
  LovenseCommand,
} from "@/lib/lovense";
import { buildChatSystemPrompt } from "@/lib/companionSystemPrompts";
import { useCompanionVibrationPatterns, type CompanionVibrationPatternRow } from "@/hooks/useCompanionVibrationPatterns";
import { payloadToLovenseCommand } from "@/lib/vibrationPatternPayload";
import { messageFromFunctionsInvoke } from "@/lib/supabaseFunctionsError";
import { inferForgeBodyTypeFromTags, inferStylizedArtFromTags } from "@/lib/forgeBodyTypes";
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
import {
  TTS_UX_LABELS,
  resolveUxVoiceId,
  uxVoiceToXaiVoice,
  type TtsUxVoiceId,
} from "@/lib/ttsVoicePresets";
import { ToyHubPopover } from "@/components/toy/ToyHubPopover";
import { ChatGallerySheet } from "@/components/chat/ChatGallerySheet";
import { setCompanionPortraitFromGalleryUrl } from "@/lib/setCompanionPortraitFromGallery";
import {
  FAB_SELFIE,
  FREE_NSFW_CHAT_IMAGES,
  getChatAutoSpendImages,
  getFreeNsfwImagesUsed,
  incrementFreeNsfwImagesUsed,
  isExplicitImageRequest,
  setChatAutoSpendImages,
} from "@/lib/chatImageSettings";

const TOKEN_COST = 15;

/** Optional second arg for `sendMessage`: internal image brief (not shown in chat) + skip confirm for + menu. */
type SendMessageOptions = {
  imageGenerationPrompt?: string;
  bypassImageConfirmation?: boolean;
};
const IMAGE_TOKEN_COST = 75;

const SMART_FALLBACK = ["Tell me more…", "I want you closer.", "Surprise me."];

const Chat = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: dbCompanions } = useCompanions();

  const dbComp = useMemo(
    () => (dbCompanions || []).find((c) => c.id === id),
    [dbCompanions, id]
  );
  const companion = dbComp ? dbToCompanion(dbComp) : null;
  const basePortraitUrl = useMemo(() => galleryStaticPortraitUrl(dbComp, id), [dbComp, id]);
  const headerAnimated = profileAnimatedPortraitUrl(dbComp);

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
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>(SMART_FALLBACK);
  const [heartBursts, setHeartBursts] = useState<{ id: number; x: string }[]>([]);
  const heartIdRef = useRef(0);
  const prevAffectionRef = useRef<number | null>(null);
  const prevLoadingRef = useRef(false);
  const [ttsLoadingId, setTtsLoadingId] = useState<string | null>(null);
  const [ttsPlayingId, setTtsPlayingId] = useState<string | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const [pairingUrl, setPairingUrl] = useState<string | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [intensity, setIntensity] = useState<number>(() => parseInt(localStorage.getItem("lustforge-intensity") || "50"));
  const [sendingVibrationId, setSendingVibrationId] = useState<string | null>(null);
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
    () => deriveChatMood(relationship?.affection_level ?? 0, lastAssistantText),
    [relationship?.affection_level, lastAssistantText],
  );

  const effectiveUxVoice = useMemo((): TtsUxVoiceId => {
    if (profileTtsGlobal) return resolveUxVoiceId(profileTtsGlobal);
    if (relationship?.tts_voice_preset) return resolveUxVoiceId(relationship.tts_voice_preset);
    if (dbComp?.tts_voice_preset) return resolveUxVoiceId(dbComp.tts_voice_preset);
    return "velvet_whisper";
  }, [profileTtsGlobal, relationship, dbComp]);

  const effectiveVoiceLabel = TTS_UX_LABELS[effectiveUxVoice];

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

  const triggerCompanionVibration = async (row: CompanionVibrationPatternRow) => {
    if (!user || !hasDevice) {
      toast.error("Connect a Lovense toy to use these patterns.");
      return;
    }
    const cmd = payloadToLovenseCommand(row.vibration_pattern_pool?.payload);
    if (!cmd) {
      toast.error("Could not read this pattern.");
      return;
    }
    setSendingVibrationId(row.id);
    try {
      const target = primaryToyUid ?? activeToys[0]?.id;
      if (!target) {
        toast.error("No active toy selected.");
        return;
      }
      const ok = await sendCommand(user.id, { ...cmd, toyId: target });
      if (!ok) toast.error("Could not send to device.");
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

  useEffect(() => {
    localStorage.setItem("lustforge-intensity", intensity.toString());
  }, [intensity]);

  const checkDevice = async (userId: string) => {
    const toys = await getToys(userId);
    setConnectedToys(toys);
  };

  const refreshToys = async () => {
    if (!user?.id) return;
    setToysPanelLoading(true);
    try {
      await checkDevice(user.id);
    } finally {
      setToysPanelLoading(false);
    }
  };

  const handleToggleToyEnabled = async (deviceUid: string, enabled: boolean) => {
    if (!user) return;
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

  /** Only treat as an image request when the user clearly asks for a picture — not casual words like "hot" or substrings like "pic" in "topic". */
  const isImageRequest = (text: string): boolean => {
    const t = text.toLowerCase().normalize("NFKC").trim();
    if (t.length < 10) return false;

    const phrases = [
      "send me a picture",
      "send me a photo",
      "send me an image",
      "send me a pic",
      "send a picture",
      "send a photo",
      "send an image",
      "send a pic",
      "send nudes",
      "take a picture",
      "take a photo",
      "take a selfie",
      "take a pic",
      "take another pic",
      "take another picture",
      "generate a picture",
      "generate an image",
      "generate image",
      "generate a photo",
      "create an image",
      "create a picture",
      "create image",
      "draw yourself",
      "draw you a",
      "draw me a",
      "paint me a",
      "paint yourself",
      "photo of you",
      "picture of you",
      "image of you",
      "portrait of you",
      "what do you look like",
      "show yourself",
      "show me what you look like",
      "show me a picture",
      "show me a photo",
      "show me an image",
      "let me see you",
      "can i see you",
      "can i see what you look like",
      "see what you look like",
      "snap a pic",
      "snap a photo",
      "another selfie",
      "take a selfie for",
      "selfie for me",
      "send me a selfie",
      "a selfie from you",
      "selfie from you",
    ];

    if (phrases.some((p) => t.includes(p))) return true;

    return false;
  };

  const generateImage = async (userRequest: string, userId: string): Promise<any> => {
    if (!companion || !dbComp) return null;

    try {
      const explicit = isExplicitImageRequest(userRequest);
      const freeUsed = getFreeNsfwImagesUsed(userId, companion.id);
      const useFreeNsfwSlot = explicit && freeUsed < FREE_NSFW_CHAT_IMAGES;
      const tokenCost = isAdminUser ? 0 : useFreeNsfwSlot ? 0 : IMAGE_TOKEN_COST;

      /** Raw desire text — `generate-image` uses chat-session rewrite + non–card Imagine prompt (explicit ok; xAI enforces limits). */
      const prompt = `${userRequest}\n\n(Character: ${companion.name}, ${companion.gender}. ${companion.appearance})`.slice(
        0,
        8000,
      );

      const { data, error } = await invokeGenerateImage({
        prompt,
        userId,
        isPortrait: false,
        tokenCost,
        characterData: {
          companionId: companion.id,
          style: "chat-session",
          artStyleLabel: inferStylizedArtFromTags(dbComp.tags ?? []) ?? "Photorealistic",
          bodyType: inferForgeBodyTypeFromTags(dbComp.tags ?? []) ?? "Average",
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
              savedToCompanionGallery: hasImage
                ? (gi?.saved_to_companion_gallery ?? true)
                : undefined,
              savedToPersonalGallery: hasImage ? Boolean(gi?.saved_to_personal_gallery) : undefined,
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
    const pct = parseInt(localStorage.getItem("lustforge-intensity") || "50", 10);
    return buildChatSystemPrompt(companion, {
      safeWord,
      connectedToysSummary: toyBlock,
      openingFantasyStarterTitle: openingFantasyStarterTitleRef.current,
      userToyIntensityPercent: Number.isFinite(pct) ? pct : 50,
    });
  };

  const clearOpeningStarterContext = () => {
    openingFantasyStarterTitleRef.current = null;
  };

  const parseLovenseCommand = (text: string): { cleanText: string; command: any | null } => {
    const jsonMatch = text.match(/\{[\s\S]*"lovense_command"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const cleanText = text.replace(jsonMatch[0], "").trim();
        return { cleanText, command: parsed.lovense_command };
      } catch {
        return { cleanText: text, command: null };
      }
    }
    return { cleanText: text, command: null };
  };

  const executeDeviceCommand = async (command: any) => {
    if (!user || !hasDevice || !command) return;

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
      const success = await sendCommand(user.id, lovenseCommand);
      if (!success) {
        toast.error("Failed to send command to device");
      }
    } catch (err: any) {
      console.error("Device command error:", err);
      toast.error("Failed to send command to device");
    }
  };

    const handleConnectToy = async () => {
    if (!user) return;
    setPairingLoading(true);
    const url = await generatePairingQR(user.id);
    setPairingUrl(url);
    setPairingLoading(false);
    if (!url) {
      toast.error("Failed to create pairing link.");
    }
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
    const a = relationship?.affection_level;
    if (a === undefined || a === null) return;
    const prev = prevAffectionRef.current;
    prevAffectionRef.current = a;
    if (prev !== null && a > prev) {
      heartIdRef.current += 1;
      const id = heartIdRef.current;
      const x = `${12 + Math.random() * 76}%`;
      setHeartBursts((b) => [...b, { id, x }]);
      window.setTimeout(() => {
        setHeartBursts((b) => b.filter((h) => h.id !== id));
      }, 2600);
    }
  }, [relationship?.affection_level]);

  useEffect(() => {
    if (!companion || !user || !historyReady) return;
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = loading;
    if (wasLoading && !loading) {
      const last = messagesRef.current[messagesRef.current.length - 1];
      if (last?.role !== "assistant") return;
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
      return () => clearTimeout(t);
    }
  }, [loading, companion, user, historyReady]);

  const saveRelationshipVoice = async (v: TtsUxVoiceId) => {
    if (!user || !companion) return;
    setVoicePresetSaving(true);
    try {
      const { error } = await supabase.from("companion_relationships").upsert(
        {
          user_id: user.id,
          companion_id: companion.id,
          affection_level: relationship?.affection_level ?? 0,
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
        void a.play().catch(() => toast.error("Could not play audio"));
        return;
      }
      setTtsLoadingId(msg.id);
      try {
        const voiceId = uxVoiceToXaiVoice(effectiveUxVoice);
        const { data, error } = await supabase.functions.invoke("grok-tts", {
          body: {
            text: msg.content.slice(0, 3800),
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
        void a.play().catch(() => toast.error("Could not play audio"));
      } catch (e: unknown) {
        const raw = e instanceof Error ? e.message : "TTS failed";
        toast.error(raw.length > 120 ? `${raw.slice(0, 117)}…` : raw);
      } finally {
        setTtsLoadingId(null);
      }
    },
    [user, ttsPlayingId, effectiveUxVoice],
  );

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

    const promptForImage = options?.imageGenerationPrompt?.trim() || messageText;
    const requestingImage =
      Boolean(options?.imageGenerationPrompt?.trim()) ||
      isImageRequest(messageText) ||
      isImageRequest(promptForImage);
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

    const priorThread = messagesRef.current;
    const threadForModel = [...priorThread, { role: "user" as const, content: messageText }].slice(-20).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setInput("");

    let savedUserMessageId: string | null = null;
    let userMsg: ChatMessage | null = null;

    try {
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

        const { cleanText, command } = parseLovenseCommand(
          chatPayload?.response || chatPayload?.message || "",
        );

        const asstId = await insertAssistantMessage(cleanText, command);
        const assistantMsg: ChatMessage = {
          id: asstId,
          role: "assistant",
          content: cleanText,
          lovenseCommand: command,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMsg]);

        if (command && hasDevice) {
          executeDeviceCommand(command);
        }

        await deductTokens(user.id);
        clearOpeningStarterContext();
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
      void sendMessage(FAB_SELFIE.sfw.display, {
        imageGenerationPrompt: FAB_SELFIE.sfw.imagePrompt,
        bypassImageConfirmation: true,
      });
      return;
    }
    if (fabId === "selfie_lewd") {
      void sendMessage(FAB_SELFIE.lewd.display, {
        imageGenerationPrompt: FAB_SELFIE.lewd.imagePrompt,
        bypassImageConfirmation: true,
      });
      return;
    }
    if (fabId === "selfie_nude") {
      void sendMessage(FAB_SELFIE.nude.display, {
        imageGenerationPrompt: FAB_SELFIE.nude.imagePrompt,
        bypassImageConfirmation: true,
      });
      return;
    }
    if (fabId === "vibration") {
      const first = vibrationPatterns[0];
      if (first) void triggerCompanionVibration(first);
      else toast.error("No signature patterns for this companion.");
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

  if (!companion && dbCompanions) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Companion not found.</p>
      </div>
    );
  }

  if (!companion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
      : isImageRequest(input) && isExplicitImageRequest(input) && freeNsfwRemaining > 0
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
        rightSlot={
          user ? (
            <ToyHubPopover
              toys={connectedToys}
              loading={toysPanelLoading}
              pairingLoading={pairingLoading}
              pairingUrl={pairingUrl}
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
        pairingUrl={pairingUrl}
        toyUtilityBusy={toyUtilityBusy}
        pairingLoading={pairingLoading}
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
        onTriggerPattern={(row) => void triggerCompanionVibration(row)}
      />

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
        isImageRequest={isImageRequest}
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

      <ChatComposer
        input={input}
        onChange={setInput}
        onSubmit={() => void sendMessage()}
        disabled={!isAdminUser && tokensBalance <= 0}
        loading={loading}
        placeholder={
          !isAdminUser && tokensBalance <= 0
            ? "Out of tokens — upgrade to continue"
            : `Message ${companion.name}… (ask for selfies or pics!)`
        }
        isImageRequest={isImageRequest}
        isAdminUser={isAdminUser}
        tokensBalance={tokensBalance}
        tokenCost={TOKEN_COST}
        imageTokenCost={IMAGE_TOKEN_COST}
        imageSubmitTitle={imageSubmitTitle}
        safeWord={safeWord}
        companionName={companion.name}
        autoSpendChatImages={autoSpendChatImages}
        onAutoSpendChatImagesChange={(enabled) => {
          setAutoSpendChatImages(enabled);
          setChatAutoSpendImages(companion.id, enabled);
        }}
      />

      <ChatQuickActionFab onAction={handleFabAction} />

      <ChatVoiceSettingsSheet
        open={voiceSettingsOpen}
        onOpenChange={setVoiceSettingsOpen}
        companionName={companion.name}
        effectiveLabel={effectiveVoiceLabel}
        relationshipPreset={resolveUxVoiceId(relationship?.tts_voice_preset ?? undefined)}
        onSaveRelationshipPreset={saveRelationshipVoice}
        saving={voicePresetSaving}
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
