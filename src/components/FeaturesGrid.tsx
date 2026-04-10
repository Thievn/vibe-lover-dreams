import { useState } from "react";
import { Zap, Shield, Heart, Crown, Mic, Image, Users, Sparkles, Book, Bell, Star, Globe, Gamepad2, Headphones } from "lucide-react";

export default function FeaturesGrid() {
  const [refreshKey, setRefreshKey] = useState(0);

  const features = [
    { icon: Zap, title: "AI CHAT COMPANIONS", desc: "50+ unique AI personalities with deep memory", color: "#FF2D7B" },
    { icon: Shield, title: "SMART DEVICE CONTROL", desc: "Real-time Lovense integration", color: "#00FFD4" },
    { icon: Shield, title: "SAFE WORD SYSTEM", desc: "Customizable safe word instantly stops all activity", color: "#7B2D8E" },
    { icon: Crown, title: "HYBRID CREATION SYSTEM", desc: "Breed two companions to create unique hybrids", color: "#FF2D7B" },
    { icon: Heart, title: "CONVERSATION MEMORY", desc: "Companions remember your history", color: "#00FFD4" },
    { icon: Shield, title: "PRIVACY FIRST", desc: "No logging of private content", color: "#7B2D8E" },
    { icon: Book, title: "FANTASY SCENARIOS", desc: "Pre-built scenario starters for every companion", color: "#FF2D7B" },
    { icon: Zap, title: "INTENSITY CONTROLS", desc: "Set device intensity limits", color: "#00FFD4" },
    { icon: Mic, title: "VOICE CHAT", desc: "Talk to your companions with real-time voice", comingSoon: true },
    { icon: Image, title: "AI IMAGE GENERATION", desc: "Companions send custom-generated images", comingSoon: true },
    { icon: Users, title: "CUSTOM COMPANIONS", desc: "Build companions from scratch", comingSoon: true },
    { icon: Heart, title: "RELATIONSHIP SYSTEM", desc: "Companions develop feelings over time", comingSoon: true },
    { icon: Gamepad2, title: "INTERACTIVE SCENARIOS", desc: "Branching storylines with choices", comingSoon: true },
    { icon: Globe, title: "MULTI-LANGUAGE", desc: "20+ languages supported", comingSoon: true },
    { icon: Star, title: "FAVORITES & COLLECTIONS", desc: "Save your favorite moments", comingSoon: true },
    { icon: Sparkles, title: "MOOD DETECTION", desc: "AI adapts tone and intensity", comingSoon: true },
  ];

  return (
    <section className="py-20 px-6 bg-black/60">
      <div className="max-w-7xl mx-auto">
        {/* BUILT FOR PLEASURE */}
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold tracking-widest bg-gradient-to-r from-[#FF2D7B] via-[#00FFD4] to-[#7B2D8E] bg-clip-text text-transparent">
            BUILT FOR PLEASURE
          </h2>
          <p className="text-white/70 mt-3 text-lg">Features designed for the most immersive AI companion experience</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative bg-black/80 border border-white/10 hover:border-[#FF2D7B] rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-6">
                <feature.icon className="h-9 w-9" style={{ color: feature.color }} />
                {feature.comingSoon && (
                  <span className="text-xs uppercase tracking-widest bg-white/10 text-white/70 px-3 py-1 rounded-2xl">Coming Soon</span>
                )}
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-white/70 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* THE CREATION & CUSTOMIZATION SYSTEM */}
        <div className="mt-24 text-center">
          <h2 className="text-4xl font-bold tracking-widest text-white mb-4">THE CREATION &amp; CUSTOMIZATION SYSTEM</h2>
          <p className="text-white/70 max-w-2xl mx-auto">Build companions from scratch with limitless customization — or breed two together to create entirely new AI personalities.</p>
        </div>

        {/* 4 creation cards would go here if you want them added next — let me know */}

      </div>
    </section>
  );
}