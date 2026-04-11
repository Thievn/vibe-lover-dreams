import { useState, useEffect } from "react";
import { Shield, Flame, Heart, Baby, Zap, Trophy, Settings, Edit3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const currentUser = data.session?.user;
      setUser(currentUser);
      if (currentUser?.email === "lustforgeapp@gmail.com") setIsAdmin(true);
      
      // Use username if available, otherwise email prefix
      const username = currentUser?.user_metadata?.username || currentUser?.email?.split('@')[0] || "Explorer";
      setDisplayName(username);
    });
  }, []);

  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="max-w-screen-2xl mx-auto">
        {/* Top Bar with Profile */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-muted-foreground text-lg">Welcome back,</p>
            <h1 className="font-gothic text-5xl lg:text-6xl font-bold tracking-tighter gradient-vice-text">
              {displayName.toUpperCase()}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Profile Picture */}
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl font-bold text-white shadow-inner border border-white/20">
              {avatarLetter}
            </div>

            {/* Account Menu Button */}
            <div className="flex items-center gap-3 bg-card border border-border rounded-2xl px-5 py-2 cursor-pointer hover:border-primary transition-all">
              <span className="font-medium text-sm">{displayName}</span>
              <div className="text-xs px-3 py-1 bg-muted rounded-xl text-muted-foreground">Account</div>
            </div>

            {isAdmin && (
              <a href="/admin" className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl hover:scale-105 transition-all font-bold">
                <Shield className="h-5 w-5" />
                ADMIN
              </a>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <div className="bg-card border border-border rounded-3xl p-7 hover:border-pink-400 transition-all">
            <Heart className="h-8 w-8 text-pink-400 mb-5" />
            <div className="text-5xl font-bold">12</div>
            <div className="text-muted-foreground">Companions</div>
          </div>
          <div className="bg-card border border-border rounded-3xl p-7 hover:border-purple-400 transition-all">
            <Baby className="h-8 w-8 text-purple-400 mb-5" />
            <div className="text-5xl font-bold">3</div>
            <div className="text-muted-foreground">Hybrids Bred</div>
          </div>
          <div className="bg-card border border-border rounded-3xl p-7 hover:border-cyan-400 transition-all">
            <Zap className="h-8 w-8 text-cyan-400 mb-5" />
            <div className="text-5xl font-bold">47</div>
            <div className="text-muted-foreground">Toy Sessions</div>
          </div>
          <div className="bg-card border border-border rounded-3xl p-7 hover:border-amber-400 transition-all">
            <Trophy className="h-8 w-8 text-amber-400 mb-5" />
            <div className="text-5xl font-bold">2</div>
            <div className="text-muted-foreground">Legendary</div>
          </div>
        </div>

        {/* Collection */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <Trophy className="h-7 w-7 text-amber-400" />
              YOUR COLLECTION
            </h2>
            <span className="text-muted-foreground">61+ Companions • Growing</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { name: "Lilith Vesper", rarity: "Legendary", level: 12, color: "from-purple-600 to-pink-600" },
              { name: "Kira Lux", rarity: "Legendary", level: 12, color: "from-pink-500 to-rose-500" },
              { name: "Velvet Eclipse", rarity: "Epic", level: 9, color: "from-violet-600 to-purple-600" },
              { name: "Raven Nox", rarity: "Rare", level: 7, color: "from-zinc-700 to-slate-700" },
              { name: "Miko Circuit", rarity: "Legendary", level: 12, color: "from-cyan-500 to-teal-500" },
              { name: "Sage Evergreen", rarity: "Epic", level: 8, color: "from-emerald-500 to-teal-500" },
            ].map((comp, i) => (
              <div key={i} className="group relative cursor-pointer">
                <div className={`bg-gradient-to-br ${comp.color} border border-amber-400/70 rounded-3xl overflow-hidden transition-all hover:scale-[1.03] hover:border-amber-400 shadow-2xl`}>
                  <div className="h-56 bg-black/40 flex items-center justify-center text-7xl font-black text-white/10">
                    {comp.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div className="p-6">
                    <p className="font-bold text-2xl text-white">{comp.name}</p>
                    <div className="flex justify-between text-sm mt-3">
                      <span className="px-4 py-1 text-xs font-bold rounded-full bg-amber-400 text-black">{comp.rarity}</span>
                      <span className="text-muted-foreground">Lv.{comp.level}</span>
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