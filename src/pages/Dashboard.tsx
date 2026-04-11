import { useState, useEffect } from "react";
import { Shield, Flame, Users, Heart, Zap, Trophy, Sparkles, Baby, Settings, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";

type Rarity = "Legendary" | "Epic" | "Rare" | "Common";

type CompanionCard = {
  id: string;
  name: string;
  rarity: Rarity;
  level: number;
  description: string;
  starters: string[];
  vibration: string;
};

const rarityStyles: Record<Rarity, { border: string; glow: string; tag: string; tagBg: string }> = {
  Legendary: { border: "border-yellow-400", glow: "shadow-[0_0_30px_hsl(45_100%_60%/0.5)]", tag: "text-yellow-400", tagBg: "bg-yellow-500/10 border-yellow-400/50" },
  Epic:      { border: "border-purple-500", glow: "shadow-[0_0_25px_hsl(280_70%_60%/0.4)]", tag: "text-purple-400", tagBg: "bg-purple-500/10 border-purple-500/50" },
  Rare:      { border: "border-cyan-400",   glow: "shadow-[0_0_20px_hsl(170_100%_50%/0.3)]", tag: "text-cyan-400",   tagBg: "bg-cyan-500/10 border-cyan-400/50" },
  Common:    { border: "border-border",     glow: "", tag: "text-muted-foreground", tagBg: "bg-muted border-border" },
};

const placeholderCollection: CompanionCard[] = [
  { id: "1", name: "Lilith Vesper", rarity: "Legendary", level: 85, description: "Eternal temptress of midnight desires. Whispers secrets that shatter resolve.", starters: ["Kneel before me…", "Your will is mine.", "Tell me your darkest thought."], vibration: "Pulsing Abyss" },
  { id: "2", name: "Kira Lux", rarity: "Legendary", level: 78, description: "Bratty, beautiful, unbreakable. She commands and teases until you break.", starters: ["Beg for it.", "Try to resist.", "I'm not done with you yet."], vibration: "Teasing Pulse" },
  { id: "3", name: "Velvet Eclipse", rarity: "Epic", level: 64, description: "Between worlds, between sheets. A hybrid of shadow and silk.", starters: ["Let the eclipse take you.", "Surrender to the void."], vibration: "Eclipse Surge" },
  { id: "4", name: "Raven Nox", rarity: "Rare", level: 52, description: "Midnight predator with a hunger that never sleeps.", starters: ["Come closer…", "The night is hungry."], vibration: "Raven's Call" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const currentUser = data.session?.user;
      setUser(currentUser);
      if (currentUser?.email === "lustforgeapp@gmail.com") setIsAdmin(true);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient glows matching landing page */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-600/5 pointer-events-none" />

      <div className="max-w-screen-2xl mx-auto p-8 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="font-gothic text-6xl font-bold tracking-tighter gradient-vice-text">
              WELCOME BACK, {user?.email?.split('@')[0].toUpperCase() || 'EXPLORER'}
            </h1>
            <p className="text-muted-foreground text-xl mt-1">Your personal LustForge sanctuary</p>
          </div>

          <div className="flex items-center gap-4">
            {isAdmin && (
              <Link 
                to="/admin" 
                className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl hover:scale-105 transition-all font-bold shadow-lg"
              >
                <Shield className="h-5 w-5" />
                ADMIN PANEL
              </Link>
            )}
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-3 bg-card border border-border rounded-2xl hover:border-primary transition-all"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <div className="bg-card border border-border rounded-3xl p-8 hover:border-pink-400 transition-all">
            <Heart className="h-10 w-10 text-pink-400 mb-6" />
            <div className="text-6xl font-bold text-white">12</div>
            <div className="text-xl text-muted-foreground">Companions Owned</div>
          </div>
          <div className="bg-card border border-border rounded-3xl p-8 hover:border-purple-400 transition-all">
            <Baby className="h-10 w-10 text-purple-400 mb-6" />
            <div className="text-6xl font-bold text-white">3</div>
            <div className="text-xl text-muted-foreground">Hybrids Bred</div>
          </div>
          <div className="bg-card border border-border rounded-3xl p-8 hover:border-cyan-400 transition-all">
            <Zap className="h-10 w-10 text-cyan-400 mb-6" />
            <div className="text-6xl font-bold text-white">47</div>
            <div className="text-xl text-muted-foreground">Toy Sessions</div>
          </div>
          <div className="bg-card border border-border rounded-3xl p-8 hover:border-amber-400 transition-all">
            <Trophy className="h-10 w-10 text-amber-400 mb-6" />
            <div className="text-6xl font-bold text-white">2</div>
            <div className="text-xl text-muted-foreground">Legendary Cards</div>
          </div>
        </div>

        {/* Collection */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-4xl font-bold flex items-center gap-3">
              <Trophy className="h-8 w-8 text-amber-400" />
              YOUR COLLECTION
            </h2>
            <span className="text-muted-foreground text-xl">61+ Companions • Growing</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {placeholderCollection.map((card, i) => {
              const rs = rarityStyles[card.rarity];
              return (
                <div key={card.id} className="group relative cursor-pointer">
                  <div className={`bg-gradient-to-br from-zinc-900 to-black border-2 ${rs.border} rounded-3xl overflow-hidden hover:scale-105 transition-all ${rs.glow}`}>
                    <div className="h-52 bg-gradient-to-br from-purple-950 to-pink-950 flex items-center justify-center text-7xl font-black text-white/10">
                      {card.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div className="p-6">
                      <p className="font-bold text-2xl text-white truncate">{card.name}</p>
                      <div className="flex justify-between mt-3">
                        <span className={`px-4 py-1 text-xs font-bold rounded-full ${rs.tagBg} ${rs.tag}`}>{card.rarity}</span>
                        <span className="text-muted-foreground">Lv.{card.level}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-4 line-clamp-2">{card.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}