import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Camera,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Hash,
  History,
  Image as ImageIcon,
  Loader2,
  Megaphone,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCompanions, type DbCompanion } from "@/hooks/useCompanions";
import { galleryStaticPortraitUrl } from "@/lib/companionMedia";
import { normalizeCompanionRarity, type CompanionRarity, COMPANION_RARITIES } from "@/lib/companionRarity";
import { getEdgeFunctionInvokeMessage } from "@/lib/edgeFunction";
import { cn } from "@/lib/utils";
import { TierHaloPortraitFrame } from "@/components/rarity/TierHaloPortraitFrame";
import {
  buildProductAtlasForPrompt,
  getMergedMarketingSurfaces,
  type MergedMarketableSurface,
} from "@/lib/marketingSurfacesMerge";
import { buildSmartAngles } from "@/lib/xMarketingSiteRegistry";

const NEON = "#FF2D7B";
const HISTORY_KEY = "lustforge-x-marketing-history-v2";

export type TweetVariation = { text: string; hashtags: string[] };

export type XMarketingHistoryEntry = {
  id: string;
  at: string;
  companionId: string | null;
  companionName: string;
  surfaceId: string | null;
  surfaceLabel: string | null;
  tone: string;
  quickKind: string | null;
  variations: TweetVariation[];
};

type StatsPayload = {
  totalStock: number;
  totalCustom: number;
  totalCompanions: number;
  mostSavedWeek: { companion_id: string; count: number; name: string }[];
  trendingTags: { tag: string; count: number }[];
  pinCountsTop: Record<string, number>;
};

type ChatTurn = { role: "user" | "assistant"; content: string };

const TONES = [
  "Professional",
  "Teasing",
  "Mysterious",
  "Horny",
  "Elegant",
  "Aggressive Hype",
] as const;

const QUICK_ACTIONS: { id: string; label: string; kind: string }[] = [
  { id: "q1", label: "Promote new companion", kind: "promote_new" },
  { id: "q2", label: "Highlight saves / hype", kind: "highlight_popular" },
  { id: "q3", label: "Hype The Nexus", kind: "hype_nexus" },
  { id: "q4", label: "Tease post (safe)", kind: "sexual_tease" },
  { id: "q5", label: "Community / replies", kind: "community" },
  { id: "q6", label: "Rarity / TCG flex", kind: "rarity_drop" },
];

function loadHistory(): XMarketingHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      const legacy = localStorage.getItem("lustforge-x-marketing-history-v1");
      if (legacy) {
        const j = JSON.parse(legacy) as unknown;
        if (Array.isArray(j)) {
          const migrated = j.map((x: Record<string, unknown>) => ({
            ...x,
            surfaceId: null,
            surfaceLabel: null,
          })) as XMarketingHistoryEntry[];
          saveHistory(migrated);
          localStorage.removeItem("lustforge-x-marketing-history-v1");
          return migrated;
        }
      }
      return [];
    }
    const j = JSON.parse(raw) as unknown;
    if (!Array.isArray(j)) return [];
    return j.filter((x) => x && typeof x === "object" && Array.isArray((x as XMarketingHistoryEntry).variations)) as XMarketingHistoryEntry[];
  } catch {
    return [];
  }
}

function saveHistory(entries: XMarketingHistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 40)));
  } catch {
    /* quota */
  }
}

function fullTweetText(v: TweetVariation): string {
  const tags = v.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ");
  return tags ? `${v.text} ${tags}` : v.text;
}

async function captureScreenToDataUrl(): Promise<string | null> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    toast.error("Screen capture is not supported in this browser.");
    return null;
  }
  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
  } catch {
    toast.message("Capture cancelled.");
    return null;
  }
  const video = document.createElement("video");
  video.playsInline = true;
  video.muted = true;
  video.srcObject = stream;
  try {
    await video.play();
  } catch {
    stream.getTracks().forEach((t) => t.stop());
    toast.error("Could not read display stream.");
    return null;
  }
  await new Promise((r) => setTimeout(r, 320));
  const w = video.videoWidth;
  const h = video.videoHeight;
  stream.getTracks().forEach((t) => t.stop());
  video.srcObject = null;
  if (!w || !h) {
    toast.error("No video frame captured.");
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);
  try {
    return canvas.toDataURL("image/png");
  } catch {
    toast.error("Could not export image (try another window or disable HDR capture).");
    return null;
  }
}

export default function XMarketingHub() {
  const { data: companions = [], isLoading: companionsLoading } = useAdminCompanions();
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  const siteOrigin = useMemo(() => {
    const env = import.meta.env.VITE_SITE_URL as string | undefined;
    if (env && /^https?:\/\//i.test(env)) return env.replace(/\/$/, "");
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  }, []);

  const mergedSurfaces = useMemo(() => getMergedMarketingSurfaces(), []);

  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [selectedSurface, setSelectedSurface] = useState<MergedMarketableSurface | null>(null);
  const [selected, setSelected] = useState<DbCompanion | null>(null);

  const [rarityFilter, setRarityFilter] = useState<CompanionRarity | "all">("all");
  const [sortBy, setSortBy] = useState<"newest" | "most_saved" | "name">("newest");
  const [tagFilter, setTagFilter] = useState("");
  const [kinkFilter, setKinkFilter] = useState("");
  const [search, setSearch] = useState("");

  const [customPrompt, setCustomPrompt] = useState("");
  const [tone, setTone] = useState<string>(TONES[0]!);
  const [quickKind, setQuickKind] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [variations, setVariations] = useState<TweetVariation[] | null>(null);

  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [captureBusy, setCaptureBusy] = useState(false);

  const [history, setHistory] = useState<XMarketingHistoryEntry[]>(() => loadHistory());
  const [historyOpen, setHistoryOpen] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatTurn[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-x-marketing", {
        body: { mode: "stats" },
      });
      if (error) throw new Error(await getEdgeFunctionInvokeMessage(error, data));
      if (!data || typeof data !== "object") throw new Error("Invalid stats response");
      setStats(data as StatsPayload);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatsError(msg);
      toast.error(msg);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatSending]);

  const pinCounts = stats?.pinCountsTop ?? {};

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const c of companions) {
      for (const t of c.tags || []) s.add(t);
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [companions]);

  const allKinks = useMemo(() => {
    const s = new Set<string>();
    for (const c of companions) {
      for (const k of c.kinks || []) s.add(k);
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [companions]);

  const filteredCompanions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const tf = tagFilter.trim().toLowerCase();
    const kf = kinkFilter.trim().toLowerCase();
    let list = [...companions];
    if (rarityFilter !== "all") {
      list = list.filter((c) => normalizeCompanionRarity(c.rarity) === rarityFilter);
    }
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.tagline.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (tf) {
      list = list.filter((c) => c.tags.some((t) => t.toLowerCase().includes(tf)));
    }
    if (kf) {
      list = list.filter((c) => c.kinks.some((k) => k.toLowerCase().includes(kf)));
    }
    if (sortBy === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "newest") {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      list.sort((a, b) => (pinCounts[b.id] || 0) - (pinCounts[a.id] || 0));
    }
    return list;
  }, [companions, rarityFilter, search, tagFilter, kinkFilter, sortBy, pinCounts]);

  const smartAngles = useMemo(
    () => buildSmartAngles(selectedSurface, selected),
    [selectedSurface, selected],
  );

  const productAtlas = useMemo(() => buildProductAtlasForPrompt(), []);

  const contextBlockForChat = useMemo(() => {
    const parts: string[] = [];
    parts.push(`Tone preset: ${tone}`);
    if (selected) {
      parts.push(
        `Companion: ${selected.name} (${selected.id}) — ${selected.tagline}. Rarity ${normalizeCompanionRarity(selected.rarity)}. Tags: ${(selected.tags || []).join(", ")}.`,
      );
    }
    if (selectedSurface) {
      parts.push(`Site surface: ${selectedSurface.label} — ${selectedSurface.pitch} Path: ${selectedSurface.path}`);
    }
    if (quickKind) parts.push(`Quick campaign kind: ${quickKind}`);
    if (customPrompt.trim()) parts.push(`Current operator prompt:\n${customPrompt.trim()}`);
    if (variations?.length) {
      parts.push(
        `Latest generated tweets (may edit):\n${variations.map((v, i) => `${i + 1}. ${fullTweetText(v)}`).join("\n")}`,
      );
    }
    parts.push(`Product atlas:\n${productAtlas}`);
    return parts.join("\n\n");
  }, [tone, selected, selectedSurface, quickKind, customPrompt, variations, productAtlas]);

  const applyAngle = (prompt: string, label: string) => {
    setCustomPrompt((prev) => (prev.trim() ? `${prev.trim()}\n\n${prompt}` : prompt));
    toast.message(`Angle: ${label}`);
  };

  const useInTweet = (c: DbCompanion) => {
    setSelected(c);
    workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    toast.success(`${c.name} — loaded in workspace`);
  };

  const pickSurface = (s: MergedMarketableSurface) => {
    setSelectedSurface((prev) => {
      const next = prev?.id === s.id ? null : s;
      queueMicrotask(() => {
        toast.message(next ? `${s.label} — angles updated` : "Surface cleared");
      });
      return next;
    });
    workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const runGenerate = async () => {
    setGenerating(true);
    setVariations(null);
    try {
      const companionPayload = selected
        ? {
            id: selected.id,
            name: selected.name,
            tagline: selected.tagline,
            rarity: normalizeCompanionRarity(selected.rarity),
            role: selected.role,
            gender: selected.gender,
            tags: selected.tags,
            kinks: selected.kinks,
          }
        : null;
      const siteSurface = selectedSurface
        ? {
            id: selectedSurface.id,
            label: selectedSurface.label,
            pitch: selectedSurface.pitch,
            path: selectedSurface.path,
            category: selectedSurface.category,
          }
        : null;

      const { data, error } = await supabase.functions.invoke("admin-x-marketing", {
        body: {
          mode: "generate",
          tone,
          customPrompt,
          quickKind: quickKind || undefined,
          companion: companionPayload,
          productAtlas,
          siteSurface,
        },
      });
      if (error) throw new Error(await getEdgeFunctionInvokeMessage(error, data));
      const vars = (data as { variations?: TweetVariation[] })?.variations;
      if (!Array.isArray(vars) || vars.length < 1) throw new Error("No variations returned");
      setVariations(vars);
      const entry: XMarketingHistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        at: new Date().toISOString(),
        companionId: selected?.id ?? null,
        companionName: selected?.name ?? "Brand",
        surfaceId: selectedSurface?.id ?? null,
        surfaceLabel: selectedSurface?.label ?? null,
        tone,
        quickKind,
        variations: vars,
      };
      const next = [entry, ...history].slice(0, 40);
      setHistory(next);
      saveHistory(next);
      toast.success("5 variations ready.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  };

  const sendChat = async () => {
    const t = chatInput.trim();
    if (!t || chatSending) return;
    const nextUser: ChatTurn = { role: "user", content: t };
    setChatInput("");
    setChatSending(true);
    const thread = [...chatMessages, nextUser];
    setChatMessages(thread);
    try {
      const { data, error } = await supabase.functions.invoke("admin-x-marketing", {
        body: {
          mode: "chat",
          contextBlock: contextBlockForChat,
          messages: thread.map((m) => ({ role: m.role, content: m.content })),
        },
      });
      if (error) throw new Error(await getEdgeFunctionInvokeMessage(error, data));
      const reply = (data as { reply?: string })?.reply;
      if (!reply?.trim()) throw new Error("No reply from Grok");
      setChatMessages((prev) => [...prev, { role: "assistant", content: reply.trim() }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      setChatMessages((prev) => prev.slice(0, -1));
      setChatInput(t);
    } finally {
      setChatSending(false);
    }
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Clipboard blocked");
    }
  };

  const copyImage = async (c: DbCompanion) => {
    const url = galleryStaticPortraitUrl(c, c.id);
    if (!url) {
      toast.error("No portrait URL for this companion.");
      return;
    }
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const type = blob.type.startsWith("image/") ? blob.type : "image/png";
      await navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
      toast.success("Image copied — paste into X.");
    } catch {
      await copyText(url, "Portrait URL");
    }
  };

  const copyScreenshot = async () => {
    if (!screenshotDataUrl) return;
    try {
      const res = await fetch(screenshotDataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast.success("Screenshot copied.");
    } catch {
      await copyText(screenshotDataUrl, "Screenshot (data URL)");
    }
  };

  const heroVisual = screenshotDataUrl || (selected ? galleryStaticPortraitUrl(selected, selected.id) : null);

  return (
    <div className="space-y-4">
      <div className="rounded-[1.75rem] border border-primary/25 bg-gradient-to-br from-black/75 via-card/45 to-[#140818]/95 backdrop-blur-xl overflow-hidden shadow-[0_0_70px_rgba(255,45,123,0.09)]">
        <div className="px-5 md:px-8 py-6 border-b border-white/[0.08] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/25 to-purple-900/40"
              style={{ boxShadow: `0 0 28px ${NEON}33` }}
            >
              <Megaphone className="h-7 w-7 text-white" aria-hidden />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary/90 mb-1">Social command</p>
              <h2 className="font-gothic text-2xl md:text-3xl gradient-vice-text leading-tight">X Marketing Hub</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-3xl leading-relaxed">
                One workspace: roster pulse, <strong className="text-foreground/90">living product atlas</strong> (add
                surfaces in code as you ship), smart angles, screen capture for assets, Grok tweet generation, and a
                sidecar chat to refine copy — same noir forge energy as Command.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadStats()}
            disabled={statsLoading}
            className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-white hover:border-primary/40 transition-colors disabled:opacity-50"
          >
            {statsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh pulse
          </button>
        </div>

        <div className="p-4 md:p-6 lg:p-8">
          {statsError ? (
            <p className="text-sm text-destructive border border-destructive/30 rounded-xl p-4 bg-destructive/10 mb-6">{statsError}</p>
          ) : null}

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_min(440px,100%)] gap-6 xl:gap-8 items-start">
            {/* LEFT */}
            <div className="space-y-6 min-w-0">
              <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-4 md:p-5 space-y-4">
                <div className="flex flex-wrap gap-3 items-center justify-between">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" style={{ color: NEON }} />
                    Roster pulse
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { k: "Stock", v: statsLoading ? "—" : String(stats?.totalStock ?? 0) },
                    { k: "Forge", v: statsLoading ? "—" : String(stats?.totalCustom ?? 0) },
                    { k: "Total", v: statsLoading ? "—" : String(stats?.totalCompanions ?? 0) },
                  ].map((c) => (
                    <div key={c.k} className="rounded-xl border border-border/50 bg-white/[0.03] px-3 py-2 text-center">
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{c.k}</p>
                      <p className="font-gothic text-xl text-white mt-0.5">{c.v}</p>
                    </div>
                  ))}
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Hot saves (7d)</p>
                    {statsLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (stats?.mostSavedWeek?.length ?? 0) === 0 ? (
                      <p className="text-xs text-muted-foreground">No pins this week.</p>
                    ) : (
                      <ul className="space-y-1 max-h-28 overflow-y-auto pr-1">
                        {stats!.mostSavedWeek.slice(0, 8).map((row) => (
                          <li key={row.companion_id} className="flex justify-between gap-2 text-xs text-foreground/90">
                            <span className="truncate">{row.name}</span>
                            <span className="text-primary shrink-0">{row.count}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                      <Hash className="h-3 w-3" /> Trending tags
                    </p>
                    <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
                      {(stats?.trendingTags ?? []).slice(0, 18).map((t) => (
                        <button
                          key={t.tag}
                          type="button"
                          onClick={() => setTagFilter(t.tag)}
                          className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.04] hover:border-primary/40"
                        >
                          {t.tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground mb-3">
                  Marketable surfaces · grows with the codebase
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {mergedSurfaces.map((s) => {
                    const active = selectedSurface?.id === s.id;
                    return (
                      <div
                        key={s.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => pickSurface(s)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            pickSurface(s);
                          }
                        }}
                        className={cn(
                          "text-left rounded-2xl border p-4 transition-all hover:border-primary/35 cursor-pointer",
                          active ? "border-primary/55 bg-primary/10 ring-1 ring-primary/25" : "border-border/60 bg-black/45",
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{s.category}</p>
                          {!s.reviewed ? (
                            <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-500/50 text-amber-200/90 bg-amber-500/10">
                              Unreviewed
                            </span>
                          ) : null}
                        </div>
                        <p className="font-gothic text-base text-white mt-1">{s.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-2 line-clamp-3 leading-snug">{s.pitch}</p>
                        <button
                          type="button"
                          className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`${siteOrigin}${s.path}`, "_blank", "noopener,noreferrer");
                          }}
                        >
                          Open in app <ExternalLink className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-black/40 p-4 space-y-4">
                <div className="flex flex-col xl:flex-row gap-3 flex-wrap xl:items-end">
                  <div className="flex flex-col gap-1 min-w-[8rem]">
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Rarity</label>
                    <select
                      value={rarityFilter}
                      onChange={(e) => setRarityFilter(e.target.value as CompanionRarity | "all")}
                      className="rounded-xl bg-black/50 border border-border px-2 py-2 text-sm text-foreground"
                    >
                      <option value="all">All</option>
                      {COMPANION_RARITIES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 min-w-[8rem]">
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Sort</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as "newest" | "most_saved" | "name")}
                      className="rounded-xl bg-black/50 border border-border px-2 py-2 text-sm text-foreground"
                    >
                      <option value="newest">Newest</option>
                      <option value="most_saved">Most saved</option>
                      <option value="name">Name A–Z</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 flex-1 min-w-[10rem]">
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Tags</label>
                    <input
                      value={tagFilter}
                      onChange={(e) => setTagFilter(e.target.value)}
                      list="xhub-tags-v2"
                      className="rounded-xl bg-black/50 border border-border px-2 py-2 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-1 min-w-[10rem]">
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Kinks</label>
                    <input
                      value={kinkFilter}
                      onChange={(e) => setKinkFilter(e.target.value)}
                      list="xhub-kinks-v2"
                      className="rounded-xl bg-black/50 border border-border px-2 py-2 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-[2] min-w-[12rem]">
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Search</label>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Name, tagline…"
                      className="rounded-xl bg-black/50 border border-border px-2 py-2 text-sm"
                    />
                  </div>
                </div>
                <datalist id="xhub-tags-v2">
                  {allTags.slice(0, 200).map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
                <datalist id="xhub-kinks-v2">
                  {allKinks.slice(0, 200).map((k) => (
                    <option key={k} value={k} />
                  ))}
                </datalist>

                {companionsLoading ? (
                  <div className="flex justify-center py-16 text-muted-foreground gap-2">
                    <Loader2 className="h-6 w-6 animate-spin" /> Loading companions…
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredCompanions.map((c, idx) => {
                      const rarity = normalizeCompanionRarity(c.rarity);
                      const img = galleryStaticPortraitUrl(c, c.id);
                      const saves = pinCounts[c.id] ?? 0;
                      return (
                        <motion.div
                          key={c.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(idx * 0.015, 0.25) }}
                          className={cn(
                            "rounded-2xl border overflow-hidden flex flex-col bg-black/50 backdrop-blur-md",
                            selected?.id === c.id ? "border-primary/60 ring-2 ring-primary/20" : "border-border/60 hover:border-primary/30",
                          )}
                        >
                          <div className="relative aspect-[3/4] w-full">
                            <TierHaloPortraitFrame
                              variant="card"
                              rarity={rarity}
                              gradientFrom={c.gradient_from}
                              gradientTo={c.gradient_to}
                              overlayUrl={c.rarity_border_overlay_url}
                            >
                              <div
                                className="absolute inset-0 z-0"
                                style={{
                                  background: img ? undefined : `linear-gradient(160deg, ${c.gradient_from}, ${c.gradient_to})`,
                                }}
                              />
                              {img ? (
                                <img src={img} alt="" className="absolute inset-0 z-[1] h-full w-full object-cover object-top" />
                              ) : (
                                <span className="absolute inset-0 z-[2] flex items-center justify-center font-gothic text-4xl text-white/85">
                                  {c.name.charAt(0)}
                                </span>
                              )}
                              <div className="absolute left-2 top-2 z-[4] rounded-md bg-black/65 border border-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/90">
                                {rarity}
                              </div>
                              {saves > 0 ? (
                                <div className="absolute right-2 top-2 z-[4] rounded-md bg-black/65 border border-primary/30 px-2 py-0.5 text-[9px] font-bold text-primary">
                                  {saves} saves
                                </div>
                              ) : null}
                              <div className="absolute inset-x-0 bottom-0 z-[4] bg-gradient-to-t from-black via-black/70 to-transparent p-3">
                                <p className="font-gothic text-sm font-bold text-white line-clamp-2 leading-tight">{c.name}</p>
                                <p className="text-[11px] text-white/70 line-clamp-2 mt-0.5">{c.tagline}</p>
                              </div>
                            </TierHaloPortraitFrame>
                          </div>
                          <div className="p-3 border-t border-white/[0.06]">
                            <button
                              type="button"
                              onClick={() => useInTweet(c)}
                              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-primary-foreground shadow-lg border border-primary/35"
                              style={{ background: `linear-gradient(135deg, ${NEON}, hsl(280 45% 38%))` }}
                            >
                              <Zap className="h-4 w-4 shrink-0" />
                              Use in Tweet
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border/60 bg-black/35 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setHistoryOpen((o) => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-white/[0.04]"
                >
                  <span className="flex items-center gap-2">
                    <History className="h-4 w-4 text-accent" />
                    Recent generations ({history.length})
                  </span>
                  {historyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                <AnimatePresence initial={false}>
                  {historyOpen ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border/50"
                    >
                      <ul className="max-h-64 overflow-y-auto divide-y divide-border/40">
                        {history.length === 0 ? (
                          <li className="px-4 py-6 text-xs text-muted-foreground text-center">No runs yet.</li>
                        ) : (
                          history.map((h) => (
                            <li key={h.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                              <div className="flex-1 min-w-0">
                                <p className="text-muted-foreground">
                                  {new Date(h.at).toLocaleString()} · {h.companionName}
                                  {h.surfaceLabel ? ` · ${h.surfaceLabel}` : ""}
                                </p>
                                <p className="text-foreground/90 line-clamp-2 mt-1">{h.variations[0] ? fullTweetText(h.variations[0]) : "—"}</p>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <button
                                  type="button"
                                  className="px-2 py-1 rounded-lg border border-border text-[10px] font-semibold hover:border-primary/40"
                                  onClick={() => h.variations[0] && void copyText(fullTweetText(h.variations[0]), "Tweet")}
                                >
                                  Copy
                                </button>
                                <button
                                  type="button"
                                  className="px-2 py-1 rounded-lg border border-primary/40 text-[10px] font-semibold text-primary"
                                  onClick={() => {
                                    setVariations(h.variations);
                                    setTone(h.tone);
                                    setQuickKind(h.quickKind);
                                    const surf = mergedSurfaces.find((x) => x.id === h.surfaceId);
                                    setSelectedSurface(surf ?? null);
                                    if (h.companionId) {
                                      const row = companions.find((c) => c.id === h.companionId);
                                      setSelected(row ?? null);
                                    } else setSelected(null);
                                    workspaceRef.current?.scrollIntoView({ behavior: "smooth" });
                                  }}
                                >
                                  Load
                                </button>
                              </div>
                            </li>
                          ))
                        )}
                      </ul>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>

            {/* RIGHT workspace */}
            <div
              ref={workspaceRef}
              className="xl:sticky xl:top-4 space-y-4 rounded-2xl border border-primary/20 bg-gradient-to-b from-black/55 to-black/80 p-4 md:p-5 max-h-[calc(100dvh-8rem)] overflow-y-auto shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            >
              <div className="rounded-2xl border border-white/[0.08] bg-black/50 overflow-hidden">
                <div className="aspect-[16/10] max-h-52 w-full bg-black/70 relative flex items-center justify-center">
                  {heroVisual ? (
                    <img src={heroVisual} alt="" className="absolute inset-0 h-full w-full object-contain object-top bg-black" />
                  ) : (
                    <div className="text-center px-6 py-10">
                      <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2 opacity-60" />
                      <p className="text-xs text-muted-foreground">Select a companion or capture a screen for the hero slot.</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 p-3 border-t border-white/[0.06]">
                  <button
                    type="button"
                    disabled={captureBusy}
                    onClick={() => {
                      void (async () => {
                        setCaptureBusy(true);
                        try {
                          const url = await captureScreenToDataUrl();
                          if (url) {
                            setScreenshotDataUrl(url);
                            toast.success("Screenshot captured — appears above.");
                          }
                        } finally {
                          setCaptureBusy(false);
                        }
                      })();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent hover:bg-accent/20 disabled:opacity-50"
                  >
                    {captureBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                    Capture screen / tab
                  </button>
                  {screenshotDataUrl ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void copyScreenshot()}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy screenshot
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setScreenshotDataUrl(null);
                          toast.message("Screenshot cleared");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Clear capture
                      </button>
                    </>
                  ) : null}
                  {selected ? (
                    <button
                      type="button"
                      onClick={() => void copyImage(selected)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-foreground"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      Copy portrait
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-[11px]">
                {selected ? (
                  <span className="rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-primary font-semibold truncate max-w-full">
                    {selected.name}
                  </span>
                ) : (
                  <span className="rounded-full border border-border px-3 py-1 text-muted-foreground">No companion</span>
                )}
                {selectedSurface ? (
                  <span className="rounded-full border border-accent/35 bg-accent/10 px-3 py-1 text-accent font-semibold truncate max-w-full">
                    {selectedSurface.label}
                  </span>
                ) : (
                  <span className="rounded-full border border-border px-3 py-1 text-muted-foreground">No surface focus</span>
                )}
                <button type="button" className="text-primary hover:underline ml-auto" onClick={() => { setSelected(null); setSelectedSurface(null); }}>
                  Reset focus
                </button>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">Smart angles</p>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                  {smartAngles.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => applyAngle(a.prompt, a.label)}
                      className="text-left text-[11px] px-2.5 py-1.5 rounded-xl border border-border/70 bg-white/[0.03] hover:border-primary/40 text-foreground/90 max-w-[18rem]"
                      title={a.prompt}
                    >
                      <span className="font-semibold text-primary/90">{a.label}</span>
                      <span className="block text-muted-foreground line-clamp-2 mt-0.5">{a.prompt}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-black/60 border border-border px-3 py-2 text-sm text-foreground"
                  >
                    {TONES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Quick campaigns</label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {QUICK_ACTIONS.map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => {
                          setQuickKind(q.kind);
                          toast.message(q.label);
                        }}
                        className={cn(
                          "text-[10px] font-semibold px-2 py-1 rounded-lg border",
                          quickKind === q.kind ? "border-primary/50 bg-primary/15 text-primary" : "border-border/60 bg-black/40 text-muted-foreground",
                        )}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-white">Operator prompt</label>
                <p className="text-[11px] text-muted-foreground mt-1">Stack angles, CTAs, or “make a thread about Nexus”. Grok reads this + atlas + selection.</p>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-xl bg-black/60 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-y min-h-[96px]"
                  placeholder="e.g. Thread hook + 3 tweets teasing Lovense patterns on mythics…"
                />
              </div>

              <button
                type="button"
                disabled={generating}
                onClick={() => void runGenerate()}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-primary-foreground border border-primary/40 shadow-[0_0_40px_rgba(255,45,123,0.2)] disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${NEON}, hsl(280 40% 36%))` }}
              >
                {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                Generate 5 tweets
              </button>

              <div className="space-y-3">
                <h3 className="font-gothic text-lg text-white flex items-center gap-2">
                  <Send className="h-5 w-5 text-accent" />
                  Variations
                </h3>
                {!variations?.length ? (
                  <p className="text-xs text-muted-foreground border border-dashed border-border/50 rounded-xl p-6 text-center">
                    Generate to see five copy-ready posts with hashtags and character counts.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {variations.map((v, i) => {
                      const full = fullTweetText(v);
                      const count = full.length;
                      return (
                        <div key={i} className="rounded-xl border border-border/60 bg-black/45 p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] uppercase tracking-widest text-primary font-bold">#{i + 1}</span>
                            <span
                              className={cn(
                                "text-xs font-mono font-bold",
                                count > 280 ? "text-destructive" : count > 260 ? "text-amber-300" : "text-accent",
                              )}
                            >
                              {count} / 280
                            </span>
                          </div>
                          <p className="text-sm text-foreground/95 whitespace-pre-wrap leading-relaxed">{full}</p>
                          <p className="text-[10px] text-muted-foreground">
                            <span className="text-primary/80 font-semibold mr-1">Tags</span>
                            {v.hashtags.length ? v.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ") : "—"}
                          </p>
                          <button
                            type="button"
                            onClick={() => void copyText(full, "Tweet")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copy
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-violet-500/25 bg-violet-950/20 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <MessageSquare className="h-4 w-4 text-violet-300" />
                  Grok · refine copy
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Ask for hornier, more mysterious, a thread outline, or punch-up hooks. Context updates as you change companion / surface /
                  prompt / last generation.
                </p>
                <div className="max-h-48 overflow-y-auto space-y-2 rounded-xl border border-white/[0.06] bg-black/40 p-3 text-xs">
                  {chatMessages.length === 0 ? (
                    <p className="text-muted-foreground italic">Start a conversation…</p>
                  ) : (
                    chatMessages.map((m, i) => (
                      <div
                        key={i}
                        className={cn(
                          "rounded-lg px-2 py-1.5",
                          m.role === "user" ? "bg-primary/10 text-foreground ml-4" : "bg-white/[0.05] text-foreground/90 mr-4",
                        )}
                      >
                        {m.content}
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendChat();
                      }
                    }}
                    placeholder="e.g. Make variation 2 more mysterious…"
                    className="flex-1 rounded-xl bg-black/50 border border-border px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={chatSending || !chatInput.trim()}
                    onClick={() => void sendChat()}
                    className="shrink-0 rounded-xl px-4 py-2 text-sm font-bold text-primary-foreground border border-primary/40 disabled:opacity-40"
                    style={{ backgroundColor: NEON }}
                  >
                    {chatSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setChatMessages([]);
                    toast.message("Chat cleared");
                  }}
                  className="text-[10px] text-muted-foreground hover:text-white underline"
                >
                  Clear chat
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
