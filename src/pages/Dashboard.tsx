import { useState, useEffect } from "react";
import { Shield, Flame, Users, Heart, Zap, Trophy, Sparkles, Baby, Settings, ToyCar } from "lucide-react";
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
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-2xl mx-auto p-8">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="font-gothic text-6xl font-bold tracking-tighter gradient-vice-text">
              WELCOME BACK, {user?.email?.split('@')[0].toUpperCase() || 'EXPLORER'}
            </h1>
            <p className="text-muted-foreground text-xl">Your personal LustForge sanctuary</p>
          </div>

          <div className="flex items-center gap-4">
            {isAdmin && (
              <a href="/admin" className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl hover:scale-105 transition-all font-bold">
                <Shield className="h-5 w-5" />
                ADMIN PANEL
              </a>
            )}
            <button className="flex items-center gap-2 px-5 py-3 bg-card border border-border rounded-2xl hover:border-primary transition-all">
              <Settings className="h-5 w-5" />
              <span>Account</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-card border border-border rounded-3xl p-6">
            <Heart className="h-9 w-9 text-pink-400 mb-4" />
            <div className="text-5xl font-bold">12</div>
            <div className="text-muted-foreground">Companions Owned</div>
          </div>
          <div className="bg-card border border-border rounded-3xl p-6">
            <Baby className="h-9 w-9 text-purple-400 mb-4" />
            <div className="text-5xl font-bold">3</div>
            <div className="text-muted-foreground">Hybrids Bred</div>
          </div>
          <div className="bg-card border border-border rounded-3xl p-6">
            <Zap className="h-9 w-9 text-electric-teal mb-4" />
            <div className="text-5xl font-bold">47</div>
            <div className="text-muted-foreground">Toy Sessions</div>
          </div>
          <div className="bg-card border border-border rounded-3xl p-6">
            <Trophy className="h-9 w-9 text-amber-400 mb-4" />
            <div className="text-5xl font-bold">2</div>
            <div className="text-muted-foreground">Legendary Cards</div>
          </div>
        </div>

        {/* Collection - TCG Style */}
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
              { name: "Lilith Vesper", rarity: "Legendary", level: 12 },
              { name: "Kira Lux", rarity: "Legendary", level: 12 },
              { name: "Velvet Eclipse", rarity: "Epic", level: 9 },
              { name: "Raven Nox", rarity: "Rare", level: 7 },
              { name: "Miko Circuit", rarity: "Legendary", level: 12 },
              { name: "Sage Evergreen", rarity: "Epic", level: 8 },
            ].map((comp, i) => (
              <div key={i} className="group relative">
                <div className="bg-gradient-to-br from-zinc-900 to-black border-2 border-amber-400/70 rounded-3xl overflow-hidden hover:border-amber-400 transition-all hover:scale-[1.03] shadow-xl">
                  <div className="h-48 bg-gradient-to-br from-purple-900 via-pink-900 to-black flex items-center justify-center text-7xl font-black text-white/10">
                    {comp.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div className="p-5">
                    <p className="font-bold text-xl text-white">{comp.name}</p>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-amber-400 font-medium">{comp.rarity}</span>
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