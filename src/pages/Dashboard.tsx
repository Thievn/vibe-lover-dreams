import { useState, useEffect } from "react";
import { Shield, Flame, Users, Heart, Zap, Trophy, Sparkles, Baby, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const currentUser = data.session?.user;
      setUser(currentUser);
      if (currentUser?.email === "lustforgeapp@gmail.com") setIsAdmin(true);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-screen-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="font-gothic text-6xl font-bold tracking-tighter gradient-vice-text">
              WELCOME BACK, {user?.email?.split('@')[0].toUpperCase() || 'EXPLORER'}
            </h1>
            <p className="text-muted-foreground text-2xl mt-1">Your personal LustForge sanctuary</p>
          </div>

          {isAdmin && (
            <a href="/admin" className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-3xl hover:scale-105 transition-all shadow-lg">
              <Shield className="h-6 w-6" />
              ADMIN PANEL
            </a>
          )}
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

        {/* Collection - TCG Style */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-4xl font-bold flex items-center gap-3">
              <Trophy className="h-8 w-8 text-amber-400" />
              YOUR COLLECTION
            </h2>
            <span className="text-muted-foreground text-xl">61+ Companions • Growing</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { name: "Lilith Vesper", rarity: "Legendary", level: 12, color: "from-purple-500 to-pink-500" },
              { name: "Kira Lux", rarity: "Legendary", level: 12, color: "from-pink-500 to-cyan-500" },
              { name: "Velvet Eclipse", rarity: "Epic", level: 9, color: "from-purple-600 to-violet-600" },
              { name: "Raven Nox", rarity: "Rare", level: 7, color: "from-zinc-700 to-gray-700" },
              { name: "Miko Circuit", rarity: "Legendary", level: 12, color: "from-cyan-500 to-blue-500" },
              { name: "Sage Evergreen", rarity: "Epic", level: 8, color: "from-emerald-500 to-teal-500" },
            ].map((comp, i) => (
              <div key={i} className="group relative cursor-pointer">
                <div className={`bg-gradient-to-br ${comp.color} border-2 border-amber-400/70 rounded-3xl overflow-hidden h-full transition-all hover:scale-105 hover:border-amber-400 shadow-2xl`}>
                  <div className="h-52 bg-black/40 flex items-center justify-center text-7xl font-black text-white/10 backdrop-blur-sm">
                    {comp.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div className="p-6 bg-black/80">
                    <p className="font-bold text-2xl text-white">{comp.name}</p>
                    <div className="flex justify-between mt-3">
                      <span className="px-4 py-1 text-xs font-bold rounded-full bg-amber-400 text-black">{comp.rarity}</span>
                      <span className="text-muted-foreground text-lg">Lv.{comp.level}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}