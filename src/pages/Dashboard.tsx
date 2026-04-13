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
  Legendary: { border: "border-yellow-500/60", glow: "shadow-[0_0_25px_hsl(45_100%_50%/0.35)]", tag: "text-yellow-400", tagBg: "bg-yellow-500/10 border-yellow-500/30" },
  Epic: { border: "border-purple-500/60", glow: "glow-purple", tag: "text-purple-400", tagBg: "bg-purple-500/10 border-purple-500/30" },
  Rare: { border: "border-cyan-400/60", glow: "glow-teal", tag: "text-cyan-400", tagBg: "bg-cyan-500/10 border-cyan-400/30" },
  Common: { border: "border-border", glow: "", tag: "text-muted-foreground", tagBg: "bg-muted border-border" },
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

        const currentUser = session.user;
        setUser(currentUser);
        setIsAdmin(currentUser.email === "lustforgeapp@gmail.com");

        setToyConnected(Math.random() > 0.5);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        navigate("/auth", { replace: true });
        return;
      }
      setUser(session.user);
      setIsAdmin(session.user.email === "lustforgeapp@gmail.com");
    });

    return () => listener?.subscription.unsubscribe();
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient glow blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-secondary/5 blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-[300px] h-[300px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />

      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-muted transition-colors lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="font-gothic text-base font-bold gradient-vice-text">
              Welcome back, {displayName}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Toy Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted border border-border text-xs">
              {toyConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-accent" />
                  <span className="text-muted-foreground">Toy Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Toy Offline</span>
                </>
              )}
            </div>

            {/* ADMIN BUTTON - Only visible to you */}
            {isAdmin && (
              <button
                onClick={() => navigate("/admin")}
                className="flex items-center gap-2 px-5 py-2 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium hover:scale-105 transition-all"
              >
                <Shield className="h-4 w-4" />
                Admin Panel
              </button>
            )}

            {/* Profile */}
            <button
              onClick={() => navigate("/account")}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-muted transition-colors"
              title="Account/Profile"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground hidden sm:block">Account</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed lg:relative inset-y-0 left-0 z-40 w-[260px] bg-card/95 backdrop-blur-xl border-r border-border shadow-2xl"
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-6 border-b border-border">
                  <Link to="/" className="font-gothic text-base font-bold gradient-vice-text">
                    LustForge
                  </Link>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-1 rounded-lg hover:bg-muted transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1">
                  {sidebarItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                        activeTab === item.id
                          ? "bg-primary/10 text-primary border border-primary/30 glow-pink"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </button>
                  ))}
                </nav>

                <div className="p-4 border-t border-border space-y-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                  >
                    <LogOut className="h-5 w-5" />
                    Logout
                  </button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 min-h-screen p-6 relative z-10">
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-7xl mx-auto space-y-8"
              >
                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  {[
                    { icon: Users, label: "Companions", value: 12, color: "text-primary" },
                    { icon: Heart, label: "Hybrids Bred", value: 3, color: "text-secondary" },
                    { icon: Zap, label: "Toy Sessions", value: 47, color: "text-accent" },
                    { icon: Crown, label: "Legendaries", value: 2, color: "text-yellow-400" },
                    { icon: Clock, label: "Hours Chatted", value: 89, color: "text-muted-foreground" },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-card/60 backdrop-blur-sm border border-border rounded-2xl p-6 hover:border-primary/40 hover:glow-pink transition-all duration-300"
                    >
                      <stat.icon className={`h-6 w-6 ${stat.color} mb-3`} />
                      <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                      <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="flex gap-4">
                  <button 
                    onClick={() => navigate('/create-companion')}
                    className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold glow-pink hover:scale-105 transition-all"
                  >
                    <Sparkles className="h-5 w-5" />
                    Create Companion
                  </button>
                  <button
                    onClick={() => setActiveTab("breeding")}
                    className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-secondary text-secondary-foreground font-bold glow-purple hover:scale-105 transition-all"
                  >
                    <Baby className="h-5 w-5" />
                    Breed Hybrid
                  </button>
                </div>

                {/* Recent Activity */}
                <div className="bg-card/60 backdrop-blur-sm border border-border rounded-2xl p-6">
                  <h3 className="font-gothic text-base font-bold text-foreground mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {[
                      { action: "Bred a Legendary hybrid", time: "2 hours ago", icon: Baby, color: "text-yellow-400" },
                      { action: "Connected toy device", time: "1 day ago", icon: Gamepad2, color: "text-accent" },
                      { action: "Reached affection level 90", time: "3 days ago", icon: Heart, color: "text-secondary" },
                    ].map((activity, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <activity.icon className={`h-4 w-4 ${activity.color}`} />
                        <span className="text-sm text-foreground">{activity.action}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{activity.time}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Collection Preview */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-gothic text-lg font-bold gradient-vice-text">Your Collection</h2>
                    <button
                      onClick={() => setActiveTab("collection")}
                      className="text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      View All →
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {placeholderCollection.slice(0, 4).map((card, i) => {
                      const rs = rarityStyles[card.rarity];
                      return (
                        <motion.div
                          key={card.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.1 }}
                          className={`bg-card border-2 ${rs.border} rounded-2xl p-4 hover:scale-105 hover:${rs.glow} transition-all duration-300 cursor-pointer`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${rs.tagBg} ${rs.tag}`}>
                              {card.rarity}
                            </span>
                            <span className="text-xs text-muted-foreground">Lv.{card.level}</span>
                          </div>
                          <h4 className="font-gothic text-base font-bold text-foreground mb-2">{card.name}</h4>
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{card.description}</p>
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1">
                              <Volume2 className="h-3 w-3 text-accent" />
                              <span className="text-muted-foreground">{card.vibration}</span>
                            </div>
                            <span className="text-primary">♥ {card.affection}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "collection" && (
              <motion.div
                key="collection"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-7xl mx-auto"
              >
                <h2 className="font-gothic text-lg font-bold gradient-vice-text mb-6">My Collection</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {placeholderCollection.map((card, i) => {
                    const rs = rarityStyles[card.rarity];
                    return (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        whileHover={{ y: -6, transition: { duration: 0.3 } }}
                        className={`bg-card border-2 ${rs.border} rounded-2xl p-0 overflow-hidden hover:scale-105 hover:${rs.glow} transition-all duration-500 group cursor-pointer`}
                      >
                        <div className="relative h-48 bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity animate-shimmer" />
                        </div>
                        <div className="p-5 space-y-4">
                          <div className="flex justify-between items-start">
                            <h4 className="font-gothic text-base font-bold text-foreground">{card.name}</h4>
                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${rs.tagBg} ${rs.tag}`}>
                              {card.rarity}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Level {card.level}</span>
                            <span className="text-primary">♥ {card.affection}</span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
                          <div className="space-y-2 pt-2 border-t border-border">
                            <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Starters</p>
                            {card.starters.map((starter, sIdx) => (
                              <div key={sIdx} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors p-1 -m-1 rounded hover:bg-muted/50">
                                <MessageCircle className="h-3 w-3 text-primary" />
                                "{starter}"
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 pt-3 border-t border-border">
                            <Volume2 className="h-4 w-4 text-accent" />
                            <span className="text-sm text-muted-foreground">{card.vibration}</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {activeTab !== "dashboard" && activeTab !== "collection" && (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-7xl mx-auto text-center py-20"
              >
                <h2 className="font-gothic text-lg font-bold text-foreground mb-4 capitalize">
                  {sidebarItems.find(item => item.id === activeTab)?.label}
                </h2>
                <p className="text-sm text-muted-foreground">Coming soon...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}