import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Copy,
  Hash,
  History,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  Megaphone,
  RefreshCw,
  Send,
  Sparkles,
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

const NEON = "#FF2D7B";
const HISTORY_KEY = "lustforge-x-marketing-history-v1";

type HubTab = "overview" | "browse" | "generate" | "history";

type StatsPayload = {
  totalStock: number;
  totalCustom: number;
  totalCompanions: number;
  mostSavedWeek: { companion_id: string; count: number; name: string }[];
  trendingTags: { tag: string; count: number }[];
  pinCountsTop: Record<string, number>;
};

export type TweetVariation = {
  text: string;
  hashtags: string[];
};

export type XMarketingHistoryEntry = {
  id: string;
  at: string;
  companionId: string | null;
  companionName: string;
  tone: string;
  quickKind: string | null;
  variations: TweetVariation[];
};

const TONES = [
  "Professional",
  "Teasing",
  "Mysterious",
  "Horny",
  "Elegant",
  "Aggressive Hype",
] as const;

const QUICK_ACTIONS: { id: string; label: string; kind: string }[] = [
  { id: "q1", label: "Promote New Companion", kind: "promote_new" },
  { id: "q2", label: "Highlight Popular Companion", kind: "highlight_popular" },
  { id: "q3", label: "Hype The Nexus", kind: "hype_nexus" },
  { id: "q4", label: "Sexual Tease Post", kind: "sexual_tease" },
  { id: "q5", label: "Community Engagement", kind: "community" },
  { id: "q6", label: "Rarity Drop Announcement", kind: "rarity_drop" },
];

function loadHistory(): XMarketingHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
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

export default function XMarketingHub() {
  const { data: companions = [], isLoading: companionsLoading } = useAdminCompanions();
  const [tab, setTab] = useState<HubTab>("overview");

  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [rarityFilter, setRarityFilter] = useState<CompanionRarity | "all">("all");
  const [sortBy, setSortBy] = useState<"newest" | "most_saved" | "name">("newest");
  const [tagFilter, setTagFilter] = useState("");
  const [kinkFilter, setKinkFilter] = useState("");
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<DbCompanion | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [tone, setTone] = useState<string>(TONES[0]!);
  const [quickKind, setQuickKind] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [variations, setVariations] = useState<TweetVariation[] | null>(null);

  const [history, setHistory] = useState<XMarketingHistoryEntry[]>(() => loadHistory());

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
      const { data, error } = await supabase.functions.invoke("admin-x-marketing", {
        body: {
          mode: "generate",
          tone,
          customPrompt,
          quickKind: quickKind || undefined,
          companion: companionPayload,
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
        tone,
        quickKind,
        variations: vars,
      };
      const next = [entry, ...history].slice(0, 40);
      setHistory(next);
      saveHistory(next);
      toast.success("5 tweet variations ready.");
      setTab("generate");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
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

  const hubTabs: { id: HubTab; label: string; Icon: typeof LayoutGrid }[] = [
    { id: "overview", label: "Dashboard", Icon: BarChart3 },
    { id: "browse", label: "Companion Browser", Icon: LayoutGrid },
    { id: "generate", label: "Tweet Generator", Icon: Send },
    { id: "history", label: "History", Icon: History },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-[1.75rem] border border-primary/25 bg-gradient-to-br from-black/70 via-card/50 to-[#1a0a14]/90 backdrop-blur-xl overflow-hidden shadow-[0_0_60px_rgba(255,45,123,0.08)]">
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
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
                Pick a companion, set the vibe, generate five ready-to-post tweets with hashtags and counts. Built for
                speed — same noir energy as the rest of Command.
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
            Refresh data
          </button>
        </div>

        <div className="px-4 md:px-6 py-4 border-b border-white/[0.06] flex flex-wrap gap-2">
          {hubTabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold border transition-all",
                tab === id
                  ? "border-primary/50 bg-primary/15 text-primary shadow-[0_0_24px_rgba(255,45,123,0.15)]"
                  : "border-border/60 bg-black/40 text-muted-foreground hover:text-foreground hover:border-border",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-4 md:p-8 space-y-8">
          {tab === "overview" && (
            <div className="space-y-8">
              {statsError ? (
                <p className="text-sm text-destructive border border-destructive/30 rounded-xl p-4 bg-destructive/10">{statsError}</p>
              ) : null}
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  {
                    label: "Catalog companions",
                    value: statsLoading ? "—" : String(stats?.totalStock ?? 0),
                    sub: "Stock personas",
                  },
                  {
                    label: "Forge creations",
                    value: statsLoading ? "—" : String(stats?.totalCustom ?? 0),
                    sub: "custom_characters",
                  },
                  {
                    label: "Total roster",
                    value: statsLoading ? "—" : String(stats?.totalCompanions ?? 0),
                    sub: "Stock + forge rows",
                  },
                ].map((card) => (
                  <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-border/70 bg-black/45 p-5 backdrop-blur-md"
                  >
                    <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground font-semibold">{card.label}</p>
                    <p className="font-gothic text-3xl text-white mt-2">{card.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                  </motion.div>
                ))}
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-border/70 bg-black/40 p-5 backdrop-blur-md">
                  <h3 className="font-gothic text-lg text-white flex items-center gap-2 mb-4">
                    <Sparkles className="h-5 w-5 text-primary" style={{ color: NEON }} />
                    Most saved (7 days)
                  </h3>
                  {statsLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading pins…
                    </div>
                  ) : (stats?.mostSavedWeek?.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted-foreground">No Discover pins in the last week yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {stats!.mostSavedWeek.map((row) => (
                        <li
                          key={row.companion_id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2"
                        >
                          <span className="text-sm text-foreground truncate font-medium">{row.name}</span>
                          <span className="text-xs font-bold text-primary shrink-0">{row.count} saves</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-2xl border border-border/70 bg-black/40 p-5 backdrop-blur-md">
                  <h3 className="font-gothic text-lg text-white flex items-center gap-2 mb-4">
                    <Hash className="h-5 w-5 text-accent" />
                    Trending tags &amp; interests
                  </h3>
                  {statsLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" /> Scanning roster…
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(stats?.trendingTags ?? []).map((t) => (
                        <button
                          key={t.tag}
                          type="button"
                          onClick={() => {
                            setTagFilter(t.tag);
                            setTab("browse");
                          }}
                          className="text-[11px] px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] text-foreground/90 hover:border-primary/40 hover:text-primary transition-colors"
                        >
                          {t.tag}
                          <span className="text-muted-foreground ml-1">({t.count})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === "browse" && (
            <div className="space-y-5">
              <div className="flex flex-col xl:flex-row gap-4 flex-wrap xl:items-end">
                <div className="flex flex-col gap-1 min-w-[10rem]">
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Rarity</label>
                  <select
                    value={rarityFilter}
                    onChange={(e) => setRarityFilter(e.target.value as CompanionRarity | "all")}
                    className="rounded-xl bg-black/50 border border-border px-3 py-2 text-sm text-foreground"
                  >
                    <option value="all">All rarities</option>
                    {COMPANION_RARITIES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1 min-w-[10rem]">
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Sort</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as "newest" | "most_saved" | "name")}
                    className="rounded-xl bg-black/50 border border-border px-3 py-2 text-sm text-foreground"
                  >
                    <option value="newest">Newest</option>
                    <option value="most_saved">Most saved (all time)</option>
                    <option value="name">Name A–Z</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-[12rem]">
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Tags contains</label>
                  <input
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    list="xhub-tags"
                    placeholder="e.g. Yandere"
                    className="rounded-xl bg-black/50 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-[12rem]">
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Kinks contains</label>
                  <input
                    value={kinkFilter}
                    onChange={(e) => setKinkFilter(e.target.value)}
                    list="xhub-kinks"
                    placeholder="Filter kinks…"
                    className="rounded-xl bg-black/50 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div className="flex flex-col gap-1 flex-[2] min-w-[14rem]">
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Search</label>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Name, tagline, tag…"
                    className="rounded-xl bg-black/50 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              <datalist id="xhub-tags">
                {allTags.slice(0, 200).map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
              <datalist id="xhub-kinks">
                {allKinks.slice(0, 200).map((k) => (
                  <option key={k} value={k} />
                ))}
              </datalist>

              {companionsLoading ? (
                <div className="flex justify-center py-20 text-muted-foreground gap-2">
                  <Loader2 className="h-6 w-6 animate-spin" /> Loading companions…
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {filteredCompanions.map((c, idx) => {
                    const rarity = normalizeCompanionRarity(c.rarity);
                    const img = galleryStaticPortraitUrl(c, c.id);
                    const saves = pinCounts[c.id] ?? 0;
                    return (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.02, 0.35) }}
                        className={cn(
                          "rounded-2xl border overflow-hidden flex flex-col bg-black/50 backdrop-blur-md",
                          selected?.id === c.id ? "border-primary/60 ring-2 ring-primary/25" : "border-border/60 hover:border-primary/35",
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
                        <div className="p-3 border-t border-white/[0.06] flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelected(c);
                              setTab("generate");
                              toast.success(`${c.name} selected for tweets`);
                            }}
                            className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-primary-foreground shadow-lg border border-primary/30"
                            style={{ background: `linear-gradient(135deg, ${NEON}, hsl(280 45% 42%))` }}
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
          )}

          {tab === "generate" && (
            <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-8">
              <div className="space-y-5">
                <div className="rounded-2xl border border-border/70 bg-black/45 p-5 space-y-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Selected companion</h3>
                  {selected ? (
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden border border-white/10">
                        {galleryStaticPortraitUrl(selected, selected.id) ? (
                          <img
                            src={galleryStaticPortraitUrl(selected, selected.id)}
                            alt=""
                            className="w-full h-full object-cover object-top"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-xl font-gothic text-white"
                            style={{
                              background: `linear-gradient(135deg, ${selected.gradient_from}, ${selected.gradient_to})`,
                            }}
                          >
                            {selected.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-gothic text-lg text-white truncate">{selected.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{selected.tagline}</p>
                        <p className="text-[10px] text-primary mt-1 uppercase tracking-wider">
                          {normalizeCompanionRarity(selected.rarity)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelected(null)}
                        className="text-xs text-muted-foreground hover:text-white underline shrink-0"
                      >
                        Clear
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      None selected — tweets will be brand-level. Pick someone from{" "}
                      <button type="button" className="text-primary hover:underline" onClick={() => setTab("browse")}>
                        Companion Browser
                      </button>
                      .
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-border/70 bg-black/45 p-5 space-y-2">
                  <label className="text-sm font-semibold text-white">Custom prompt</label>
                  <p className="text-[11px] text-muted-foreground">Describe the vibe, CTA, or goal for this batch.</p>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={4}
                    placeholder="e.g. Push the Valentine’s drop, mention Nexus 2-for-1 merge energy, keep hashtags edgy but safe…"
                    className="w-full rounded-xl bg-black/60 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-y min-h-[100px]"
                  />
                </div>

                <div className="rounded-2xl border border-border/70 bg-black/45 p-5 space-y-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Quick actions</h3>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_ACTIONS.map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => {
                          setQuickKind(q.kind);
                          toast.message(`Angle: ${q.label}`);
                        }}
                        className={cn(
                          "text-xs font-semibold px-3 py-2 rounded-xl border transition-colors",
                          quickKind === q.kind
                            ? "border-primary/50 bg-primary/15 text-primary"
                            : "border-border/60 bg-black/40 text-muted-foreground hover:text-foreground hover:border-primary/30",
                        )}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-black/45 p-5 space-y-2">
                  <label className="text-sm font-semibold text-white">Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full rounded-xl bg-black/60 border border-border px-3 py-2 text-sm text-foreground"
                  >
                    {TONES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  disabled={generating}
                  onClick={() => void runGenerate()}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-primary-foreground border border-primary/40 shadow-[0_0_40px_rgba(255,45,123,0.2)] disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${NEON}, hsl(280 40% 38%))` }}
                >
                  {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                  Generate 5 tweets
                </button>
              </div>

              <div className="space-y-4">
                <h3 className="font-gothic text-xl text-white flex items-center gap-2">
                  <Send className="h-5 w-5 text-accent" />
                  Output
                </h3>
                {!variations?.length ? (
                  <div className="rounded-2xl border border-dashed border-border/60 bg-black/30 p-10 text-center text-sm text-muted-foreground">
                    Run the generator to see five variations with character counts and copy buttons.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {variations.map((v, i) => {
                      const full = fullTweetText(v);
                      const count = full.length;
                      return (
                        <div
                          key={i}
                          className="rounded-2xl border border-border/70 bg-black/50 p-4 space-y-3 backdrop-blur-md"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[10px] uppercase tracking-[0.25em] text-primary font-bold">Variation {i + 1}</span>
                            <span
                              className={cn(
                                "text-xs font-mono font-bold",
                                count > 280 ? "text-destructive" : count > 260 ? "text-amber-300" : "text-accent",
                              )}
                            >
                              {count} / 280
                            </span>
                          </div>
                          <p className="text-sm text-foreground/95 leading-relaxed whitespace-pre-wrap">{full}</p>
                          <p className="text-[11px] text-muted-foreground">
                            <span className="text-primary/80 font-semibold uppercase tracking-wider text-[10px] mr-2">Hashtags</span>
                            {v.hashtags.length ? v.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ") : "—"}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void copyText(full, "Tweet")}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Copy tweet
                            </button>
                            {selected ? (
                              <button
                                type="button"
                                onClick={() => void copyImage(selected)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-foreground hover:border-accent/40"
                              >
                                <ImageIcon className="h-3.5 w-3.5" />
                                Copy image
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "history" && (
            <div className="space-y-4">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground border border-dashed border-border/60 rounded-2xl p-10 text-center">
                  No generations yet — they are stored in this browser only.
                </p>
              ) : (
                <ul className="space-y-4">
                  {history.map((h) => (
                    <li
                      key={h.id}
                      className="rounded-2xl border border-border/70 bg-black/45 p-4 backdrop-blur-md flex flex-col md:flex-row md:items-start gap-4"
                    >
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{new Date(h.at).toLocaleString()}</span>
                          <span className="text-border">·</span>
                          <span className="text-foreground font-medium">{h.companionName}</span>
                          <span className="text-border">·</span>
                          <span>{h.tone}</span>
                          {h.quickKind ? (
                            <>
                              <span className="text-border">·</span>
                              <span className="text-primary/90">{h.quickKind}</span>
                            </>
                          ) : null}
                        </div>
                        <p className="text-sm text-foreground/90 line-clamp-3">
                          {h.variations[0] ? fullTweetText(h.variations[0]) : "—"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={!h.variations[0]}
                          onClick={() => h.variations[0] && void copyText(fullTweetText(h.variations[0]), "Tweet")}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border hover:border-primary/40 disabled:opacity-40"
                        >
                          Copy first
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setVariations(h.variations);
                            setTone(h.tone);
                            setQuickKind(h.quickKind);
                            setTab("generate");
                          }}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-primary/40 text-primary hover:bg-primary/10"
                        >
                          Load in generator
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
