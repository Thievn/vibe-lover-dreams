import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

interface HeroSectionProps {
  onGetStarted?: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onGetStarted }) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center text-center px-4 py-20 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
      <div className="absolute top-20 left-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-secondary/20 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        {/* Main headline */}
        <div className="space-y-6">
          <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent leading-tight">
            Unleash Your <span className="text-glow-pink">Deepest</span> Desires
          </h1>
          <p className="text-xl md:text-2xl text-foreground/80 max-w-2xl mx-auto leading-relaxed">
            Create AI companions that understand your every fantasy. Real-time Lovense integration for immersive, connected experiences.
          </p>
        </div>

        {/* Call to action */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={onGetStarted}
            className="group relative px-8 py-4 bg-gradient-to-r from-primary to-secondary text-background font-semibold rounded-xl shadow-lg hover:shadow-primary/50 transition-all duration-300 transform hover:scale-105 text-lg"
          >
            Start Creating Now
            <ArrowRight className="ml-2 h-5 w-5 inline group-hover:translate-x-1 transition-transform" />
          </button>
          <Link
            to="/auth"
            className="px-8 py-4 border-2 border-border/50 text-foreground font-semibold rounded-xl hover:border-primary/50 hover:text-primary transition-all duration-300 text-lg"
          >
            See Features <Sparkles className="ml-2 h-5 w-5 inline" />
          </Link>
        </div>

        {/* Social proof */}
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          What beta testers are experiencing
        </p>
      </div>
    </section>
  );
};

export default HeroSection;