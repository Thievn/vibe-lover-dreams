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
  Legendary: { border: "border-yellow-400", glow: "shadow-[0_0_30px_hsl(45_100%_60%/0.5)]", tag: "text-yellow-300", tagBg: "bg-yellow-500/10 border-yellow-400" },
  Epic: { border: "border-purple-400", glow: "shadow-[0_0_30px_hsl(270_100%_60%/0.5)]", tag: "text-purple-300", tagBg: "bg-purple-500/10 border-purple-400" },
  Rare: { border: "border-cyan-400", glow: "shadow-[0_0_30px_hsl(180_100%_60%/0.5)]", tag: "text-cyan-300", tagBg: "bg-cyan-500/10 border-cyan-400" },
  Common: { border: "border-zinc-500", glow: "", tag: "text-zinc-400", tagBg: "bg-zinc-500/10 border-zinc-500" },
};

const placeholderCollection: CompanionCard[] = [
  { id: "1", name: "Nyx Shadowveil", rarity: "Legendary", level: 85, description: "Eternal temptress of midnight desires.", starters: ["Kneel before me…"], vibration: "Pulsing Abyss", affection: 92 },
  { id: "2", name: "Vexara Thorn", rarity: "Epic", level: 72, description: "Sadistic hybrid breeder.", starters: ["Beg for the thorns."], vibration: "Thorn Whip", affection: 78 },
  { id: "3", name: "Lirael Voidheart", rarity: "Rare", level: 59, description: "Cyber-goth siren.", starters: ["Feel the void pulse."], vibration: "Sonic Void", affection: 65 },
  { id: "4", name: "Draven Bloodforge", rarity: "Legendary", level: 92, description: "Forge-master of legends.", starters: ["Forge your fate."], vibration: "Forge Hammer", affection: 88 },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toyConnected, setToyConnected] = useState(true);

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
    return <div className="min-h-screen bg-background flex items-center justify-center text-white">Loading dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur-xl">
        <div className="max-w-screen-2xl mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-gothic text-3xl tracking-widest gradient-vice-text">
              Welcome back, {displayName}
            </h1>
          </div>

          <div className="flex items-center gap-6">
            {/* Toy Status */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-zinc-900 border border-white/10 text-sm">
              {toyConnected ? <Wifi className="h-4 w-4 text-teal-400" /> : <WifiOff className="h-4 w-4" />}
              <span>Toy Connected</span>
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

      <div className="max-w-screen-2xl mx-auto px-8 py-10">
        {/* Stats Row - Compact */}
        <div className="grid grid-cols-5 gap-4 mb-12">
          {[
            { icon: Users, label: "Companions", value: 12 },
            { icon: Heart, label: "Hybrids Bred", value: 3 },
            { icon: Zap, label: "Toy Sessions", value: 47 },
            { icon: Crown, label: "Legendaries", value: 2 },
            { icon: Clock, label: "Hours Chatted", value: 89 },
          ].map((stat) => (
            <div key={stat.label} className="bg-zinc-900 border border-white/10 rounded-3xl p-6 text-center hover:border-pink-500/30 transition-all">
              <stat.icon className="h-7 w-7 mx-auto mb-3 text-pink-400" />
              <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-xs text-zinc-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-4 mb-12">
          <button className="flex-1 px-8 py-6 rounded-3xl bg-pink-600 text-white font-medium flex items-center justify-center gap-4 hover:scale-105 transition-all text-lg">
            <Sparkles className="h-6 w-6" />
            Create Companion
          </button>
          <button className="flex-1 px-8 py-6 rounded-3xl bg-purple-600 text-white font-medium flex items-center justify-center gap-4 hover:scale-105 transition-all text-lg">
            <Baby className="h-6 w-6" />
            Breed Hybrid
          </button>
        </div>

        {/* Your Collection - Modern horizontal scroll */}
        <div>
          <div className="flex justify-between items-baseline mb-6">
            <h2 className="font-gothic text-4xl tracking-wider gradient-vice-text">Your Collection</h2>
            <button className="text-pink-400 flex items-center gap-2 hover:text-pink-300">View All →</button>
          </div>

          <div className="flex gap-6 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-hide">
            {placeholderCollection.map((card) => {
              const rs = rarityStyles[card.rarity];
              return (
                <motion.div
                  key={card.id}
                  whileHover={{ scale: 1.05 }}
                  className={`min-w-[280px] bg-zinc-900 border-2 ${rs.border} rounded-3xl overflow-hidden cursor-pointer ${rs.glow}`}
                >
                  <div className="h-64 bg-gradient-to-br from-zinc-800 to-black flex items-center justify-center p-8">
                    <div className="text-8xl opacity-10">🖼️</div>
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between mb-3">
                      <span className={`px-4 py-1 text-xs font-bold rounded-full ${rs.tagBg} ${rs.tag}`}>{card.rarity}</span>
                      <span className="text-sm text-zinc-400">Lv.{card.level}</span>
                    </div>
                    <h3 className="font-gothic text-2xl text-white mb-2">{card.name}</h3>
                    <p className="text-sm text-zinc-400 line-clamp-2 mb-6">{card.description}</p>
                    <div className="flex justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Volume2 className="h-4 w-4 text-teal-400" />
                        <span>{card.vibration}</span>
                      </div>
                      <span className="text-pink-400">♥ {card.affection}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}