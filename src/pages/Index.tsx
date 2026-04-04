import { useState } from "react";
import AgeGate from "@/components/AgeGate";
import HeroSection from "@/components/HeroSection";
import CompanionGallery from "@/components/CompanionGallery";
import FeaturesGrid from "@/components/FeaturesGrid";
import WaitlistSection from "@/components/WaitlistSection";
import PricingTeaser from "@/components/PricingTeaser";
import ParticleBackground from "@/components/ParticleBackground";
import Navbar from "@/components/Navbar";

const Index = () => {
  const [ageVerified, setAgeVerified] = useState(() => {
    return localStorage.getItem("lustforge-age-verified") === "true";
  });

  if (!ageVerified) {
    return <AgeGate onVerified={() => setAgeVerified(true)} />;
  }

  return (
    <div className="min-h-screen bg-background relative">
      <ParticleBackground />
      <Navbar />
      <HeroSection />
      <CompanionGallery />
      <FeaturesGrid />
      <PricingTeaser />
      <WaitlistSection />

      <footer className="border-t border-border py-8 px-4 text-center">
        <p className="text-xs text-muted-foreground max-w-2xl mx-auto">
          LustForge AI is strictly for adults 18+. All characters are AI-generated fiction.
          All interactions are consensual fantasy. Safe-word support is available in every session.
          We do not store private chat logs on our servers. Your privacy is paramount.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          © 2026 LustForge AI · <span className="text-primary">Premium</span> coming soon
        </p>
      </footer>
    </div>
  );
};

export default Index;
