import { motion } from "framer-motion";
import { Sparkles, Heart, Zap } from "lucide-react";

const HeroSection = () => {
  const scrollToCompanions = () => {
    document.getElementById("companions")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-[80vh] flex items-center justify-center px-4 overflow-hidden">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="relative z-10 text-center max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-4"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium">
            <Sparkles className="h-3 w-3" />
            Strictly 18+ · AI-Powered Companions
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="font-gothic text-4xl sm:text-5xl md:text-6xl font-bold mb-4 leading-tight"
        >
          <span className="gradient-vice-text">ViceVibe</span>{" "}
          <span className="text-foreground">AI</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-lg sm:text-xl text-muted-foreground mb-2 italic"
        >
          Where Fantasies Take Control
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-sm text-muted-foreground mb-8 max-w-xl mx-auto"
        >
          AI companions that talk, tease, and make your toys vibrate.
          Immersive erotic roleplay with real-time Lovense integration — 
          every gender, every fantasy, zero judgment.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <button
            onClick={scrollToCompanions}
            className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-lg glow-pink hover:scale-105 transition-transform inline-flex items-center gap-2"
          >
            <Heart className="h-5 w-5" />
            Meet Your Companion
          </button>
          <button
            onClick={scrollToCompanions}
            className="px-8 py-3 rounded-xl border border-border bg-muted/50 text-foreground font-medium hover:border-primary/50 transition-colors inline-flex items-center gap-2"
          >
            <Zap className="h-5 w-5 text-electric-teal" />
            Connect Your Toy
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 flex justify-center gap-8 text-muted-foreground text-xs"
        >
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">20</div>
            <div>Companions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-electric-teal">∞</div>
            <div>Fantasies</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-velvet-purple">🔒</div>
            <div>Private & Safe</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
