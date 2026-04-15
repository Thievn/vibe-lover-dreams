import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ParticleBackground from "@/components/ParticleBackground";
import CompanionCreator from "@/components/CompanionCreator";
import CompanionManager from "@/components/admin/CompanionManager";
import AdminForgeAssistant from "@/components/admin/AdminForgeAssistant";
import { getGaMeasurementId } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { isPlatformAdmin, platformAdminEmailDisplay } from "@/config/auth";
const NEON = "#FF2D7B";

const adminQueryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60 * 1000 } },
});

type AdminSection =
  | "overview"
  | "creator"
  | "characters"
  | "users"
  | "waitlist"
  | "analytics"
  | "settings";

const NAV: { id: AdminSection; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "creator", label: "Companion Forge", icon: Sparkles },
  { id: "characters", label: "Character Management", icon: Palette },
  { id: "users", label: "User Management", icon: Users },
  { id: "waitlist", label: "Waitlist", icon: ScrollText },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
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

type TrendPoint = {
  dateKey: string;
  name: string;
  sessions: number;
  signups: number;
  images: number;
  forged: number;
};

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
  const navigate = useNavigate();
  const [authLoading, setAuthLoading] = useState(true);
  const [section, setSection] = useState<AdminSection>("overview");
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

  const gaMeasurementId = getGaMeasurementId();

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const profilesCountRes = await supabase.from("profiles").select("id", { count: "exact", head: true });
      const stockRes = await supabase.from("companions").select("id", { count: "exact", head: true });
      const customRes = await supabase.from("custom_characters").select("id", { count: "exact", head: true });
      const imgRes = await supabase.from("generated_images").select("id", { count: "exact", head: true });
      const wlRes = await supabase.from("waitlist").select("id", { count: "exact", head: true });

      const totalUsers = profilesCountRes.error ? 0 : (profilesCountRes.count ?? 0);
      const totalCompanions = stockRes.error ? 0 : (stockRes.count ?? 0);
      const customCount = customRes.error ? 0 : (customRes.count ?? 0);
      const imagesGenerated = imgRes.error ? 0 : (imgRes.count ?? 0);
      const waitlistSignups = wlRes.error ? 0 : (wlRes.count ?? 0);

      const { data: paying } = await supabase
        .from("profiles")
        .select("id")
        .not("stripe_customer_id", "is", null);
      const { data: toys } = await supabase.from("profiles").select("id").not("device_uid", "is", null);

      setStats({
        totalUsers,
        waitlistSignups,
        totalCompanions,
        imagesGenerated,
        companionsCreatedCustom: customCount,
        revenueMrr: (paying?.length ?? 0) * 19.99,
        toysLinked: toys?.length ?? 0,
      });
    } catch (e) {
      console.error(e);
      toast.error("Some metrics failed to load (check RLS / tables).");
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
    if (authLoading) return;
    if (section === "users") void loadProfiles();
    if (section === "waitlist") void loadWaitlist();
  }, [authLoading, section, loadProfiles, loadWaitlist]);

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
      toast.success(`Granted ${n} tokens.`);
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
    toast.success("Removed from waitlist.");
    setWaitlist((w) => w.filter((x) => x.id !== id));
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
    toast.success("Export started.");
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
              onClick={() => setSection(id)}
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
        <div className="lg:hidden sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-border/60 px-3 py-2 flex gap-1 overflow-x-auto">
          {NAV.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap",
                section === id ? "bg-primary/20 text-primary" : "text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-4 md:p-8 max-w-[1400px] mx-auto pb-24">
          {section === "overview" && (
            <OverviewSection
              stats={stats}
              statsLoading={statsLoading}
              analyticsLoading={analyticsLoading}
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
              onOpenWaitlist={() => setSection("waitlist")}
            />
          )}
          {section === "creator" && (
            <div className="rounded-[1.75rem] border border-border/80 bg-card/30 backdrop-blur-md overflow-hidden">
              <div className="px-6 py-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="font-gothic text-2xl gradient-vice-text">Companion Forge</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSection("characters")}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border/80 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                  >
                    Character management
                  </button>
                  <span className="text-xs text-muted-foreground uppercase tracking-widest">Admin · no token cost</span>
                </div>
              </div>
              <div className="p-4 md:p-6 min-h-0 max-h-[min(92dvh,1100px)] overflow-y-auto">
                <CompanionCreator mode="admin" embedded onForged={() => setSection("characters")} />
              </div>
            </div>
          )}
          {section === "characters" && (
            <div className="rounded-[1.75rem] border border-border/80 bg-card/40 backdrop-blur-md p-4 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h2 className="font-gothic text-2xl gradient-vice-text">Character management</h2>
                <button
                  type="button"
                  onClick={() => setSection("creator")}
                  className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
                >
                  Open Companion Forge
                </button>
              </div>
              <CompanionManager />
            </div>
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
    { label: "Total registered users", value: s.totalUsers, sub: "profiles", color: "text-primary", glow: true },
    { label: "Waitlist signups", value: s.waitlistSignups, sub: "waitlist table", color: "text-velvet-purple" },
    { label: "Images generated", value: s.imagesGenerated, sub: "generated_images", color: "text-accent" },
    { label: "Stock companions", value: s.totalCompanions, sub: "catalog (companions)", color: "text-primary/80" },
    { label: "Custom forges", value: s.companionsCreatedCustom, sub: "custom_characters", color: "text-accent/90" },
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
      <p className="text-xs text-muted-foreground italic">
        {loading
          ? "Refreshing analytics…"
          : "Telemetry is live from profiles, waitlist, generated_images, custom_characters, and chat_messages."}
      </p>
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
