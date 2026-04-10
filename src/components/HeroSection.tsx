import { motion } from "framer-motion";
import { Heart, Zap } from "lucide-react";

interface HeroSectionProps {
  onGetStarted: () => void;
}

export default function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center px-4 overflow-hidden pt-14">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="relative z-10 text-center max-w-3xl mx-auto">
        {/* Top badge */}
        <div className="mb-4">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium">
            Strictly 18+ · AI-Powered Companions
          </span>
        </div>

        {/* Title */}
        <h1 className="font-gothic text-4xl sm:text-5xl md:text-6xl font-bold mb-4 leading-tight">
          <span className="gradient-vice-text">LustForge</span> <span className="text-foreground">AI</span>
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground mb-2 italic">Forge Your Fantasies</p>

        <p className="text-sm text-muted-foreground mb-8 max-w-xl mx-auto">
          AI companions that talk, tease, and connect to your smart toys. Immersive roleplay with real-time device integration — every persona, every scenario, zero judgment.
        </p>

        {/* Buttons */}
        <div className="flex justify-center gap-4">
          <button
            onClick={onGetStarted}
            className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-lg glow-pink hover:scale-105 transition-transform inline-flex items-center gap-2"
          >
            <Heart className="h-5 w-5" />
            Join the Waitlist
          </button>

          <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-black/70 border border-white/20 text-sm">
            <Zap className="h-4 w-4 text-[#00FFD4]" />
            Powered by Grok and Lovense
          </div>
        </div>

        {/* Stats */}
        <div className="mt-12 flex justify-center items-end gap-8 text-muted-foreground text-xs">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">61+</div>
            <div>Companions &amp; Growing</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-[#00FFD4]">∞</div>
            <div>Scenarios</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#7B2D8E]">🔒</div>
            <div>Private &amp; Safe</div>
          </div>
        </div>
      </div>
    </section>
  );
}