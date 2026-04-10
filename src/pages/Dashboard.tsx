import { useState, useEffect } from "react";
import { Shield, Flame, Users, Heart, Zap, Trophy, Sparkles, Baby } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const currentUser = data.session?.user;
      setUser(currentUser);

      if (currentUser?.email === "lustforgeapp@gmail.com") {
        setIsAdmin(true);
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-gothic text-5xl font-bold gradient-vice-text">
              Welcome back, {user?.email?.split('@')[0] || 'Explorer'}
            </h1>
            <p className="text-muted-foreground">Your personal LustForge sanctuary</p>
          </div>

          {isAdmin && (
            <a href="/admin" className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-purple-600 rounded-2xl hover:scale-105 transition-all">
              <Shield className="h-5 w-5" />
              <span className="font-bold">Admin Panel</span>
            </a>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-card border border-border rounded-2xl p-6 hover:border-primary/40 transition-all">
            <Heart className="h-8 w-8 text-pink-400 mb-4" />
            <div className="text-4xl font-bold">12</div>
            <div className="text-sm text-muted-foreground">Companions</div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 hover:border-primary/40 transition-all">
            <Baby className="h-8 w-8 text-purple-400 mb-4" />
            <div className="text-4xl font-bold">3</div>
            <div className="text-sm text-muted-foreground">Hybrids Bred</div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 hover:border-primary/40 transition-all">
            <Zap className="h-8 w-8 text-electric-teal mb-4" />
            <div className="text-4xl font-bold">47</div>
            <div className="text-sm text-muted-foreground">Toy Sessions</div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 hover:border-primary/40 transition-all">
            <Trophy className="h-8 w-8 text-amber-400 mb-4" />
            <div className="text-4xl font-bold">2</div>
            <div className="text-sm text-muted-foreground">Legendary</div>
          </div>
        </div>

        {/* TCG Collection */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" /> Your Collection
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {["Lilith Vesper", "Kira Lux", "Velvet Eclipse", "Raven Nox", "Miko Circuit", "Sage Evergreen"].map((name, i) => (
              <div key={i} className="relative group">
                <div className="bg-gradient-to-br from-zinc-900 to-black border border-amber-400/60 rounded-2xl overflow-hidden hover:scale-105 transition-all">
                  <div className="aspect-video bg-gradient-to-br from-purple-950 to-pink-950 flex items-center justify-center text-5xl font-black text-white/20">
                    {name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div className="p-4">
                    <p className="font-bold text-white truncate">{name}</p>
                    <div className="text-xs text-amber-400">Legendary • Lv.12</div>
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