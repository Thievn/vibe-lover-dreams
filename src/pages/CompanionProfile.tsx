import { useParams, useNavigate } from "react-router-dom";
import { useCompanions, dbToCompanion } from "@/hooks/useCompanions";
import { companionImages } from "@/data/companionImages";
import Navbar from "@/components/Navbar";
import ParticleBackground from "@/components/ParticleBackground";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, MessageCircle, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useMemo } from "react";

const CompanionProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: dbCompanions, isLoading } = useCompanions();
  const [user, setUser] = useState<any>(null);

  const dbComp = useMemo(
    () => (dbCompanions || []).find((c) => c.id === id),
    [dbCompanions, id]
  );
  const companion = dbComp ? dbToCompanion(dbComp) : null;
  const imageUrl = dbComp?.image_url || (id ? companionImages[id] : undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!companion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Companion not found.</p>
      </div>
    );
  }

  const handleStartChat = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    navigate(`/chat/${companion.id}`);
  };

  return (
    <div className="min-h-screen bg-background relative">
      <ParticleBackground />
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="flex flex-col md:flex-row gap-6 mb-8">
            <div
              className="w-full md:w-64 h-64 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${companion.gradientFrom}, ${companion.gradientTo})`,
              }}
            >
              {imageUrl ? (
                <img src={imageUrl} alt={companion.name} className="w-full h-full object-cover object-top" />
              ) : (
                <span className="text-8xl font-gothic font-bold text-white/90 drop-shadow-lg">
                  {companion.name.charAt(0)}
                </span>
              )}
            </div>

            <div className="flex-1">
              <h1 className="font-gothic text-3xl md:text-4xl font-bold text-foreground mb-1">
                {companion.name}
              </h1>
              <p className="text-primary italic text-lg mb-3">{companion.tagline}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 rounded-full text-xs bg-secondary/50 border border-border text-foreground">{companion.gender}</span>
                <span className="px-3 py-1 rounded-full text-xs bg-secondary/50 border border-border text-foreground">{companion.orientation}</span>
                <span className="px-3 py-1 rounded-full text-xs bg-primary/20 border border-primary/30 text-primary">{companion.role}</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">{companion.bio}</p>

              <button
                onClick={handleStartChat}
                className="mt-4 px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold glow-pink hover:scale-105 transition-transform inline-flex items-center gap-2"
              >
                <MessageCircle className="h-5 w-5" />
                Start Chat
              </button>
            </div>
          </div>

          {/* Details */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-gothic text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Appearance
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{companion.appearance}</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-gothic text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary" />
                Personality
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{companion.personality}</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-gothic text-lg font-bold text-foreground mb-3">Kinks & Interests</h3>
              <div className="flex flex-wrap gap-2">
                {companion.kinks.map((kink) => (
                  <span key={kink} className="px-3 py-1 rounded-full text-xs bg-primary/10 border border-primary/20 text-primary">
                    {kink}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-gothic text-lg font-bold text-foreground mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {companion.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-full text-xs bg-muted border border-border text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Fantasy Starters */}
          <div className="mt-6">
            <h3 className="font-gothic text-xl font-bold text-foreground mb-4">Fantasy Starters</h3>
            <div className="grid gap-3">
              {companion.fantasyStarters.map((starter, i) => (
                <motion.div
                  key={starter.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * i }}
                  onClick={handleStartChat}
                  className="cursor-pointer rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:glow-pink transition-all"
                >
                  <h4 className="font-bold text-foreground text-sm mb-1">{starter.title}</h4>
                  <p className="text-xs text-muted-foreground">{starter.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CompanionProfile;
