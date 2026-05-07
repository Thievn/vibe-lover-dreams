import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Hash,
  History,
  Image as ImageIcon,
  ImagePlus,
  Loader2,
  Megaphone,
  MessageSquare,
  RefreshCw,
  ScanLine,
  Send,
  Sparkles,
  UserCircle2,
  Zap,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { mapSupabaseCustomCharacterRow, useAdminCompanions, type DbCompanion } from "@/hooks/useCompanions";
import {
  galleryStaticPortraitUrl,
  resolvePublicLoopPortraitVideoUrlForX,
  stablePortraitDisplayUrl,
  isVideoPortraitUrl,
} from "@/lib/companionMedia";
import { normalizeCompanionRarity, type CompanionRarity, COMPANION_RARITIES } from "@/lib/companionRarity";
import { getEdgeFunctionInvokeMessage } from "@/lib/edgeFunction";
import { cn } from "@/lib/utils";
import {
  buildProductAtlasForPrompt,
  getMergedMarketingSurfaces,
  type MergedMarketableSurface,
} from "@/lib/marketingSurfacesMerge";
import { buildSmartAngles } from "@/lib/xMarketingSiteRegistry";
import { invokeGenerateImage } from "@/lib/invokeGenerateImage";
import { inferForgeBodyTypeFromTags } from "@/lib/forgeBodyTypes";
import { resolveChatArtStyleLabel } from "@/lib/chatArtStyle";
import { appendXProfileLinkToTweet } from "@/lib/xMarketingProfileTweetAppend";
import { isPlatformAdmin } from "@/config/auth";
import { MarketingHubTabStrip, MarketingHubZernioPanels } from "@/components/admin/xmarketing/MarketingHubZernio";
import { MarketingTweetPreview } from "@/components/admin/xmarketing/MarketingTweetPreview";
import { XMarketingHeroCard } from "@/components/admin/xmarketing/XMarketingHeroCard";
import {
  bakeFramedCardPngBlob,
  framedXBakeFingerprint,
  recordFramedCardWebmBlob,
  uploadFramedXMedia,
} from "@/lib/xMarketingFramedVideoBake";
import type { ZernioHubTab } from "@/lib/zernioSocial";
import {
  X_MARKETING_PORTRAIT_TIERS,
  resolvePortraitHeroUrlForX,
  portraitTierForGrokLine,
  loadPortraitTierForCompanion,
  savePortraitTierForCompanion,
  type XMarketingPortraitTier,
} from "@/lib/xMarketingPortraitTier";

const NEON = "#FF2D7B";
const MARKETING_IMAGE_TOKEN_COST = 75;
const HISTORY_KEY = "lustforge-x-marketing-history-v2";

export type TweetVariation = { text: string; hashtags: string[] };

/** Echoes what admin-x-marketing sent to Grok for this run (profile + controls). */
export type XMarketingStyleSource = {
  generatedAt: string;
  companionId: string | null;
  companionName: string | null;
  styleLock: "gothic_ok" | "gothic_avoid";
  styleLockHint: string;
  chips: { label: string; value: string }[];
  summaryLine: string;
};

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
  styleSource?: XMarketingStyleSource | null;
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

/** Grok: preferred post shape (in addition to tone). */
const POST_STYLES: { id: string; label: string; hint: string }[] = [
  { id: "punchy", label: "Punchy one-liner", hint: "Single sharp hook + CTA energy." },
  { id: "thread", label: "Thread opener", hint: "First tweet of a thread; invites scroll." },
  { id: "quote", label: "Quote-bait", hint: "Screenshot-worthy standalone line." },
  { id: "lore", label: "Lore tease", hint: "Mystery, backstory crumbs, no spoilers." },
  { id: "drop", label: "Drop / FOMO", hint: "Scarcity, event, or build hype." },
];

const SCENE_PRESETS: { label: string; text: string }[] = [
  { label: "Spotlight", text: "Dramatic stage spotlight, velvet darkness, eyes to camera, premium promo still." },
  { label: "Neon street", text: "Rain-slick cyberpunk alley, neon rim light, confident stride, editorial X promo." },
  { label: "TCG flex", text: "Collectible card energy — heroic pose, subtle frame hints, mythic rare vibe, SFW." },
  { label: "Silhouette", text: "Backlit silhouette, mystery, slow-burn desire, tasteful adult brand." },
  { label: "Boudoir soft", text: "Soft window light, intimate but SFW, luxurious textures, romantic tension." },
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

export default function XMarketingHub() {
  const { data: companions = [], isLoading: companionsLoading } = useAdminCompanions();
  const { data: forgeCompanions = [], isLoading: forgeLoading } = useQuery({
    queryKey: ["admin-x-marketing-forge-roster"],
    queryFn: async (): Promise<DbCompanion[]> => {
      const { data, error } = await supabase
        .from("custom_characters")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(250);
      if (error) throw error;
      return (data ?? []).map((row) => mapSupabaseCustomCharacterRow(row as Record<string, unknown>));
    },
  });
  /** Catalog stock + forged personas (Forge Studio) for “Use in Tweet”. */
  const roster = useMemo(() => {
    const merged = [...companions, ...forgeCompanions];
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return merged;
  }, [companions, forgeCompanions]);
  const rosterLoading = companionsLoading || forgeLoading;
  const companionPickRef = useRef<HTMLDivElement | null>(null);
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

  /** Start unset so the roster does not dump every companion until you choose a tier or "all". */
  const [rarityFilter, setRarityFilter] = useState<CompanionRarity | "all" | "unset">("unset");
  const [sortBy, setSortBy] = useState<"newest" | "most_saved" | "name">("newest");
  const [tagFilter, setTagFilter] = useState("");
  const [kinkFilter, setKinkFilter] = useState("");
  const [search, setSearch] = useState("");

  const [customPrompt, setCustomPrompt] = useState("");
  const [tone, setTone] = useState<string>(TONES[0]!);
  const [quickKind, setQuickKind] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [variations, setVariations] = useState<TweetVariation[] | null>(null);
  const [styleSource, setStyleSource] = useState<XMarketingStyleSource | null>(null);

  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null);
  const [marketingRenders, setMarketingRenders] = useState<{ id: string; url: string }[]>([]);
  const [heroSource, setHeroSource] = useState<{ type: "portrait" } | { type: "render"; id: string }>({ type: "portrait" });
  const [marketingScene, setMarketingScene] = useState("");
  const [marketingGenBusy, setMarketingGenBusy] = useState(false);
  const [tweetPostStyle, setTweetPostStyle] = useState<string>(POST_STYLES[0]!.label);

  const [history, setHistory] = useState<XMarketingHistoryEntry[]>(() => loadHistory());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [hubTab, setHubTab] = useState<ZernioHubTab>("compose");
  /** Which generated variation is shown in the X preview and sent via Zernio */
  const [composePickVar, setComposePickVar] = useState(0);
  /** Selfie = catalog portrait; lewd/nude pick best match from generated_images for this companion */
  const [portraitTierForX, setPortraitTierForX] = useState<XMarketingPortraitTier>("selfie");

  const [chatMessages, setChatMessages] = useState<ChatTurn[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  /** Public URL of last baked framed asset for Zernio (PNG or WebM). */
  const [framedDeliverUrl, setFramedDeliverUrl] = useState<string | null>(null);
  const [framedDeliverKey, setFramedDeliverKey] = useState<string | null>(null);
  const [framedBakeBusy, setFramedBakeBusy] = useState(false);
  const [framedStillPrepBusy, setFramedStillPrepBusy] = useState(false);
  const autoStillFramedFailedForFp = useRef<string | null>(null);

  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setIsMobileLayout(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

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
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      const u = session?.user ?? null;
      setSessionUser(u);
      if (u?.id) {
        const { data: prof } = await supabase.from("profiles").select("display_name").eq("user_id", u.id).maybeSingle();
        if (!cancelled) setProfileDisplayName(prof?.display_name ?? null);
      } else {
        setProfileDisplayName(null);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSessionUser(session?.user ?? null);
      void (async () => {
        const uid = session?.user?.id;
        if (!uid) {
          setProfileDisplayName(null);
          return;
        }
        const { data: prof } = await supabase.from("profiles").select("display_name").eq("user_id", uid).maybeSingle();
        setProfileDisplayName(prof?.display_name ?? null);
      })();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const isAdminSession = useMemo(
    () => isPlatformAdmin(sessionUser, { profileDisplayName }),
    [sessionUser, profileDisplayName],
  );

  /** For lewd/nude hero: scan generated_images (admin can read all) to pick best prompt match */
  const { data: generatedImagesForTier = [] } = useQuery({
    queryKey: ["x-marketing-generated-images", selected?.id, portraitTierForX],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_images")
        .select("image_url, prompt, created_at")
        .eq("companion_id", selected!.id)
        .order("created_at", { ascending: false })
        .limit(120);
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(selected?.id) && portraitTierForX !== "selfie",
  });

  const { data: marketingSocialSettings } = useQuery({
    queryKey: ["marketing-social-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_social_settings")
        .select(
          "use_looping_video_for_x, use_framed_card_for_x_video, x_append_profile_link, x_profile_link_cta_preset, x_profile_link_cta_custom",
        )
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const tweetTextForPost = useCallback(
    (v: TweetVariation) =>
      appendXProfileLinkToTweet(fullTweetText(v), {
        append: Boolean(marketingSocialSettings?.x_append_profile_link),
        preset: String(marketingSocialSettings?.x_profile_link_cta_preset ?? "check_out"),
        custom: marketingSocialSettings?.x_profile_link_cta_custom,
        companionId: selected?.id,
        companionName: selected?.name ?? "",
        companionTagline: selected?.tagline,
      }),
    [marketingSocialSettings, selected],
  );

  const historyTweetText = useCallback(
    (v: TweetVariation, h: XMarketingHistoryEntry) =>
      appendXProfileLinkToTweet(fullTweetText(v), {
        append: Boolean(marketingSocialSettings?.x_append_profile_link),
        preset: String(marketingSocialSettings?.x_profile_link_cta_preset ?? "check_out"),
        custom: marketingSocialSettings?.x_profile_link_cta_custom,
        companionId: h.companionId,
        companionName: h.companionName,
        companionTagline: undefined,
      }),
    [marketingSocialSettings],
  );

  useEffect(() => {
    setMarketingRenders([]);
    setHeroSource({ type: "portrait" });
  }, [selected?.id]);

  useEffect(() => {
    if (!selected?.id) return;
    setPortraitTierForX(loadPortraitTierForCompanion(selected.id));
  }, [selected?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatSending]);

  const pinCounts = stats?.pinCountsTop ?? {};

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const c of roster) {
      for (const t of c.tags || []) s.add(t);
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [roster]);

  const allKinks = useMemo(() => {
    const s = new Set<string>();
    for (const c of roster) {
      for (const k of c.kinks || []) s.add(k);
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [roster]);

  const styleSourceStale = useMemo(() => {
    if (!styleSource?.companionId) return false;
    if (!selected?.id) return true;
    return styleSource.companionId !== selected.id;
  }, [styleSource?.companionId, selected?.id]);

  const filteredCompanions = useMemo(() => {
    if (rarityFilter === "unset") {
      return [];
    }
    const q = search.trim().toLowerCase();
    const tf = tagFilter.trim().toLowerCase();
    const kf = kinkFilter.trim().toLowerCase();
    let list = [...roster];
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
  }, [roster, rarityFilter, search, tagFilter, kinkFilter, sortBy, pinCounts]);

  const smartAngles = useMemo(
    () => buildSmartAngles(selectedSurface, selected),
    [selectedSurface, selected],
  );

  const productAtlas = useMemo(() => buildProductAtlasForPrompt(), []);

  const contextBlockForChat = useMemo(() => {
    const parts: string[] = [];
    parts.push(`Tone: ${tone}. Post shape: ${tweetPostStyle}.`);
    parts.push(portraitTierForGrokLine(portraitTierForX));
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
        `Latest generated tweets (may edit):\n${variations.map((v, i) => `${i + 1}. ${tweetTextForPost(v)}`).join("\n")}`,
      );
    }
    parts.push(`Product atlas:\n${productAtlas}`);
    return parts.join("\n\n");
  }, [
    tone,
    tweetPostStyle,
    portraitTierForX,
    selected,
    selectedSurface,
    quickKind,
    customPrompt,
    variations,
    productAtlas,
    tweetTextForPost,
  ]);

  const applyAngle = (prompt: string) => {
    setCustomPrompt((prev) => (prev.trim() ? `${prev.trim()}\n\n${prompt}` : prompt));
  };

  const useInTweet = (c: DbCompanion) => {
    setSelected(c);
    workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const pickSurface = (s: MergedMarketableSurface) => {
    setSelectedSurface((prev) => (prev?.id === s.id ? null : s));
    workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const runGenerate = async () => {
    setGenerating(true);
    setVariations(null);
    setStyleSource(null);
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
            personality: selected.personality.slice(0, 800),
            bio: selected.bio.slice(0, 900),
            appearance: selected.appearance.slice(0, 1200),
            timePeriod: (selected as unknown as { time_period?: string }).time_period ?? null,
            speechStyle: (selected as unknown as { speech_style?: string }).speech_style ?? null,
            relationshipVibe: (selected as unknown as { relationship_vibe?: string }).relationship_vibe ?? null,
            sexualEnergy: (selected as unknown as { sexual_energy?: string }).sexual_energy ?? null,
            personalityType: (selected as unknown as { personality_type?: string }).personality_type ?? null,
            isNexusHybrid: Boolean((selected as unknown as { is_nexus_hybrid?: boolean }).is_nexus_hybrid),
            lineageParentIds: Array.isArray((selected as unknown as { lineage_parent_ids?: unknown }).lineage_parent_ids)
              ? ((selected as unknown as { lineage_parent_ids?: string[] }).lineage_parent_ids ?? []).slice(0, 4)
              : [],
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
          tweetStyle: tweetPostStyle,
          customPrompt,
          quickKind: quickKind || undefined,
          companion: companionPayload,
          productAtlas,
          siteSurface,
          portraitTier: portraitTierForX,
        },
      });
      if (error) throw new Error(await getEdgeFunctionInvokeMessage(error, data));
      const payload = data as { variations?: TweetVariation[]; styleSource?: XMarketingStyleSource };
      const vars = payload?.variations;
      if (!Array.isArray(vars) || vars.length < 1) throw new Error("No variations returned");
      const src = payload?.styleSource;
      const normalizedSource: XMarketingStyleSource | null =
        src &&
        typeof src === "object" &&
        typeof src.generatedAt === "string" &&
        Array.isArray(src.chips) &&
        typeof src.summaryLine === "string"
          ? {
              generatedAt: src.generatedAt,
              companionId: typeof src.companionId === "string" ? src.companionId : null,
              companionName: typeof src.companionName === "string" ? src.companionName : null,
              styleLock: src.styleLock === "gothic_ok" ? "gothic_ok" : "gothic_avoid",
              styleLockHint: typeof src.styleLockHint === "string" ? src.styleLockHint : "",
              chips: src.chips.filter(
                (c): c is { label: string; value: string } =>
                  Boolean(c) &&
                  typeof c === "object" &&
                  typeof (c as { label?: string }).label === "string" &&
                  typeof (c as { value?: string }).value === "string",
              ),
              summaryLine: src.summaryLine,
            }
          : null;
      setVariations(vars);
      setStyleSource(normalizedSource);
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
        styleSource: normalizedSource,
      };
      const next = [entry, ...history].slice(0, 40);
      setHistory(next);
      saveHistory(next);
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

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
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
    } catch {
      await copyText(url);
    }
  };

  const portraitHeroFromTier = useMemo(() => {
    if (!selected) return { url: null as string | null, usedFallback: false };
    const rows = portraitTierForX === "selfie" ? undefined : generatedImagesForTier;
    return resolvePortraitHeroUrlForX(selected, portraitTierForX, rows);
  }, [selected, portraitTierForX, generatedImagesForTier]);

  const heroVisual = useMemo(() => {
    if (heroSource.type === "render") {
      const row = marketingRenders.find((r) => r.id === heroSource.id);
      if (row?.url) return row.url;
      if (selected) return portraitHeroFromTier.url ?? galleryStaticPortraitUrl(selected, selected.id) ?? null;
      return null;
    }
    if (selected) return portraitHeroFromTier.url ?? galleryStaticPortraitUrl(selected, selected.id) ?? null;
    return null;
  }, [heroSource, marketingRenders, selected, portraitHeroFromTier]);

  const loopVideoPublicUrl = useMemo(
    () => (selected ? resolvePublicLoopPortraitVideoUrlForX(selected) : null),
    [selected],
  );

  const preferLoopForX = Boolean(
    marketingSocialSettings?.use_looping_video_for_x &&
      selected &&
      heroSource.type === "portrait" &&
      portraitTierForX === "selfie" &&
      loopVideoPublicUrl,
  );

  const framedModeOn = Boolean(marketingSocialSettings?.use_framed_card_for_x_video);

  const framedBakeFingerprint = useMemo(() => {
    if (!selected || !framedModeOn) return null;
    const interior = preferLoopForX && loopVideoPublicUrl ? loopVideoPublicUrl : (heroVisual?.split("?")[0] ?? "");
    return framedXBakeFingerprint({
      companionId: selected.id,
      heroVisual: interior,
      portraitTier: portraitTierForX,
      useLoopingVideoForX: Boolean(marketingSocialSettings?.use_looping_video_for_x),
      useFramedCardForX: true,
      heroSourceType: heroSource.type,
      pinCount: pinCounts[selected.id] ?? 0,
    });
  }, [
    selected,
    framedModeOn,
    preferLoopForX,
    loopVideoPublicUrl,
    heroVisual,
    portraitTierForX,
    marketingSocialSettings?.use_looping_video_for_x,
    heroSource.type,
    pinCounts,
  ]);

  /** Zernio can only fetch public http(s) URLs — not data: or blob: URLs. */
  const { mediaUrlsForZernio, zernioMediaBlockedReason } = useMemo(() => {
    if (!heroVisual) {
      return { mediaUrlsForZernio: [] as string[], zernioMediaBlockedReason: null as string | null };
    }
    if (heroVisual.startsWith("data:")) {
      return {
        mediaUrlsForZernio: [],
        zernioMediaBlockedReason:
          "This image isn’t a public URL, so Zernio can’t attach it. Use profile portrait, a marketing still, or paste media manually on X.",
      };
    }
    if (heroVisual.startsWith("blob:")) {
      return {
        mediaUrlsForZernio: [],
        zernioMediaBlockedReason: "This image can’t be attached via API. Use a portrait or generated still.",
      };
    }

    const preferLoop =
      Boolean(marketingSocialSettings?.use_looping_video_for_x) &&
      Boolean(selected) &&
      heroSource.type === "portrait" &&
      portraitTierForX === "selfie";

    let naturalUrl: string | null = null;
    if (preferLoop && loopVideoPublicUrl) {
      naturalUrl = loopVideoPublicUrl;
    }
    if (!naturalUrl && /^https?:\/\//i.test(heroVisual)) {
      naturalUrl = heroVisual.split("?")[0] ?? null;
    }
    if (!naturalUrl && heroVisual.startsWith("/")) {
      const origin = siteOrigin || (typeof window !== "undefined" ? window.location.origin : "");
      if (origin) naturalUrl = `${origin}${heroVisual}`;
    }

    if (!naturalUrl) {
      return { mediaUrlsForZernio: [] as string[], zernioMediaBlockedReason: null as string | null };
    }

    if (!framedModeOn) {
      return { mediaUrlsForZernio: [naturalUrl], zernioMediaBlockedReason: null as string | null };
    }

    /** Without a companion row we cannot bake tier chrome — attach the natural hero. */
    if (!selected || !framedBakeFingerprint) {
      return { mediaUrlsForZernio: [naturalUrl], zernioMediaBlockedReason: null as string | null };
    }

    if (framedDeliverUrl && framedDeliverKey === framedBakeFingerprint) {
      return { mediaUrlsForZernio: [framedDeliverUrl.split("?")[0]!], zernioMediaBlockedReason: null as string | null };
    }

    const needsVideoBake = preferLoopForX && Boolean(loopVideoPublicUrl);
    if (needsVideoBake) {
      return {
        mediaUrlsForZernio: [] as string[],
        zernioMediaBlockedReason:
          "Framed card for X is on — click “Bake framed video for X” in Post hero so Zernio gets a public WebM with the discover-style rim.",
      };
    }

    return {
      mediaUrlsForZernio: [] as string[],
      zernioMediaBlockedReason: framedStillPrepBusy
        ? "Preparing framed card PNG for X…"
        : "Framed card for X is on — still image is being prepared, or baking failed (check toast).",
    };
  }, [
    heroVisual,
    siteOrigin,
    marketingSocialSettings?.use_looping_video_for_x,
    selected,
    heroSource.type,
    portraitTierForX,
    framedModeOn,
    framedBakeFingerprint,
    framedDeliverUrl,
    framedDeliverKey,
    preferLoopForX,
    loopVideoPublicUrl,
    framedStillPrepBusy,
  ]);

  useEffect(() => {
    if (!marketingSocialSettings?.use_framed_card_for_x_video) {
      setFramedDeliverUrl(null);
      setFramedDeliverKey(null);
    }
  }, [marketingSocialSettings?.use_framed_card_for_x_video]);

  useEffect(() => {
    autoStillFramedFailedForFp.current = null;
  }, [framedBakeFingerprint]);

  useEffect(() => {
    if (!framedModeOn || !selected || !heroVisual) return;
    if (heroVisual.startsWith("data:") || heroVisual.startsWith("blob:")) return;
    if (!framedBakeFingerprint) return;
    if (preferLoopForX) return;
    if (framedDeliverKey === framedBakeFingerprint && framedDeliverUrl) return;
    if (autoStillFramedFailedForFp.current === framedBakeFingerprint) return;

    let cancelled = false;
    setFramedStillPrepBusy(true);
    void (async () => {
      try {
        const blob = await bakeFramedCardPngBlob({
          companion: selected,
          heroStillUrl: heroVisual,
          loopVideoUrl: null,
          pinCount: pinCounts[selected.id] ?? 0,
        });
        const url = await uploadFramedXMedia(supabase, blob, selected.id);
        if (!cancelled) {
          setFramedDeliverUrl(url);
          setFramedDeliverKey(framedBakeFingerprint);
        }
      } catch (e) {
        if (!cancelled) {
          autoStillFramedFailedForFp.current = framedBakeFingerprint;
          toast.error(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setFramedStillPrepBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    framedModeOn,
    selected,
    heroVisual,
    preferLoopForX,
    framedBakeFingerprint,
    framedDeliverKey,
    framedDeliverUrl,
    pinCounts,
  ]);

  const bakeFramedLoopForX = useCallback(async () => {
    if (!selected || !loopVideoPublicUrl || !framedModeOn) {
      toast.error("Select a companion with a public looping MP4 and enable framed card for X in Zernio settings.");
      return;
    }
    const interior = loopVideoPublicUrl;
    const fp = framedXBakeFingerprint({
      companionId: selected.id,
      heroVisual: interior,
      portraitTier: portraitTierForX,
      useLoopingVideoForX: Boolean(marketingSocialSettings?.use_looping_video_for_x),
      useFramedCardForX: true,
      heroSourceType: heroSource.type,
      pinCount: pinCounts[selected.id] ?? 0,
    });
    setFramedBakeBusy(true);
    try {
      const blob = await recordFramedCardWebmBlob({
        companion: selected,
        heroStillUrl: null,
        loopVideoUrl: loopVideoPublicUrl,
        pinCount: pinCounts[selected.id] ?? 0,
      });
      const url = await uploadFramedXMedia(supabase, blob, selected.id);
      setFramedDeliverUrl(url);
      setFramedDeliverKey(fp);
      toast.success("Framed clip uploaded — Zernio will attach this public URL.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setFramedBakeBusy(false);
    }
  }, [
    selected,
    loopVideoPublicUrl,
    framedModeOn,
    portraitTierForX,
    marketingSocialSettings?.use_looping_video_for_x,
    heroSource.type,
    pinCounts,
  ]);

  useEffect(() => {
    if (!variations?.length) return;
    setComposePickVar((i) => Math.min(i, variations.length - 1));
  }, [variations]);

  const composePreviewFull = useMemo(
    () => (variations?.[composePickVar] ? tweetTextForPost(variations[composePickVar]!) : ""),
    [variations, composePickVar, tweetTextForPost],
  );
  const composePreviewChars = composePreviewFull.length;

  const composePreviewMedia = useMemo(() => {
    if (!heroVisual) return null;
    if (selected) {
      const plainLoopPreview = !framedModeOn && preferLoopForX && loopVideoPublicUrl;
      if (plainLoopPreview) {
        return (
          <div className="w-full max-w-[min(100%,280px)] mx-auto">
            <div className="relative rounded-xl overflow-hidden border border-[#2f3336] bg-black aspect-[2/3] max-h-[min(56vh,520px)]">
              <video
                src={loopVideoPublicUrl}
                className="absolute inset-0 h-full w-full origin-center scale-[1.02] object-cover object-top"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />
            </div>
          </div>
        );
      }
      return (
        <div className="w-full max-w-[min(100%,280px)] mx-auto">
          <XMarketingHeroCard
            companion={selected}
            mediaUrl={heroVisual}
            loopVideoUrl={preferLoopForX ? loopVideoPublicUrl : null}
            pinCount={pinCounts[selected.id] ?? 0}
          />
        </div>
      );
    }
    if (isVideoPortraitUrl(heroVisual)) {
      return (
        <div className="relative w-full max-w-md mx-auto bg-black rounded-lg overflow-hidden">
          <video
            src={heroVisual}
            className="w-full max-h-[min(320px,45vh)] object-contain object-top"
            autoPlay
            muted
            loop
            playsInline
          />
        </div>
      );
    }
    return null;
  }, [heroVisual, selected, preferLoopForX, loopVideoPublicUrl, pinCounts, framedModeOn]);

  const generateMarketingStill = async () => {
    if (!selected) {
      toast.error("Select a companion first (Use in Tweet on a card).");
      return;
    }
    const uid = sessionUser?.id;
    if (!uid) {
      toast.error("Sign in to generate images.");
      return;
    }
    setMarketingGenBusy(true);
    try {
      const defaultByTier =
        portraitTierForX === "lewd"
          ? "Lewd teasing marketing still — lingerie / sheer / seductive pose, editorial spice, alluring but brand-safe framing."
          : portraitTierForX === "nude"
            ? "Explicit 18+ marketing still — fully nude or highly implied adult art, cinematic erotic lighting, character-accurate anatomy."
            : "Premium editorial marketing still for X — cinematic lighting, alluring confident expression, SFW, on-brand.";
      const scene = marketingScene.trim() || defaultByTier;
      const prompt =
        `${scene}\n\n(Character: ${selected.name}, ${selected.gender}. ${selected.appearance})`.slice(0, 8000);
      const referenceImageUrl =
        (typeof (selected as Record<string, unknown>).static_image_url === "string" &&
          ((selected as Record<string, unknown>).static_image_url as string)) ||
        (typeof (selected as Record<string, unknown>).image_url === "string" &&
          ((selected as Record<string, unknown>).image_url as string)) ||
        (typeof (selected as Record<string, unknown>).avatar_url === "string" &&
          ((selected as Record<string, unknown>).avatar_url as string)) ||
        undefined;
      const { data, error } = await invokeGenerateImage({
        prompt,
        userId: uid,
        isPortrait: false,
        tokenCost: isAdminSession ? 0 : MARKETING_IMAGE_TOKEN_COST,
        name: selected.name,
        subtitle: selected.tagline,
        ...(referenceImageUrl ? { referenceImageUrl } : {}),
        characterData: {
          companionId: selected.id,
          style: "x-marketing",
          artStyleLabel: resolveChatArtStyleLabel({
            tags: selected.tags,
            nude_tensor_render_group: (selected as Record<string, unknown>).nude_tensor_render_group as string | undefined,
            image_prompt: (selected as Record<string, unknown>).image_prompt as string | undefined,
            appearance: selected.appearance,
          }),
          bodyType: inferForgeBodyTypeFromTags(selected.tags ?? []) ?? "Average",
          tags: selected.tags ?? [],
          baseDescription: `promotional portrait of ${selected.name}, ${selected.gender}; ${selected.appearance}`,
          vibe: selected.personality,
          clothing: selected.role ? `styled for ${selected.role} energy` : undefined,
        },
      });
      if (error) throw error;
      if (!data?.success || !data.imageUrl) throw new Error(data?.error || "Image generation failed");
      const id = `mkt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setMarketingRenders((prev) => [...prev, { id, url: data.imageUrl! }]);
      setHeroSource({ type: "render", id });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setMarketingGenBusy(false);
    }
  };

  const copyHeroImage = async () => {
    if (!heroVisual) {
      toast.error("Nothing to copy yet.");
      return;
    }
    try {
      if (heroVisual.startsWith("data:")) {
        const res = await fetch(heroVisual);
        const blob = await res.blob();
        const t = blob.type.startsWith("image/") ? blob.type : "image/png";
        await navigator.clipboard.write([new ClipboardItem({ [t]: blob })]);
        return;
      }
      const res = await fetch(heroVisual);
      const blob = await res.blob();
      const type = blob.type.startsWith("image/") ? blob.type : "image/png";
      await navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
    } catch {
      await copyText(heroVisual);
    }
  };

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
                Roster pulse, <strong className="text-foreground/90">living product atlas</strong>, smart angles,{" "}
                <strong className="text-foreground/90">companion-themed posts</strong> (tone + post shape), optional marketing
                stills, Grok generation + refine chat, and Zernio — wide desktop layout with the X mock-up up front.
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

          <div className="mb-4 space-y-3">
            <MarketingHubTabStrip hubTab={hubTab} onHubTab={setHubTab} />
          </div>

          {hubTab !== "compose" ? (
            <MarketingHubZernioPanels
              hubTab={hubTab}
              onHubTab={setHubTab}
              variations={variations}
              fullTweetText={tweetTextForPost}
              selected={selected}
              composePickVar={composePickVar}
              onComposePickVarChange={setComposePickVar}
              mediaUrlsForZernio={mediaUrlsForZernio}
            />
          ) : null}

          {hubTab === "compose" ? (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 xl:gap-6 2xl:gap-8 items-start w-full">
            {/* LEFT — companion context (sticky scroll on desktop only) */}
            <div className="xl:col-span-6 2xl:col-span-5 min-w-0 space-y-4 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-5rem)] xl:overflow-y-auto xl:overscroll-contain xl:pr-1.5">
              <details
                key={`xhub-pulse-${isMobileLayout}`}
                defaultOpen={!isMobileLayout}
                className="group rounded-2xl border border-white/[0.08] bg-black/40 overflow-hidden [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="cursor-pointer list-none flex items-center justify-between gap-2 px-4 py-3 md:px-5 md:py-4 hover:bg-white/[0.03]">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" style={{ color: NEON }} />
                    Roster pulse
                  </h3>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-4 pb-4 md:px-5 md:pb-5 space-y-4 border-t border-white/[0.06] pt-4">
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
                        <ul className="space-y-1">
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
                      <div className="flex flex-wrap gap-1">
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
              </details>

              <details
                key={`xhub-surfaces-${isMobileLayout}`}
                defaultOpen={!isMobileLayout}
                className="group rounded-2xl border border-white/[0.08] bg-black/40 overflow-hidden [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="cursor-pointer list-none flex items-center justify-between gap-2 px-4 py-3 hover:bg-white/[0.03]">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground text-left">
                    Marketable surfaces · grows with the codebase
                  </h3>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-3 pb-3 border-t border-white/[0.06] pt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[min(70vh,520px)] overflow-y-auto pr-0.5">
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
                            "text-left rounded-xl border p-3 transition-all hover:border-primary/35 cursor-pointer",
                            active ? "border-primary/55 bg-primary/10 ring-1 ring-primary/25" : "border-border/60 bg-black/45",
                          )}
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-[8px] uppercase tracking-widest text-muted-foreground">{s.category}</p>
                            {!s.reviewed ? (
                              <span className="text-[7px] font-bold uppercase tracking-wider px-1 py-0.5 rounded border border-amber-500/50 text-amber-200/90 bg-amber-500/10">
                                Unreviewed
                              </span>
                            ) : null}
                          </div>
                          <p className="font-gothic text-sm text-white mt-0.5 line-clamp-2">{s.label}</p>
                          <p className="text-[10px] text-muted-foreground mt-1.5 line-clamp-2 leading-snug">{s.pitch}</p>
                          <button
                            type="button"
                            className="mt-2 inline-flex items-center gap-1 text-[9px] font-semibold text-primary hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`${siteOrigin}${s.path}`, "_blank", "noopener,noreferrer");
                            }}
                          >
                            Open <ExternalLink className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </details>

              <div
                ref={companionPickRef}
                id="x-marketing-companion-pick"
                className="rounded-2xl border border-border/70 bg-black/40 p-4 md:p-5 space-y-4 scroll-mt-6"
              >
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground flex items-center gap-2">
                    <UserCircle2 className="h-4 w-4 text-primary" style={{ color: NEON }} aria-hidden />
                    Who is this post about?
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-3xl">
                    Pick a <strong className="text-foreground/90">rarity</strong> (or all) to load cards — then{" "}
                    <strong className="text-foreground/90">Use in Tweet</strong>. Catalog + Forge personas.
                  </p>
                </div>
                <div className="flex flex-col xl:flex-row gap-2.5 flex-wrap xl:items-end">
                  <div className="flex flex-col gap-1 min-w-[10rem]">
                    <label className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Rarity</label>
                    <select
                      value={rarityFilter}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "unset") setRarityFilter("unset");
                        else if (v === "all") setRarityFilter("all");
                        else setRarityFilter(v as CompanionRarity);
                      }}
                      className="rounded-xl bg-black/50 border border-border px-2.5 py-2 text-sm text-foreground"
                    >
                      <option value="unset">Choose rarity to browse…</option>
                      <option value="all">All rarities</option>
                      {COMPANION_RARITIES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 min-w-[8rem]">
                    <label className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Sort</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as "newest" | "most_saved" | "name")}
                      className="rounded-xl bg-black/50 border border-border px-2.5 py-2 text-sm text-foreground"
                    >
                      <option value="newest">Newest</option>
                      <option value="most_saved">Most saved</option>
                      <option value="name">Name A–Z</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 flex-1 min-w-[10rem]">
                    <label className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Tags</label>
                    <input
                      value={tagFilter}
                      onChange={(e) => setTagFilter(e.target.value)}
                      list="xhub-tags-v2"
                      className="rounded-xl bg-black/50 border border-border px-2.5 py-2 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-1 min-w-[10rem]">
                    <label className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Kinks</label>
                    <input
                      value={kinkFilter}
                      onChange={(e) => setKinkFilter(e.target.value)}
                      list="xhub-kinks-v2"
                      className="rounded-xl bg-black/50 border border-border px-2.5 py-2 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-[2] min-w-[12rem]">
                    <label className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Search</label>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Name, tagline…"
                      className="rounded-xl bg-black/50 border border-border px-2.5 py-2 text-sm"
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

                {rosterLoading ? (
                  <div className="flex justify-center py-12 text-muted-foreground gap-2 text-sm">
                    <Loader2 className="h-5 w-5 animate-spin" /> Loading roster…
                  </div>
                ) : rarityFilter === "unset" ? (
                  <p className="text-sm text-muted-foreground text-center py-10 px-4 rounded-xl border border-dashed border-border/60 bg-black/30">
                    Choose a <strong className="text-foreground/90">rarity</strong> or <strong className="text-foreground/90">All rarities</strong> above to
                    load cards — keeps this panel scannable.
                  </p>
                ) : filteredCompanions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10 px-4 rounded-xl border border-dashed border-border/60 bg-black/30">
                    No companions match these filters. Clear search, tags, or kinks — or pick another rarity.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3 gap-2.5 sm:gap-3">
                    {filteredCompanions.map((c, idx) => {
                      const img = galleryStaticPortraitUrl(c, c.id);
                      const saves = pinCounts[c.id] ?? 0;
                      return (
                        <motion.div
                          key={c.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(idx * 0.012, 0.2) }}
                          className={cn(
                            "rounded-xl border overflow-visible flex flex-col bg-black/50 backdrop-blur-md p-1.5 max-md:p-1",
                            selected?.id === c.id ? "border-primary/60 ring-1 ring-primary/25" : "border-border/60 hover:border-primary/30",
                          )}
                        >
                          <XMarketingHeroCard
                            companion={c}
                            mediaUrl={img ?? null}
                            pinCount={saves}
                            className="max-h-[min(56vh,520px)]"
                          />
                          <div className="p-2 border-t border-white/[0.06]">
                            <button
                              type="button"
                              onClick={() => useInTweet(c)}
                              className="w-full flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold text-primary-foreground shadow-md border border-primary/35"
                              style={{ background: `linear-gradient(135deg, ${NEON}, hsl(280 45% 38%))` }}
                            >
                              <Zap className="h-3.5 w-3.5 shrink-0" />
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
                                <p className="text-foreground/90 line-clamp-2 mt-1">
                                  {h.variations[0] ? historyTweetText(h.variations[0], h) : "—"}
                                </p>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <button
                                  type="button"
                                  className="px-2 py-1 rounded-lg border border-border text-[10px] font-semibold hover:border-primary/40"
                                  onClick={() => h.variations[0] && void copyText(historyTweetText(h.variations[0], h))}
                                >
                                  Copy
                                </button>
                                <button
                                  type="button"
                                  className="px-2 py-1 rounded-lg border border-primary/40 text-[10px] font-semibold text-primary"
                                  onClick={() => {
                                    setVariations(h.variations);
                                    setStyleSource(h.styleSource ?? null);
                                    setTone(h.tone);
                                    setQuickKind(h.quickKind);
                                    const surf = mergedSurfaces.find((x) => x.id === h.surfaceId);
                                    setSelectedSurface(surf ?? null);
                                    if (h.companionId) {
                                      const row = roster.find((c) => c.id === h.companionId);
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

            {/* RIGHT — compose (preview first, no nested column scroll) */}
            <div ref={workspaceRef} className="xl:col-span-6 2xl:col-span-7 min-w-0 space-y-5">
              <div className="flex flex-wrap gap-2 text-[11px] items-center rounded-2xl border border-white/[0.08] bg-black/35 px-3 py-2.5">
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
                <button
                  type="button"
                  className="text-primary hover:underline ml-auto text-[11px] font-semibold"
                  onClick={() => {
                    setSelected(null);
                    setSelectedSurface(null);
                    setMarketingRenders([]);
                    setHeroSource({ type: "portrait" });
                  }}
                >
                  Reset focus
                </button>
              </div>

              <div className="rounded-2xl border border-primary/35 bg-gradient-to-b from-black/60 via-black/75 to-black/90 p-4 md:p-6 lg:p-7 shadow-[0_0_60px_rgba(255,45,123,0.08)] space-y-5">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary/90">X post mock-up</p>
                    <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
                      Preview and Zernio post bar stay together — pick copy from the variations list below or from the post
                      dropdown.
                    </p>
                  </div>
                  {variations?.length ? (
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Selected variation</p>
                      <p
                        className={cn(
                          "text-lg font-mono font-bold tabular-nums",
                          composePreviewChars > 280
                            ? "text-destructive"
                            : composePreviewChars > 260
                              ? "text-amber-300"
                              : "text-accent",
                        )}
                      >
                        {composePreviewChars} <span className="text-xs font-normal text-muted-foreground">/ 280</span>
                      </p>
                    </div>
                  ) : null}
                </div>
                <MarketingTweetPreview
                  fullText={composePreviewFull}
                  media={composePreviewMedia ?? undefined}
                  imageUrl={composePreviewMedia ? null : heroVisual}
                  charCount={composePreviewChars}
                  mediaBlockedReason={zernioMediaBlockedReason}
                />
                <MarketingHubZernioPanels
                  hubTab="compose"
                  onHubTab={setHubTab}
                  variations={variations}
                  fullTweetText={tweetTextForPost}
                  selected={selected}
                  composePickVar={composePickVar}
                  onComposePickVarChange={setComposePickVar}
                  mediaUrlsForZernio={mediaUrlsForZernio}
                />
              </div>

              <details
                key={`xhub-hero-${isMobileLayout}`}
                defaultOpen={!isMobileLayout}
                className="group rounded-2xl border border-white/[0.08] bg-black/50 overflow-hidden [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="cursor-pointer list-none flex items-center justify-between gap-2 px-4 py-3 bg-black/45 hover:bg-black/55">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Post hero image · portrait tier · marketing still
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t border-white/[0.06] p-4 space-y-4">
                  <div className="flex items-center justify-end gap-2">
                    {heroVisual ? (
                      <button
                        type="button"
                        onClick={() => void copyHeroImage()}
                        className="text-[10px] font-semibold text-primary hover:underline"
                      >
                        Copy hero image
                      </button>
                    ) : null}
                  </div>
                  {framedModeOn && selected && heroVisual ? (
                    <div className="rounded-xl border border-white/[0.08] bg-black/40 px-3 py-3 space-y-2 text-xs">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Framed card for X (Zernio media)
                      </p>
                      {preferLoopForX ? (
                        <>
                          <p className="text-muted-foreground leading-relaxed">
                            Bakes one loop of the selfie MP4 into a public WebM with the same rim and footer as the mockup, then
                            Zernio attaches that URL.
                          </p>
                          <button
                            type="button"
                            disabled={framedBakeBusy}
                            onClick={() => void bakeFramedLoopForX()}
                            className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/15 px-3 py-2 text-[11px] font-bold text-primary disabled:opacity-50"
                          >
                            {framedBakeBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                            Bake framed video for X
                          </button>
                        </>
                      ) : (
                        <p className="text-muted-foreground leading-relaxed">
                          {framedStillPrepBusy
                            ? "Preparing framed PNG for Zernio…"
                            : framedDeliverKey === framedBakeFingerprint
                              ? "Framed still is ready — Zernio will attach the uploaded PNG."
                              : "Framed still uploads automatically when the hero is an image (public URL)."}
                        </p>
                      )}
                      {framedDeliverUrl && framedDeliverKey === framedBakeFingerprint ? (
                        <p className="text-[10px] text-emerald-300/90 break-all">
                          Zernio URL: {framedDeliverUrl.length > 140 ? `${framedDeliverUrl.slice(0, 140)}…` : framedDeliverUrl}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="aspect-[16/9] max-h-48 w-full bg-black/70 relative rounded-xl overflow-hidden flex items-center justify-center p-2">
                    {heroVisual && selected ? (
                      <div className="h-full w-full flex items-center justify-center overflow-hidden">
                        <div className="h-full max-h-full w-auto max-w-full aspect-[2/3] shrink-0">
                          <XMarketingHeroCard
                            companion={selected}
                            mediaUrl={heroVisual}
                            loopVideoUrl={preferLoopForX ? loopVideoPublicUrl : null}
                            pinCount={pinCounts[selected.id] ?? 0}
                            className="h-full max-h-full"
                            aspectClassName="aspect-[2/3] h-full max-h-full w-auto mx-auto"
                          />
                        </div>
                      </div>
                    ) : heroVisual ? (
                      isVideoPortraitUrl(heroVisual) ? (
                        <video
                          src={heroVisual}
                          className="absolute inset-0 h-full w-full object-contain object-top bg-black"
                          autoPlay
                          muted
                          loop
                          playsInline
                        />
                      ) : (
                        <img src={heroVisual} alt="" className="absolute inset-0 h-full w-full object-contain object-top bg-black" />
                      )
                    ) : (
                      <div className="text-center px-4 py-8">
                        <ImageIcon className="h-9 w-9 mx-auto text-muted-foreground mb-2 opacity-60" />
                        <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
                          Use <strong className="text-foreground/85">Use in Tweet</strong> on a card, then choose{" "}
                          <strong className="text-foreground/85">Profile portrait</strong> or generate a{" "}
                          <strong className="text-foreground/85">marketing still</strong>. Public URLs attach through Zernio.
                        </p>
                        <button
                          type="button"
                          onClick={() => companionPickRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                          className="mt-3 text-[11px] font-semibold text-primary hover:underline"
                        >
                          Jump to companion picker
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Which image goes with the post
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selected ? (
                        <button
                          type="button"
                          onClick={() => setHeroSource({ type: "portrait" })}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[10px] font-semibold transition-colors",
                            heroSource.type === "portrait"
                              ? "border-primary/50 bg-primary/15 text-primary"
                              : "border-border/60 bg-black/40 text-muted-foreground hover:border-primary/30",
                          )}
                        >
                          <UserCircle2 className="h-3.5 w-3.5" />
                          Profile portrait
                        </button>
                      ) : null}
                      {marketingRenders.map((r, idx) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setHeroSource({ type: "render", id: r.id })}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[10px] font-semibold transition-colors",
                            heroSource.type === "render" && heroSource.id === r.id
                              ? "border-velvet-purple/50 bg-velvet-purple/15 text-accent"
                              : "border-border/60 bg-black/40 text-muted-foreground hover:border-primary/30",
                          )}
                        >
                          <ImagePlus className="h-3.5 w-3.5" />
                          Render {idx + 1}
                        </button>
                      ))}
                    </div>

                    {selected ? (
                      <div className="space-y-1.5 rounded-xl border border-white/[0.06] bg-black/35 px-3 py-2.5">
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                          Portrait heat (X hero when Profile portrait is selected)
                        </label>
                        <select
                          value={portraitTierForX}
                          onChange={(e) => {
                            const v = e.target.value as XMarketingPortraitTier;
                            setPortraitTierForX(v);
                            savePortraitTierForCompanion(selected.id, v);
                          }}
                          className="w-full max-w-md rounded-xl bg-black/60 border border-border px-3 py-2 text-sm text-foreground"
                        >
                          {X_MARKETING_PORTRAIT_TIERS.map((t) => (
                            <option key={t.id} value={t.id} title={t.hint}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-[9px] text-muted-foreground leading-snug">
                          {X_MARKETING_PORTRAIT_TIERS.find((x) => x.id === portraitTierForX)?.hint}
                        </p>
                        {heroSource.type !== "portrait" ? (
                          <p className="text-[9px] text-amber-200/85 border border-amber-500/25 rounded-lg px-2 py-1 bg-amber-500/5">
                            Tier affects the catalog/generated portrait when you switch back to{" "}
                            <strong className="text-foreground/90">Profile portrait</strong>. Generate & Grok use this tier now.
                          </p>
                        ) : null}
                        {portraitHeroFromTier.usedFallback && portraitTierForX !== "selfie" && heroSource.type === "portrait" ? (
                          <p className="text-[9px] text-amber-200/90 border border-amber-500/30 rounded-lg px-2 py-1.5 bg-amber-500/10">
                            No generated image matched this tier’s keywords yet — showing catalog portrait. Add chat gens or
                            marketing stills for this companion, or pick Lewd/Nude after prompts contain those themes.
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      {selected ? (
                        <button
                          type="button"
                          onClick={() => void copyImage(selected)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-foreground"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          Copy catalog portrait
                        </button>
                      ) : null}
                    </div>

                    {selected ? (
                      <div className="rounded-xl border border-primary/20 bg-primary/[0.06] p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                            New marketing still — {selected.name}
                          </p>
                          <span className="text-[10px] text-muted-foreground">
                            {isAdminSession ? "Admin · credits waived" : `${MARKETING_IMAGE_TOKEN_COST} credits each`}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-snug">
                          Generates a fresh SFW promo image themed to this companion (same pipeline as chat images). Describe a
                          scene or tap a preset, then generate. Latest render is selected as hero automatically.
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {SCENE_PRESETS.map((p) => (
                            <button
                              key={p.label}
                              type="button"
                              onClick={() => setMarketingScene(p.text)}
                              className="text-[9px] px-2 py-0.5 rounded-lg border border-border/60 bg-black/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={marketingScene}
                          onChange={(e) => setMarketingScene(e.target.value)}
                          rows={2}
                          placeholder="Optional scene: lighting, setting, mood — or use a preset above."
                          className="w-full rounded-lg bg-black/50 border border-border/70 px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground resize-y min-h-[52px]"
                        />
                        <button
                          type="button"
                          disabled={marketingGenBusy}
                          onClick={() => void generateMarketingStill()}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-gradient-to-r from-primary/20 to-purple-900/30 py-2.5 text-xs font-bold text-primary disabled:opacity-50"
                        >
                          {marketingGenBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                          Generate marketing still
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </details>

              <details
                key={`xhub-angles-${isMobileLayout}`}
                defaultOpen={!isMobileLayout}
                className="group rounded-xl border border-border/60 bg-black/35 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="cursor-pointer list-none flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-white/[0.03]">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Smart angles ({smartAngles.length})
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-3 pb-3 border-t border-border/40">
                  <div className="flex flex-wrap gap-2 pt-3">
                    {smartAngles.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => applyAngle(a.prompt)}
                        className="text-left text-[11px] px-2.5 py-1.5 rounded-xl border border-border/70 bg-white/[0.03] hover:border-primary/40 text-foreground/90 max-w-[20rem] lg:max-w-[24rem]"
                        title={a.prompt}
                      >
                        <span className="font-semibold text-primary/90">{a.label}</span>
                        <span className="block text-muted-foreground line-clamp-2 mt-0.5">{a.prompt}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </details>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Post shape</label>
                  <select
                    value={tweetPostStyle}
                    onChange={(e) => setTweetPostStyle(e.target.value)}
                    title={POST_STYLES.find((p) => p.label === tweetPostStyle)?.hint}
                    className="mt-1 w-full rounded-xl bg-black/60 border border-border px-3 py-2 text-sm text-foreground"
                  >
                    {POST_STYLES.map((p) => (
                      <option key={p.id} value={p.label}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[9px] text-muted-foreground mt-1 leading-tight">
                    {POST_STYLES.find((p) => p.label === tweetPostStyle)?.hint}
                  </p>
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Quick campaigns</label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {QUICK_ACTIONS.map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => {
                          setQuickKind(q.kind);
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

              {styleSource ? (
                <details className="group rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-950/40 to-black/50 open:shadow-[0_0_24px_rgba(139,92,246,0.12)]">
                  <summary className="cursor-pointer list-none flex flex-wrap items-center gap-2 px-3 py-2.5 text-left [&::-webkit-details-marker]:hidden">
                    <ScanLine className="h-4 w-4 shrink-0 text-violet-300" aria-hidden />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-violet-200/90">Style source</span>
                    <span className="text-[11px] text-foreground/85 min-w-0 flex-1 line-clamp-2">{styleSource.summaryLine}</span>
                    {styleSourceStale ? (
                      <span className="shrink-0 rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-100">
                        Stale
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                        styleSource.styleLock === "gothic_ok"
                          ? "border-fuchsia-400/35 bg-fuchsia-500/15 text-fuchsia-100"
                          : "border-emerald-400/35 bg-emerald-500/12 text-emerald-100",
                      )}
                    >
                      {styleSource.styleLock === "gothic_ok" ? "Gothic OK" : "Profile-first"}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="px-3 pb-3 pt-0 space-y-2 border-t border-white/[0.06]">
                    {styleSourceStale ? (
                      <p className="text-[11px] text-amber-100/95 leading-snug pt-3 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2">
                        <strong className="text-amber-50">Out of date vs your picker.</strong> This snapshot matches{" "}
                        {styleSource.companionName ? (
                          <span className="font-semibold">{styleSource.companionName}</span>
                        ) : (
                          "another context"
                        )}
                        , not the companion selected now. Generate again or <strong className="text-foreground">Load</strong> from
                        history after choosing the right card.
                      </p>
                    ) : null}
                    <p className="text-[10px] text-muted-foreground leading-relaxed pt-2">{styleSource.styleLockHint}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {styleSource.chips.map((chip, idx) => (
                        <span
                          key={`${chip.label}-${idx}`}
                          className="inline-flex max-w-full items-start gap-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[10px] leading-snug"
                          title={`${chip.label}: ${chip.value}`}
                        >
                          <span className="shrink-0 font-semibold text-violet-200/90">{chip.label}</span>
                          <span className="text-foreground/80 break-words">{chip.value}</span>
                        </span>
                      ))}
                    </div>
                    <p className="text-[9px] text-muted-foreground/70 tabular-nums">
                      Snapshot · {new Date(styleSource.generatedAt).toLocaleString()}
                      {styleSource.companionId ? (
                        <>
                          {" · "}
                          <span className="font-mono text-[9px]">{styleSource.companionId}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                </details>
              ) : null}

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
                      const full = tweetTextForPost(v);
                      const count = full.length;
                      return (
                        <div
                          key={i}
                          role="button"
                          tabIndex={0}
                          onClick={() => setComposePickVar(i)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setComposePickVar(i);
                            }
                          }}
                          className={cn(
                            "rounded-xl border bg-black/45 p-3 space-y-2 text-left w-full cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                            composePickVar === i
                              ? "border-primary/55 ring-1 ring-primary/20"
                              : "border-border/60 hover:border-border",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] uppercase tracking-widest text-primary font-bold">
                              #{i + 1}
                              {composePickVar === i ? (
                                <span className="ml-2 text-[9px] font-semibold text-accent normal-case">· for X</span>
                              ) : null}
                            </span>
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
                            onClick={(e) => {
                              e.stopPropagation();
                              void copyText(full);
                            }}
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

              <details className="group rounded-2xl border border-violet-500/25 bg-violet-950/20 overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-2 px-4 py-3 hover:bg-violet-950/35">
                  <span className="flex items-center gap-2 text-sm font-bold text-white">
                    <MessageSquare className="h-4 w-4 text-violet-300" />
                    Grok · refine copy
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-4 pb-4 border-t border-white/[0.06] space-y-3">
                  <p className="text-[11px] text-muted-foreground leading-snug pt-3">
                    Optional side chat — punch up hooks, thread outlines, or tone. Context follows companion, surface, prompt, and
                    last generation.
                  </p>
                  <div className="max-h-56 overflow-y-auto space-y-2 rounded-xl border border-white/[0.06] bg-black/40 p-3 text-xs">
                    {chatMessages.length === 0 ? (
                      <p className="text-muted-foreground italic">Open and start a conversation…</p>
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
                    }}
                    className="text-[10px] text-muted-foreground hover:text-white underline"
                  >
                    Clear chat
                  </button>
                </div>
              </details>
            </div>
          </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
