import { useState } from "react";
import { Zap, Shield, Heart, Crown, Mic, Image as ImageIcon, Users, Sparkles, Book, Bell, Star, Globe, Gamepad2, Headphones, Lock, MessageCircle } from "lucide-react";

export default function FeaturesGrid() {
  const features = [
    { icon: MessageCircle, title: "AI CHAT COMPANIONS", desc: "50+ unique AI personalities with deep memory", color: "#FF2D7B" },
    { icon: Zap, title: "SMART DEVICE CONTROL", desc: "Real-time Lovense integration — your companion controls your devices", color: "#00FFD4" },
    { icon: Shield, title: "SAFE WORD SYSTEM", desc: "Customizable safe word instantly stops all activity", color: "#7B2D8E" },
    { icon: Crown, title: "HYBRID CREATION SYSTEM", desc: "Breed two companions to create unique hybrids", color: "#FF2D7B" },
    { icon: Heart, title: "CONVERSATION MEMORY", desc: "Companions remember your history and build deeper connections", color: "#00FFD4" },
    { icon: Lock, title: "PRIVACY FIRST", desc: "No logging of private content. Your sessions stay yours", color: "#7B2D8E" },
    { icon: Book, title: "FANTASY SCENARIOS", desc: "Pre-built scenario starters for every companion", color: "#FF2D7B" },
    { icon: Zap, title: "INTENSITY CONTROLS", desc: "Set device intensity limits for a comfortable experience", color: "#00FFD4" },
    { icon: Mic, title: "VOICE CHAT", desc: "Talk to your companions with real-time voice synthesis", comingSoon: true },
    { icon: ImageIcon, title: "AI IMAGE GENERATION", desc: "Companions send custom-generated images during sessions", comingSoon: true },
    { icon: Users, title: "CUSTOM COMPANIONS", desc: "Build companions from scratch with full control", comingSoon: true },
    { icon: Heart, title: "RELATIONSHIP SYSTEM", desc: "Companions develop feelings and relationship dynamics over time", comingSoon: true },
    { icon: Gamepad2, title: "INTERACTIVE SCENARIOS", desc: "Branching storylines with choices that affect the outcome", comingSoon: true },
    { icon: Globe, title: "MULTI-LANGUAGE", desc: "Companions speak your language — 20+ languages supported", comingSoon: true },
    { icon: Star, title: "FAVORITES & COLLECTIONS", desc: "Save your favorite moments and revisit them anytime", comingSoon: true },
    { icon: Sparkles, title: "MOOD DETECTION", desc: "AI adapts tone and intensity based on your responses", comingSoon: true },
  ];

  return (
    <section className="py-16 px-4 bg-black/60">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-gothic text-3xl md:text-4xl font-bold gradient-vice-text mb-3">BUILT FOR PLEASURE</h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">Features designed for the most immersive AI companion experience. MVP features are live — more launching soon.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className="relative rounded-xl border p-5 transition-all duration-300 hover:border-primary/40 bg-card border-border hover:glow-pink flex flex-col h-full"
            >
              <div className="mb-3 text-primary">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-sm text-foreground mb-1">{feature.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed flex-1">{feature.desc}</p>
              {feature.comingSoon && (
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-secondary/20 text-secondary text-[10px] font-medium">Coming Soon</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}