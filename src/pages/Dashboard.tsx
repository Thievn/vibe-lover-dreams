import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DailyFreeMessagesBar } from "@/components/chat/DailyFreeMessagesBar";
import { nextTextMessageFc, remainingFreeMessages } from "@/lib/chatDailyQuota";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import {
  Activity,
  Bell,
  ChevronRight,
  Flame,
  Gamepad2,
  Hammer,
  Coins,
  Heart,
  Layers,
  LogOut,
  MessageSquare,
  Orbit,
  Settings,
  Shield,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getToys } from "@/lib/lovense";
import { cn } from "@/lib/utils";
import ParticleBackground from "@/components/ParticleBackground";
import DiscoverCompanionsGallery from "@/components/DiscoverCompanionsGallery";
import TheNexus from "@/components/TheNexus";
import { TierHaloPortraitFrame } from "@/components/rarity/TierHaloPortraitFrame";
import { CompanionVibeTraitStrip } from "@/components/traits/CompanionVibeTraitStrip";
import { resolveDisplayTraitsForCompanion } from "@/lib/vibeDisplayTraits";
import { normalizeCompanionRarity } from "@/lib/companionRarity";
import { Progress } from "@/components/ui/progress";
import { useCompanions, dbToCompanion } from "@/hooks/useCompanions";
import { useVaultCollection } from "@/hooks/useVaultCollection";
import { companions, type Companion } from "@/data/companions";
import { isPlatformAdmin } from "@/config/auth";
import {
  DASHBOARD_NAV_ITEMS,
  DASHBOARD_NAV_QUERY,
  parseDashboardNavParam,
  type DashboardNavId,
  type NavId,
} from "@/lib/dashboardNav";
import { useWindowVisibleRefresh } from "@/hooks/useWindowVisibleRefresh";
import { useDashboardInsights, DASHBOARD_INSIGHTS_QUERY_KEY } from "@/hooks/useDashboardInsights";
import {
  activityRelativeTime,
  affectionOverallPct,
  buildDashboardActivity,
  chatBondLabel,
} from "@/lib/dashboardInsights";

const NEON_PINK = "#FF2D7B";

const DASHBOARD_STAT_DEFS = [
  { key: "companions", label: "Companions", accent: "text-primary" },
  { key: "hybrids", label: "Nexus-born", accent: "text-accent" },
  { key: "toySyncs", label: "Toy syncs", accent: "text-[#FF2D7B]" },
  { key: "messages", label: "Messages", accent: "text-primary/80" },
] as const;

const MOCK_THREADS = [
  { title: "Midnight ritual with Lilith", preview: "Don't move until I say so, pet…", at: "Today" },
  { title: "Jax — cabin aftercare", preview: "Already missin' you. Coffee's on.", at: "Yesterday" },
  { title: "Kira — brat tax", preview: "You owe me three edges. Pay up.", at: "Mon" },
];

/** Uses `profiles.display_name` verbatim (same casing as Account). Uniqueness is enforced case-insensitively in DB/RPC. */
function resolveGreetingName(user: User | null, profileDisplayName: string | null): string {
  if (!user) return "Forgemaster";
  const fromProfile = profileDisplayName?.trim();
  if (fromProfile) return fromProfile;
  const meta = user.user_metadata as Record<string, string | undefined> | undefined;
  return meta?.full_name || meta?.name || meta?.username || user.email?.split("@")[0] || "Forgemaster";
}

function avatarUrl(user: User | null): string | undefined {
  const meta = user?.user_metadata as Record<string, string | undefined> | undefined;
  return meta?.avatar_url;
}

function initialsFromGreeting(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0] + parts[1]![0]).toUpperCase();
  const single = parts[0] || name;
  return single.slice(0, 2).toUpperCase();
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { data: dbCompanions = [], isLoading: companionsLoading } = useCompanions();
  const allCompanions = useMemo(() => dbCompanions.map(dbToCompanion), [dbCompanions]);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeNav, setActiveNav] = useState<DashboardNavId>(
    () => parseDashboardNavParam(searchParams.get(DASHBOARD_NAV_QUERY)) ?? "dashboard",
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [toyConnected, setToyConnected] = useState(false);
  const [toyLabel, setToyLabel] = useState<string | null>(null);
  const [notifySessions, setNotifySessions] = useState(true);
  const [notifyMarketing, setNotifyMarketing] = useState(false);
  const [privateMode, setPrivateMode] = useState(true);
  const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null);
  const [tokensBalance, setTokensBalance] = useState(0);
  const [chatDailyQuotaDate, setChatDailyQuotaDate] = useState<string | null>(null);
  const [chatDailyQuotaUsed, setChatDailyQuotaUsed] = useState<number | null>(null);

  const { vaultCompanions, isLoading: vaultLoading } = useVaultCollection(user?.id ?? null, dbCompanions);
  const { data: insights, isLoading: insightsLoading } = useDashboardInsights(user?.id ?? null);
  const collectionPreview = useMemo(() => vaultCompanions.slice(0, 12), [vaultCompanions]);
  const forgeParents = useMemo(() => {
    if (!user?.id) return [];
    return dbCompanions.filter((c) => c.id.startsWith("cc-") && c.user_id === user.id);
  }, [dbCompanions, user?.id]);
  const nexusBornCount = useMemo(() => vaultCompanions.filter((c) => c.isNexusHybrid).length, [vaultCompanions]);
  const hotPicks = useMemo(() => {
    const pool = user ? vaultCompanions : allCompanions;
    const rels = insights?.relationships ?? [];
    const vaultIds = new Set(pool.map((c) => c.id));
    const orderIds: string[] = [];
    const seen = new Set<string>();
    for (const r of rels) {
      if (!vaultIds.has(r.companion_id)) continue;
      if (seen.has(r.companion_id)) continue;
      orderIds.push(r.companion_id);
      seen.add(r.companion_id);
      if (orderIds.length >= 8) break;
    }
    for (const c of pool) {
      if (orderIds.length >= 8) break;
      if (!seen.has(c.id)) {
        orderIds.push(c.id);
        seen.add(c.id);
      }
    }
    const relById = new Map(rels.map((r) => [r.companion_id, r]));
    return orderIds.slice(0, 6).flatMap((id) => {
      const companion = pool.find((c) => c.id === id);
      if (!companion) return [];
      const rel = relById.get(id);
      return [{ companion, lastChatAt: rel?.last_interaction ?? null }];
    });
  }, [user, vaultCompanions, allCompanions, insights?.relationships]);

  const affectionSnapshot = useMemo(() => {
    const vaultIds = new Set(vaultCompanions.map((c) => c.id));
    const rows = (insights?.relationships ?? [])
      .filter((r) => vaultIds.has(r.companion_id))
      .slice()
      .sort((a, b) => {
        const lv = (b.chat_affection_level ?? 0) - (a.chat_affection_level ?? 0);
        if (lv !== 0) return lv;
        return new Date(b.last_interaction).getTime() - new Date(a.last_interaction).getTime();
      })
      .slice(0, 5);
    return rows
      .map((r) => {
        const c = vaultCompanions.find((x) => x.id === r.companion_id);
        if (!c) return null;
        return {
          name: c.name,
          pct: affectionOverallPct(r),
          tier: chatBondLabel(r.chat_affection_level),
        };
      })
      .filter(Boolean) as { name: string; pct: number; tier: string }[];
  }, [insights?.relationships, vaultCompanions]);

  const recentActivity = useMemo(() => {
    if (!insights) return [];
    const nameById = new Map(vaultCompanions.map((c) => [c.id, c.name]));
    return buildDashboardActivity(insights, nameById);
  }, [insights, vaultCompanions]);

  const statRow = useMemo(() => {
    const c = vaultCompanions.length;
    const h = nexusBornCount;
    const t = insights?.toySyncCount;
    const m = insights?.chatMessageCount;
    return DASHBOARD_STAT_DEFS.map((d) => {
      let value: string;
      let sub: string | undefined;
      if (d.key === "companions") value = String(c);
      else if (d.key === "hybrids") value = String(h);
      else if (d.key === "toySyncs") {
        value = insightsLoading ? "—" : String(t ?? 0);
        sub = "Haptic messages in chat";
      } else {
        value = insightsLoading ? "—" : String(m ?? 0);
        sub = "All chat lines in your account";
      }
      return { ...d, value, sub };
    });
  }, [vaultCompanions.length, nexusBornCount, insights?.toySyncCount, insights?.chatMessageCount, insightsLoading]);

  const profileRef = useRef<HTMLDivElement>(null);
  const greetingName = resolveGreetingName(user, profileDisplayName);

  const isAdmin = isPlatformAdmin(user, { profileDisplayName });

  const dashboardChatQuotaUi = useMemo(
    () => ({
      remainingFree: remainingFreeMessages(chatDailyQuotaDate, chatDailyQuotaUsed),
      nextLineFc: nextTextMessageFc(chatDailyQuotaDate, chatDailyQuotaUsed),
    }),
    [chatDailyQuotaDate, chatDailyQuotaUsed],
  );

  const refreshToy = useCallback(async (uid: string) => {
    try {
      const toys = await getToys(uid);
      if (toys.length > 0 && toys[0].status === "online") {
        setToyConnected(true);
        setToyLabel(toys[0].name);
      } else if (toys.length > 0) {
        setToyConnected(false);
        setToyLabel(toys[0].name);
      } else {
        setToyConnected(false);
        setToyLabel(null);
      }
    } catch {
      setToyConnected(false);
      setToyLabel(null);
    }
  }, []);

  const refreshProfileCredits = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("profiles")
      .select("tokens_balance, chat_daily_quota_date, chat_daily_quota_used")
      .eq("user_id", user.id)
      .maybeSingle();
    setTokensBalance(typeof data?.tokens_balance === "number" ? data.tokens_balance : 0);
    setChatDailyQuotaDate(data?.chat_daily_quota_date ?? null);
    setChatDailyQuotaUsed(typeof data?.chat_daily_quota_used === "number" ? data.chat_daily_quota_used : null);
  }, [user?.id]);

  useWindowVisibleRefresh(
    () => {
      if (user?.id) {
        void refreshToy(user.id);
        void queryClient.invalidateQueries({ queryKey: DASHBOARD_INSIGHTS_QUERY_KEY });
        void refreshProfileCredits();
      }
    },
    Boolean(user?.id),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth", { replace: true });
        return;
      }
      if (!cancelled) {
        setUser(session.user);
        let { data: prof } = await supabase
          .from("profiles")
          .select("display_name, tokens_balance, chat_daily_quota_date, chat_daily_quota_used")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (!prof) {
          await supabase.from("profiles").insert({ user_id: session.user.id });
          const again = await supabase
            .from("profiles")
            .select("display_name, tokens_balance, chat_daily_quota_date, chat_daily_quota_used")
            .eq("user_id", session.user.id)
            .maybeSingle();
          prof = again.data;
        }
        if (!cancelled) {
          setProfileDisplayName(prof?.display_name ?? null);
          setTokensBalance(typeof prof?.tokens_balance === "number" ? prof.tokens_balance : 0);
          setChatDailyQuotaDate(prof?.chat_daily_quota_date ?? null);
          setChatDailyQuotaUsed(typeof prof?.chat_daily_quota_used === "number" ? prof.chat_daily_quota_used : null);
        }
        await refreshToy(session.user.id);
      }
      if (!cancelled) setAuthLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) {
        navigate("/auth", { replace: true });
        return;
      }
      setUser(session.user);
      void (async () => {
        let { data: prof } = await supabase
          .from("profiles")
          .select("display_name, tokens_balance, chat_daily_quota_date, chat_daily_quota_used")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (!prof) {
          await supabase.from("profiles").insert({ user_id: session.user.id });
          const again = await supabase
            .from("profiles")
            .select("display_name, tokens_balance, chat_daily_quota_date, chat_daily_quota_used")
            .eq("user_id", session.user.id)
            .maybeSingle();
          prof = again.data;
        }
        setProfileDisplayName(prof?.display_name ?? null);
        setTokensBalance(typeof prof?.tokens_balance === "number" ? prof.tokens_balance : 0);
        setChatDailyQuotaDate(prof?.chat_daily_quota_date ?? null);
        setChatDailyQuotaUsed(typeof prof?.chat_daily_quota_used === "number" ? prof.chat_daily_quota_used : null);
      })();
      void refreshToy(session.user.id);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate, refreshToy]);

  useEffect(() => {
    const st = location.state as { activeNav?: NavId | "breeding" } | null | undefined;
    const nav = st?.activeNav;
    if (nav) {
      const next = (nav === "breeding" ? "nexus" : nav) as DashboardNavId;
      setActiveNav(next);
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set(DASHBOARD_NAV_QUERY, next);
          return p;
        },
        { replace: true },
      );
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate, setSearchParams]);

  useEffect(() => {
    const fromUrl = parseDashboardNavParam(searchParams.get(DASHBOARD_NAV_QUERY));
    if (fromUrl && fromUrl !== activeNav) {
      setActiveNav(fromUrl);
    }
  }, [searchParams, activeNav]);

  useEffect(() => {
    if (!profileOpen) return;
    const onDown = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [profileOpen]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const openSettings = () => {
    setSettingsOpen(true);
    setProfileOpen(false);
  };

  const handleNav = (id: NavId) => {
    setActiveNav(id);
    if (id !== "history") setSettingsOpen(false);
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set(DASHBOARD_NAV_QUERY, id);
        return p;
      },
      { replace: true },
    );
  };

  const handleSettingsNav = () => {
    setActiveNav("dashboard");
    setSettingsOpen(true);
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set(DASHBOARD_NAV_QUERY, "dashboard");
        return p;
      },
      { replace: true },
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-sans">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Flame className="h-10 w-10 text-primary animate-pulse" style={{ color: NEON_PINK }} />
          <p className="text-sm text-muted-foreground tracking-wide">Awakening your vault…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans relative overflow-x-hidden overflow-y-auto">
      <ParticleBackground />
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.07] via-transparent to-background pointer-events-none" />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[min(900px,100vw)] h-[500px] rounded-full blur-[140px] pointer-events-none opacity-40"
        style={{ background: `radial-gradient(ellipse at center, ${NEON_PINK}33, transparent 65%)` }}
      />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-accent/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden md:flex w-[260px] shrink-0 flex-col border-r border-border/80 bg-black/50 backdrop-blur-xl py-8 px-5">
          <div className="mb-10 w-full flex justify-center px-1">
            <div className="flex w-full max-w-[14rem] flex-col items-center gap-3 text-center">
              <Link to="/" className="group flex flex-col items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-primary/35 rounded-xl px-2 py-1">
                <Flame
                  className="h-8 w-8 shrink-0 drop-shadow-[0_0_12px_rgba(255,45,123,0.5)] transition-transform group-hover:scale-[1.05]"
                  style={{ color: NEON_PINK }}
                  aria-hidden
                />
                <span className="font-gothic text-xl font-bold leading-tight tracking-tight">
                  <span className="gradient-vice-text">LustForge</span>{" "}
                  <span className="text-foreground/90 text-lg font-bold">AI</span>
                </span>
              </Link>
              <div className="w-full border-t border-border/50 pt-3">
                <p className="text-[10px] uppercase tracking-[0.42em] text-muted-foreground text-center font-medium">
                  Command Deck
                </p>
              </div>
            </div>
          </div>

          <nav className="flex flex-col gap-1.5 flex-1">
            {DASHBOARD_NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleNav(id)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-all border border-transparent",
                  activeNav === id && !settingsOpen
                    ? "bg-primary/10 text-primary border-primary/25 shadow-[0_0_20px_rgba(255,45,123,0.12)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5 hover:border-border/60",
                )}
              >
                <Icon className={cn("h-5 w-5 shrink-0", activeNav === id && !settingsOpen && "text-[#FF2D7B]")} />
                {label}
              </button>
            ))}
            <Link
              to="/account"
              state={{ from: `${location.pathname}${location.search}` }}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-all border border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5 hover:border-border/60 mt-2"
            >
              <UserRound className="h-5 w-5 shrink-0" />
              Account
            </Link>
            <button
              type="button"
              onClick={handleSettingsNav}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-all border",
                settingsOpen
                  ? "bg-velvet-purple/20 text-accent border-accent/30 glow-teal"
                  : "text-muted-foreground border-transparent hover:text-foreground hover:bg-white/5 hover:border-border/60",
              )}
            >
              <span className="relative flex h-5 w-5 items-center justify-center shrink-0">
                <span className="absolute h-2 w-2 rounded-full bg-accent animate-pulse opacity-60 left-0 top-0" />
                <Settings className="h-5 w-5 relative" />
              </span>
              Preferences
            </button>
          </nav>

          <div className="mt-auto pt-8 border-t border-border/60 space-y-3">
            <Link
              to="/"
              className="block text-center text-xs text-muted-foreground hover:text-primary transition-colors py-2"
            >
              ← Back to site
            </Link>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="relative z-[100] isolate shrink-0 border-b border-border/80 bg-black/40 backdrop-blur-xl px-4 sm:px-8 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-gothic text-2xl sm:text-3xl font-bold tracking-tight">
                <span className="text-foreground">Welcome back, </span>
                <span className="gradient-vice-text normal-case">{greetingName}</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1 italic">
                Your forge is live — every pulse, every whisper, yours to command.
              </p>
            </div>

            <div className="flex w-full sm:w-auto min-w-0 sm:justify-end">
              <div
                className={cn(
                  "inline-flex w-full min-w-0 sm:w-auto max-w-full items-stretch sm:items-center",
                  "rounded-2xl border border-white/[0.08] bg-zinc-950/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-md",
                )}
              >
                {/* Device status — same chrome as the rest, accent only on the signal dot */}
                <div
                  className={cn(
                    "flex min-w-0 flex-1 sm:flex-initial items-center gap-2 px-3.5 py-2 sm:py-2.5 pl-3.5 sm:pl-4",
                    "text-sm text-foreground/90",
                  )}
                  title={toyConnected && toyLabel ? `Toy: ${toyLabel}` : undefined}
                >
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-zinc-950/80",
                      toyConnected
                        ? "bg-emerald-400 ring-emerald-400/35 shadow-[0_0_10px_hsl(142_76%_50%/0.5)]"
                        : "bg-zinc-500 ring-zinc-500/20",
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="sr-only">{toyConnected ? "Toy connected" : "Toy not connected"}. </span>
                    {toyConnected ? (
                      <>
                        <span className="text-muted-foreground/90 max-sm:hidden">Toy · </span>
                        <span className="font-medium text-foreground/95 truncate sm:max-w-[10rem] md:max-w-[14rem]">
                          {toyLabel?.trim() || "Connected"}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">No toy</span>
                    )}
                  </span>
                </div>

                {isAdmin && (
                  <>
                    <span
                      className="hidden w-px shrink-0 self-stretch my-2 bg-gradient-to-b from-transparent via-white/12 to-transparent sm:block"
                      aria-hidden
                    />
                    <Link
                      to="/admin"
                      className={cn(
                        "shrink-0 flex items-center justify-center gap-2 border-l border-white/[0.06] sm:border-l-0",
                        "px-3.5 sm:px-3 py-2 sm:py-0 sm:h-full sm:min-h-[2.75rem]",
                        "text-sm font-medium text-foreground/85 hover:text-primary hover:bg-white/[0.04] transition-colors",
                        "active:bg-white/[0.06] sm:rounded-none",
                      )}
                    >
                      <Shield className="h-4 w-4 text-velvet-purple/90 shrink-0" aria-hidden />
                      <span className="whitespace-nowrap sm:inline">Admin</span>
                    </Link>
                  </>
                )}

                <span
                  className="hidden w-px shrink-0 self-stretch my-2 bg-gradient-to-b from-transparent via-white/12 to-transparent sm:block"
                  aria-hidden
                />
                <Link
                  to="/buy-credits"
                  className={cn(
                    "shrink-0 flex items-center justify-center gap-2 min-w-0",
                    "border-l border-white/[0.06] pl-3 pr-2.5 sm:pl-3 sm:pr-3.5",
                    "py-2 sm:py-0 sm:min-h-[2.75rem] sm:items-center",
                    "text-sm font-medium text-foreground/90",
                    "hover:text-primary hover:bg-white/[0.04] transition-colors",
                    "active:bg-white/[0.06]",
                  )}
                >
                  <Coins className="h-4 w-4 text-primary/90 shrink-0" aria-hidden />
                  <span className="min-w-0 sm:whitespace-nowrap text-left sm:text-center">
                    <span className="md:hidden">Coins</span>
                    <span className="hidden md:inline">Buy Forge Coins</span>
                  </span>
                </Link>

                <span
                  className="hidden w-px shrink-0 self-stretch my-2 bg-gradient-to-b from-transparent via-white/12 to-transparent sm:block"
                  aria-hidden
                />
                <div
                  className={cn(
                    "shrink-0 border-l border-white/[0.06] pl-2 pr-2.5 sm:pl-1 sm:pr-1.5",
                    "py-1.5 sm:py-1.5 sm:flex sm:items-center",
                  )}
                >
                  <div className="relative" ref={profileRef}>
                    <button
                      type="button"
                      onClick={() => setProfileOpen((o) => !o)}
                      className="relative block rounded-full p-0.5 transition-all ring-1 ring-white/12 ring-offset-2 ring-offset-zinc-950/90 hover:ring-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                      aria-expanded={profileOpen}
                      aria-label="Open account menu"
                      aria-haspopup="menu"
                    >
                      {avatarUrl(user) ? (
                        <img
                          src={avatarUrl(user)}
                          alt=""
                          className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold text-white/95 font-sans bg-gradient-to-br from-zinc-700 to-zinc-900 ring-1 ring-inset ring-white/10"
                        >
                          {initialsFromGreeting(greetingName)}
                        </div>
                      )}
                    </button>

                    <AnimatePresence>
                      {profileOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.97 }}
                          transition={{ type: "spring", stiffness: 400, damping: 28 }}
                          className="absolute right-0 top-[calc(100%+10px)] w-56 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden z-[200]"
                        >
                          <div className="px-4 py-3 border-b border-border/60 bg-white/[0.03]">
                            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                          </div>
                          <div className="p-1.5">
                            <Link
                              to="/account"
                              onClick={() => setProfileOpen(false)}
                              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                            >
                              <UserRound className="h-4 w-4" />
                              Account
                            </Link>
                            <Link
                              to="/settings#device-connection"
                              onClick={() => setProfileOpen(false)}
                              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-foreground hover:bg-[#00ffd4]/10 hover:text-[#00ffd4] transition-colors"
                            >
                              <Gamepad2 className="h-4 w-4" />
                              Connect Lovense
                            </Link>
                            <button
                              type="button"
                              onClick={openSettings}
                              className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-left text-foreground hover:bg-accent/10 hover:text-accent transition-colors"
                            >
                              <Bell className="h-4 w-4" />
                              Preferences
                            </button>
                            <button
                              type="button"
                              onClick={signOut}
                              className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-left text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <LogOut className="h-4 w-4" />
                              Sign out
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 sm:px-8 py-8 pb-mobile-nav md:pb-8">
            {activeNav === "dashboard" && (
              <DashboardHome
                onCreate={() => navigate("/create-companion")}
                onOpenNexus={() => {
                  setActiveNav("nexus");
                  setSearchParams(
                    (prev) => {
                      const p = new URLSearchParams(prev);
                      p.set(DASHBOARD_NAV_QUERY, "nexus");
                      return p;
                    },
                    { replace: true },
                  );
                }}
                collectionCards={collectionPreview}
                hotPicks={hotPicks}
                statRow={statRow}
                affectionRows={affectionSnapshot}
                recentActivity={recentActivity}
                companionsLoading={companionsLoading || vaultLoading}
                insightsLoading={insightsLoading}
                profileLinkFrom={`${location.pathname}${location.search}`}
                chatRemainingFree={dashboardChatQuotaUi.remainingFree}
                chatNextLineFc={dashboardChatQuotaUi.nextLineFc}
                isAdminUser={isAdmin}
              />
            )}
            {activeNav === "collection" && (
              <CollectionView
                companions={vaultCompanions}
                loading={companionsLoading || vaultLoading}
                onForge={() => navigate("/create-companion")}
              />
            )}
            {activeNav === "discover" && <DiscoverCompanionsGallery />}
            {activeNav === "nexus" && user && (
              <TheNexus
                userId={user.id}
                forgeParents={forgeParents}
                tokensBalance={tokensBalance}
                onCreditsChanged={() => void refreshProfileCredits()}
              />
            )}
            {activeNav === "toy" && (
              <ToyControlView
                connected={toyConnected}
                label={toyLabel}
                onRefresh={() => user && void refreshToy(user.id)}
                onOpenChat={() => navigate("/chat")}
                onOpenDeviceSettings={() => navigate("/settings#device-connection")}
              />
            )}
            {activeNav === "history" && <ChatHistoryView onOpenChat={() => navigate("/chat")} />}
          </main>
        </div>

        {/* Settings panel */}
        <AnimatePresence>
          {settingsOpen && (
            <>
              <motion.button
                type="button"
                aria-label="Close settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSettingsOpen(false)}
                className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm md:left-[260px]"
              />
              <motion.aside
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 280, damping: 32 }}
                className="fixed right-0 top-0 z-[70] h-full w-full max-w-md border-l border-border/80 bg-[hsl(240_15%_5%)]/95 backdrop-blur-2xl shadow-[-20px_0_60px_rgba(0,0,0,0.5)] flex flex-col"
              >
                <div className="flex items-center justify-between px-6 py-5 border-b border-border/60">
                  <h2 className="font-gothic text-2xl gradient-vice-text">Preferences</h2>
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(false)}
                    className="p-2 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3">
                      Identity
                    </h3>
                    <div className="rounded-2xl border border-border/80 bg-card/40 p-4 space-y-2">
                      <p className="text-sm text-foreground font-sans normal-case">{greetingName}</p>
                      <p className="text-xs text-muted-foreground break-all">{user?.email}</p>
                    </div>
                  </section>
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3">
                      Notifications
                    </h3>
                    <ToggleRow
                      label="Session summaries"
                      description="Gentle nudges after long chats."
                      checked={notifySessions}
                      onChange={setNotifySessions}
                    />
                    <ToggleRow
                      label="Product drops"
                      description="Rare companions & hybrid events."
                      checked={notifyMarketing}
                      onChange={setNotifyMarketing}
                    />
                    <div className="rounded-xl border border-border/60 bg-card/30 px-4 py-3 mt-2">
                      <p className="text-sm font-medium text-foreground">Voice call alerts (browser)</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Web Push for &ldquo;incoming call&rdquo; when LustForge is in the background — enable on the full
                        settings page (VAPID + this device).
                      </p>
                      <Link
                        to="/settings#voice-call-alerts"
                        onClick={() => setSettingsOpen(false)}
                        className="mt-2 inline-flex items-center gap-1 text-sm text-accent hover:underline font-medium"
                      >
                        Open full settings <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </section>
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3">
                      Privacy
                    </h3>
                    <ToggleRow
                      label="Local-only history"
                      description="Keep transcripts on this device when possible."
                      checked={privateMode}
                      onChange={setPrivateMode}
                    />
                    <Link
                      to="/privacy-policy"
                      className="mt-3 inline-flex items-center gap-1 text-sm text-accent hover:underline"
                    >
                      Privacy policy <ChevronRight className="h-4 w-4" />
                    </Link>
                  </section>
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3">
                      Device
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Pair or calibrate Lovense from a live session for full haptic sync.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSettingsOpen(false);
                        navigate("/chat");
                      }}
                      className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold glow-pink hover:opacity-95 transition-opacity"
                      style={{ backgroundColor: NEON_PINK }}
                    >
                      Open live session
                    </button>
                  </section>
                </div>
                <div className="p-6 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(false)}
                    className="w-full py-3 rounded-xl border border-accent/40 text-accent font-semibold hover:bg-accent/10 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-card/30 px-4 py-3 mb-2 cursor-pointer hover:border-primary/25 transition-colors">
      <span>
        <span className="text-sm font-medium text-foreground block">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 rounded border-border accent-[#FF2D7B]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function DashboardHome({
  onCreate,
  onOpenNexus,
  collectionCards,
  hotPicks,
  statRow,
  affectionRows,
  recentActivity,
  companionsLoading,
  insightsLoading,
  profileLinkFrom,
  chatRemainingFree,
  chatNextLineFc,
  isAdminUser,
}: {
  onCreate: () => void;
  onOpenNexus: () => void;
  collectionCards: Companion[];
  hotPicks: { companion: Companion; lastChatAt: string | null }[];
  statRow: { key: string; label: string; value: string; accent: string; sub?: string }[];
  affectionRows: { name: string; pct: number; tier: string }[];
  recentActivity: { t: string; msg: string; tone: "pink" | "teal" | "purple" }[];
  companionsLoading: boolean;
  insightsLoading: boolean;
  profileLinkFrom: string;
  chatRemainingFree: number;
  chatNextLineFc: number;
  isAdminUser: boolean;
}) {
  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      {/* Stats — four even tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statRow.map((s, i) => (
          <motion.div
            key={s.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-border/80 bg-card/50 backdrop-blur-md p-4 sm:p-5 relative overflow-hidden group"
          >
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/5 blur-2xl group-hover:bg-primary/10 transition-colors" />
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">
              {s.label}
            </p>
            <p className={cn("font-gothic text-2xl sm:text-3xl mt-2", s.accent)}>{s.value}</p>
            {s.sub ? <p className="text-[10px] text-muted-foreground/80 mt-1.5 leading-snug">{s.sub}</p> : null}
          </motion.div>
        ))}
      </div>

      <section className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-black/55 via-card/35 to-cyan-950/10 p-5 sm:p-6 shadow-[0_0_44px_rgba(255,45,123,0.1),inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-gothic text-lg sm:text-xl text-white flex items-center gap-2 min-w-0">
            <MessageSquare className="h-5 w-5 shrink-0 text-primary" style={{ color: NEON_PINK }} />
            Companion chat — free lines today
          </h3>
        </div>
        <p className="mt-1.5 text-[11px] sm:text-xs text-muted-foreground leading-relaxed max-w-2xl">
          Classic text uses a shared daily pool (UTC). After it runs out, each line bills Forge Coins at the rate shown
          below.
        </p>
        {isAdminUser ? (
          <p className="mt-3 text-xs text-muted-foreground">Admin accounts skip message quota metering.</p>
        ) : (
          <DailyFreeMessagesBar
            visible
            className="mt-3 text-[11px] sm:text-xs px-3.5 py-2.5"
            remainingFree={chatRemainingFree}
            nextLineFc={chatNextLineFc}
            isAdminUser={false}
          />
        )}
      </section>

      {/* Quick actions — centered under the stat row */}
      <div className="flex w-full justify-center pt-1">
        <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCreate}
            className="flex w-full min-h-[3.5rem] items-center justify-center gap-3 rounded-2xl py-4 px-6 font-semibold text-primary-foreground shadow-lg border border-white/10"
            style={{ background: `linear-gradient(135deg, ${NEON_PINK}, hsl(280 50% 35%))` }}
          >
            <Hammer className="h-5 w-5 shrink-0 opacity-95" />
            Create Companion
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpenNexus}
            className="flex w-full min-h-[3.5rem] items-center justify-center gap-3 rounded-2xl py-4 px-6 font-semibold text-primary-foreground border border-accent/40 bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
          >
            <Orbit className="h-5 w-5 shrink-0" />
            The Nexus
          </motion.button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Collection */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-gothic text-2xl sm:text-3xl flex items-center gap-2">
                <Layers className="h-7 w-7 text-primary shrink-0" style={{ color: NEON_PINK }} />
                Your Collection
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Tap a card to open the full companion profile.</p>
            </div>
            <span className="text-xs text-muted-foreground uppercase tracking-widest hidden sm:block font-gothic">
              Signature tiers
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
            {companionsLoading ? (
              Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-border/60 bg-card/40 aspect-[2/3] animate-pulse"
                />
              ))
            ) : collectionCards.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-border/80 bg-card/30 p-8 text-center text-sm text-muted-foreground">
                No companions in your roster yet. Forge one in Studio or browse Discover.
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={onCreate}
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-primary-foreground"
                    style={{ backgroundColor: NEON_PINK }}
                  >
                    <Hammer className="h-4 w-4" />
                    Open Companion Forge
                  </button>
                </div>
              </div>
            ) : (
              collectionCards.map((c, idx) => <MiniCompanionCard key={c.id} companion={c} index={idx} />)
            )}
          </div>
        </section>

        {/* Right column widgets */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-border/80 bg-card/40 backdrop-blur-md p-5">
            <h3 className="font-gothic text-lg flex items-center gap-2 text-primary mb-1" style={{ color: NEON_PINK }}>
              <Heart className="h-5 w-5" />
              Affection overview
            </h3>
            <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
              From your chat bond tiers (same progression as in chat).
            </p>
            <div className="space-y-5">
              {insightsLoading && affectionRows.length === 0
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-3 w-1/2 rounded bg-muted/40 animate-pulse" />
                      <div className="h-2 w-full rounded bg-muted/30 animate-pulse" />
                    </div>
                  ))
                : null}
              {!insightsLoading && affectionRows.length === 0 ? (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  No bond data yet — open a companion in Chat to build your first tier.
                </p>
              ) : null}
              {affectionRows.map((row) => (
                <div key={row.name}>
                  <div className="flex justify-between text-xs mb-1.5 gap-2">
                    <span className="text-foreground font-medium min-w-0 truncate">{row.name}</span>
                    <span className="text-muted-foreground shrink-0">{row.tier}</span>
                  </div>
                  <Progress value={row.pct} className="h-2 bg-secondary/80 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-accent" />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 to-transparent p-5">
            <div className="flex items-start justify-between gap-3 mb-1">
              <h3 className="font-gothic text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent shrink-0" />
                Hot right now
              </h3>
              <Flame className="h-4 w-4 text-primary opacity-80 mt-0.5 shrink-0" style={{ color: NEON_PINK }} />
            </div>
            <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
              Ranked by recent chat, then your vault order — jump back in fast.
            </p>
            <div className="space-y-3">
              {hotPicks.length === 0 ? (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Add companions to your vault or start a chat — this list ranks who you’re spending time with.
                </p>
              ) : null}
              {hotPicks.slice(0, 4).map(({ companion: c, lastChatAt }) => (
                <Link
                  key={c.id}
                  to={`/companions/${c.id}`}
                  state={{ from: profileLinkFrom }}
                  className="w-full flex items-center gap-3 rounded-xl border border-border/60 bg-black/30 p-2.5 text-left hover:border-primary/35 transition-colors group"
                >
                  <div className="h-12 w-10 shrink-0 overflow-visible p-0.5">
                    <TierHaloPortraitFrame
                      variant="compact"
                      frameStyle="clean"
                      rarity={normalizeCompanionRarity(c.rarity)}
                      gradientFrom={c.gradientFrom}
                      gradientTo={c.gradientTo}
                      overlayUrl={c.rarityBorderOverlayUrl ?? null}
                      aspectClassName="aspect-[2/3] w-full h-full"
                      rarityFrameBleed
                    >
                      <div
                        className="absolute inset-0 z-0"
                        style={{
                          background: c.portraitUrl
                            ? undefined
                            : `linear-gradient(135deg, ${c.gradientFrom}, ${c.gradientTo})`,
                        }}
                      />
                      {c.portraitUrl ? (
                        <img
                          src={c.portraitUrl}
                          alt=""
                          className="absolute inset-0 z-[1] h-full w-full origin-center scale-[1.02] object-cover object-top"
                        />
                      ) : null}
                    </TierHaloPortraitFrame>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                      {c.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{c.tagline}</p>
                    {lastChatAt ? (
                      <p className="text-[10px] text-accent/90 mt-1">Last chat · {activityRelativeTime(lastChatAt)}</p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground/90 mt-1">In your vault</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 self-center" />
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border/80 bg-card/40 backdrop-blur-md p-5">
            <h3 className="font-gothic text-lg flex items-center gap-2 mb-1">
              <Activity className="h-5 w-5 text-velvet-purple" />
              Recent activity
            </h3>
            <p className="text-[11px] text-muted-foreground mb-4">Forge Coin ledger and your latest chat touches.</p>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {insightsLoading
                  ? "Loading your feed…"
                  : "No ledger or chat history yet — say hi in Chat or visit Buy Forge Coins when you’re ready."}
              </p>
            ) : (
              <ul className="space-y-4">
                {recentActivity.map((item, i) => (
                  <li key={`${item.t}-${i}`} className="flex gap-3 text-sm">
                    <span
                      className={cn(
                        "shrink-0 w-1 rounded-full self-stretch min-h-[2.5rem]",
                        item.tone === "pink" && "bg-primary",
                        item.tone === "teal" && "bg-accent",
                        item.tone === "purple" && "bg-velvet-purple",
                      )}
                      style={item.tone === "pink" ? { backgroundColor: NEON_PINK } : undefined}
                    />
                    <div>
                      <p className="text-muted-foreground leading-snug">{item.msg}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 mt-1">{item.t}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function MiniCompanionCard({ companion: c, index }: { companion: Companion; index: number }) {
  const location = useLocation();
  const rarity = c.rarity ?? "common";
  const cardTraits = useMemo(() => resolveDisplayTraitsForCompanion(c), [c]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="text-left rounded-2xl border border-transparent bg-card/60 backdrop-blur-sm overflow-visible group shadow-lg shadow-black/20 transition-colors p-1.5 max-md:p-1"
    >
      <Link
        to={`/companions/${c.id}`}
        state={{ from: `${location.pathname}${location.search}` }}
        className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-2xl overflow-visible"
      >
        <TierHaloPortraitFrame
          variant="card"
          frameStyle="clean"
          rarity={rarity}
          gradientFrom={c.gradientFrom}
          gradientTo={c.gradientTo}
          overlayUrl={c.rarityBorderOverlayUrl}
          rarityFrameBleed
        >
          <div
            className="absolute inset-0 z-0"
            style={{
              background: c.portraitUrl
                ? undefined
                : `linear-gradient(160deg, ${c.gradientFrom}, ${c.gradientTo})`,
            }}
          />
          {c.portraitUrl ? (
            <img
              src={c.portraitUrl}
              alt=""
              className="absolute inset-0 z-[1] h-full w-full origin-center scale-[1.02] object-cover object-top"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : null}
          <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
          {c.isNexusHybrid ? (
            <div className="absolute left-2 top-2 z-[3] max-w-[44%] truncate text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md border border-fuchsia-500/40 bg-fuchsia-950/50 text-fuchsia-100/90">
              Nexus
            </div>
          ) : null}
          <div className="absolute top-2 right-2 z-[3] max-w-[52%] truncate px-1.5 py-0.5 rounded-md bg-black/60 border border-white/10 text-[8px] font-bold uppercase tracking-wide text-white/90">
            {c.role}
          </div>
          {cardTraits.length > 0 ? (
            <div
              className="absolute bottom-[3.5rem] left-0 right-0 z-[3] px-1 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <CompanionVibeTraitStrip traits={cardTraits} className="justify-center" size="sm" max={3} />
            </div>
          ) : null}
          <div className="absolute inset-x-0 bottom-0 z-[3] p-3 space-y-0.5">
            <p className="text-xs font-bold text-white truncate leading-tight">{c.name}</p>
            <p className="text-[10px] text-white/70 truncate">{c.tagline}</p>
          </div>
          <div className="absolute inset-0 z-[3] opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
        </TierHaloPortraitFrame>
      </Link>
    </motion.div>
  );
}

function CollectionView({
  companions: list,
  loading,
  onForge,
}: {
  companions: Companion[];
  loading: boolean;
  onForge: () => void;
}) {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="font-gothic text-3xl gradient-vice-text">My Collection</h2>
        <p className="text-muted-foreground mt-2 text-sm max-w-xl">
          Your forged cards (except admin Discover-only lab drops) plus anyone you saved from Discover. Pin more from a
          companion profile.
        </p>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/60 bg-card/40 aspect-[2/3] animate-pulse" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-primary/30 bg-card/40 p-10 text-center space-y-4">
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Nothing here yet. Use Companion Forge to create a custom card — it will show up in this grid and in chat.
          </p>
          <button
            type="button"
            onClick={onForge}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-primary-foreground"
            style={{ backgroundColor: NEON_PINK }}
          >
            <Hammer className="h-4 w-4" />
            Companion Forge
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {list.map((c, i) => (
            <MiniCompanionCard key={c.id} companion={c} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function ToyControlView({
  connected,
  label,
  onRefresh,
  onOpenChat,
  onOpenDeviceSettings,
}: {
  connected: boolean;
  label: string | null;
  onRefresh: () => void;
  onOpenChat: () => void;
  onOpenDeviceSettings: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="font-gothic text-3xl flex items-center gap-3">
          <Gamepad2 className="h-8 w-8 text-accent" />
          Toy control
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Same Lovense link as <strong className="text-foreground/90">Settings → Device connection</strong> and the
          profile menu — pair once; chat, dashboard, and patterns all use it.
        </p>
      </div>
      <div className="rounded-2xl border border-border/80 bg-card/50 backdrop-blur-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Bridge status</span>
          <button
            type="button"
            onClick={onRefresh}
            className="text-xs uppercase tracking-widest text-accent hover:underline"
          >
            Refresh
          </button>
        </div>
        <div
          className={cn(
            "rounded-xl border px-4 py-4 text-sm",
            connected ? "border-accent/40 bg-accent/5 text-accent" : "border-border bg-black/30 text-muted-foreground",
          )}
        >
          {connected
            ? `Linked${label ? ` — ${label}` : ""}. Session commands will route in real time.`
            : "No toy linked yet. Pair with the QR code in Settings (or dashboard profile → Connect Lovense), then refresh here."}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={onOpenDeviceSettings}
            className="flex-1 py-3 rounded-xl font-semibold border border-accent/40 bg-accent/10 text-accent hover:bg-accent/15 transition-colors"
          >
            Pair in Settings
          </button>
          <button
            type="button"
            onClick={onOpenChat}
            className="flex-1 py-3 rounded-xl font-semibold text-primary-foreground glow-pink"
            style={{ backgroundColor: NEON_PINK }}
          >
            Open live session
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatHistoryView({ onOpenChat }: { onOpenChat: () => void }) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="font-gothic text-3xl flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-primary" style={{ color: NEON_PINK }} />
          Chat history
        </h2>
        <button
          type="button"
          onClick={onOpenChat}
          className="text-sm font-semibold text-accent hover:underline"
        >
          New session →
        </button>
      </div>
      <ul className="space-y-3">
        {MOCK_THREADS.map((t) => (
          <li key={t.title}>
            <button
              type="button"
              onClick={onOpenChat}
              className="w-full text-left rounded-2xl border border-border/80 bg-card/40 backdrop-blur-md p-4 hover:border-primary/30 transition-colors group"
            >
              <div className="flex justify-between items-start gap-2 mb-1">
                <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {t.title}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">{t.at}</span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{t.preview}</p>
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground text-center italic">
        Full transcripts stay private to your device whenever local-only mode is enabled in Settings.
      </p>
    </div>
  );
}
