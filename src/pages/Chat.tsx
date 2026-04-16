import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useCompanions, dbToCompanion } from "@/hooks/useCompanions";
import { galleryStaticPortraitUrl } from "@/lib/companionMedia";
import { supabase } from "@/integrations/supabase/client";
import { invokeGenerateImage } from "@/lib/invokeGenerateImage";
import { isPlatformAdmin } from "@/config/auth";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Loader2, Zap, AlertOctagon, Flame, Image as ImageIcon, Heart, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ImageViewer } from "@/components/ImageViewer";
import { ImageMessage } from "@/components/ImageMessage";
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
import { ToyControlPanel } from "@/components/toy/ToyControlPanel";
import { ToyHubPopover } from "@/components/toy/ToyHubPopover";
import { payloadToLovenseCommand } from "@/lib/vibrationPatternPayload";
import { messageFromFunctionsInvoke } from "@/lib/supabaseFunctionsError";

const TOKEN_COST = 15;
const IMAGE_TOKEN_COST = 75;

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  lovenseCommand?: any;
  timestamp: Date;
  imageUrl?: string;
  imageId?: string;
  imagePrompt?: string;
  generatedImageId?: string;
  savedToCompanionGallery?: boolean;
  savedToPersonalGallery?: boolean;
}

const Chat = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: dbCompanions } = useCompanions();

  const dbComp = useMemo(
    () => (dbCompanions || []).find((c) => c.id === id),
    [dbCompanions, id]
  );
  const companion = dbComp ? dbToCompanion(dbComp) : null;
  const imageUrl = galleryStaticPortraitUrl(dbComp, id);

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
  const [pairingUrl, setPairingUrl] = useState<string | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [intensity, setIntensity] = useState<number>(() => parseInt(localStorage.getItem("lustforge-intensity") || "50"));
  const [sendingVibrationId, setSendingVibrationId] = useState<string | null>(null);
  const [toyUtilityBusy, setToyUtilityBusy] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);
  const starterSentRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  const sendMessageRef = useRef<(text?: string) => Promise<void>>(async () => {});
  const openingFantasyStarterTitleRef = useRef<string | null>(null);
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isAdminUser = useMemo(() => isPlatformAdmin(user), [user]);

  const {
    relationship,
    gifts,
    loading: relationshipLoading,
    refresh: refreshRelationship,
  } = useCompanionRelationship(companion?.id || "");

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
      if (ok) {
        const tn = activeToys.find((t) => t.id === target)?.name ?? "toy";
        toast.success(`${row.display_name} → ${tn}`, { duration: 2200 });
      } else {
        toast.error("Could not send to device.");
      }
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
      toast.success("Toy unlinked.");
    } else {
      toast.error("Failed to unlink toy.");
    }
  };

  const fetchTokens = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("tokens_balance")
      .eq("user_id", userId)
      .single();
    if (data) setTokensBalance(data.tokens_balance);
  };

  const deductTokens = async (userId: string) => {
    if (isAdminUser) return;
    const { data } = await supabase.from("profiles").select("tokens_balance").eq("user_id", userId).maybeSingle();
    const cur = data?.tokens_balance ?? 0;
    const newBalance = Math.max(0, cur - TOKEN_COST);
    await supabase.from("profiles").update({ tokens_balance: newBalance }).eq("user_id", userId);
    setTokensBalance(newBalance);
  };

  const isImageRequest = (text: string): boolean => {
    const imageKeywords = [
      'image', 'picture', 'photo', 'pic', 'send pic', 'send a picture',
      'selfie', 'nude', 'spicy', 'hot', 'sexy', 'nudes', 'show', 'pose',
      'take a photo', 'picture of you', 'image of you', 'photo of you',
      'draw', 'generate', 'create image', 'create a picture',
      'what do you look like', 'show yourself', 'let me see you',
      'generate image', 'generate picture'
    ];
    const lowerText = text.toLowerCase();
    return imageKeywords.some(keyword => lowerText.includes(keyword));
  };

  const generateImage = async (userRequest: string, userId: string): Promise<any> => {
    if (!companion || !dbComp) return null;

    try {
      /** Raw desire text — `generate-image` runs `rewritePromptForImagine` + SFW portrait brief server-side. */
      const prompt = `${userRequest}\n\n(Character: ${companion.name}, ${companion.gender}. ${companion.appearance})`.slice(
        0,
        8000,
      );

      const { data, error } = await invokeGenerateImage({
        prompt,
        userId,
        isPortrait: false,
        tokenCost: isAdminUser ? 0 : IMAGE_TOKEN_COST,
        characterData: {
          companionId: companion.id,
          style: "chat-session",
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
        .select("*")
        .eq("user_id", userId)
        .eq("companion_id", id)
        .order("created_at", { ascending: true })
        .limit(50);

      if (data && data.length > 0) {
        setMessages(
          data.map((m: any) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            lovenseCommand: m.lovense_command,
            timestamp: new Date(m.created_at),
          })),
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
      if (success) {
        toast.success("⚡ Command sent to device", { duration: 2000 });
      } else {
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
    if (url) {
      toast.success("Pairing link is ready. Open it in a new tab to connect your device.");
    } else {
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
      toast.success("Toy disconnected.");
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
    if (success) {
      toast.success("Stopped patterns on all active toys.");
    } else {
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
    if (success) {
      toast.success("Toy test successful.");
    } else {
      toast.error("Toy test failed.");
    }
  };

  const handleStartBreedingRitual = () => {
    setShowBreedingRitual(true);
  };

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
      if (ok) toast.success("🛑 All devices stopped");
      else toast.error("Failed to stop device");
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

  const sendMessage = async (overrideText?: string) => {
      const messageText = overrideText?.trim() ?? input.trim();
      if (!messageText || loading || !user || !companion) return;

      if (overrideText) {
        setInput("");
      }

      const requestingImage = isImageRequest(messageText);
      const requiredTokens = requestingImage ? IMAGE_TOKEN_COST : TOKEN_COST;

      if (!isAdminUser && tokensBalance < requiredTokens) {
        const tokenType = requestingImage ? "image generation" : "messaging";
        toast.error(`Not enough tokens for ${tokenType}. You need ${requiredTokens} but only have ${tokensBalance}.`, {
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
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: messageText,
        timestamp: new Date(),
      };

      const threadForModel = [...priorThread, userMsg].slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      let savedUserMessageId: string | null = null;

      try {
        const { data: insertedUserRow, error: userInsertError } = await supabase
          .from("chat_messages")
          .insert({
            user_id: user.id,
            companion_id: companion.id,
            role: "user",
            content: userMsg.content,
          })
          .select("id")
          .single();

        if (userInsertError) {
          throw new Error(userInsertError.message || "Could not save your message.");
        }
        savedUserMessageId = insertedUserRow?.id ?? null;

        if (requestingImage) {
          const imageResult = await generateImage(userMsg.content, user.id);

          if (imageResult) {
            const imageMsg: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: `*creates a captivating image just for you*`,
              imageUrl: imageResult.imageUrl,
              imageId: imageResult.imageId,
              generatedImageId: imageResult.imageId,
              imagePrompt: userMsg.content,
              timestamp: new Date(),
              savedToCompanionGallery: false,
              savedToPersonalGallery: false,
            };

            setMessages((prev) => [...prev, imageMsg]);

            toast.success(
              isAdminUser ? "✨ Image generated (admin — no credits charged)." : `✨ Image generated! (${IMAGE_TOKEN_COST} forge credits)`,
              { duration: 3000 },
            );
            clearOpeningStarterContext();
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

            const assistantMsg: ChatMessage = {
              id: (Date.now() + 2).toString(),
              role: "assistant",
              content: cleanText,
              lovenseCommand: command,
              timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMsg]);

            await supabase.from("chat_messages").insert({
              user_id: user.id,
              companion_id: companion.id,
              role: "assistant",
              content: cleanText,
              lovense_command: command,
            });

            if (command && hasDevice) {
              executeDeviceCommand(command);
            }

            await deductTokens(user.id);
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

          const assistantMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: cleanText,
            lovenseCommand: command,
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, assistantMsg]);

          await supabase.from("chat_messages").insert({
            user_id: user.id,
            companion_id: companion.id,
            role: "assistant",
            content: cleanText,
            lovense_command: command,
          });

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
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        setInput(messageText);
        const raw = err instanceof Error ? err.message : "Failed to process your request.";
        toast.error(raw.length > 240 ? `${raw.slice(0, 237)}…` : raw);
      } finally {
        setLoading(false);
      }
  };

  sendMessageRef.current = sendMessage;

  /** Fantasy starter from profile: first line is the exact scripted USER message; works with new or existing threads. */
  useEffect(() => {
    if (!user || !companion || !historyReady || loading) return;
    const state = location.state as { starterPrompt?: string; starterTitle?: string } | undefined;
    const sp = state?.starterPrompt?.trim();
    const st = state?.starterTitle?.trim();
    if (!sp || starterSentRef.current) return;
    starterSentRef.current = true;
    if (st) openingFantasyStarterTitleRef.current = st;
    navigate(location.pathname, { replace: true, state: {} });
    queueMicrotask(() => void sendMessageRef.current(sp));
  }, [user, companion, historyReady, loading, location.pathname, location.state, navigate]);

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

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-xl px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={() => navigate(`/companions/${companion.id}`)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${companion.gradientFrom}, ${companion.gradientTo})`,
          }}
        >
          {imageUrl ? (
            <img src={imageUrl} alt={companion.name} className="w-full h-full object-cover object-top" />
          ) : (
            <span className="text-lg font-gothic font-bold text-white/90">
              {companion.name.charAt(0)}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-foreground text-sm truncate">{companion.name}</h2>
          <p className="text-xs text-primary truncate">{companion.tagline}</p>
        </div>
        <div className="flex items-center gap-2">
          {user && (
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
          )}
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs">
            <Flame className="h-3 w-3 text-primary" />
            <span
              className={`font-medium ${!isAdminUser && tokensBalance < 100 ? "text-destructive" : "text-foreground"}`}
            >
              {isAdminUser ? "∞" : tokensBalance.toLocaleString()}
            </span>
          </div>
          <button
            onClick={() => {
              toast.info(`🛑 Safe word: "${safeWord}" — Type it anytime to stop everything.`);
            }}
            className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
            title="Safe Word Info"
          >
            <AlertOctagon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="border-b border-border bg-card/80 backdrop-blur-xl px-4 py-4 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Session</p>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="rounded-full bg-muted px-3 py-1 text-xs text-foreground">
                {connectedToys.length > 0
                  ? `${connectedToys.length} linked · ${activeToys.length} active`
                  : "No toy connected"}
              </span>
              <span className="rounded-full bg-muted px-3 py-1 text-xs text-foreground">
                Affection: {relationship?.affection_level ?? 0}%
              </span>
              <span className="rounded-full bg-muted px-3 py-1 text-xs text-foreground">
                Breeding: {relationship?.breeding_stage ?? 0} / 3
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {hasDevice ? (
              <>
                <button
                  type="button"
                  onClick={() => void handleTestToy()}
                  disabled={toyUtilityBusy}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  Test Toy
                </button>
                <button
                  type="button"
                  onClick={() => void handleDisconnectToy()}
                  disabled={toyUtilityBusy}
                  className="rounded-xl bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
                >
                  Disconnect
                </button>
                <button
                  type="button"
                  onClick={() => void handleStopAll()}
                  disabled={toyUtilityBusy}
                  className="rounded-xl bg-destructive/80 px-4 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
                >
                  Stop All
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => void handleConnectToy()}
                disabled={pairingLoading}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {pairingLoading ? "Pairing..." : "Connect Toy"}
              </button>
            )}
            <button
              type="button"
              onClick={handleStartBreedingRitual}
              className="rounded-xl bg-secondary px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary/90 transition-colors"
            >
              Breeding Ritual
            </button>
          </div>
        </div>

        {hasDevice ? (
          <ToyControlPanel
            toys={activeToys}
            primaryToyId={primaryToyUid}
            onSelectPrimaryToy={selectPrimaryToy}
            patterns={vibrationPatterns}
            patternsLoading={vibrationPatternsLoading}
            disabled={false}
            sendingId={sendingVibrationId}
            onTrigger={(row) => void triggerCompanionVibration(row)}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-3 text-center text-xs text-muted-foreground">
            Pair your Lovense toy to unlock <span className="text-primary/90">{companion.name}</span>&apos;s signature
            vibration patterns in this chat.
            {pairingUrl ? (
              <a
                href={pairingUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-2 text-primary underline font-medium"
              >
                Open pairing portal
              </a>
            ) : null}
          </div>
        )}
      </div>

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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border text-foreground rounded-bl-md"
              }`}
            >
              {/* Image display */}
              {msg.imageUrl ? (
                <ImageMessage
                  imageUrl={msg.imageUrl}
                  prompt={msg.imagePrompt || "Generated image"}
                  onImageClick={() => setViewingImage(msg)}
                  companionName={companion.name}
                />
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}

              {msg.lovenseCommand && (
                <div className="mt-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs flex items-center gap-2">
                  <Zap className="h-3 w-3" />
                  {hasDevice ? (
                    <>
                      {labelForLovenseCmd(msg.lovenseCommand)}: {String(msg.lovenseCommand.command)} at{" "}
                      {msg.lovenseCommand.intensity}%
                      <span className="text-accent ml-1">✓ Sent</span>
                    </>
                  ) : (
                    <>
                      Device: {String(msg.lovenseCommand.command)} at {msg.lovenseCommand.intensity}%
                      <span className="text-muted-foreground ml-1">(Connect device to activate)</span>
                    </>
                  )}
                </div>
              )}

              {/* Save status for images */}
              {msg.imageUrl && (msg.savedToCompanionGallery || msg.savedToPersonalGallery) && (
                <div className="mt-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-xs flex items-center gap-2">
                  ✓ Saved to {msg.savedToCompanionGallery ? `${companion.name}'s gallery` : "your personal gallery"}
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                {companion.name} is {isImageRequest(input) ? "creating..." : "typing..."}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card/80 backdrop-blur-xl px-4 py-3 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              !isAdminUser && tokensBalance <= 0
                ? "Out of tokens — upgrade to continue"
                : `Message ${companion.name}... (ask for selfies or pics!)`
            }
            className="flex-1 px-4 py-3 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            disabled={loading || (!isAdminUser && tokensBalance <= 0)}
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || (!isAdminUser && tokensBalance <= 0)}
            className="px-4 py-3 rounded-xl bg-primary text-primary-foreground disabled:opacity-30 hover:glow-pink transition-all flex items-center gap-2"
            title={
              isAdminUser
                ? "Admin — no credit cost"
                : isImageRequest(input)
                  ? `Generate image (${IMAGE_TOKEN_COST} tokens)`
                  : `Send message (${TOKEN_COST} tokens)`
            }
          >
            {isImageRequest(input) ? (
              <>
                <ImageIcon className="h-5 w-5" />
              </>
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </form>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Safe word: <span className="text-destructive font-bold">{safeWord}</span> ·{" "}
          {isAdminUser ? "Admin session — credits waived · " : `${TOKEN_COST} tokens/message · ${IMAGE_TOKEN_COST} tokens/image · `}
          18+ only
        </p>
      </div>

      {/* Image Viewer Modal */}
      {viewingImage && viewingImage.imageUrl && viewingImage.generatedImageId && (
        <ImageViewer
          imageUrl={viewingImage.imageUrl}
          imageId={viewingImage.generatedImageId}
          companionName={companion.name}
          prompt={viewingImage.imagePrompt || "Generated image"}
          onSaveToCompanionGallery={saveImageToCompanionGallery}
          onSaveToPersonalGallery={saveImageToPersonalGallery}
          onClose={() => setViewingImage(null)}
        />
      )}

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
