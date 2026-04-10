import { Zap, Shield, Heart, Crown, Mic, Image as ImageIcon, Users, Sparkles, Book, Bell, Star, Globe, Gamepad2, Headphones, MessageCircle, Settings, Palette, Brain, Lock } from "lucide-react";

export default function FeaturesGrid() {
  const features = [
    { icon: MessageCircle, title: "AI Chat Companions", desc: "50+ unique AI personalities with deep memory and distinct voices — growing as users create hybrids", color: "#FF2D7B", comingSoon: false },
    { icon: Zap, title: "Smart Device Control", desc: "Real-time Lovense integration — your companion controls your devices", color: "#00FFD4", comingSoon: false },
    { icon: Shield, title: "Safe Word System", desc: "Customizable safe word instantly stops all activity and device control", color: "#FF2D7B", comingSoon: false },
    { icon: Gamepad2, title: "Hybrid Creation System", desc: "Breed two companions to create unique hybrids with exclusive rarity tiers and device patterns", color: "#00FFD4", comingSoon: false },
    { icon: Brain, title: "Conversation Memory", desc: "Companions remember your history and build deeper connections", color: "#FF2D7B", comingSoon: false },
    { icon: Lock, title: "Privacy First", desc: "No logging of private content. Your sessions stay yours", color: "#00FFD4", comingSoon: false },
    { icon: Palette, title: "Fantasy Scenarios", desc: "Pre-built scenario starters for every companion", color: "#FF2D7B", comingSoon: false },
    { icon: Settings, title: "Intensity Controls", desc: "Set device intensity limits for a comfortable experience", color: "#00FFD4", comingSoon: false },
    
    // Coming Soon ones
    { icon: Mic, title: "Voice Chat", desc: "Talk to your companions with real-time voice synthesis", color: "#7B2D8E", comingSoon: true },
    { icon: ImageIcon, title: "AI Image Generation", desc: "Companions send custom-generated images during sessions", color: "#7B2D8E", comingSoon: true },
    { icon: Crown, title: "Custom Companions", desc: "Build companions from scratch with full control over appearance, personality, traits, and art style", color: "#FF2D7B", comingSoon: false },
    { icon: Heart, title: "Relationship System", desc: "Companions develop feelings and relationship dynamics over time", color: "#7B2D8E", comingSoon: true },
    { icon: Gamepad2, title: "Interactive Scenarios", desc: "Branching storylines with choices that affect the outcome", color: "#7B2D8E", comingSoon: true },
    { icon: Globe, title: "Multi-Language", desc: "Companions speak your language — 20+ languages supported", color: "#7B2D8E", comingSoon: true },
    { icon: Star, title: "Favorites & Collections", desc: "Save your favorite moments and revisit them anytime", color: "#FF2D7B", comingSoon: true },
    { icon: Sparkles, title: "Mood Detection", desc: "AI adapts tone and intensity based on your responses", color: "#7B2D8E", comingSoon: true },
    { icon: Book, title: "Story Mode", desc: "Long-form narrative adventures with your companion", color: "#7B2D8E", comingSoon: true },
    { icon: Bell, title: "Companion Notifications", desc: "Your companions reach out when they miss you", color: "#7B2D8E", comingSoon: true },
    { icon: Users, title: "Multi-Companion Scenes", desc: "Invite multiple companions into a single session", color: "#7B2D8E", comingSoon: true },
    { icon: Headphones, title: "ASMR Mode", desc: "Whispered audio sessions designed for deep relaxation", color: "#7B2D8E", comingSoon: true },
  ];

  return (
    <section className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-gothic text-3xl md:text-4xl font-bold gradient-vice-text mb-3">Built for Pleasure</h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">Features designed for the most immersive AI companion experience. MVP features are live — more launching soon.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className={`relative rounded-xl border p-5 transition-all duration-300 hover:border-primary/40 bg-card ${feature.comingSoon ? 'border-border/50 bg-card/50' : 'border-border hover:glow-pink'}`}
            >
              {feature.comingSoon && (
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-secondary/20 text-secondary text-[10px] font-medium">Coming Soon</span>
              )}
              
              <div className={`mb-3 ${feature.comingSoon ? 'text-muted-foreground' : 'text-primary'}`}>
                <feature.icon className="h-5 w-5" style={{ color: feature.color }} />
              </div>
              
              <h3 className="font-semibold text-sm text-foreground mb-1">{feature.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}