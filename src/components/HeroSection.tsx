import { motion } from "framer-motion";
import { Sparkles, Heart, Zap } from "lucide-react";

interface HeroSectionProps {
  onGetStarted: () => void;
}

export default function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section className="min-h-screen flex items-center justify-center relative overflow-hidden pt-14">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FF2D7B]/10 via-transparent to-[#00FFD4]/10" />

      <div className="max-w-5xl mx-auto text-center px-6 relative z-10">
        {/* Top badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 bg-black/70 border border-white/20 rounded-3xl px-6 py-2 text-sm font-medium tracking-widest mb-8"
        >
          <span className="text-[#FF2D7B]">Strictly 18+</span>
          <span className="text-white">•</span>
          <span className="text-[#00FFD4]">AI-Powered Companions</span>
        </motion.div>

        {/* Main Title */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="text-7xl md:text-8xl font-bold tracking-tighter leading-none bg-gradient-to-r from-[#FF2D7B] via-[#00FFD4] to-[#7B2D8E] bg-clip-text text-transparent mb-4"
        >
          LUSTFORGE AI
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-3xl font-light text-white/90 mb-6"
        >
          Forge Your Fantasies
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="max-w-2xl mx-auto text-lg text-white/70 mb-10"
        >
          AI companions that talk, tease, and connect to your smart toys.<br />
          Immersive roleplay with real-time device integration — every persona, every scenario, zero judgment.
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <button
            onClick={onGetStarted}
            className="px-10 py-5 bg-gradient-to-r from-[#FF2D7B] to-[#FF6B9D] hover:from-[#FF4D8A] hover:to-[#FF8EB0] text-white text-xl font-semibold rounded-3xl flex items-center gap-3 transition-all shadow-lg shadow-pink-500/30"
          >
            <Heart className="h-6 w-6" />
            Join the Waitlist
          </button>

          <div className="flex items-center gap-2 text-sm text-white/60 bg-black/60 border border-white/20 px-6 py-5 rounded-3xl">
            <Zap className="h-5 w-5 text-[#00FFD4]" />
            Powered by Grok and Lovense
          </div>
        </motion.div>
      </div>

      {/* Bottom glow */}
      <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-black to-transparent" />
    </section>
  );
}