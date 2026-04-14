import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import ParticleBackground from "@/components/ParticleBackground";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import CreationSystem from "@/components/CreationSystem";
import FeaturesGrid from "@/components/FeaturesGrid";
import Testimonials from "@/components/Testimonials";
import WaitlistSection from "@/components/WaitlistSection";

const Index = () => {
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    supabase.auth
      .getSession()
      .catch((error) => {
        console.error("Failed to get session in Index:", error);
      })
      .finally(() => setUserLoading(false));
  }, []);

  // Temporary: scroll to waitlist instead of going to broken auth
  const handleGetStarted = () => {
    document.getElementById("waitlist")?.scrollIntoView({ 
      behavior: "smooth" 
    });
  };

  // Fallback if components fail to load
  if (userLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading landing page...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <ParticleBackground />
      {/* Soft ambient lift — still dark, reads “brighter” without washing out neon */}
      <div
        className="pointer-events-none fixed inset-0 z-[1]"
        aria-hidden
        style={{
          background: `
            radial-gradient(ellipse 120% 55% at 50% -15%, hsl(330 100% 58% / 0.11), transparent 52%),
            radial-gradient(ellipse 70% 45% at 100% 35%, hsl(170 100% 50% / 0.06), transparent 50%),
            radial-gradient(ellipse 55% 40% at 0% 60%, hsl(280 50% 45% / 0.07), transparent 48%),
            linear-gradient(to bottom, hsl(240 18% 6%) 0%, hsl(240 20% 4.2%) 45%, hsl(240 22% 3.5%) 100%)
          `,
        }}
      />

      <div className="relative z-10">
        <Navbar />
        <HeroSection onGetStarted={handleGetStarted} />
        <CreationSystem />
        <FeaturesGrid />
        <Testimonials />
        <WaitlistSection />
      </div>

      <footer className="relative z-10 border-t border-white/[0.06] bg-gradient-to-t from-black/20 to-transparent py-12 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-3 text-xs text-muted-foreground/90">
          <p><strong className="text-foreground/80">18+ Only.</strong> By using LustForge AI, you confirm you are at least 18 years of age. All characters are AI-generated fiction. No real persons are depicted. All interactions are consensual fantasy simulations.</p>
          <p>Safe-word support is available in every session. We do not store private chat logs on our servers. Your privacy is paramount. For data deletion requests, contact <a href="mailto:support@lustforge.app" className="text-primary hover:underline">support@lustforge.app</a>.</p>
          <p>© 2026 LustForge AI · <span className="text-primary">Premium</span> coming soon</p>
          <p className="tracking-widest uppercase">Powered by <span className="text-primary/80 text-glow-pink font-medium">Grok</span> • <span className="text-accent/80 text-glow-teal font-medium">Lovense</span></p>
        </div>
      </footer>
    </div>
  );
};

export default Index;