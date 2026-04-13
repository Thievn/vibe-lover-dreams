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
  Legendary: { border: "border-yellow-500/70", glow: "shadow-[0_0_30px_hsl(45_100%_60%/0.4)]", tag: "text-yellow-300", tagBg: "bg-yellow-500/10 border-yellow-400/40" },
  Epic: { border: "border-purple-500/70", glow: "glow-purple", tag: "text-purple-300", tagBg: "bg-purple-500/10 border-purple-400/40" },
  Rare: { border: "border-cyan-400/70", glow: "glow-teal", tag: "text-cyan-300", tagBg: "bg-cyan-500/10 border-cyan-400/40" },
  Common: { border: "border-border", glow: "", tag: "text-muted-foreground", tagBg: "bg-muted border-border" },
};

const placeholderCollection: CompanionCard[] = [
  { id: "1", name: "Nyx Shadowveil", rarity: "Legendary", level: 85, description: "Eternal temptress of midnight desires.", starters: ["Kneel before me…"], vibration: "Pulsing Abyss", affection: 92 },
  { id: "2", name: "Vexara Thorn", rarity: "Epic", level: 72, description: "Sadistic hybrid breeder.", starters: ["Beg for the thorns."], vibration: "Thorn Whip", affection: 78 },
  { id: "3", name: "Lirael Voidheart", rarity: "Rare", level: 59, description: "Cyber-goth siren.", starters: ["Feel the void pulse."], vibration: "Sonic Void", affection: 65 },
  { id: "4", name: "Draven Bloodforge", rarity: "Legendary", level: 92, description: "Forge-master of legends.", starters: ["Forge your fate."], vibration: "Forge Hammer", affection: 88 },
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
        setToyConnected(true);
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
    return <div className="min-h-screen bg-background flex items-center justify-center"><Flame className="h-8 w-8 text-primary animate-pulse" /></div>;
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-muted">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="font-gothic text-2xl tracking-widest gradient-vice-text">
              Welcome back, {displayName}
            </h1>
          </div>

          <div className="flex items-center gap-6">
            {/* Toy Status */}
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-muted/80 border border-border text-sm">
              {toyConnected ? <Wifi className="h-4 w-4 text-teal-400" /> : <WifiOff className="h-4 w-4 text-muted-foreground" />}
              <span className="text-sm font-medium">Toy Connected</span>
            </div>

            {/* Admin Button - Only for you */}
            {isAdmin && (
              <button
                onClick={() => navigate("/admin")}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:scale-105 transition-all"
              >
                <Shield className="h-4 w-4" />
                Admin Panel
              </button>
            )}

            {/* Profile */}
            <button className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center border border-white/10">
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
            <motion.aside /* your original sidebar code */ >
              {/* Keep your existing sidebar code here if you want - I can adjust it later */}
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content - Completely new layout */}
        <main className="flex-1 p-8">
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && (
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto space-y-12">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                  {[
                    { label: "Companions", value: 12, icon: Users },
                    { label: "Hybrids Bred", value: 3, icon: Heart },
                    { label: "Toy Sessions", value: 47, icon: Zap },
                    { label: "Legendaries", value: 2, icon: Crown },
                    { label: "Hours Chatted", value: 89, icon: Clock },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-card/70 border border-white/10 rounded-3xl p-6 text-center hover:border-pink-500/30 transition-all">
                      <stat.icon className="h-8 w-8 mx-auto mb-4 text-pink-400" />
                      <div className="text-4xl font-bold text-white mb-1">{stat.value}</div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-4">
                  <button onClick={() => {}} className="flex-1 md:flex-none px-8 py-5 rounded-3xl bg-pink-600 text-white font-medium flex items-center justify-center gap-3 hover:scale-105 transition-all">
                    <Sparkles className="h-5 w-5" />
                    Create Companion
                  </button>
                  <button onClick={() => {}} className="flex-1 md:flex-none px-8 py-5 rounded-3xl bg-purple-600 text-white font-medium flex items-center justify-center gap-3 hover:scale-105 transition-all">
                    <Baby className="h-5 w-5" />
                    Breed Hybrid
                  </button>
                </div>

                {/* Your Collection - Large cards */}
                <div>
                  <div className="flex justify-between items-end mb-6">
                    <h2 className="font-gothic text-3xl tracking-wider gradient-vice-text">Your Collection</h2>
                    <button className="text-pink-400 text-sm flex items-center gap-2">
                      View All <span className="text-xl">→</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {placeholderCollection.map((card) => {
                      const rs = rarityStyles[card.rarity];
                      return (
                        <motion.div
                          key={card.id}
                          whileHover={{ scale: 1.04, transition: { duration: 0.3 } }}
                          className={`bg-card border-2 ${rs.border} rounded-3xl overflow-hidden cursor-pointer ${rs.glow}`}
                        >
                          <div className="h-64 bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center p-6">
                            {/* Placeholder for image - later we'll use real generated images */}
                            <div className="text-center">
                              <div className="text-6xl mb-4">🖼️</div>
                              <p className="text-xs text-muted-foreground">Image will appear here</p>
                            </div>
                          </div>
                          <div className="p-6">
                            <div className="flex justify-between mb-2">
                              <span className={`px-3 py-1 text-xs font-bold rounded-full ${rs.tagBg} ${rs.tag}`}>{card.rarity}</span>
                              <span className="text-sm text-muted-foreground">Lv.{card.level}</span>
                            </div>
                            <h3 className="font-gothic text-xl text-white mb-2">{card.name}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{card.description}</p>
                            <div className="flex items-center gap-2 text-xs">
                              <Volume2 className="h-3 w-3" />
                              <span>{card.vibration}</span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}