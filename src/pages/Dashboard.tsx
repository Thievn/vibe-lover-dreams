import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Heart, Zap, Crown, Shield, Settings, LogOut, Flame,
  MessageCircle, Volume2, Sparkles, Baby, Gamepad2, Clock,
  Wifi, WifiOff, User, Menu, X, Trophy,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type Rarity = "Legendary" | "Epic" | "Rare" | "Common";

type CompanionCard = {
  id: string;
  name: string;
  rarity: Rarity;
  level: number;
  description: string;
  starters: string[];
  vibration: string;
  affection: number;
};

const rarityStyles: Record<Rarity, { border: string; glow: string; tag: string; tagBg: string }> = {
  Legendary: { border: "border-yellow-400/70", glow: "shadow-[0_0_30px_hsl(45_100%_60%/0.4)]", tag: "text-yellow-300", tagBg: "bg-yellow-500/10 border-yellow-400/40" },
  Epic: { border: "border-purple-400/70", glow: "shadow-[0_0_30px_hsl(280_100%_60%/0.4)]", tag: "text-purple-300", tagBg: "bg-purple-500/10 border-purple-400/40" },
  Rare: { border: "border-cyan-400/70", glow: "shadow-[0_0_30px_hsl(180_100%_60%/0.4)]", tag: "text-cyan-300", tagBg: "bg-cyan-500/10 border-cyan-400/40" },
  Common: { border: "border-white/20", glow: "", tag: "text-muted-foreground", tagBg: "bg-white/5 border-white/20" },
};

const placeholderCollection: CompanionCard[] = [
  {
    id: "1",
    name: "Nyx Shadowveil",
    rarity: "Legendary",
    level: 85,
    description: "Eternal temptress of midnight desires. Whispers secrets that shatter resolve.",
    starters: ["Kneel before me…", "Your will is mine."],
    vibration: "Pulsing Abyss",
    affection: 92,
  },
  {
    id: "2",
    name: "Vexara Thorn",
    rarity: "Epic",
    level: 72,
    description: "Sadistic hybrid breeder. Turns pain into exquisite, addictive pleasure.",
    starters: ["Beg for the thorns.", "Breed or break."],
    vibration: "Thorn Whip",
    affection: 78,
  },
  {
    id: "3",
    name: "Lirael Voidheart",
    rarity: "Rare",
    level: 59,
    description: "Cyber-goth siren with vibrating toys that rewrite ecstasy itself.",
    starters: ["Feel the void pulse.", "Surrender to rhythm."],
    vibration: "Sonic Void",
    affection: 65,
  },
  {
    id: "4",
    name: "Draven Bloodforge",
    rarity: "Legendary",
    level: 92,
    description: "Forge-master of legendary companions. Unyielding, absolute dominance.",
    starters: ["Forge your fate.", "Blood binds us."],
    vibration: "Forge Hammer",
    affection: 88,
  },
];

const sidebarItems = [
  { id: "dashboard", label: "Dashboard", icon: Flame },
  { id: "collection", label: "My Collection", icon: Trophy },
  { id: "breeding", label: "Breeding Chamber", icon: Baby },
  { id: "toy-control", label: "Toy Control", icon: Gamepad2 },
  { id: "chat-history", label: "Chat History", icon: MessageCircle },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [toyConnected, setToyConnected] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          navigate("/auth");
          return;
        }

        setUser(session.user);
        setIsAdmin(session.user.email === "lustforgeapp@gmail.com");
        setToyConnected(Math.random() > 0.5);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session?.user) {
        navigate("/auth", { replace: true });
        return;
      }
      setUser(session.user);
      setIsAdmin(session.user.email === "lustforgeapp@gmail.com");
    });

    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  const displayName = user?.user_metadata?.username || user?.email?.split("@")[0] || "Forgemaster";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Flame className="h-8 w-8 text-primary mx-auto animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading your empire…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-pink-500/5 blur-[150px]" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-purple-500/5 blur-[120px]" />

      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur-xl">
        <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-white/5 lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="font-gothic text-xl font-bold text-white">Welcome back, <span className="text-pink-400">{displayName}</span></h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Toy Status */}
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs">
              {toyConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-emerald-400" />
                  Toy Connected
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-muted-foreground" />
                  Toy Offline
                </>
              )}
            </div>

            {/* Admin Button - Only for you */}
            {isAdmin && (
              <button
                onClick={() => navigate("/admin")}
                className="flex items-center gap-2 px-5 py-2 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium hover:scale-[1.03] transition-all shadow-lg shadow-purple-500/30"
              >
                <Shield className="h-4 w-4" />
                Admin Panel
              </button>
            )}

            {/* Profile */}
            <button
              onClick={() => navigate("/account")}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/5 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center ring-1 ring-white/10">
                <User className="h-5 w-5 text-pink-400" />
              </div>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed lg:static inset-y-0 left-0 z-50 w-72 bg-zinc-950/95 backdrop-blur-xl border-r border-white/10"
            >
              {/* Sidebar content - your original sidebar logic stays */}
              <div className="p-6">
                <div className="flex justify-between items-center mb-8">
                  <span className="font-gothic text-xl tracking-widest text-white">LUSTFORGE</span>
                  <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <nav className="space-y-1">
                  {sidebarItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm transition-all ${
                        activeTab === item.id
                          ? "bg-white/10 text-white"
                          : "text-zinc-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </button>
                  ))}
                </nav>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-10">
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-7xl mx-auto space-y-12"
              >
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { icon: Users, label: "Companions", value: 12, color: "text-pink-400" },
                    { icon: Heart, label: "Hybrids Bred", value: 3, color: "text-purple-400" },
                    { icon: Zap, label: "Toy Sessions", value: 47, color: "text-cyan-400" },
                    { icon: Crown, label: "Legendaries", value: 2, color: "text-yellow-400" },
                    { icon: Clock, label: "Hours Chatted", value: 89, color: "text-white" },
                  ].map((stat, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-zinc-950/70 border border-white/10 backdrop-blur-xl rounded-3xl p-6 hover:border-pink-500/30 transition-all"
                    >
                      <stat.icon className={`h-6 w-6 ${stat.color} mb-4`} />
                      <div className="text-4xl font-bold text-white mb-1">{stat.value}</div>
                      <div className="text-sm text-zinc-400">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-4">
                  <button className="flex-1 min-w-[200px] flex items-center justify-center gap-3 bg-pink-600 hover:bg-pink-700 py-4 rounded-2xl font-medium text-lg transition-all">
                    <Sparkles className="h-5 w-5" />
                    Create Companion
                  </button>
                  <button className="flex-1 min-w-[200px] flex items-center justify-center gap-3 bg-purple-600 hover:bg-purple-700 py-4 rounded-2xl font-medium text-lg transition-all">
                    <Baby className="h-5 w-5" />
                    Breed Hybrid
                  </button>
                </div>

                {/* Recent Activity */}
                <div className="bg-zinc-950/70 border border-white/10 backdrop-blur-xl rounded-3xl p-8">
                  <h3 className="font-gothic text-lg tracking-widest mb-6 text-white">Recent Activity</h3>
                  <div className="space-y-4">
                    {[
                      { action: "Bred a Legendary hybrid", time: "2 hours ago", icon: Baby },
                      { action: "Connected toy device", time: "1 day ago", icon: Gamepad2 },
                      { action: "Reached affection level 90", time: "3 days ago", icon: Heart },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors">
                        <item.icon className="h-5 w-5 text-pink-400" />
                        <div className="flex-1 text-sm text-white">{item.action}</div>
                        <div className="text-xs text-zinc-500">{item.time}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Your Collection - Larger Cards */}
                <div>
                  <div className="flex justify-between items-end mb-6">
                    <h2 className="font-gothic text-2xl tracking-widest text-white">Your Collection</h2>
                    <button onClick={() => setActiveTab("collection")} className="text-pink-400 hover:text-pink-300 text-sm flex items-center gap-1">
                      View All <span>→</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {placeholderCollection.map((card, i) => {
                      const rs = rarityStyles[card.rarity];
                      return (
                        <motion.div
                          key={card.id}
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08 }}
                          whileHover={{ y: -8, scale: 1.02 }}
                          className={`bg-zinc-950 border-2 ${rs.border} rounded-3xl overflow-hidden hover:${rs.glow} transition-all duration-300 group cursor-pointer`}
                        >
                          <div className="h-56 bg-gradient-to-br from-zinc-900 to-black relative flex items-center justify-center">
                            <div className="text-6xl opacity-10">🖤</div>
                          </div>
                          <div className="p-6">
                            <div className="flex justify-between mb-3">
                              <span className={`px-3 py-1 text-xs font-bold rounded-full ${rs.tagBg} ${rs.tag}`}>
                                {card.rarity}
                              </span>
                              <span className="text-xs text-zinc-500">Lv.{card.level}</span>
                            </div>
                            <h4 className="font-gothic text-xl text-white mb-2">{card.name}</h4>
                            <p className="text-sm text-zinc-400 line-clamp-2 mb-4">{card.description}</p>
                            <div className="flex justify-between text-xs">
                              <div className="flex items-center gap-1 text-pink-400">
                                <Volume2 className="h-3.5 w-3.5" /> {card.vibration}
                              </div>
                              <div className="text-pink-400">♥ {card.affection}</div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Other tabs placeholder */}
            {activeTab !== "dashboard" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20"
              >
                <h2 className="font-gothic text-2xl text-white mb-4">
                  {sidebarItems.find(i => i.id === activeTab)?.label}
                </h2>
                <p className="text-zinc-400">This section is coming soon...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}