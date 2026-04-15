import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useCompanions, dbToCompanion } from "@/hooks/useCompanions";
import { galleryStaticPortraitUrl } from "@/lib/companionMedia";
import { supabase } from "@/integrations/supabase/client";
import { invokeGenerateImage } from "@/lib/invokeGenerateImage";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Loader2, Zap, AlertOctagon, Flame, Image as ImageIcon, Heart, Sparkles, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { ImageViewer } from "@/components/ImageViewer";
import { ImageMessage } from "@/components/ImageMessage";
import { BreedingRitual } from "@/components/BreedingRitual";
import { useCompanionRelationship } from "@/hooks/useCompanionRelationship";
import { getToys, sendCommand, testToy, generatePairingQR, disconnectToy, LovenseToy, LovenseCommand } from "@/lib/lovense";
import { buildChatSystemPrompt } from "@/lib/companionSystemPrompts";

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
  const [viewingImage, setViewingImage] = useState<ChatMessage | null>(null);
  const [showBreedingRitual, setShowBreedingRitual] = useState(false);
  const [activePattern, setActivePattern] = useState<string>(() => localStorage.getItem("lustforge-active-pattern") || "steady");
  const [patternSending, setPatternSending] = useState(false);
  const [pairingUrl, setPairingUrl] = useState<string | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [starterPrompt, setStarterPrompt] = useState<string | null>(null);
  const [starterTitle, setStarterTitle] = useState<string | null>(null);
  const [intensity, setIntensity] = useState<number>(() => parseInt(localStorage.getItem("lustforge-intensity") || "50"));
  const [isPatternPersistent, setIsPatternPersistent] = useState<boolean>(false);
  const starterSentRef = useRef(false);
  const openingFantasyStarterTitleRef = useRef<string | null>(null);
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    relationship,
    gifts,
    loading: relationshipLoading,
    refresh: refreshRelationship,
  } = useCompanionRelationship(companion?.id || "");

  const hasDevice = connectedToys.length > 0;

  useEffect(() => {
    starterSentRef.current = false;
    openingFantasyStarterTitleRef.current = null;
  }, [id]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      loadChatHistory(session.user.id);
      fetchTokens(session.user.id);
      checkDevice(session.user.id);
    });
  }, []);

  useEffect(() => {
    if (!location.state) return;
    const state = location.state as { starterPrompt?: string; starterTitle?: string };
    if (state.starterPrompt) {
      setStarterPrompt(state.starterPrompt);
      setStarterTitle(state.starterTitle || null);
    }
  }, [location.state]);

  useEffect(() => {
    if (starterTitle) openingFantasyStarterTitleRef.current = starterTitle;
  }, [starterTitle]);

  useEffect(() => {
    if (!user || !starterPrompt || starterSentRef.current || loading) return;
    if (messages.length === 1 && messages[0].role === "assistant" && messages[0].id === "greeting") {
      starterSentRef.current = true;
      sendMessage(starterPrompt);
    }
  }, [starterPrompt, user, messages, loading]);

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

  const fetchTokens = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("tokens_balance")
      .eq("user_id", userId)
      .single();
    if (data) setTokensBalance(data.tokens_balance);
  };

  const deductTokens = async (userId: string) => {
    const newBalance = Math.max(0, tokensBalance - TOKEN_COST);
    await supabase
      .from("profiles")
      .update({ tokens_balance: newBalance })
      .eq("user_id", userId);
    setTokensBalance(newBalance);
  };

  const deductImageTokens = async (userId: string) => {
    const newBalance = Math.max(0, tokensBalance - IMAGE_TOKEN_COST);
    await supabase
      .from("profiles")
      .update({ tokens_balance: newBalance })
      .eq("user_id", userId);
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
      const prompt = `${userRequest}\n\n(Character: ${companion.name}, ${companion.gender}. ${companion.appearance})`.slice(
        0,
        8000,
      );

      const { data, error } = await invokeGenerateImage({
        prompt,
        userId,
        isPortrait: false,
        characterData: {
          companionId: companion.id,
          style: "chat-session",
          baseDescription: `portrait of ${companion.name}, ${companion.gender}; ${companion.appearance}`,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Image generation failed");

      const imageUrl = data.imageUrl;
      const imageId = data.imageId;

      if (!imageUrl) throw new Error("No image generated");

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

  const loadChatHistory = async (userId: string) => {
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
        }))
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

  const composeGrokSystemPrompt = () => {
    if (!companion) return "";
    const toys = connectedToys.length > 0 ? connectedToys.map((t) => t.name).join(", ") : "No toys connected";
    const pct = parseInt(localStorage.getItem("lustforge-intensity") || "50", 10);
    return buildChatSystemPrompt(companion, {
      safeWord,
      connectedToysSummary: toys,
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
    if (!user || connectedToys.length === 0 || !command) return;

    const intensityLimit = parseInt(localStorage.getItem("lustforge-intensity") || "100");
    const scaledIntensity = Math.round((command.intensity || 50) * (intensityLimit / 100));

    const lovenseCommand: LovenseCommand = {
      command: command.command || "vibrate",
      intensity: Math.min(20, Math.max(0, scaledIntensity)),
      duration: command.duration || 5000,
      pattern: command.pattern,
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
    const success = await disconnectToy(user.id);
    if (success) {
      setConnectedToys([]);
      toast.success("Toy disconnected.");
    } else {
      toast.error("Failed to disconnect toy.");
    }
  };

  const handleSendPattern = async (pattern?: string, customIntensity?: number, persistent?: boolean) => {
    if (!user || !hasDevice) {
      toast.error("No connected device available.");
      return;
    }
    setPatternSending(true);
    const intensityLimit = customIntensity !== undefined ? customIntensity : intensity;
    const patternIntensity = Math.min(20, Math.max(0, Math.round(intensityLimit * 0.18))); // Scale to 0-20 range for Lovense
    const command: LovenseCommand = {
      command: "vibrate",
      intensity: patternIntensity,
      duration: persistent ? 0 : 8000, // 0 for persistent (no auto-stop)
      pattern: pattern || activePattern,
    };
    const success = await sendCommand(user.id, command);
    setPatternSending(false);
    if (success) {
      if (pattern) setActivePattern(pattern);
      setIsPatternPersistent(!!persistent);
      toast.success(`Pattern “${pattern || activePattern}” sent to ${connectedToys[0].name}.`);
    } else {
      toast.error("Failed to send pattern.");
    }
  };

  const handleStopAll = async () => {
    if (!user || !hasDevice) {
      toast.error("No connected device available.");
      return;
    }
    setPatternSending(true);
    const command: LovenseCommand = {
      command: "stop",
      intensity: 0,
      duration: 0,
    };
    const success = await sendCommand(user.id, command);
    setPatternSending(false);
    if (success) {
      setIsPatternPersistent(false);
      toast.success(`All patterns stopped on ${connectedToys[0].name}.`);
    } else {
      toast.error("Failed to stop patterns.");
    }
  };

  const handleTestToy = async () => {
    if (!user || !hasDevice) {
      toast.error("No connected device available.");
      return;
    }
    const success = await testToy(user.id, connectedToys[0].id);
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
    try {
      await supabase.functions.invoke("send-device-command", {
        body: { command: "Stop", intensity: 0, duration: 0 },
      });
      setIsPatternPersistent(false);
      toast.success("🛑 All devices stopped");
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

    // If starter prompt or auto-send is used, clear the input field but keep it from blocking.
    if (overrideText) {
      setInput("");
    }

    // Check if it's an image request
    const requestingImage = isImageRequest(messageText);
    const requiredTokens = requestingImage ? IMAGE_TOKEN_COST : TOKEN_COST;

    if (tokensBalance < requiredTokens) {
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

      // Also send emergency stop if device connected
      if (connectedToys.length > 0) {
        handleEmergencyStop();
      }

      const safeMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: "*immediately stops everything* Of course. Everything stops right now. You're safe. Take all the time you need. I'm here when and if you want to continue. No pressure, no judgment. 💛",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, safeMsg]);
      return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      await supabase.from("chat_messages").insert({
        user_id: user.id,
        companion_id: companion.id,
        role: "user",
        content: userMsg.content,
      });

      // If image is requested, generate it
      if (requestingImage) {
        const imageResult = await generateImage(userMsg.content, user.id);
        
        if (imageResult) {
          // Add image response message
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

          // Deduct image tokens
          await deductImageTokens(user.id);
          
          toast.success(`✨ Image generated! (${IMAGE_TOKEN_COST} tokens deducted)`, {
            duration: 3000,
          });
          clearOpeningStarterContext();
        } else {
          // If image generation fails, provide a chat response instead
          const contextMessages = messages.slice(-20).map((m) => ({
            role: m.role,
            content: m.content,
          }));

          const { data, error } = await supabase.functions.invoke("chat-with-companion", {
            body: {
              companionId: companion.id,
              messages: [...contextMessages, { role: "user", content: userMsg.content }],
              systemPrompt: composeGrokSystemPrompt(),
              companionName: companion.name,
            },
          });

          if (error) throw error;

          const { cleanText, command } = parseLovenseCommand(data.response || data.message || "");

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
        // Regular chat message
        const contextMessages = messages.slice(-20).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const { data, error } = await supabase.functions.invoke("chat-with-companion", {
          body: {
            companionId: companion.id,
            messages: [...contextMessages, { role: "user", content: userMsg.content }],
            systemPrompt: composeGrokSystemPrompt(),
            companionName: companion.name,
            connectedToys: connectedToys,
          },
        });

        if (error) throw error;

        const { cleanText, command } = parseLovenseCommand(data.response || data.message || "");

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

        // Auto-execute device command if connected
        if (command && connectedToys.length > 0) {
          executeDeviceCommand(command);
        }

        await deductTokens(user.id);
        clearOpeningStarterContext();
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      toast.error("Failed to process your request. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

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
          {connectedToys.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-accent/10 text-accent text-xs">
              <Zap className="h-3 w-3" />
              <span className="font-medium">
                {connectedToys[0].name} ({connectedToys[0].type})
              </span>
            </div>
          )}
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs">
            <Flame className="h-3 w-3 text-primary" />
            <span className={`font-medium ${tokensBalance < 100 ? "text-destructive" : "text-foreground"}`}>
              {tokensBalance.toLocaleString()}
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
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Toy Control</p>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="rounded-full bg-muted px-3 py-1 text-xs text-foreground">
                {hasDevice ? `${connectedToys[0].name} (${connectedToys[0].status})` : "No toy connected"}
              </span>
              <span className="rounded-full bg-muted px-3 py-1 text-xs text-foreground">
                Affection: {relationship?.affection_level ?? 0}%
              </span>
              <span className="rounded-full bg-muted px-3 py-1 text-xs text-foreground">
                Breeding Stage: {relationship?.breeding_stage ?? 0} / 3
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {hasDevice ? (
              <>
                <button
                  onClick={handleTestToy}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Test Toy
                </button>
                <button
                  onClick={handleDisconnectToy}
                  className="rounded-xl bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  Disconnect
                </button>
                <button
                  onClick={handleStopAll}
                  className="rounded-xl bg-destructive/80 px-4 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  Stop All
                </button>
              </>
            ) : (
              <button
                onClick={handleConnectToy}
                disabled={pairingLoading}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {pairingLoading ? "Pairing..." : "Connect Toy"}
              </button>
            )}
            <button
              onClick={handleStartBreedingRitual}
              className="rounded-xl bg-secondary px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary/90 transition-colors"
            >
              Start Breeding Ritual
            </button>
          </div>
        </div>

        {hasDevice && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              <button
                onClick={() => handleSendPattern("tease", intensity, isPatternPersistent)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                  activePattern === "tease"
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-muted/90'
                }`}
              >
                Tease
              </button>
              <button
                onClick={() => handleSendPattern("pulse", intensity, isPatternPersistent)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                  activePattern === "pulse"
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-muted/90'
                }`}
              >
                Pulse
              </button>
              {connectedToys[0].capabilities.includes("thrust") && (
                <button
                  onClick={() => handleSendPattern("thrust", intensity, isPatternPersistent)}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                    activePattern === "thrust"
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground hover:bg-muted/90'
                  }`}
                >
                  Thrust
                </button>
              )}
              <button
                onClick={() => handleSendPattern(activePattern, Math.min(100, intensity + 20), isPatternPersistent)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors bg-muted text-foreground hover:bg-muted/90`}
              >
                Intensify
              </button>
              <button
                onClick={() => handleSendPattern(activePattern, Math.max(0, intensity - 20), isPatternPersistent)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors bg-muted text-foreground hover:bg-muted/90`}
              >
                Slow Down
              </button>
              <button
                onClick={() => setIsPatternPersistent(!isPatternPersistent)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                  isPatternPersistent
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-muted text-foreground hover:bg-muted/90'
                }`}
              >
                {isPatternPersistent ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                Persistent
              </button>
            </div>

            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-muted-foreground">Intensity:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={intensity}
                  onChange={(e) => setIntensity(parseInt(e.target.value))}
                  className="w-full sm:w-48 accent-primary"
                />
                <span className="text-xs text-foreground">{intensity}%</span>
              </div>
              <button
                onClick={() => handleSendPattern(undefined, intensity, isPatternPersistent)}
                disabled={!hasDevice || patternSending}
                className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {patternSending ? "Sending pattern..." : `Send ${activePattern}`}
              </button>
              {pairingUrl && !hasDevice && (
                <a
                  href={pairingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-primary/10 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                >
                  Open pairing portal
                </a>
              )}
            </div>

            {connectedToys.length > 1 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-muted-foreground">Enabled Toys:</span>
                {connectedToys.map(toy => (
                  <button
                    key={toy.id}
                    onClick={() => toggleToyEnabled(toy.id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      toy.enabled ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {toy.name} {toy.enabled ? '✓' : '✗'}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Token warning */}
      {tokensBalance < 100 && tokensBalance > 0 && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 text-center text-xs text-destructive">
          ⚠️ Low tokens! You have {tokensBalance} left.{" "}
          <Link to="/" className="underline font-medium">Upgrade for more</Link>
        </div>
      )}

      {tokensBalance <= 0 && (
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
                  {connectedToys.length > 0 ? (
                    <>
                      {connectedToys[0].name}: {msg.lovenseCommand.command} at {msg.lovenseCommand.intensity}%
                      <span className="text-accent ml-1">✓ Sent</span>
                    </>
                  ) : (
                    <>
                      Device: {msg.lovenseCommand.command} at {msg.lovenseCommand.intensity}%
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
              tokensBalance <= 0
                ? "Out of tokens — upgrade to continue"
                : `Message ${companion.name}... (ask for selfies or pics!)`
            }
            className="flex-1 px-4 py-3 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            disabled={loading || tokensBalance <= 0}
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || tokensBalance <= 0}
            className="px-4 py-3 rounded-xl bg-primary text-primary-foreground disabled:opacity-30 hover:glow-pink transition-all flex items-center gap-2"
            title={isImageRequest(input) ? `Generate image (${IMAGE_TOKEN_COST} tokens)` : `Send message (${TOKEN_COST} tokens)`}
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
          Safe word: <span className="text-destructive font-bold">{safeWord}</span> · {TOKEN_COST} tokens/message · {IMAGE_TOKEN_COST} tokens/image · 18+ only
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
