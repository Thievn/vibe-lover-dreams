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
  Common: { border: "border-white/10", glow: "", tag: "text-muted-foreground", tagBg: "bg-muted/50 border-white/10" },
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
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  const displayName = user?.user_metadata?.username || user?.email?.split("@")[0] || "Forgemaster";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center space-y-4"
        >
          <Flame className="h-8 w-8 text-primary mx-auto animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading your empire…</p>
        </motion.div>
      </div>
    );
  }

  if (!user) return null;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, rotateX: 10 },
    visible: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
    hover: {
      y: -8,
      scale: 1.02,
      rotateX: -5,
      transition: { duration: 0.3, ease: "easeOut" },
    },
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient glow blobs - cinematic lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-purple-500/10 to-pink-500/10 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-gradient-to-tl from-teal-500/10 to-purple-500/10 blur-[100px] pointer-events-none animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-0 w-[300px] h-[300px] rounded-full bg-gradient-to-br from-pink-500/5 to-teal-500/5 blur-[100px] pointer-events-none animate-pulse delay-2000" />

      {/* Top Bar - Tight, premium header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl supports-[backdrop-filter]:bg-black/40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-white/10 transition-all lg:hidden"
            >
              <Menu className="h-5 w-5 text-white" />
            </button>
            <h1 className="text-lg font-cinzel text-white font-bold">
              Welcome back<span className="text-pink-400">, {displayName}</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Toy Status - Compact glassmorphism */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/30 backdrop-blur-md border border-white/10 text-xs shadow-lg"
            >
              {toyConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-teal-400" />
                  <span className="text-zinc-300">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-zinc-500" />
                  <span className="text-zinc-500">Offline</span>
                </>
              )}
            </motion.div>

            {/* Admin Panel Button - Only for admin, premium glow */}
            {isAdmin && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/admin")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600/90 to-pink-600/90 text-white text-sm font-medium backdrop-blur-md border border-white/20 shadow-lg hover:shadow-purple-500/30 transition-all"
              >
                <Shield className="h-4 w-4" />
                Admin
              </motion.button>
            )}

            {/* Profile Icon - Clean, clickable */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/account")}
              className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/10 transition-all"
              title="Account"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-800 to-black flex items-center justify-center border border-white/10">
                <User className="h-4 w-4 text-zinc-300" />
              </div>
            </motion.button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Unchanged as requested */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed lg:relative inset-y-0 left-0 z-40 w-[260px] bg-black/80 backdrop-blur-xl border-r border-white/10 shadow-2xl"
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                  <button
                    onClick={() => navigate("/")}
                    className="font-cinzel text-base font-bold text-white"
                  >
                    LustForge
                  </button>
                  <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1">
                  {sidebarItems.map((item) => (
                    <motion.button
                      key={item.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setActiveTab(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all backdrop-blur-md border border-white/10 ${
                        activeTab === item.id
                          ? "bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-white border-purple-500/30 shadow-purple-500/20"
                          : "text-zinc-300 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </motion.button>
                  ))}
                </nav>

                <div className="p-4 border-t border-white/10 space-y-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-white/10 transition-all backdrop-blur-md border border-white/10"
                  >
                    <LogOut className="h-5 w-5" />
                    Logout
                  </motion.button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content - Tighter, organized layout */}
        <main className="flex-1 min-h-screen p-4 lg:p-6 relative z-10">
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && (
              <motion.div
                key="dashboard"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="max-w-7xl mx-auto space-y-6" // Tighter spacing
              >
                {/* Stats Row - Glassmorphism cards, staggered entrance */}
                <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  {[
                    { icon: Users, label: "Companions", value: 12, color: "text-teal-400" },
                    { icon: Heart, label: "Hybrids Bred", value: 3, color: "text-pink-400" },
                    { icon: Zap, label: "Toy Sessions", value: 47, color: "text-purple-400" },
                    { icon: Crown, label: "Legendaries", value: 2, color: "text-yellow-400" },
                    { icon: Clock, label: "Hours Chatted", value: 89, color: "text-zinc-300" },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      variants={cardVariants}
                      whileHover={{ y: -4, scale: 1.02 }}
                      className="bg-black/30 backdrop-blur-md border border-white/10 rounded-xl p-4 lg:p-5 shadow-lg hover:border-teal-500/30 hover:shadow-teal-500/20 transition-all duration-300"
                    >
                      <stat.icon className={`h-5 w-5 ${stat.color} mb-2 opacity-80`} />
                      <div className="text-2xl lg:text-3xl font-bold text-white">{stat.value}</div>
                      <div className="text-xs text-zinc-400 uppercase tracking-wider mt-1">{stat.label}</div>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Quick Actions - Premium buttons, cinematic hover */}
                <motion.div variants={itemVariants} className="flex gap-4">
                  <motion.button 
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/create-companion')}
                    className="flex items-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600/90 to-purple-600/90 text-white font-medium backdrop-blur-md border border-white/20 shadow-lg hover:shadow-teal-500/30 transition-all duration-300"
                  >
                    <Sparkles className="h-5 w-5" />
                    Create Companion
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab("breeding")}
                    className="flex items-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-600/90 to-purple-600/90 text-white font-medium backdrop-blur-md border border-white/20 shadow-lg hover:shadow-pink-500/30 transition-all duration-300"
                  >
                    <Baby className="h-5 w-5" />
                    Breed Hybrid
                  </motion.button>
                </motion.div>

                {/* Recent Activity - Compact glass panel */}
                <motion.div variants={itemVariants} className="bg-black/30 backdrop-blur-md border border-white/10 rounded-xl p-5 shadow-lg">
                  <h3 className="font-cinzel text-lg font-bold text-white mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {[
                      { action: "Bred a Legendary hybrid", time: "2 hours ago", icon: Baby, color: "text-yellow-400" },
                      { action: "Connected toy device", time: "1 day ago", icon: Gamepad2, color: "text-teal-400" },
                      { action: "Reached affection level 90", time: "3 days ago", icon: Heart, color: "text-pink-400" },
                    ].map((activity, i) => (
                      <motion.div
                        key={i}
                        whileHover={{ x: 4 }}
                        className="flex items-center gap-3 p-3 rounded-lg bg-black/20 backdrop-blur-sm border border-white/5 hover:bg-white/5 transition-all duration-300"
                      >
                        <activity.icon className={`h-4 w-4 ${activity.color}`} />
                        <span className="text-sm text-white flex-1">{activity.action}</span>
                        <span className="text-xs text-zinc-400 ml-auto">{activity.time}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Your Collection - TCG-sized cards, glassmorphism */}
                <motion.div variants={itemVariants}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-cinzel text-xl font-bold text-white">Your Collection</h2>
                    <button
                      onClick={() => setActiveTab("collection")}
                      className="text-sm text-teal-400 hover:text-teal-300 font-medium transition-colors"
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
                          variants={cardVariants}
                          whileHover="hover"
                          className={`relative bg-black/40 backdrop-blur-md border-2 ${rs.border} rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer aspect-[2.5/3.5] w-full max-w-[200px] mx-auto`}
                          onClick={() => navigate(`/companions/${card.id}`)}
                        >
                          {/* Card Image Area - Larger, cinematic */}
                          <div className="relative h-[60%] bg-gradient-to-br from-zinc-900/80 to-black/80 flex items-center justify-center border-b border-white/10">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 animate-shimmer" />
                            <div className="absolute top-2 right-2">
                              <span className={`px-2 py-1 text-xs font-bold rounded-full ${rs.tagBg} ${rs.tag}`}>
                                {card.rarity}
                              </span>
                            </div>
                          </div>

                          {/* Card Details - Tight hierarchy */}
                          <div className="p-3 space-y-2">
                            <div className="flex justify-between items-start">
                              <h4 className="font-cinzel text-sm font-bold text-white">{card.name}</h4>
                              <span className="text-xs text-zinc-400">Lv.{card.level}</span>
                            </div>
                            <p className="text-xs text-zinc-300 leading-tight line-clamp-2">{card.description}</p>
                            <div className="space-y-1 pt-1 border-t border-white/10">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-zinc-400">Vibration</span>
                                <span className="text-teal-400 font-medium">{card.vibration}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-zinc-400">Affection</span>
                                <span className="text-pink-400">♥ {card.affection}</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Collection Tab - Full TCG grid, upgraded glassmorphism */}
            {activeTab === "collection" && (
              <motion.div 
                key="collection" 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -20 }} 
                className="max-w-7xl mx-auto space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-cinzel text-xl font-bold text-white">My Collection</h2>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    className="text-sm text-teal-400 hover:text-teal-300 font-medium transition-colors"
                    onClick={() => setActiveTab("dashboard")}
                  >
                    ← Back to Dashboard
                  </motion.button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {placeholderCollection.map((card, i) => {
                    const rs = rarityStyles[card.rarity];
                    return (
                      <motion.div
                        key={card.id}
                        variants={cardVariants}
                        whileHover="hover"
                        className={`relative bg-black/40 backdrop-blur-md border-2 ${rs.border} rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer aspect-[2.5/3.5] w-full`}
                        onClick={() => navigate(`/companions/${card.id}`)}
                      >
                        {/* Image Area */}
                        <div className="relative h-[60%] bg-gradient-to-br from-zinc-900/80 to-black/80 flex items-center justify-center border-b border-white/10">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 animate-shimmer" />
                          <div className="absolute top-2 right-2">
                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${rs.tagBg} ${rs.tag}`}>
                              {card.rarity}
                            </span>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="p-3 space-y-2">
                          <div className="flex justify-between items-start">
                            <h4 className="font-cinzel text-sm font-bold text-white">{card.name}</h4>
                            <span className="text-xs text-zinc-400">Lv.{card.level}</span>
                          </div>
                          <p className="text-xs text-zinc-300 leading-tight line-clamp-2">{card.description}</p>
                          <div className="space-y-1 pt-1 border-t border-white/10">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-zinc-400">Vibration</span>
                              <span className="text-teal-400 font-medium">{card.vibration}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-zinc-400">Affection</span>
                              <span className="text-pink-400">♥ {card.affection}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Other Tabs - Placeholder with premium style */}
            {activeTab !== "dashboard" && activeTab !== "collection" && (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-7xl mx-auto text-center py-20 space-y-4"
              >
                <h2 className="font-cinzel text-xl font-bold text-white capitalize">
                  {sidebarItems.find(item => item.id === activeTab)?.label}
                </h2>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-black/30 backdrop-blur-md border border-white/10 rounded-xl p-6 shadow-lg inline-block"
                >
                  <p className="text-sm text-zinc-300">Coming soon... Premium features incoming.</p>
                </motion.div>
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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Inter:wght@300;400;500;600&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .font-cinzel { font-family: 'Cinzel Decorative', serif; }
        .gradient-vice-text { background: linear-gradient(135deg, hsl(320 100% 50%), hsl(280 100% 60%)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .glow-purple { box-shadow: 0 0 20px hsl(280 100% 60% / 0.3); }
        .glow-teal { box-shadow: 0 0 20px hsl(180 100% 50% / 0.3); }
        .animate-shimmer { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent); background-size: 200% 100%; animation: shimmer 2s infinite; }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
}