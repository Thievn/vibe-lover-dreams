import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ParticleBackground from "@/components/ParticleBackground";
import { Flame } from "lucide-react";

// Default imports (these files use export default)
import HeroSection from "@/components/HeroSection";
import FeaturesGrid from "@/components/FeaturesGrid";
import PricingTeaser from "@/components/PricingTeaser";
import Navbar from "@/components/Navbar";
import WaitlistSection from "@/components/WaitlistSection";

// Named imports
import { NavLink } from "@/components/NavLink";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isDevMode] = useState(true); // forced true so we can see the dev badge

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      }
    });
  }, []);

  const handleGetStarted = () => {
    if (user) {
      navigate("/companion/lilith-vesper");
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <ParticleBackground />

      {/* Visible Dev Build Indicator - proves the new deployment is live */}
      {isDevMode && (
        <div className="fixed top-4 right-4 z-50 bg-black/90 backdrop-blur-md border border-red-500/50 rounded-full px-4 py-1.5 text-xs text-red-400 font-mono shadow-lg">
          DEV BUILD • {new Date().toLocaleTimeString()}
        </div>
      )}

      <Navbar>
        <NavLink to="/auth">Sign In</NavLink>
      </Navbar>

      <HeroSection onGetStarted={handleGetStarted} />
      <FeaturesGrid />
      <PricingTeaser />
      <WaitlistSection />

      <footer className="py-8 text-center text-muted-foreground text-sm border-t border-border/50 relative z-10">
        <div 
          className="flex flex-col items-center gap-3 mb-6 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <Flame className="h-7 w-7 text-primary" />
          <span className="text-xs uppercase tracking-[0.4em] text-primary">LustForge AI</span>
        </div>
        <p>© 2025 LustForge AI. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Index;