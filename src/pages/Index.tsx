import { useState } from "react";
import AgeGate from "@/components/AgeGate";
import HeroSection from "@/components/HeroSection";
import CompanionGallery from "@/components/CompanionGallery";
import FeaturesGrid from "@/components/FeaturesGrid";
import WaitlistSection from "@/components/WaitlistSection";
import PricingTeaser from "@/components/PricingTeaser";
import ParticleBackground from "@/components/ParticleBackground";
import Navbar from "@/components/Navbar";

// Force preview reconnect
const Index = () => {
  const [ageVerified, setAgeVerified] = useState(() => {
    return localStorage.getItem("lustforge-age-verified") === "true";
  });

  if (!ageVerified) {
    return <AgeGate onVerified={() => setAgeVerified(true)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-deep-black relative overflow-hidden">
      <ParticleBackground />
      <Navbar />
      <HeroSection />
      <CompanionGallery />
      <FeaturesGrid />
      <PricingTeaser />
      <WaitlistSection />

      <footer className="border-t border-border/50 py-12 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent pointer-events-none" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="flex justify-center items-center gap-4 mb-6">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold text-sm">G</span>
            </div>
            <span className="text-muted-foreground">×</span>
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
              <span className="text-accent font-bold text-sm">L</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-4">
            LustForge AI is strictly for adults 18+. All characters are AI-generated fiction.
            All interactions are consensual fantasy. Safe-word support is available in every session.
            We do not store private chat logs on our servers. Your privacy is paramount.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-muted-foreground">
            <span>© 2026 LustForge AI</span>
            <span className="hidden sm:block">•</span>
            <span className="gradient-vice-text font-medium">Premium Experience Coming Soon</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
