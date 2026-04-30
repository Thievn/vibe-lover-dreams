import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  Download,
  Flame,
  LayoutDashboard,
  Loader2,
  Palette,
  ScrollText,
  Settings2,
  Shield,
  Sparkles,
  Trash2,
  UserCog,
  Users,
  Coins,
  RefreshCw,
  ChevronRight,
  Orbit,
  Megaphone,
  CalendarClock,
  MessageCircle,
  ShoppingBag,
  Trophy,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ParticleBackground from "@/components/ParticleBackground";
import CompanionCreator, { type CompanionCreatorHandle } from "@/components/CompanionCreator";
import { AdminForgeSchedulePanel } from "@/components/admin/AdminForgeSchedulePanel";
import { AdminCelebrityParodyPanel } from "@/components/admin/AdminCelebrityParodyPanel";
import CompanionManager from "@/components/admin/CompanionManager";
import AdminForgeAssistant from "@/components/admin/AdminForgeAssistant";
import XMarketingHub from "@/components/admin/XMarketingHub";
import AdminTheNexus from "@/components/AdminTheNexus";
import { getGaMeasurementId } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { isPlatformAdmin, platformAdminEmailDisplay } from "@/config/auth";
import { getEdgeFunctionInvokeMessage } from "@/lib/edgeFunction";
const NEON = "#FF2D7B";

const adminQueryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60 * 1000 } },
});

type AdminSection =
  | "overview"
  | "creator"
  | "nexus"
  | "characters"
  | "xmarketing"
  | "weeklydrops"
  | "users"
  | "waitlist"
  | "analytics"
  | "cardstats"
  | "settings";

const ADMIN_SECTION_IDS = new Set<AdminSection>([
  "overview",
  "creator",
  "nexus",
  "characters",
  "xmarketing",
  "weeklydrops",
  "users",
  "waitlist",
  "analytics",
  "cardstats",
  "settings",
]);

function parseAdminSectionParam(raw: string | null): AdminSection | null {
  if (!raw) return null;
  const s = raw as AdminSection;
  return ADMIN_SECTION_IDS.has(s) ? s : null;
}

const NAV: { id: AdminSection; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "creator", label: "Companion Forge", icon: Sparkles },
  { id: "nexus", label: "The Nexus", icon: Orbit },
  { id: "characters", label: "Character Management", icon: Palette },
  { id: "xmarketing", label: "X Marketing Hub", icon: Megaphone },
  { id: "weeklydrops", label: "Weekly Drops", icon: CalendarClock },
  { id: "users", label: "User Management", icon: Users },
  { id: "waitlist", label: "Waitlist", icon: ScrollText },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "cardstats", label: "Card Stats", icon: Trophy },
  { id: "settings", label: "Settings", icon: Settings2 },
];

interface ProfileRow {
  id: string;
  user_id: string;
  display_name: string | null;
  tokens_balance: number;
  tier: string;
  stripe_customer_id: string | null;
  device_uid: string | null;
  created_at: string;
}

interface WaitlistRow {
  id: string;
  email: string;
  created_at: string;
}

interface StatsShape {
  totalUsers: number;
  waitlistSignups: number;
  totalCompanions: number;
  imagesGenerated: number;
  companionsCreatedCustom: number;
  revenueMrr: number;
  toysLinked: number;
}

type WeeklyDropRow = {
  id: string;
  posted_at: string;
  companion_id: string;
  companion_name: string;
  rarity: string | null;
  landing_url: string;
  x_post_url: string | null;
  total_clicks: number;
};

type TrendPoint = {
  dateKey: string;
  name: string;
  sessions: number;
  signups: number;
  images: number;
  forged: number;
};

type CardStatsRow = {
  companionId: string;
  name: string;
  rarity: string | null;
  tagline: string;
  purchases: number;
  uniqueBuyers: number;
  uses: number;
  uniqueUsers: number;
  lastPurchaseAt: string | null;
  lastUsedAt: string | null;
};

type CardStatsRange = "7d" | "30d" | "all";

const chartTooltipStyle = {
  backgroundColor: "hsl(240 15% 8%)",
  border: "1px solid hsl(280 30% 25%)",
  borderRadius: "12px",
  fontSize: "12px",
};

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function labelFromDayKey(k: string): string {
  const d = new Date(`${k}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function AdminShell() {
  const forgeRef = useRef<CompanionCreatorHandle>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [authLoading, setAuthLoading] = useState(true);
  const [section, setSection] = useState<AdminSection>(() => parseAdminSectionParam(searchParams.get("section")) ?? "overview");
  const [stats, setStats] = useState({
    totalUsers: 0,
    waitlistSignups: 0,
    totalCompanions: 0,
    imagesGenerated: 0,
    companionsCreatedCustom: 0,
    revenueMrr: 0,
    toysLinked: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([]);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ProfileRow | null>(null);
  const [grantAmount, setGrantAmount] = useState("500");
  const [grantLoading, setGrantLoading] = useState(false);
  const [userChars, setUserChars] = useState<{ id: string; name: string }[]>([]);
  const [charsLoading, setCharsLoading] = useState(false);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [barData, setBarData] = useState<{ name: string; value: number }[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [cardStatsRows, setCardStatsRows] = useState<CardStatsRow[]>([]);
  const [cardStatsLoading, setCardStatsLoading] = useState(false);
  const [cardStatsRange, setCardStatsRange] = useState<CardStatsRange>("30d");
  const [overviewDataIssues, setOverviewDataIssues] = useState<string | null>(null);
  const [weeklyDrops, setWeeklyDrops] = useState<WeeklyDropRow[]>([]);
  const [weeklyDropsLoading, setWeeklyDropsLoading] = useState(false);
  const [weeklySettingsSaving, setWeeklySettingsSaving] = useState(false);
  const [weeklyTickLoading, setWeeklyTickLoading] = useState(false);
  const [weeklySettings, setWeeklySettings] = useState({
    enabled: false,
    dropsPerWeek: 2,
    intervalDays: 3,
    sourceMode: "mixed" as "mixed" | "catalog_only" | "forge_only",
    lastRunAt: null as string | null,
  });

  const gaMeasurementId = getGaMeasurementId();

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setOverviewDataIssues(null);
    const failed: string[] = [];
    try {
      const [
        profilesCountRes,
        stockRes,
        customRes,
        imgRes,
        wlRes,
        payingRes,
        toysRes,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("companions").select("id", { count: "exact", head: true }),
        supabase.from("custom_characters").select("id", { count: "exact", head: true }),
        supabase.from("generated_images").select("id", { count: "exact", head: true }),
        supabase.from("waitlist").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id").not("stripe_customer_id", "is", null),
        supabase.from("profiles").select("id").not("device_uid", "is", null),
      ]);

      const note = (label: string, res: { error: { message: string } | null }) => {
        if (res.error) failed.push(`${label}: ${res.error.message}`);
      };
      note("Profiles (count)", profilesCountRes);
      note("Companions (count)", stockRes);
      note("Custom forges (count)", customRes);
      note("Generated images (count)", imgRes);
      note("Waitlist (count)", wlRes);
      note("Profiles (paying list)", payingRes);
      note("Profiles (toys list)", toysRes);

      const totalUsers = profilesCountRes.error ? 0 : (profilesCountRes.count ?? 0);
      const totalCompanions = stockRes.error ? 0 : (stockRes.count ?? 0);
      const customCount = customRes.error ? 0 : (customRes.count ?? 0);
      const imagesGenerated = imgRes.error ? 0 : (imgRes.count ?? 0);
      const waitlistSignups = wlRes.error ? 0 : (wlRes.count ?? 0);

      setStats({
        totalUsers,
        waitlistSignups,
        totalCompanions,
        imagesGenerated,
        companionsCreatedCustom: customCount,
        revenueMrr: (payingRes.error ? 0 : payingRes.data?.length ?? 0) * 19.99,
        toysLinked: toysRes.error ? 0 : toysRes.data?.length ?? 0,
      });

      if (failed.length) {
        const hint =
          failed.join(" · ") +
          " — Run the latest Supabase migration (admin overview RLS). Your account also needs `admin` in `user_roles` for cross-table counts.";
        setOverviewDataIssues(hint);
        toast.error("Some overview metrics could not load. See the banner on Overview.");
      }
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      setOverviewDataIssues(msg);
      toast.error("Overview metrics failed (check RLS / tables).");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const days = 14;
      const start = new Date();
      start.setUTCHours(0, 0, 0, 0);
      start.setUTCDate(start.getUTCDate() - (days - 1));
      const fromIso = start.toISOString();

      const [profilesRes, waitlistRes, imagesRes, customRes, chatsRes] = await Promise.all([
        supabase.from("profiles").select("created_at").gte("created_at", fromIso),
        supabase.from("waitlist").select("created_at").gte("created_at", fromIso),
        supabase.from("generated_images").select("created_at").gte("created_at", fromIso),
        supabase.from("custom_characters").select("created_at").gte("created_at", fromIso),
        supabase.from("chat_messages").select("created_at").gte("created_at", fromIso),
      ]);

      const telemetryErrors = [
        profilesRes.error && `profiles: ${profilesRes.error.message}`,
        waitlistRes.error && `waitlist: ${waitlistRes.error.message}`,
        imagesRes.error && `generated_images: ${imagesRes.error.message}`,
        customRes.error && `custom_characters: ${customRes.error.message}`,
        chatsRes.error && `chat_messages: ${chatsRes.error.message}`,
      ].filter(Boolean) as string[];
      if (telemetryErrors.length) {
        console.warn("[admin analytics]", telemetryErrors.join(" | "));
        toast.error("Analytics charts are missing some series (RLS or migration). Check console.");
      }

      const timeline: TrendPoint[] = Array.from({ length: days }, (_, i) => {
        const d = new Date(start);
        d.setUTCDate(start.getUTCDate() + i);
        const key = dayKey(d);
        return {
          dateKey: key,
          name: labelFromDayKey(key),
          sessions: 0,
          signups: 0,
          images: 0,
          forged: 0,
        };
      });

      const indexByKey = new Map(timeline.map((p, i) => [p.dateKey, i]));

      const addCount = (rows: { created_at: string }[] | null, target: keyof TrendPoint) => {
        (rows || []).forEach((r) => {
          const key = (r.created_at || "").slice(0, 10);
          const idx = indexByKey.get(key);
          if (idx == null) return;
          const prev = timeline[idx]!;
          timeline[idx] = { ...prev, [target]: Number(prev[target]) + 1 } as TrendPoint;
        });
      };

      addCount(profilesRes.data as { created_at: string }[] | null, "signups");
      addCount(waitlistRes.data as { created_at: string }[] | null, "signups");
      addCount(imagesRes.data as { created_at: string }[] | null, "images");
      addCount(customRes.data as { created_at: string }[] | null, "forged");
      addCount(chatsRes.data as { created_at: string }[] | null, "sessions");

      const sum = (k: keyof TrendPoint) => timeline.reduce((acc, row) => acc + Number(row[k]), 0);

      setTrendData(timeline);
      setBarData([
        { name: "Chats", value: Math.max(0, sum("sessions")) },
        { name: "Signups", value: Math.max(0, sum("signups")) },
        { name: "Images", value: Math.max(0, sum("images")) },
        { name: "Forged", value: Math.max(0, sum("forged")) },
      ]);
    } catch (e) {
      console.error(e);
      toast.error("Analytics charts failed to load from telemetry tables.");
      setTrendData([]);
      setBarData([]);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const loadProfiles = useCallback(async () => {
    setProfilesLoading(true);
    try {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setProfiles((data || []) as ProfileRow[]);
    } catch (e: unknown) {
      console.error(e);
      toast.error("Could not load profiles — admin SELECT policy may be missing.");
      setProfiles([]);
    } finally {
      setProfilesLoading(false);
    }
  }, []);

  const loadCardStats = useCallback(async (range: CardStatsRange) => {
    setCardStatsLoading(true);
    try {
      const startIso =
        range === "all"
          ? null
          : (() => {
              const d = new Date();
              const days = range === "7d" ? 7 : 30;
              d.setUTCDate(d.getUTCDate() - (days - 1));
              d.setUTCHours(0, 0, 0, 0);
              return d.toISOString();
            })();

      const txQuery = supabase
        .from("user_transactions")
        .select("user_id, created_at, metadata, transaction_type")
        .eq("transaction_type", "card_purchase");
      const useQuery = supabase.from("chat_messages").select("user_id, created_at, companion_id");

      const [txRes, useRes, stockRes, customRes] = await Promise.all([
        startIso ? txQuery.gte("created_at", startIso) : txQuery,
        startIso ? useQuery.gte("created_at", startIso) : useQuery,
        supabase.from("companions").select("id, name, tagline, rarity"),
        supabase.from("custom_characters").select("id, name, tagline, rarity"),
      ]);

      if (txRes.error) throw txRes.error;
      if (useRes.error) throw useRes.error;
      if (stockRes.error) throw stockRes.error;
      if (customRes.error) throw customRes.error;

      const metaById = new Map<
        string,
        { name: string; tagline: string; rarity: string | null }
      >();
      for (const row of stockRes.data ?? []) {
        metaById.set(row.id, {
          name: row.name ?? row.id,
          tagline: row.tagline ?? "",
          rarity: row.rarity ?? null,
        });
      }
      for (const row of customRes.data ?? []) {
        const key = `cc-${row.id}`;
        metaById.set(key, {
          name: row.name ?? key,
          tagline: row.tagline ?? "",
          rarity: row.rarity ?? null,
        });
      }

      const agg = new Map<
        string,
        {
          purchases: number;
          uniqueBuyers: Set<string>;
          uses: number;
          uniqueUsers: Set<string>;
          lastPurchaseAt: string | null;
          lastUsedAt: string | null;
        }
      >();
      const get = (id: string) => {
        const current = agg.get(id);
        if (current) return current;
        const created = {
          purchases: 0,
          uniqueBuyers: new Set<string>(),
          uses: 0,
          uniqueUsers: new Set<string>(),
          lastPurchaseAt: null as string | null,
          lastUsedAt: null as string | null,
        };
        agg.set(id, created);
        return created;
      };

      for (const row of txRes.data ?? []) {
        const md = row.metadata as Record<string, unknown> | null;
        const companionId = typeof md?.companion_id === "string" ? md.companion_id : null;
        if (!companionId) continue;
        const bucket = get(companionId);
        bucket.purchases += 1;
        bucket.uniqueBuyers.add(row.user_id);
        if (!bucket.lastPurchaseAt || row.created_at > bucket.lastPurchaseAt) bucket.lastPurchaseAt = row.created_at;
      }

      for (const row of useRes.data ?? []) {
        if (!row.companion_id) continue;
        const bucket = get(row.companion_id);
        bucket.uses += 1;
        bucket.uniqueUsers.add(row.user_id);
        if (!bucket.lastUsedAt || row.created_at > bucket.lastUsedAt) bucket.lastUsedAt = row.created_at;
      }

      const rows: CardStatsRow[] = [...agg.entries()]
        .map(([companionId, a]) => {
          const m = metaById.get(companionId);
          return {
            companionId,
            name: m?.name || companionId,
            rarity: m?.rarity ?? null,
            tagline: m?.tagline ?? "",
            purchases: a.purchases,
            uniqueBuyers: a.uniqueBuyers.size,
            uses: a.uses,
            uniqueUsers: a.uniqueUsers.size,
            lastPurchaseAt: a.lastPurchaseAt,
            lastUsedAt: a.lastUsedAt,
          };
        })
        .sort((a, b) => b.purchases - a.purchases || b.uses - a.uses || a.name.localeCompare(b.name));

      setCardStatsRows(rows);
    } catch (e) {
      console.error(e);
      toast.error("Could not load card stats.");
      setCardStatsRows([]);
    } finally {
      setCardStatsLoading(false);
    }
  }, []);

  const loadWaitlist = useCallback(async () => {
    setWaitlistLoading(true);
    setWaitlistError(null);
    try {
      const { data, error } = await supabase.from("waitlist").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setWaitlist((data || []) as WaitlistRow[]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load waitlist";
      setWaitlistError(msg);
      setWaitlist([]);
    } finally {
      setWaitlistLoading(false);
    }
  }, []);

  const loadWeeklyDrops = useCallback(async () => {
    setWeeklyDropsLoading(true);
    try {
      const [{ data: settingsData, error: settingsErr }, { data: rowsData, error: rowsErr }] = await Promise.all([
        supabase.functions.invoke("zernio-social", { body: { mode: "settings_get" } }),
        supabase.functions.invoke("zernio-social", { body: { mode: "weekly_drop_stats" } }),
      ]);
      if (settingsErr) throw new Error(await getEdgeFunctionInvokeMessage(settingsErr, settingsData));
      if (rowsErr) throw new Error(await getEdgeFunctionInvokeMessage(rowsErr, rowsData));
      const s = (settingsData as { settings?: Record<string, unknown> } | null)?.settings ?? {};
      setWeeklySettings({
        enabled: Boolean(s.weekly_drop_enabled),
        dropsPerWeek: Number(s.weekly_drops_per_week ?? 2),
        intervalDays: Number(s.weekly_drop_interval_days ?? 3),
        sourceMode:
          s.weekly_drop_source_mode === "catalog_only" || s.weekly_drop_source_mode === "forge_only"
            ? (s.weekly_drop_source_mode as "catalog_only" | "forge_only")
            : "mixed",
        lastRunAt: typeof s.weekly_drop_last_run_at === "string" ? s.weekly_drop_last_run_at : null,
      });
      const rows = ((rowsData as { rows?: WeeklyDropRow[] } | null)?.rows ?? []).map((r) => ({
        ...r,
        total_clicks: Number(r.total_clicks ?? 0),
      }));
      setWeeklyDrops(rows);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Could not load weekly drops.");
      setWeeklyDrops([]);
    } finally {
      setWeeklyDropsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth", { replace: true });
        return;
      }
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!isPlatformAdmin(session.user, { profileDisplayName: prof?.display_name ?? null })) {
        toast.error("Access denied. Admin only.");
        navigate("/dashboard", { replace: true });
        return;
      }
      if (!cancelled) setAuthLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (authLoading) return;
    void loadStats();
    void loadAnalytics();
    void loadWaitlist();
  }, [authLoading, loadStats, loadAnalytics, loadWaitlist]);

  useEffect(() => {
    const parsed = parseAdminSectionParam(searchParams.get("section"));
    setSection(parsed ?? "overview");
  }, [searchParams]);

  const goSection = useCallback(
    (next: AdminSection) => {
      setSection(next);
      if (next === "overview") setSearchParams({}, { replace: true });
      else setSearchParams({ section: next }, { replace: true });
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (authLoading) return;
    if (section === "users") void loadProfiles();
    if (section === "waitlist") void loadWaitlist();
    if (section === "weeklydrops") void loadWeeklyDrops();
    if (section === "cardstats") void loadCardStats(cardStatsRange);
  }, [authLoading, section, loadProfiles, loadWaitlist, loadWeeklyDrops, loadCardStats, cardStatsRange]);

  const openUserPanel = async (p: ProfileRow) => {
    setSelectedUser(p);
    setCharsLoading(true);
    setUserChars([]);
    try {
      const { data, error } = await supabase
        .from("custom_characters")
        .select("id, name")
        .eq("user_id", p.user_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setUserChars((data || []) as { id: string; name: string }[]);
    } catch {
      toast.error("Could not load user's custom characters.");
    } finally {
      setCharsLoading(false);
    }
  };

  const grantTokens = async () => {
    if (!selectedUser) return;
    const n = parseInt(grantAmount, 10);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Enter a positive number.");
      return;
    }
    setGrantLoading(true);
    try {
      const next = selectedUser.tokens_balance + n;
      const { error } = await supabase
        .from("profiles")
        .update({ tokens_balance: next })
        .eq("user_id", selectedUser.user_id);
      if (error) throw error;
      setSelectedUser({ ...selectedUser, tokens_balance: next });
      setProfiles((prev) =>
        prev.map((r) => (r.user_id === selectedUser.user_id ? { ...r, tokens_balance: next } : r)),
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Update failed";
      toast.error(msg + " — add an admin UPDATE policy on profiles if needed.");
    } finally {
      setGrantLoading(false);
    }
  };

  const removeWaitlistEntry = async (id: string) => {
    const { error } = await supabase.from("waitlist").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setWaitlist((w) => w.filter((x) => x.id !== id));
    void loadStats();
  };

  const exportCsv = (rows: Record<string, string | number | null>[], filename: string) => {
    if (!rows.length) {
      toast.error("Nothing to export.");
      return;
    }
    const keys = Object.keys(rows[0]!);
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-sans">
        <Loader2 className="h-10 w-10 animate-spin text-primary" style={{ color: NEON }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans relative overflow-hidden flex">
      <ParticleBackground />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-transparent to-accent/[0.05] pointer-events-none" />
      <div
        className="absolute top-20 right-0 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none opacity-30"
        style={{ background: `radial-gradient(circle, ${NEON}44, transparent 70%)` }}
      />

      {/* Sidebar */}
      <aside className="relative z-20 hidden lg:flex w-[280px] shrink-0 flex-col border-r border-border/80 bg-black/55 backdrop-blur-xl">
        <div className="p-6 border-b border-border/60">
          <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-primary text-xs mb-4 transition-colors">
            <ChevronRight className="h-3 w-3 rotate-180" />
            Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 border border-primary/30">
              <Shield className="h-7 w-7" style={{ color: NEON }} />
            </div>
            <div>
              <h1 className="font-gothic text-xl tracking-wide gradient-vice-text leading-tight">Command</h1>
              <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">Admin</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => goSection(id)}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-all border",
                section === id
                  ? "border-primary/40 bg-primary/10 text-primary shadow-[0_0_24px_rgba(255,45,123,0.12)]"
                  : "border-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border/60 text-[10px] text-muted-foreground uppercase tracking-widest">
          LustForge AI · {platformAdminEmailDisplay()}
        </div>
      </aside>

      {/* Main */}
      <main className="relative z-10 flex-1 overflow-y-auto min-h-screen lg:min-h-0">
        <div
          className="lg:hidden sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-border/60 px-2 py-2 flex items-center gap-2"
          style={{ paddingTop: "max(0.35rem, env(safe-area-inset-top))" }}
        >
          <Link
            to="/dashboard"
            className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-black/50 text-muted-foreground hover:text-foreground hover:border-primary/35 transition-colors touch-manipulation"
            aria-label="Back to dashboard"
          >
            <ChevronRight className="h-5 w-5 rotate-180" />
          </Link>
          <div className="flex gap-1 overflow-x-auto flex-1 min-w-0 pb-0.5 [-webkit-overflow-scrolling:touch]">
            {NAV.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => goSection(id)}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap",
                  section === id ? "bg-primary/20 text-primary" : "text-muted-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto max-w-[1400px] p-4 pb-24 md:p-8">
          {section === "overview" && (
            <OverviewSection
              stats={stats}
              statsLoading={statsLoading}
              analyticsLoading={analyticsLoading}
              dataIssuesBanner={overviewDataIssues}
              onRefresh={() => {
                void loadStats();
                void loadAnalytics();
                void loadWaitlist();
              }}
              trendData={trendData}
              barData={barData}
              waitlistPreview={waitlist}
              waitlistLoading={waitlistLoading}
              waitlistError={waitlistError}
              onOpenWaitlist={() => goSection("waitlist")}
            />
          )}
          {section === "creator" && (
            <div className="relative flex min-h-0 flex-col overflow-hidden rounded-[1.75rem] border border-white/[0.09] bg-[#050508] font-sans text-foreground shadow-[0_0_60px_rgba(255,45,123,0.12),inset_0_1px_0_rgba(255,255,255,0.05)]">
              <ParticleBackground contain />
              <div
                className="pointer-events-none absolute inset-0 z-[1]"
                style={{
                  background: `linear-gradient(180deg, ${NEON}0d 0%, transparent 35%, hsl(280 40% 8% / 0.4) 100%)`,
                }}
              />
              <div className="relative z-10 flex min-h-0 flex-col">
                <div className="flex shrink-0 flex-col gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between md:px-8">
                  <h2 className="font-gothic text-2xl tracking-wide text-white gradient-vice-text">Companion Forge</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => goSection("characters")}
                      className="rounded-lg border border-white/15 bg-black/35 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/35 hover:text-white"
                    >
                      Character management
                    </button>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground/90">
                      Admin · no token cost
                    </span>
                  </div>
                </div>
                <div className="flex min-h-0 w-full max-h-[min(calc(100dvh-8.5rem),960px)] flex-col gap-4 overflow-hidden lg:max-h-[calc(100dvh-7.5rem)]">
                  {/* Scroll schedule/parody separately so wheel events reach the forge split panes (no competing parent scroller). */}
                  <div
                    className={cn(
                      "min-h-0 max-h-[min(40dvh,360px)] shrink-0 space-y-3 overflow-y-auto overscroll-y-contain px-4 pt-4 md:px-8 md:pt-5",
                      "[scrollbar-gutter:stable] [scrollbar-color:rgba(255,255,255,0.22)_transparent] [scrollbar-width:thin]",
                      "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent",
                    )}
                  >
                    <AdminForgeSchedulePanel
                      onAutoForge={async (opts) => {
                        await forgeRef.current?.runRandomRouletteAndForge(opts);
                      }}
                    />
                    <AdminCelebrityParodyPanel
                      onGenerate={async (celebrityName, grotesqueGpk) => {
                        await forgeRef.current?.runCelebrityParody(celebrityName, { grotesqueGpk });
                      }}
                    />
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-1">
                    <CompanionCreator
                      ref={forgeRef}
                      mode="admin"
                      embedded
                      onForged={() => goSection("characters")}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          {section === "nexus" && <AdminTheNexus />}
          {section === "characters" && (
            <div className="rounded-[1.75rem] border border-border/80 bg-card/40 backdrop-blur-md p-4 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h2 className="font-gothic text-2xl gradient-vice-text">Character management</h2>
                <button
                  type="button"
                  onClick={() => goSection("creator")}
                  className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
                >
                  Open Companion Forge
                </button>
              </div>
              <CompanionManager />
            </div>
          )}
          {section === "xmarketing" && <XMarketingHub />}
          {section === "weeklydrops" && (
            <WeeklyDropsSection
              rows={weeklyDrops}
              loading={weeklyDropsLoading}
              settings={weeklySettings}
              settingsSaving={weeklySettingsSaving}
              tickLoading={weeklyTickLoading}
              onRefresh={() => void loadWeeklyDrops()}
              onSaveSettings={async (next) => {
                setWeeklySettingsSaving(true);
                try {
                  const { data, error } = await supabase.functions.invoke("zernio-social", {
                    body: {
                      mode: "settings_update",
                      weeklyDropEnabled: next.enabled,
                      weeklyDropsPerWeek: next.dropsPerWeek,
                      weeklyDropIntervalDays: next.intervalDays,
                      weeklyDropSourceMode: next.sourceMode,
                    },
                  });
                  if (error) throw new Error(await getEdgeFunctionInvokeMessage(error, data));
                  setWeeklySettings(next);
                  toast.success("Weekly drop settings saved.");
                  void loadWeeklyDrops();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not save settings.");
                } finally {
                  setWeeklySettingsSaving(false);
                }
              }}
              onRunNow={async () => {
                setWeeklyTickLoading(true);
                try {
                  const { data, error } = await supabase.functions.invoke("zernio-social", {
                    body: { mode: "weekly_drop_tick" },
                  });
                  if (error) throw new Error(await getEdgeFunctionInvokeMessage(error, data));
                  const processed = Number((data as { processed?: number } | null)?.processed ?? 0);
                  toast.success(processed > 0 ? `Posted ${processed} weekly drop(s) to X.` : "Weekly drop tick completed.");
                  void loadWeeklyDrops();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Weekly drop tick failed.");
                } finally {
                  setWeeklyTickLoading(false);
                }
              }}
            />
          )}
          {section === "users" && (
            <UsersSection
              profiles={profiles}
              loading={profilesLoading}
              onOpenUser={openUserPanel}
              onExport={() =>
                exportCsv(
                  profiles.map((p) => ({
                    user_id: p.user_id,
                    display_name: p.display_name,
                    tokens_balance: p.tokens_balance,
                    tier: p.tier,
                    created_at: p.created_at,
                  })),
                  "lustforge-users.csv",
                )
              }
            />
          )}
          {section === "waitlist" && (
            <WaitlistSection
              rows={waitlist}
              error={waitlistError}
              onRefresh={() => void loadWaitlist()}
              onDelete={removeWaitlistEntry}
              onExport={() =>
                exportCsv(
                  waitlist.map((w) => ({ email: w.email, created_at: w.created_at })),
                  "lustforge-waitlist.csv",
                )
              }
            />
          )}
          {section === "analytics" && (
            <AnalyticsSection
              trendData={trendData}
              stats={stats}
              loading={analyticsLoading}
              gaMeasurementId={gaMeasurementId}
            />
          )}
          {section === "cardstats" && (
            <CardStatsSection
              rows={cardStatsRows}
              loading={cardStatsLoading}
              range={cardStatsRange}
              onRangeChange={setCardStatsRange}
              onRefresh={() => void loadCardStats(cardStatsRange)}
            />
          )}
          {section === "settings" && <AdminSettingsSection onExportUsers={() => exportCsv(
            profiles.map((p) => ({
              user_id: p.user_id,
              display_name: p.display_name,
              tokens_balance: p.tokens_balance,
              tier: p.tier,
            })),
            "users-snapshot.csv",
          )} />}
        </div>
      </main>

      {/* User drawer */}
      <AnimatePresence>
        {selectedUser && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              aria-label="Close"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 32 }}
              className="fixed right-0 top-0 z-[90] h-full w-full max-w-md border-l border-border/80 bg-[hsl(240_14%_5%)]/98 backdrop-blur-2xl flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-border/60 flex items-center justify-between">
                <h3 className="font-gothic text-xl text-primary" style={{ color: NEON }}>
                  User detail
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Close
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-1 text-sm">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">User ID</p>
                  <p className="font-mono text-xs break-all">{selectedUser.user_id}</p>
                  <p className="text-xs text-muted-foreground mt-3">Display name</p>
                  <p>{selectedUser.display_name || "—"}</p>
                  <p className="text-xs text-muted-foreground mt-3">Tier</p>
                  <p className="capitalize">{selectedUser.tier}</p>
                  <p className="text-xs text-muted-foreground mt-3">Tokens</p>
                  <p className="font-gothic text-2xl text-accent">{selectedUser.tokens_balance}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Custom companions
                  </p>
                  {charsLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : userChars.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No custom characters yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {userChars.map((c) => (
                        <li key={c.id} className="text-sm border border-border/50 rounded-lg px-3 py-2 bg-black/30">
                          {c.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-3">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Coins className="h-4 w-4 text-accent" />
                    Grant tokens
                  </p>
                  <input
                    type="number"
                    min={1}
                    value={grantAmount}
                    onChange={(e) => setGrantAmount(e.target.value)}
                    className="w-full rounded-lg border border-border bg-black/40 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={grantLoading}
                    onClick={() => void grantTokens()}
                    className="w-full py-2.5 rounded-xl font-semibold text-primary-foreground glow-pink disabled:opacity-50"
                    style={{ backgroundColor: NEON }}
                  >
                    {grantLoading ? "Applying…" : "Apply credit"}
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <AdminForgeAssistant />
    </div>
  );
}

function OverviewSection({
  stats,
  statsLoading,
  analyticsLoading,
  dataIssuesBanner,
  onRefresh,
  trendData,
  barData,
  waitlistPreview,
  waitlistLoading,
  waitlistError,
  onOpenWaitlist,
}: {
  stats: StatsShape;
  statsLoading: boolean;
  analyticsLoading: boolean;
  dataIssuesBanner: string | null;
  onRefresh: () => void;
  trendData: TrendPoint[];
  barData: { name: string; value: number }[];
  waitlistPreview: WaitlistRow[];
  waitlistLoading: boolean;
  waitlistError: string | null;
  onOpenWaitlist: () => void;
}) {
  const s = stats;
  const cards = [
    {
      label: "Total registered users",
      value: s.totalUsers,
      sub: "Rows in profiles (requires admin role for full count)",
      color: "text-primary",
      glow: true,
    },
    { label: "Waitlist signups", value: s.waitlistSignups, sub: "waitlist table", color: "text-velvet-purple" },
    {
      label: "Images generated",
      value: s.imagesGenerated,
      sub: "generated_images (all users when admin)",
      color: "text-accent",
    },
    { label: "Stock companions", value: s.totalCompanions, sub: "catalog (companions)", color: "text-primary/80" },
    {
      label: "Custom forges",
      value: s.companionsCreatedCustom,
      sub: "custom_characters (all users when admin)",
      color: "text-accent/90",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="font-gothic text-3xl md:text-4xl font-bold gradient-vice-text">Overview</h2>
          <p className="text-sm text-muted-foreground mt-1">Live pulse across your forge.</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={statsLoading || analyticsLoading}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm hover:border-primary/40 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", (statsLoading || analyticsLoading) && "animate-spin")} />
          Refresh metrics
        </button>
      </div>

      {dataIssuesBanner ? (
        <div
          role="alert"
          className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/95"
        >
          <p className="font-semibold text-amber-200 mb-1">Metrics could not load completely</p>
          <p className="text-xs leading-relaxed opacity-95">{dataIssuesBanner}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={cn(
              "rounded-2xl border border-border/80 bg-card/50 backdrop-blur-md p-5 relative overflow-hidden",
              c.glow && "shadow-[0_0_40px_rgba(255,45,123,0.06)]",
            )}
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">{c.label}</p>
            <p className={cn("font-gothic text-3xl mt-2", c.color)} style={c.glow ? { color: NEON } : undefined}>
              {statsLoading ? "—" : c.value}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">{c.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="rounded-2xl border border-border/80 bg-card/40 backdrop-blur-md overflow-hidden">
        <div className="px-5 py-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-gothic text-lg text-foreground">Waitlist (live)</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Latest entries from the waitlist table</p>
          </div>
          <button
            type="button"
            onClick={onOpenWaitlist}
            className="text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-xl border border-primary/40 text-primary hover:bg-primary/10 transition-colors shrink-0"
            style={{ color: NEON }}
          >
            Full waitlist
          </button>
        </div>
        {waitlistError ? (
          <p className="p-5 text-sm text-destructive">{waitlistError}</p>
        ) : waitlistLoading ? (
          <div className="flex items-center justify-center gap-2 py-14 text-muted-foreground text-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading entries…
          </div>
        ) : waitlistPreview.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">No waitlist rows yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="p-4">Email</th>
                  <th className="p-4 w-44">Signed up</th>
                </tr>
              </thead>
              <tbody>
                {waitlistPreview.slice(0, 12).map((w) => (
                  <tr key={w.id} className="border-b border-border/40 hover:bg-white/[0.03]">
                    <td className="p-4 font-mono text-xs">{w.email}</td>
                    <td className="p-4 text-muted-foreground text-xs">
                      {new Date(w.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 rounded-2xl border border-border/80 bg-card/40 backdrop-blur-md p-5">
          <h3 className="font-gothic text-lg mb-4 flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary" style={{ color: NEON }} />
            Engagement trend
          </h3>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData.length ? trendData : [{ name: "—", sessions: 0, images: 0 }]}>
                <defs>
                  <linearGradient id="lfPink" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={NEON} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={NEON} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="lfTeal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(170 100% 50%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(170 100% 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(280 20% 18%)" />
                <XAxis dataKey="name" stroke="hsl(240 5% 45%)" tick={{ fontSize: 11 }} />
                <YAxis stroke="hsl(240 5% 45%)" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area type="monotone" dataKey="sessions" stroke={NEON} fill="url(#lfPink)" strokeWidth={2} />
                <Area type="monotone" dataKey="images" stroke="hsl(170 100% 50%)" fill="url(#lfTeal)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 italic">Rolling 14-day live telemetry from app tables.</p>
        </div>
        <div className="lg:col-span-2 rounded-2xl border border-border/80 bg-card/40 backdrop-blur-md p-5">
          <h3 className="font-gothic text-lg mb-4">Feature mix</h3>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData.length ? barData : [{ name: "None", value: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(280 20% 18%)" />
                <XAxis dataKey="name" stroke="hsl(240 5% 45%)" tick={{ fontSize: 11 }} />
                <YAxis stroke="hsl(240 5% 45%)" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="value" fill={NEON} radius={[8, 8, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsersSection({
  profiles,
  loading,
  onOpenUser,
  onExport,
}: {
  profiles: ProfileRow[];
  loading: boolean;
  onOpenUser: (p: ProfileRow) => void;
  onExport: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-gothic text-3xl gradient-vice-text">User management</h2>
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm hover:border-accent/40 hover:text-accent transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>
      <div className="rounded-2xl border border-border/80 bg-card/40 backdrop-blur-md overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="p-4">User</th>
                  <th className="p-4">Tokens</th>
                  <th className="p-4">Tier</th>
                  <th className="p-4">Joined</th>
                  <th className="p-4 w-24" />
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id} className="border-b border-border/40 hover:bg-white/[0.03]">
                    <td className="p-4">
                      <p className="font-medium">{p.display_name || "—"}</p>
                      <p className="text-[10px] font-mono text-muted-foreground truncate max-w-[200px]">{p.user_id}</p>
                    </td>
                    <td className="p-4 tabular-nums text-accent font-semibold">{p.tokens_balance}</td>
                    <td className="p-4 capitalize">{p.tier}</td>
                    <td className="p-4 text-muted-foreground text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      <button
                        type="button"
                        onClick={() => onOpenUser(p)}
                        className="text-xs font-semibold text-primary hover:underline"
                        style={{ color: NEON }}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {profiles.length === 0 && (
              <p className="text-center text-muted-foreground py-12 text-sm">No profiles returned — check admin RLS.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function WaitlistSection({
  rows,
  error,
  onRefresh,
  onDelete,
  onExport,
}: {
  rows: WaitlistRow[];
  error: string | null;
  onRefresh: () => void;
  onDelete: (id: string) => void;
  onExport: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-gothic text-3xl gradient-vice-text">Waitlist</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm hover:border-primary/40"
          >
            <RefreshCw className="h-4 w-4" />
            Reload
          </button>
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm hover:border-accent/40"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>
      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-semibold mb-1">Cannot read waitlist</p>
          <p className="text-destructive/90 text-xs">
            {error} — add a SELECT policy for admins on <code className="font-mono">waitlist</code> (e.g.{" "}
            <code className="font-mono">has_role(auth.uid(), &apos;admin&apos;)</code>) to enable this view.
          </p>
        </div>
      )}
      <div className="rounded-2xl border border-border/80 bg-card/40 backdrop-blur-md divide-y divide-border/40">
        {rows.map((w) => (
          <div key={w.id} className="flex items-center justify-between gap-4 p-4 hover:bg-white/[0.02]">
            <div>
              <p className="font-medium">{w.email}</p>
              <p className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleString()}</p>
            </div>
            <button
              type="button"
              onClick={() => onDelete(w.id)}
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Remove"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {!error && rows.length === 0 && (
          <p className="text-center text-muted-foreground py-12 text-sm">No entries yet.</p>
        )}
      </div>
    </div>
  );
}

function WeeklyDropsSection({
  rows,
  loading,
  settings,
  settingsSaving,
  tickLoading,
  onRefresh,
  onSaveSettings,
  onRunNow,
}: {
  rows: WeeklyDropRow[];
  loading: boolean;
  settings: {
    enabled: boolean;
    dropsPerWeek: number;
    intervalDays: number;
    sourceMode: "mixed" | "catalog_only" | "forge_only";
    lastRunAt: string | null;
  };
  settingsSaving: boolean;
  tickLoading: boolean;
  onRefresh: () => void;
  onSaveSettings: (next: {
    enabled: boolean;
    dropsPerWeek: number;
    intervalDays: number;
    sourceMode: "mixed" | "catalog_only" | "forge_only";
    lastRunAt: string | null;
  }) => Promise<void>;
  onRunNow: () => Promise<void>;
}) {
  const [local, setLocal] = useState(settings);
  useEffect(() => {
    setLocal(settings);
  }, [settings]);

  const totals = useMemo(() => {
    const totalDrops = rows.length;
    const totalClicks = rows.reduce((acc, r) => acc + Number(r.total_clicks || 0), 0);
    const avg = totalDrops ? totalClicks / totalDrops : 0;
    return { totalDrops, totalClicks, avg };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-gothic text-3xl gradient-vice-text">Weekly Drops</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm hover:border-primary/40"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            type="button"
            disabled={tickLoading}
            onClick={() => void onRunNow()}
            className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50"
          >
            {tickLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
            Run now
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border/80 bg-card/40 p-5 backdrop-blur-md">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total drops</p>
          <p className="mt-2 font-gothic text-3xl text-primary">{totals.totalDrops}</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card/40 p-5 backdrop-blur-md">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total clicks</p>
          <p className="mt-2 font-gothic text-3xl text-accent">{totals.totalClicks}</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card/40 p-5 backdrop-blur-md">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Average clicks / drop</p>
          <p className="mt-2 font-gothic text-3xl text-foreground">{totals.avg.toFixed(1)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card/40 p-5 backdrop-blur-md space-y-4">
        <h3 className="font-gothic text-xl text-foreground">Automation settings</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm space-y-2">
            <span className="text-muted-foreground">Enabled</span>
            <input
              type="checkbox"
              checked={local.enabled}
              onChange={(e) => setLocal((s) => ({ ...s, enabled: e.target.checked }))}
              className="h-4 w-4"
            />
          </label>
          <label className="text-sm space-y-2">
            <span className="text-muted-foreground">Drops per week</span>
            <input
              type="number"
              min={1}
              max={14}
              value={local.dropsPerWeek}
              onChange={(e) => setLocal((s) => ({ ...s, dropsPerWeek: Number(e.target.value || 2) }))}
              className="w-full rounded-lg border border-border bg-black/40 px-3 py-2"
            />
          </label>
          <label className="text-sm space-y-2">
            <span className="text-muted-foreground">Run interval (days)</span>
            <input
              type="number"
              min={1}
              max={30}
              value={local.intervalDays}
              onChange={(e) => setLocal((s) => ({ ...s, intervalDays: Number(e.target.value || 3) }))}
              className="w-full rounded-lg border border-border bg-black/40 px-3 py-2"
            />
          </label>
          <label className="text-sm space-y-2">
            <span className="text-muted-foreground">Companion source</span>
            <select
              value={local.sourceMode}
              onChange={(e) =>
                setLocal((s) => ({
                  ...s,
                  sourceMode:
                    e.target.value === "catalog_only" || e.target.value === "forge_only"
                      ? (e.target.value as "catalog_only" | "forge_only")
                      : "mixed",
                }))
              }
              className="w-full rounded-lg border border-border bg-black/40 px-3 py-2"
            >
              <option value="mixed">Mixed (catalog + forge)</option>
              <option value="catalog_only">Catalog only</option>
              <option value="forge_only">Forge only</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={settingsSaving}
            onClick={() => void onSaveSettings(local)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {settingsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings2 className="h-4 w-4" />}
            Save weekly settings
          </button>
          <p className="text-xs text-muted-foreground">
            Last run: {settings.lastRunAt ? new Date(settings.lastRunAt).toLocaleString() : "never"}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card/40 backdrop-blur-md overflow-hidden">
        <div className="px-5 py-4 border-b border-border/60">
          <h3 className="font-gothic text-xl text-foreground">Drop history</h3>
        </div>
        {loading ? (
          <div className="flex justify-center py-14">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No weekly drops posted yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="p-4">Posted</th>
                  <th className="p-4">Companion</th>
                  <th className="p-4">Rarity</th>
                  <th className="p-4 text-right">Clicks</th>
                  <th className="p-4">Links</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/40 hover:bg-white/[0.03]">
                    <td className="p-4 text-xs text-muted-foreground">{new Date(r.posted_at).toLocaleString()}</td>
                    <td className="p-4">
                      <p className="font-medium">{r.companion_name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{r.companion_id}</p>
                    </td>
                    <td className="p-4 capitalize">{r.rarity ?? "—"}</td>
                    <td className="p-4 text-right tabular-nums">{r.total_clicks}</td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 text-xs">
                        <a className="text-primary hover:underline" href={r.landing_url} target="_blank" rel="noreferrer">
                          Landing
                        </a>
                        {r.x_post_url ? (
                          <a className="text-accent hover:underline" href={r.x_post_url} target="_blank" rel="noreferrer">
                            X post
                          </a>
                        ) : (
                          <span className="text-muted-foreground">X pending</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function DiscoveryVotesPanel() {
  const [rows, setRows] = useState<{ companion_id: string; up: number; down: number; net: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("companion_discovery_votes").select("companion_id, vote");
      if (cancelled) return;
      if (error) {
        setLoading(false);
        return;
      }
      const map = new Map<string, { up: number; down: number }>();
      for (const r of data ?? []) {
        const cur = map.get(r.companion_id) ?? { up: 0, down: 0 };
        if (r.vote === 1) cur.up++;
        else if (r.vote === -1) cur.down++;
        map.set(r.companion_id, cur);
      }
      const list = [...map.entries()].map(([companion_id, v]) => ({
        companion_id,
        up: v.up,
        down: v.down,
        net: v.up - v.down,
      }));
      list.sort((a, b) => b.up + b.down - (a.up + a.down));
      setRows(list);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-2xl border border-border/80 bg-card/40 p-5 backdrop-blur-md space-y-4">
      <div>
        <h3 className="font-gothic text-lg">Discover feedback</h3>
        <p className="text-xs text-muted-foreground mt-1">Likes and meh counts per companion (profile voting).</p>
      </div>
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No votes recorded yet.</p>
      ) : (
        <div className="overflow-x-auto max-h-[min(360px,50vh)] rounded-xl border border-border/60">
          <table className="w-full text-sm text-left">
            <thead className="sticky top-0 bg-black/50 backdrop-blur-md border-b border-border/60">
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Companion</th>
                <th className="px-3 py-2 font-semibold text-right">Likes</th>
                <th className="px-3 py-2 font-semibold text-right">Meh</th>
                <th className="px-3 py-2 font-semibold text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.companion_id} className="border-b border-border/40 hover:bg-white/[0.03]">
                  <td className="px-3 py-2 font-mono text-xs break-all max-w-[200px]">{r.companion_id}</td>
                  <td className="px-3 py-2 text-right text-emerald-300/90">{r.up}</td>
                  <td className="px-3 py-2 text-right text-amber-200/80">{r.down}</td>
                  <td className="px-3 py-2 text-right text-foreground/90">{r.net}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AnalyticsSection({
  trendData,
  stats,
  loading,
  gaMeasurementId,
}: {
  trendData: TrendPoint[];
  stats: {
    totalUsers: number;
    toysLinked: number;
    companionsCreatedCustom: number;
    imagesGenerated: number;
  };
  loading: boolean;
  gaMeasurementId: string | null;
}) {
  const totals = useMemo(
    () =>
      trendData.reduce(
        (acc, row) => {
          acc.sessions += row.sessions;
          acc.signups += row.signups;
          acc.images += row.images;
          acc.forged += row.forged;
          return acc;
        },
        { sessions: 0, signups: 0, images: 0, forged: 0 },
      ),
    [trendData],
  );

  const efficiencyData = useMemo(
    () => [
      {
        name: "Forge output",
        value: totals.images > 0 ? Number((totals.forged / totals.images).toFixed(2)) : 0,
      },
      {
        name: "Chat depth",
        value: totals.signups > 0 ? Number((totals.sessions / totals.signups).toFixed(2)) : 0,
      },
      {
        name: "Image / user",
        value: stats.totalUsers > 0 ? Number((stats.imagesGenerated / stats.totalUsers).toFixed(2)) : 0,
      },
    ],
    [totals, stats.totalUsers, stats.imagesGenerated],
  );

  return (
    <div className="space-y-8">
      <h2 className="font-gothic text-3xl gradient-vice-text">Analytics</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { k: "GA Measurement", v: gaMeasurementId ?? "Disabled" },
          { k: "14d Sessions / user", v: stats.totalUsers ? (totals.sessions / Math.max(stats.totalUsers, 1)).toFixed(2) : "—" },
          { k: "Toy adoption", v: `${stats.toysLinked} linked devices` },
          {
            k: "Custom / image ratio",
            v: stats.imagesGenerated ? (stats.companionsCreatedCustom / stats.imagesGenerated).toFixed(2) : "—",
          },
        ].map((x) => (
          <div key={x.k} className="rounded-2xl border border-border/80 bg-card/40 p-5 backdrop-blur-md">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{x.k}</p>
            <p className="font-gothic text-2xl text-accent">{x.v}</p>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 rounded-2xl border border-border/80 bg-card/40 p-5 h-[340px]">
          <h3 className="font-gothic text-lg mb-4">14-day activity pulse</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData.length ? trendData : [{ name: "—", sessions: 0, signups: 0, images: 0, forged: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(280 20% 18%)" />
              <XAxis dataKey="name" stroke="hsl(240 5% 45%)" tick={{ fontSize: 11 }} />
              <YAxis stroke="hsl(240 5% 45%)" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Line type="monotone" dataKey="sessions" stroke={NEON} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="signups" stroke="hsl(280 60% 55%)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="images" stroke="hsl(170 100% 45%)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="forged" stroke="hsl(35 95% 55%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="lg:col-span-2 rounded-2xl border border-border/80 bg-card/40 p-5 h-[340px]">
          <h3 className="font-gothic text-lg mb-4">Conversion efficiency</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={efficiencyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(280 20% 18%)" />
              <XAxis dataKey="name" stroke="hsl(240 5% 45%)" tick={{ fontSize: 11 }} />
              <YAxis stroke="hsl(240 5% 45%)" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="value" fill="hsl(170 100% 45%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <DiscoveryVotesPanel />
      <p className="text-xs text-muted-foreground italic">
        {loading
          ? "Refreshing analytics…"
          : "Telemetry is live from profiles, waitlist, generated_images, custom_characters, and chat_messages."}
      </p>
    </div>
  );
}

function CardStatsSection({
  rows,
  loading,
  range,
  onRangeChange,
  onRefresh,
}: {
  rows: CardStatsRow[];
  loading: boolean;
  range: CardStatsRange;
  onRangeChange: (next: CardStatsRange) => void;
  onRefresh: () => void;
}) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"purchases" | "uses" | "buyers" | "users">("purchases");

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => {
          acc.purchases += r.purchases;
          acc.uses += r.uses;
          acc.uniqueBuyers += r.uniqueBuyers;
          acc.uniqueUsers += r.uniqueUsers;
          return acc;
        },
        { purchases: 0, uses: 0, uniqueBuyers: 0, uniqueUsers: 0 },
      ),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? rows.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            r.companionId.toLowerCase().includes(q) ||
            (r.tagline || "").toLowerCase().includes(q),
        )
      : rows;
    const sorted = [...matched];
    sorted.sort((a, b) => {
      if (sortBy === "uses") return b.uses - a.uses || b.purchases - a.purchases;
      if (sortBy === "buyers") return b.uniqueBuyers - a.uniqueBuyers || b.purchases - a.purchases;
      if (sortBy === "users") return b.uniqueUsers - a.uniqueUsers || b.uses - a.uses;
      return b.purchases - a.purchases || b.uses - a.uses;
    });
    return sorted;
  }, [query, rows, sortBy]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-gothic text-3xl gradient-vice-text">Card Stats</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Privacy-safe card performance: aggregate counts only, no user identities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={range}
            onChange={(e) => onRangeChange(e.target.value as CardStatsRange)}
            className="rounded-xl border border-border bg-black/40 px-3 py-2 text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="all">All time</option>
          </select>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm hover:border-primary/40 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/80 bg-card/40 p-5 backdrop-blur-md">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total purchases</p>
          <p className="mt-2 font-gothic text-3xl text-primary">{totals.purchases}</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card/40 p-5 backdrop-blur-md">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total uses</p>
          <p className="mt-2 font-gothic text-3xl text-accent">{totals.uses}</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card/40 p-5 backdrop-blur-md">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Unique buyer sum</p>
          <p className="mt-2 font-gothic text-3xl text-foreground">{totals.uniqueBuyers}</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card/40 p-5 backdrop-blur-md">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Unique user sum</p>
          <p className="mt-2 font-gothic text-3xl text-foreground">{totals.uniqueUsers}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card/40 backdrop-blur-md overflow-hidden">
        <div className="px-5 py-4 border-b border-border/60 flex flex-col lg:flex-row lg:items-center gap-3 lg:justify-between">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by card name, id, or tagline..."
            className="w-full lg:max-w-md rounded-lg border border-border bg-black/40 px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Sort</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "purchases" | "uses" | "buyers" | "users")}
              className="rounded-lg border border-border bg-black/40 px-3 py-2 text-sm"
            >
              <option value="purchases">Purchases</option>
              <option value="uses">Uses</option>
              <option value="buyers">Unique buyers</option>
              <option value="users">Unique users</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-14">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No card stats found yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="p-4">Card</th>
                  <th className="p-4 text-right"><span className="inline-flex items-center gap-1"><ShoppingBag className="h-3.5 w-3.5" /> Purchases</span></th>
                  <th className="p-4 text-right">Unique buyers</th>
                  <th className="p-4 text-right"><span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> Uses</span></th>
                  <th className="p-4 text-right">Unique users</th>
                  <th className="p-4">Last activity</th>
                  <th className="p-4 text-right">Profile</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const lastAt = r.lastUsedAt && r.lastPurchaseAt
                    ? (r.lastUsedAt > r.lastPurchaseAt ? r.lastUsedAt : r.lastPurchaseAt)
                    : (r.lastUsedAt ?? r.lastPurchaseAt);
                  return (
                    <tr key={r.companionId} className="border-b border-border/40 hover:bg-white/[0.03]">
                      <td className="p-4">
                        <p className="font-medium">{r.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{r.companionId}</p>
                        {r.tagline ? <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{r.tagline}</p> : null}
                      </td>
                      <td className="p-4 text-right tabular-nums">{r.purchases}</td>
                      <td className="p-4 text-right tabular-nums">{r.uniqueBuyers}</td>
                      <td className="p-4 text-right tabular-nums">{r.uses}</td>
                      <td className="p-4 text-right tabular-nums">{r.uniqueUsers}</td>
                      <td className="p-4 text-xs text-muted-foreground">
                        {lastAt ? new Date(lastAt).toLocaleString() : "—"}
                      </td>
                      <td className="p-4 text-right">
                        <Link
                          to={`/companions/${r.companionId}`}
                          state={{ from: "/admin?section=cardstats" }}
                          className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-semibold"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminSettingsSection({ onExportUsers }: { onExportUsers: () => void }) {
  return (
    <div className="space-y-6 max-w-xl">
      <h2 className="font-gothic text-3xl gradient-vice-text">Settings</h2>
      <p className="text-sm text-muted-foreground">
        Operational shortcuts. Dangerous actions should stay behind service-role edge functions in production.
      </p>
      <div className="rounded-2xl border border-border/80 bg-card/40 p-6 space-y-4 backdrop-blur-md">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <UserCog className="h-4 w-4 text-primary" style={{ color: NEON }} />
          Data export
        </h3>
        <button
          type="button"
          onClick={onExportUsers}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm hover:border-primary/40 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export user snapshot (load Users tab first for full list)
        </button>
      </div>
    </div>
  );
}

export default function Admin() {
  return (
    <QueryClientProvider client={adminQueryClient}>
      <AdminShell />
    </QueryClientProvider>
  );
}
