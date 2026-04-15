import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  Trash2,
  Wand2,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCompanions } from "@/hooks/useCompanions";
import { useQueryClient } from "@tanstack/react-query";
import { getEdgeFunctionInvokeMessage } from "@/lib/edgeFunction";
import { cn } from "@/lib/utils";

const NEON = "#FF2D7B";
const STORAGE_KEY = "lustforge-forge-assistant-v1";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  updates?: Array<{ id: string; fields: Record<string, unknown> }>;
  applied?: boolean;
};

type PersistedShape = {
  panelOpen: boolean;
  messages: ChatMessage[];
  draftInput: string;
};

function loadPersisted(): PersistedShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { panelOpen: false, messages: [], draftInput: "" };
    const j = JSON.parse(raw) as PersistedShape;
    if (!j || typeof j !== "object") return { panelOpen: false, messages: [], draftInput: "" };
    return {
      panelOpen: Boolean(j.panelOpen),
      messages: Array.isArray(j.messages) ? j.messages.slice(-50) : [],
      draftInput: typeof j.draftInput === "string" ? j.draftInput : "",
    };
  } catch {
    return { panelOpen: false, messages: [], draftInput: "" };
  }
}

function savePersisted(state: PersistedShape) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

const QUICK_PROMPTS = [
  "Summarize the catalog: one line per companion with rarity + hook.",
  "Pick the companion with the weakest tagline and propose 3 better taglines (respond only, no DB apply).",
  "List companions missing static_image_url and suggest priority order to art-pass.",
  "Explain Abyssal vs Mythic presentation differences for this codebase.",
];

/**
 * Persistent Forge Assistant — Grok admin chat docked on every admin screen.
 */
export default function AdminForgeAssistant() {
  const queryClient = useQueryClient();
  const { data: companions = [], isLoading: companionsLoading } = useAdminCompanions();
  const [mounted, setMounted] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [applyingUpdates, setApplyingUpdates] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = loadPersisted();
    setPanelOpen(p.panelOpen);
    setMessages(p.messages);
    setChatInput(p.draftInput);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    savePersisted({ panelOpen, messages, draftInput: chatInput });
  }, [mounted, panelOpen, messages, chatInput]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, panelOpen, chatLoading]);

  const sendChatMessage = useCallback(async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    const historyForApi = [...messages, { role: "user" as const, content: userMsg }];
    setMessages(historyForApi);
    setChatLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("admin-companion-chat", {
        body: {
          message: userMsg,
          companions: companions.map((c) => ({
            id: c.id,
            name: c.name,
            tagline: c.tagline,
            rarity: c.rarity,
            gender: c.gender,
            orientation: c.orientation,
            role: c.role,
            tags: c.tags,
            kinks: c.kinks,
            is_active: c.is_active,
          })),
          chatHistory: historyForApi.map((m) => ({ role: m.role, content: m.content })),
        },
      });
      if (error) throw new Error(await getEdgeFunctionInvokeMessage(error, data));
      if (data?.error) throw new Error(String(data.error));

      if (data.type === "updates") {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.summary || "Ready to apply changes.",
            updates: data.updates,
            applied: false,
          },
        ]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.message || "Done." }]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Request failed";
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${msg}` }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, companions, messages]);

  const applyUpdates = async (msgIndex: number) => {
    const msg = messages[msgIndex];
    if (!msg?.updates || msg.applied) return;
    setApplyingUpdates(true);
    try {
      for (const update of msg.updates) {
        const { error } = await supabase.from("companions").update(update.fields as any).eq("id", update.id);
        if (error) throw new Error(`Failed to update ${update.id}: ${error.message}`);
      }
      setMessages((prev) => prev.map((m, i) => (i === msgIndex ? { ...m, applied: true } : m)));
      queryClient.invalidateQueries({ queryKey: ["admin-companions"] });
      queryClient.invalidateQueries({ queryKey: ["companions"] });
      toast.success("Changes applied to catalog.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Apply failed");
    } finally {
      setApplyingUpdates(false);
    }
  };

  const clearThread = () => {
    setMessages([]);
    toast.message("Forge Assistant thread cleared.");
  };

  return (
    <div className="fixed bottom-5 right-5 z-[85] flex flex-col items-end gap-3 pointer-events-none">
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="pointer-events-auto w-[min(100vw-1.5rem,420px)] h-[min(72dvh,560px)] rounded-2xl border border-[#FF2D7B]/35 bg-[hsl(240_14%_6%)]/95 backdrop-blur-2xl shadow-[0_0_60px_rgba(255,45,123,0.18),0_24px_80px_rgba(0,0,0,0.55)] flex flex-col overflow-hidden ring-1 ring-white/[0.06]"
          >
            <div
              className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0"
              style={{
                background: `linear-gradient(135deg, ${NEON}22, hsl(280 45% 18% / 0.5), hsl(170 40% 12% / 0.4))`,
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-black/40 border border-[#FF2D7B]/40 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-white" style={{ filter: `drop-shadow(0 0 8px ${NEON})` }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white font-gothic tracking-wide truncate">Forge Assistant</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest truncate">
                    Grok · catalog control
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={clearThread}
                  className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors text-xs"
                  title="Clear conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Minimize"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="px-3 py-2 border-b border-white/5 flex flex-wrap gap-1.5 bg-black/30">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setChatInput(q)}
                  className="text-[10px] leading-tight px-2 py-1 rounded-lg border border-white/10 bg-black/40 text-muted-foreground hover:text-[hsl(170_100%_78%)] hover:border-[hsl(170_100%_42%)]/40 transition-colors max-w-full text-left"
                >
                  {q.length > 72 ? `${q.slice(0, 72)}…` : q}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
              {companionsLoading && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading companion list for context…
                </p>
              )}
              {messages.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/15 bg-black/25 p-4 text-center text-xs text-muted-foreground leading-relaxed">
                  <Wand2 className="h-8 w-8 mx-auto mb-2 opacity-50 text-primary" style={{ color: NEON }} />
                  Ask Forge Assistant to edit catalog companions, polish starters, tighten SFW image prompts, or plan
                  rarity passes. Proposed DB edits show an <strong className="text-foreground">Apply</strong> button.
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[90%] rounded-xl px-3 py-2.5 text-sm shadow-md",
                      msg.role === "user"
                        ? "bg-gradient-to-br from-[#FF2D7B] to-purple-900/90 text-white border border-white/10"
                        : "bg-black/50 text-foreground border border-white/10",
                    )}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    {msg.updates && !msg.applied && (
                      <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                        <p className="text-[10px] font-semibold text-[hsl(170_100%_65%)]">
                          {msg.updates.length} update{msg.updates.length > 1 ? "s" : ""} ready for catalog
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void applyUpdates(i)}
                            disabled={applyingUpdates}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[hsl(170_100%_42%)]/20 text-[hsl(170_100%_78%)] text-xs font-medium hover:bg-[hsl(170_100%_42%)]/30 disabled:opacity-50"
                          >
                            {applyingUpdates ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            Apply to DB
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setMessages((prev) => prev.map((m, idx) => (idx === i ? { ...m, updates: undefined } : m)))
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-destructive/15 text-destructive text-xs hover:bg-destructive/25"
                          >
                            <XCircle className="h-3 w-3" /> Dismiss
                          </button>
                        </div>
                      </div>
                    )}
                    {msg.applied && (
                      <p className="text-[10px] text-[hsl(170_100%_60%)] mt-1.5 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Applied
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-black/50 border border-white/10 rounded-xl px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" style={{ color: NEON }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 border-t border-white/10 bg-black/40 shrink-0">
              <div className="flex gap-2 items-end">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendChatMessage();
                    }
                  }}
                  rows={2}
                  placeholder="Shift+Enter newline · Enter send — tell Forge Assistant what to change…"
                  className="flex-1 min-h-[44px] max-h-28 px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-foreground text-sm focus:outline-none focus:border-[#FF2D7B]/45 focus:ring-1 focus:ring-[#FF2D7B]/20 resize-y"
                />
                <button
                  type="button"
                  onClick={() => void sendChatMessage()}
                  disabled={chatLoading || !chatInput.trim()}
                  className="shrink-0 h-11 w-11 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-opacity"
                  style={{
                    background: `linear-gradient(135deg, ${NEON}, hsl(280 48% 42%))`,
                    boxShadow: `0 0 24px ${NEON}33`,
                  }}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        aria-label={panelOpen ? "Minimize Forge Assistant" : "Open Forge Assistant"}
        onClick={() => setPanelOpen((o) => !o)}
        className={cn(
          "pointer-events-auto relative h-16 w-16 rounded-full flex items-center justify-center text-white border-2 border-[#FF2D7B]/50 shadow-[0_0_40px_rgba(255,45,123,0.35)]",
          panelOpen && "ring-2 ring-[hsl(170_100%_50%)]/40",
        )}
        style={{
          background: `radial-gradient(circle at 30% 25%, white, ${NEON} 42%, hsl(280 50% 22%) 100%)`,
        }}
        animate={
          panelOpen
            ? { scale: [1, 1.04, 1], boxShadow: [`0 0 28px ${NEON}44`, `0 0 40px ${NEON}66`, `0 0 28px ${NEON}44`] }
            : {
                y: [0, -9, 0, -5, 0],
                rotate: [0, -4, 0, 3, 0],
                scale: [1, 1.02, 1, 1.01, 1],
              }
        }
        transition={
          panelOpen
            ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
            : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
        }
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
      >
        <MessageSquare className="h-7 w-7 drop-shadow-md text-[hsl(280_20%_12%)]" />
        {!panelOpen && messages.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-[hsl(170_100%_42%)] text-[10px] font-bold text-black flex items-center justify-center border border-black/40">
            {Math.min(messages.length, 9)}
            {messages.length > 9 ? "+" : ""}
          </span>
        )}
      </motion.button>
    </div>
  );
}
