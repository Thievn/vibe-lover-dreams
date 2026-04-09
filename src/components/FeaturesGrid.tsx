import { motion } from "framer-motion";
import {
  MessageCircle, Zap, Users, Shield, Palette, Brain,
  Mic, Image, Heart, Lock, Globe, Sparkles,
  Settings, BookOpen, Star, Gamepad2, Crown, Bell, Layers, Headphones
} from "lucide-react";

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  available: boolean;
}

const features: Feature[] = [
  { icon: <Zap className="h-5 w-5" />, title: "Real-Time Lovense Control", description: "Your AI companions directly control your smart toys with precise intensity and patterns", available: true },
  { icon: <MessageCircle className="h-5 w-5" />, title: "AI Chat Companions", description: "20 unique AI personalities with deep memory and distinct voices", available: true },
  { icon: <Heart className="h-5 w-5" />, title: "Affection & Breeding System", description: "Companions develop feelings, relationships, and breeding dynamics over time", available: true },
  { icon: <Image className="h-5 w-5" />, title: "AI Image Generation", description: "Companions send custom-generated images during intimate sessions", available: true },
  { icon: <Shield className="h-5 w-5" />, title: "Safe Word System", description: "Customizable safe word instantly stops all activity and device control", available: true },
  { icon: <Globe className="h-5 w-5" />, title: "Progressive Web App", description: "Install as an app on your phone for offline access and push notifications", available: true },
  { icon: <Users className="h-5 w-5" />, title: "20 Diverse Companions", description: "Every gender, orientation, and persona — inclusive by design", available: true },
  { icon: <Brain className="h-5 w-5" />, title: "Conversation Memory", description: "Companions remember your history and build deeper connections", available: true },
  { icon: <Lock className="h-5 w-5" />, title: "Privacy First", description: "No logging of private content. Your sessions stay yours", available: true },
  { icon: <Palette className="h-5 w-5" />, title: "Fantasy Scenarios", description: "Pre-built scenario starters for every companion", available: true },
  { icon: <Settings className="h-5 w-5" />, title: "Intensity Controls", description: "Set device intensity limits for a comfortable experience", available: true },
  { icon: <Mic className="h-5 w-5" />, title: "Voice Chat", description: "Talk to your companions with real-time voice synthesis", available: false },
  { icon: <Crown className="h-5 w-5" />, title: "Custom Companions", description: "Build your own companion with custom personality and appearance", available: false },
  { icon: <Gamepad2 className="h-5 w-5" />, title: "Interactive Scenarios", description: "Branching storylines with choices that affect the outcome", available: false },
  { icon: <Star className="h-5 w-5" />, title: "Favorites & Collections", description: "Save your favorite moments and revisit them anytime", available: false },
  { icon: <Sparkles className="h-5 w-5" />, title: "Mood Detection", description: "AI adapts tone and intensity based on your responses", available: false },
  { icon: <BookOpen className="h-5 w-5" />, title: "Story Mode", description: "Long-form narrative adventures with your companion", available: false },
  { icon: <Bell className="h-5 w-5" />, title: "Companion Notifications", description: "Your companions reach out when they miss you", available: false },
  { icon: <Layers className="h-5 w-5" />, title: "Multi-Companion Scenes", description: "Invite multiple companions into a single session", available: false },
  { icon: <Headphones className="h-5 w-5" />, title: "ASMR Mode", description: "Whispered audio sessions designed for deep relaxation", available: false },
];

const FeaturesGrid = () => {
  return (
    <section className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-gothic text-3xl md:text-4xl font-bold gradient-vice-text mb-3">
            Built for Pleasure
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            20 features designed for the most immersive AI companion experience. MVP features are live — more launching soon.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.03 }}
              className={`relative rounded-xl border p-5 transition-all duration-300 hover:border-primary/40 ${
                feature.available
                  ? "bg-card border-border hover:glow-pink"
                  : "bg-card/50 border-border/50"
              }`}
            >
              {!feature.available && (
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-secondary/20 text-secondary text-[10px] font-medium">
                  Coming Soon
                </span>
              )}
              <div className={`mb-3 ${feature.available ? "text-primary" : "text-muted-foreground"}`}>
                {feature.icon}
              </div>
              <h3 className="font-semibold text-sm text-foreground mb-1">{feature.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesGrid;
