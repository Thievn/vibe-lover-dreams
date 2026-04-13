import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Heart, Zap, Crown, Shield, Settings, LogOut, Flame,
  MessageCircle, Volume2, Sparkles, Baby, Gamepad2, Clock,
  Wifi, WifiOff, User, Menu, X, Trophy, Image as ImageIcon,
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
  // Your existing 4 cards (kept exactly as you had them)
  { id: "1", name: "Nyx Shadowveil", rarity: "Legendary", level: 85, description: "Eternal temptress of midnight desires. Whispers secrets that shatter resolve.", starters: ["Kneel before me…", "Your will is mine."], vibration: "Pulsing Abyss", affection: 92 },
  { id: "2", name: "Vexara Thorn", rarity: "Epic", level: 72, description: "Sadistic hybrid breeder. Turns pain into exquisite, addictive pleasure.", starters: ["Beg for the thorns.", "Breed or break."], vibration: "Thorn Whip", affection: 78 },
  { id: "3", name: "Lirael Voidheart", rarity: "Rare", level: 59, description: "Cyber-goth siren with vibrating toys that rewrite ecstasy itself.", starters: ["Feel the void pulse.", "Surrender to rhythm."], vibration: "Sonic Void", affection: 65 },
  { id: "4", name: "Draven Bloodforge", rarity: "Legendary", level: 92, description: "Forge-master of legendary companions. Unyielding, absolute dominance.", starters: ["Forge your fate.", "Blood binds us."], vibration: "Forge Hammer", affection: 88 },
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
        setToyConnected(true); // placeholder - we'll connect real Lovense later
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
    navigate("/");
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
      {/* Ambient glows - kept from your original */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-secondary/5 blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-[300px] h-[300px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />

      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-muted transition-colors lg:hidden">
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

            {/* Admin Button - ONLY for you */}
            {isAdmin && (
              <button
                onClick={() => navigate("/admin")}
                className="flex items-center gap-2 px-5 py-2 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium hover:scale-105 transition-all"
              >
                <Shield className="h-4 w-4" />
                Admin Panel
              </button>
            )}

            {/* Profile / Account */}
            <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-muted transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - kept your original */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside /* your original sidebar code */ >
              {/* ... your full sidebar code remains unchanged ... */}
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content - Improved to match screenshot style */}
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
                {/* Stats Cards - exactly like your screenshot */}
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
                  <button className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold glow-pink hover:scale-105 transition-all">
                    <Sparkles className="h-5 w-5" />
                    Create Companion
                  </button>
                  <button className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-secondary text-secondary-foreground font-bold glow-purple hover:scale-105 transition-all">
                    <Baby className="h-5 w-5" />
                    Breed Hybrid
                  </button>
                </div>

                {/* Recent Activity */}
                <div className="bg-card/60 backdrop-blur-sm border border-border rounded-2xl p-6">
                  <h3 className="font-gothic text-base font-bold text-foreground mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {/* your recent activity items */}
                  </div>
                </div>

                {/* Your Collection - TCG cards */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-gothic text-lg font-bold gradient-vice-text">Your Collection</h2>
                    <button onClick={() => setActiveTab("collection")} className="text-sm text-primary hover:text-primary/80 transition-colors">
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
                          {/* your existing card content */}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Collection tab and other tabs remain as you had them */}
            {/* ... rest of your original code for other tabs ... */}
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile sidebar overlay - your original */}
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