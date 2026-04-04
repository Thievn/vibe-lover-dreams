import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useCompanions, dbToCompanion } from "@/hooks/useCompanions";
import { companionImages } from "@/data/companionImages";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Loader2, Zap, AlertOctagon, Flame } from "lucide-react";
import { toast } from "sonner";

const TOKEN_COST = 15;

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  lovenseCommand?: any;
  timestamp: Date;
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
  const imageUrl = dbComp?.image_url || (id ? companionImages[id] : undefined);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [tokensBalance, setTokensBalance] = useState<number>(0);
  const [safeWord] = useState(() => localStorage.getItem("lustforge-safeword") || "RED");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      loadChatHistory(session.user.id);
      fetchTokens(session.user.id);
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const sendMessage = async () => {
    if (!input.trim() || loading || !user || !companion) return;

    if (tokensBalance < TOKEN_COST) {
      toast.error("You're out of tokens! Upgrade to keep chatting.", {
        action: {
          label: "Upgrade",
          onClick: () => navigate("/"),
        },
      });
      return;
    }

    if (input.trim().toUpperCase() === safeWord.toUpperCase()) {
      toast.info("🛑 Safe word activated. All activity stopped. You're safe.");
      setInput("");
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
      content: input.trim(),
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

      const contextMessages = messages.slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke("chat-with-companion", {
        body: {
          companionId: companion.id,
          messages: [...contextMessages, { role: "user", content: userMsg.content }],
          systemPrompt: companion.systemPrompt,
          companionName: companion.name,
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

      await deductTokens(user.id);
    } catch (err: any) {
      console.error("Chat error:", err);
      toast.error("Failed to get response. Check your connection.");
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
          onClick={() => navigate(`/companion/${companion.id}`)}
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
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.lovenseCommand && (
                <div className="mt-2 px-3 py-2 rounded-lg bg-electric-teal/10 border border-electric-teal/20 text-electric-teal text-xs flex items-center gap-2">
                  <Zap className="h-3 w-3" />
                  Toy command: {msg.lovenseCommand.command} at {msg.lovenseCommand.intensity}%
                  <span className="text-muted-foreground ml-1">(Connect toy to activate)</span>
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
                {companion.name} is typing...
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
            placeholder={tokensBalance <= 0 ? "Out of tokens — upgrade to continue" : `Message ${companion.name}...`}
            className="flex-1 px-4 py-3 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            disabled={loading || tokensBalance <= 0}
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || tokensBalance <= 0}
            className="px-4 py-3 rounded-xl bg-primary text-primary-foreground disabled:opacity-30 hover:glow-pink transition-all"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Safe word: <span className="text-destructive font-bold">{safeWord}</span> · {TOKEN_COST} tokens per message · 18+ only
        </p>
      </div>
    </div>
  );
};

export default Chat;
