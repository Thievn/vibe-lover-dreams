import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers, Trophy, Zap, Shield, Settings, LogOut, 
  Search, Filter, Sparkles, Plus, TrendingUp,
  Clock, User, Menu, X, LayoutGrid, Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";

/** * TCG STYLE CONFIG 
 * Mimicking the "Rarity" borders found in modern TCGs.
 */
type Rarity = "Legendary" | "Secret Rare" | "Ultra Rare" | "Common";

const rarityStyles: Record<Rarity, { border: string; glow: string; holo: string }> = {
  "Legendary": { 
    border: "border-amber-400/60", 
    glow: "shadow-[0_0_25px_rgba(251,191,36,0.3)]", 
    holo: "bg-gradient-to-tr from-amber-500/20 via-yellow-200/40 to-amber-500/20" 
  },
  "Secret Rare": { 
    border: "border-purple-400/60", 
    glow: "shadow-[0_0_25px_rgba(168,85,247,0.3)]", 
    holo: "bg-gradient-to-tr from-indigo-500/20 via-purple-300/40 to-pink-500/20" 
  },
  "Ultra Rare": { 
    border: "border-cyan-400/60", 
    glow: "shadow-[0_0_25px_rgba(34,211,238,0.3)]", 
    holo: "bg-gradient-to-tr from-blue-500/20 via-cyan-200/40 to-teal-500/20" 
  },
  "Common": { 
    border: "border-slate-700", 
    glow: "", 
    holo: "bg-slate-800/50" 
  },
};

export default function TCGDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("vault");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate("/auth");
      setLoading(false);
    };
    checkUser();
  }, [navigate]);

  if (loading) return <div className="min-h-screen bg-[#050507] flex items-center justify-center"><Sparkles className="animate-pulse text-purple-500" /></div>;

  return (
    <div className="min-h-screen bg-[#050507] text-slate-100 selection:bg-purple-500/40">
      
      {/* AMBIENT BACKGROUND LIGHTING */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 -right-24 w-80 h-80 bg-blue-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 flex h-screen">
        
        {/* MINIMALIST NAV BAR */}
        <aside className="w-20 border-r border-white/5 bg-black/40 backdrop-blur-xl flex flex-col items-center py-8 gap-10">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl shadow-lg shadow-purple-500/20">
            <Layers className="text-white w-6 h-6" />
          </div>
          <nav className="flex flex-col gap-6">
            <NavIcon icon={LayoutGrid} active />
            <NavIcon icon={Trophy} />
            <NavIcon icon={TrendingUp} />
            <NavIcon icon={Settings} />
          </nav>
        </aside>

        {/* CONTENT AREA */}
        <main className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
          
          {/* TOP DASHBOARD BAR */}
          <header className="flex flex-col lg:flex-row items-center justify-between mb-10 gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                Collector Vault
              </h1>
              <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Market: +2.4% Today
              </div>
            </div>

            <div className="flex items-center gap-4 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Search cards in vault..." 
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                />
              </div>
              <button className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                <Filter size={20} />
              </button>
            </div>
          </header>

          {/* BENTO STATS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <BentoStat label="Total Collection" value="1,248" sub="Cards Owned" icon={Layers} />
            <BentoStat label="Portfolio Value" value="$14,205.00" sub="+$420.50 (24h)" icon={TrendingUp} isPositive />
            <BentoStat label="Ranked Tier" value="Master" sub="Global Rank: #402" icon={Trophy} />
          </div>

          {/* THE "SHOWCASE" GRID */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Sparkles size={20} className="text-purple-400" />
                Premier Collection
              </h2>
              <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-purple-400 hover:text-purple-300 transition-colors">
                Full Binder <X className="rotate-45" size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              <CardItem 
                name="Shadow Monarch" 
                rarity="Secret Rare" 
                grade="10" 
                price="2,400"
                image="🎴" 
              />
              <CardItem 
                name="Aether Wyvern" 
                rarity="Ultra Rare" 
                grade="9.5" 
                price="850"
                image="🐉" 
              />
               <CardItem 
                name="Solar Flare" 
                rarity="Legendary" 
                grade="9" 
                price="1,200"
                image="☀️" 
              />
               <CardItem 
                name="Deep Sea Siren" 
                rarity="Common" 
                grade="8.5" 
                price="12"
                image="🧜‍♀️" 
              />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

/** * UI COMPONENTS 
 */

function NavIcon({ icon: Icon, active = false }: any) {
  return (
    <div className={`p-3 cursor-pointer rounded-xl transition-all ${active ? 'bg-purple-500/10 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}`}>
      <Icon size={24} />
    </div>
  );
}

function BentoStat({ label, value, sub, icon: Icon, isPositive }: any) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden group hover:bg-white/[0.07] transition-all">
      <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon size={120} />
      </div>
      <div className="text-slate-400 text-sm font-medium">{label}</div>
      <div className="text-3xl font-bold mt-2">{value}</div>
      <div className={`text-xs mt-2 font-bold ${isPositive ? 'text-emerald-400' : 'text-slate-500'}`}>{sub}</div>
    </div>
  );
}

function CardItem({ name, rarity, grade, price, image }: any) {
  const style = rarityStyles[rarity as Rarity] || rarityStyles["Common"];
  
  return (
    <motion.div 
      whileHover={{ y: -10, scale: 1.02 }}
      className={`relative group rounded-[2rem] border-2 ${style.border} ${style.glow} bg-black p-1 overflow-hidden`}
    >
      {/* HOLO OVERLAY EFFECT */}
      <div className={`absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none ${style.holo}`} />
      
      <div className="bg-[#0c0c10] rounded-[1.8rem] p-4 flex flex-col h-full relative z-10">
        {/* ART WORK CONTAINER */}
        <div className="aspect-[3/4] rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 mb-4 flex items-center justify-center text-6xl shadow-inner overflow-hidden relative">
          {image}
          {/* Card Shine Reflection */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </div>

        {/* CARD INFO */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-widest ${style.border.replace('border-', 'text-')}`}>
              {rarity}
            </span>
            <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">
              <span className="text-[10px] text-slate-500 font-bold">GRADE</span>
              <span className="text-xs font-bold text-white">{grade}</span>
            </div>
          </div>
          
          <h3 className="text-xl font-bold truncate tracking-tight">{name}</h3>
          
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <div className="text-lg font-mono font-bold text-white">${price}</div>
            <button className="p-2 bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white rounded-lg transition-all">
              <Eye size={16} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}