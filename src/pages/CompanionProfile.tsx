import { useParams, useNavigate, Link } from "react-router-dom";
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
    [dbCompanions, id],
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
      <div className="min-h-[100dvh] flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center pt-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!companion) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 pt-20 px-4 text-center">
          <p className="text-muted-foreground">Companion not found.</p>
          <Link to="/" className="text-sm text-primary hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const handleStartChat = (starterPrompt?: string, starterTitle?: string) => {
    if (!user) {
      navigate("/auth", { state: { from: `/companions/${companion.id}` } });
      return;
    }
    navigate(`/chat/${companion.id}`, {
      state: {
        starterPrompt,
        starterTitle,
      },
    });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative overflow-x-hidden">
      <ParticleBackground />
      <Navbar />

      <main className="relative z-10 flex-1 min-h-0 w-full max-w-4xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-10 overflow-y-auto overscroll-y-contain touch-pan-y">
        <motion.button
          type="button"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-primary text-sm mb-6 transition-colors touch-manipulation"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Back
        </motion.button>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 320, damping: 26 }}>
          <div className="flex flex-col md:flex-row gap-6 sm:gap-8 mb-8">
            <motion.div
              initial={{ scale: 0.97 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 280, damping: 20 }}
              className="w-full max-w-[280px] sm:max-w-none mx-auto md:mx-0 md:w-72 shrink-0 aspect-[3/4] md:h-auto md:aspect-[3/4] rounded-2xl overflow-hidden border border-border/80 shadow-lg shadow-black/30"
              style={{
                background: `linear-gradient(135deg, ${companion.gradientFrom}, ${companion.gradientTo})`,
              }}
            >
              {imageUrl ? (
                <img src={imageUrl} alt="" className="w-full h-full object-cover object-top" />
              ) : (
                <div className="w-full h-full min-h-[200px] flex items-center justify-center">
                  <span className="text-6xl sm:text-7xl font-gothic font-bold text-white/90 drop-shadow-lg">
                    {companion.name.charAt(0)}
                  </span>
                </div>
              )}
            </motion.div>

            <div className="flex-1 min-w-0 text-left">
              <h1 className="font-gothic text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-1 break-words">
                {companion.name}
              </h1>
              <p className="text-primary italic text-base sm:text-lg mb-3">{companion.tagline}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 rounded-full text-xs bg-secondary/50 border border-border text-foreground">{companion.gender}</span>
                <span className="px-3 py-1 rounded-full text-xs bg-secondary/50 border border-border text-foreground">{companion.orientation}</span>
                <span className="px-3 py-1 rounded-full text-xs bg-primary/20 border border-primary/30 text-primary">{companion.role}</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">{companion.bio}</p>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-block mt-4">
                <button
                  type="button"
                  onClick={() => handleStartChat()}
                  className="px-6 sm:px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold glow-pink inline-flex items-center gap-2 touch-manipulation"
                >
                  <MessageCircle className="h-5 w-5 shrink-0" />
                  Start Chat
                </button>
              </motion.div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-4 sm:p-5">
              <h3 className="font-gothic text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                Appearance
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{companion.appearance}</p>
            </div>

            <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-4 sm:p-5">
              <h3 className="font-gothic text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary shrink-0" />
                Personality
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{companion.personality}</p>
            </div>

            <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-4 sm:p-5 sm:col-span-2">
              <h3 className="font-gothic text-lg font-bold text-foreground mb-3">Kinks &amp; interests</h3>
              {companion.kinks.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {companion.kinks.map((kink) => (
                    <span key={kink} className="px-3 py-1 rounded-full text-xs bg-primary/10 border border-primary/20 text-primary">
                      {kink}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Open-ended — discover in chat.</p>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-4 sm:p-5 sm:col-span-2">
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

          <div className="mt-6 sm:mt-8 pb-4">
            <h3 className="font-gothic text-xl font-bold text-foreground mb-4">Fantasy starters</h3>
            {companion.fantasyStarters.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border/60 p-6 text-center">
                No scripted openers yet — tap <strong className="text-foreground">Start Chat</strong> and lead the scene.
              </p>
            ) : (
              <div className="grid gap-3">
                {companion.fantasyStarters.map((starter, i) => (
                  <motion.button
                    type="button"
                    key={starter.title}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i, type: "spring", stiffness: 400, damping: 24 }}
                    whileHover={{ scale: 1.01, borderColor: "hsl(330 100% 58% / 0.5)" }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleStartChat(starter.description, starter.title)}
                    className="text-left w-full rounded-xl border border-border bg-card/80 backdrop-blur-sm p-4 hover:border-primary/40 hover:shadow-[0_0_24px_rgba(255,45,123,0.12)] transition-shadow touch-manipulation"
                  >
                    <h4 className="font-bold text-foreground text-sm mb-1">{starter.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{starter.description}</p>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default CompanionProfile;
