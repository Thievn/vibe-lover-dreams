import { useState, useEffect } from "react";
import AgeGate from "@/components/AgeGate";
import HeroSection from "@/components/HeroSection";
import CompanionGallery from "@/components/CompanionGallery";
import ParticleBackground from "@/components/ParticleBackground";
import Navbar from "@/components/Navbar";

const Index = () => {
  const [ageVerified, setAgeVerified] = useState(() => {
    return localStorage.getItem("vicevibe-age-verified") === "true";
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

      {/* Footer disclaimer */}
      <footer className="border-t border-border py-8 px-4 text-center">
        <p className="text-xs text-muted-foreground max-w-2xl mx-auto">
          ViceVibe AI is strictly for adults 18+. All characters are AI-generated fiction. 
          All interactions are consensual fantasy. Safe-word support is available in every session. 
          We do not store explicit chat logs on our servers. Your privacy is paramount.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          © 2026 ViceVibe AI · <span className="text-primary">Premium</span> coming soon
        </p>
      </footer>
    </div>
  );
};

export default Index;
