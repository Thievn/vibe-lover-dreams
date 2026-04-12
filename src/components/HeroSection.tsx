import { motion } from "framer-motion";
import { Flame, RefreshCw } from "lucide-react";
import { useState } from "react";

interface HeroSectionProps {
  onGetStarted: () => void;
}

const companions = [
  { name: "Miko \"Circuit\" Kane", subtitle: "Level Up Your Love Life", img: "https://dcefctvhojiyiginnwuj.supabase.co/storage/v1/object/public/companion-portraits/miko-circuit-kane.png" },
  { name: "Flicker \"Spark\"", subtitle: "Follow the Light to Fun", img: "https://dcefctvhojiyiginnwuj.supabase.co/storage/v1/object/public/companion-portraits/flicker-spark.png" },
  { name: "Kaelen Veyra", subtitle: "A tender touch to ignite your deepest desires.", img: "https://dcefctvhojiyiginnwuj.supabase.co/storage/v1/object/public/companion-portraits/kaelen-veyra.png" },
  { name: "Tyler Kane", subtitle: "Your Roommate Has a Secret", img: "https://dcefctvhojiyiginnwuj.supabase.co/storage/v1/object/public/companion-portraits/tyler-kane.png" },
  { name: "Velvet Eclipse", subtitle: "Between Worlds, Between Sheets", img: "https://dcefctvhojiyiginnwuj.supabase.co/storage/v1/object/public/companion-portraits/velvet-eclipse.png" },
  { name: "Kira Lux", subtitle: "Bratty, Beautiful, Unbreakable", img: "https://dcefctvhojiyiginnwuj.supabase.co/storage/v1/object/public/companion-portraits/kira-lux.png" },
];

export default function HeroSection({ onGetStarted }: HeroSectionProps) {
  const [shuffled, setShuffled] = useState(companions);

  const shuffleCompanions = () => {
    const shuffledArray = [...companions].sort(() => Math.random() - 0.5);
    setShuffled(shuffledArray);
  };

  return (
    <section className="relative min-h-[80vh] flex items-center justify-center px-4 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="relative z-10 text-center max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium">
            <Flame className="h-3 w-3" /> Strictly 18+ · AI-Powered Companions
          </span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-gothic text-4xl sm:text-5xl md:text-6xl font-bold mb-4 leading-tight"
        >
          <span className="gradient-vice-text">LustForge</span> <span className="text-foreground">AI</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-lg sm:text-xl text-muted-foreground mb-2 italic"
        >
          Forge Your Fantasies
        </motion.p>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-muted-foreground mb-8 max-w-xl mx-auto"
        >
          AI companions that talk, tease, and connect to your smart toys. Immersive roleplay with real-time device integration — every persona, every scenario, zero judgment.
        </motion.p>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <button 
            onClick={onGetStarted}
            className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-lg glow-pink hover:scale-105 transition-transform inline-flex items-center gap-2"
          >
            <Flame className="h-5 w-5" /> Join the Waitlist
          </button>
        </motion.div>

        {/* Stats */}
        <div className="mt-12 flex justify-center items-end gap-8 text-muted-foreground text-xs">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">61+</div>
            <div>Companions & Growing</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-electric-teal">∞</div>
            <div>Scenarios</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-velvet-purple">🔒</div>
            <div>Private & Safe</div>
          </div>
        </div>

        {/* Companion Carousel */}
        <div className="mt-14 relative max-w-2xl mx-auto">
          <button 
            onClick={shuffleCompanions}
            className="absolute -top-5 right-0 text-primary/40 hover:text-primary/70 transition-colors z-10"
            aria-label="Shuffle companions"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {shuffled.map((comp, index) => (
              <div key={index} className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden hover:border-primary/40 transition-all hover:scale-[1.02] group">
                <div className="w-full aspect-[3/4] relative" style={{ background: "linear-gradient(135deg, rgb(255, 20, 147), rgb(0, 191, 255))" }}>
                  <img 
                    src={comp.img} 
                    alt={comp.name} 
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <p className="text-sm font-bold text-white truncate">{comp.name}</p>
                    <p className="text-[10px] text-white/70 truncate">{comp.subtitle}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}