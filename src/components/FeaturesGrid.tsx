import { useState } from "react";
import { Zap, Shield, Heart, Crown, Mic, Image as ImageIcon, Users, Sparkles, Book, Bell, Star, Globe, Gamepad2, Headphones } from "lucide-react";

export default function FeaturesGrid() {
  const features = [
    { icon: Zap, title: "AI CHAT COMPANIONS", desc: "50+ unique AI personalities with deep memory", color: "#FF2D7B" },
    { icon: Shield, title: "SMART DEVICE CONTROL", desc: "Real-time Lovense integration", color: "#00FFD4" },
    { icon: Shield, title: "SAFE WORD SYSTEM", desc: "Customizable safe word instantly stops all activity", color: "#7B2D8E" },
    { icon: Crown, title: "HYBRID CREATION SYSTEM", desc: "Breed two companions to create unique hybrids", color: "#FF2D7B" },
    { icon: Heart, title: "CONVERSATION MEMORY", desc: "Companions remember your history", color: "#00FFD4" },
    { icon: Shield, title: "PRIVACY FIRST", desc: "No logging of private content", color: "#7B2D8E" },
    { icon: Book, title: "FANTASY SCENARIOS", desc: "Pre-built scenario starters", color: "#FF2D7B" },
    { icon: Zap, title: "INTENSITY CONTROLS", desc: "Set device intensity limits", color: "#00FFD4" },
  ];

  return (
    <section className="py-20 px-6 bg-black/60">
      <div className="max-w-7xl mx-auto">
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
              className="group relative bg-black/80 border border-white/10 hover:border-[#FF2D7B] rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 h-full flex flex-col"
            >
              <div className="flex items-center justify-between mb-5">
                <feature.icon className="h-8 w-8" style={{ color: feature.color }} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-white/70 text-sm leading-relaxed flex-1">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}