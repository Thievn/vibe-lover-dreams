import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ParticleBackground from "@/components/ParticleBackground";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import CreationSystem from "@/components/CreationSystem";
import FeaturesGrid from "@/components/FeaturesGrid";
import Testimonials from "@/components/Testimonials";
import WaitlistSection from "@/components/WaitlistSection";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isDevMode] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user);
    });
  }, []);

  const handleGetStarted = () => {
    navigate("/auth"); // temporary - we'll improve this later
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <ParticleBackground />

      {isDevMode && (
        <div className="fixed top-4 right-4 z-50 bg-black/90 backdrop-blur-md border border-red-500/50 rounded-full px-4 py-1.5 text-xs text-red-400 font-mono shadow-lg">
          DEV BUILD • {new Date().toLocaleTimeString()}
        </div>
      )}

      <Navbar />

      <HeroSection onGetStarted={handleGetStarted} />
      <CreationSystem />
      <FeaturesGrid />
      <Testimonials />
      <WaitlistSection />

      <footer className="border-t border-border py-10 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-3 text-xs text-muted-foreground">
          <p><strong className="text-foreground/80">18+ Only.</strong> By using LustForge AI, you confirm you are at least 18 years of age. All characters are AI-generated fiction. No real persons are depicted. All interactions are consensual fantasy simulations.</p>
          <p>Safe-word support is available in every session. We do not store private chat logs on our servers. Your privacy is paramount. For data deletion requests, contact <a href="mailto:lustforgeapp@gmail.com" className="text-primary hover:underline">lustforgeapp@gmail.com</a>.</p>
          <p>© 2026 LustForge AI · <span className="text-primary">Premium</span> coming soon</p>
          <p className="tracking-widest uppercase">Powered by <span className="text-primary/80 text-glow-pink font-medium">Grok</span> • <span className="text-accent/80 text-glow-teal font-medium">Lovense</span></p>
        </div>
      </footer>
    </div>
  );
};

export default Index;