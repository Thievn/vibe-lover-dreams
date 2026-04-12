import { motion } from "framer-motion";
import { Flame, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";

interface HeroSectionProps {
  onGetStarted: () => void;
}

interface Companion {
  name: string;
  subtitle: string;
  img: string;
}

export default function HeroSection({ onGetStarted }: HeroSectionProps) {
  const [shuffled, setShuffled] = useState<Companion[]>([]);
  const [allCompanions, setAllCompanions] = useState<Companion[]>([]);

  // Random fallback subtitles
  const possibleSubtitles = [
    "Level Up Your Love Life",
    "Your Roommate Has a Secret",
    "A tender touch to ignite your deepest desires",
    "Electric Nights Await",
    "Between Worlds, Between Sheets",
    "Bratty, Beautiful, Unbreakable",
    "Follow the Light to Fun",
    "Chilled Passions in the Heat of Night",
    "Unlock the Hybrid Within",
    "Vibrations That Speak to Your Soul",
    "Rare Encounters, Epic Connections",
    "Forge Fantasies That Feel Real",
  ];

  // Subtitle map: Specific matching per name
  const subtitleMap: Record<string, string> = {
    'Tyler Kane': 'Your Roommate Has a Secret',
    'Kira Lux': 'Bratty, Beautiful, Unbreakable',
    'Lena Frost': 'Chilled Passions in the Heat of Night',
    'Bianca Rose': 'A tender touch to ignite your deepest desires',
    'Elara Moon': 'Between Worlds, Between Sheets',
    'Zara Eclipse': 'Electric Nights Await',
    'Jaxson Voss': 'Unlock the Hybrid Within',
    'Sage Evergreen': 'Rare Encounters, Epic Connections',
    'Raven Nox': 'Vibrations That Speak to Your Soul',
    'Diego Cortez': 'Follow the Light to Fun',
    'Lilith Vesper': 'Forge Fantasies That Feel Real',
    'Finn Blaze': 'Level Up Your Love Life',
    // Add more for your companions
  };

  // Get subtitle: Match first, random fallback
  const getSubtitle = (name: string): string => {
    return subtitleMap[name as keyof typeof subtitleMap] || possibleSubtitles[Math.floor(Math.random() * possibleSubtitles.length)];
  };

  // Generate companion
  const generateCompanion = (name: string, img: string): Companion => ({
    name,
    subtitle: getSubtitle(name),
    img,
  });

  // Single glob for src/assets/companions/
  useEffect(() => {
    const importImages = import.meta.glob('../assets/companions/*.{png,jpg,jpeg,webp,gif}', { 
      query: '?url', 
      import: 'default', 
      eager: true 
    });
    
    console.log('Images found in folder:', Object.keys(importImages));  // Debug

    const loadedCompanions: Companion[] = Object.entries(importImages).map(([path, imgUrl]) => {
      // Extract name from filename
      const filename = path.split('/').pop() || '';
      const nameWithoutExt = filename.replace(/\.(png|jpg|jpeg|webp|gif)$/i, '');
      const formattedName = nameWithoutExt
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

      // Assign matching subtitle (or random fallback)
      return generateCompanion(formattedName, imgUrl as string);
    });

    setAllCompanions(loadedCompanions);  // Full folder for stats

    // Initial 6: Random from full folder
    const initialSix = getRandomSix(loadedCompanions);
    setShuffled(initialSix);
  }, []);

  // Get random 6 from full folder pool
  const getRandomSix = (pool: Companion[]): Companion[] => {
    if (pool.length <= 6) return pool;  // Show all if <6
    const shuffledPool = [...pool].sort(() => Math.random() - 0.5);
    return shuffledPool.slice(0, 6);
  };

  // Shuffle: New random 6 from full folder + re-assign subtitles
  const shuffleCompanions = () => {
    const newSix = getRandomSix(allCompanions);
    const withUpdatedSubtitles = newSix.map(comp => ({
      ...comp,
      subtitle: getSubtitle(comp.name)
    }));
    setShuffled(withUpdatedSubtitles);
  };

  const totalCompanions = allCompanions.length;

  if (totalCompanions === 0) {
    return (
      <section className="relative min-h-[80vh] flex items-center justify-center px-4 overflow-hidden">
        <div className="text-center text-muted-foreground">
          Loading companions... (Add images to src/assets/companions/)
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-[80vh] flex items-center justify-center px-4 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="relative z-10 text-center max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium">
            <Flame className="h-3 w-3" /> Strictly 18+ · AI-Powered Companions
          </span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-gothic text-4xl sm:text-5xl md:text-6xl font-bold mb-4 leading-tight"
        >
          <span className="gradient-vice-text">LustForge</span> <span className="text-foreground">AI</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-lg sm:text-xl text-muted-foreground mb-2 italic"
        >
          Forge Your Fantasies
        </motion.p>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-muted-foreground mb-8 max-w-xl mx-auto"
        >
          AI companions that talk, tease, and connect to your smart toys. Immersive roleplay with real-time device integration — every persona, every scenario, zero judgment.
        </motion.p>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <button 
            onClick={onGetStarted}
            className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-lg glow-pink hover:scale-105 transition-transform inline-flex items-center gap-2"
          >
            <Flame className="h-5 w-5" /> Join the Waitlist
          </button>
        </motion.div>

        {/* Stats - dynamic total from folder */}
        <div className="mt-12 flex justify-center items-end gap-8 text-muted-foreground text-xs">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{totalCompanions}+</div>
            <div>Companions & Growing</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-electric-teal">∞</div>
            <div>Scenarios</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-velvet-purple">🔒</div>
            <div>Private & Safe</div>
          </div>
        </div>

        {/* 6-Card Carousel - random 6 from folder */}
        <div className="mt-14 relative max-w-2xl mx-auto">
          <button 
            onClick={shuffleCompanions}
            className="absolute -top-5 right-0 text-primary/40 hover:text-primary/70 transition-colors z-10"
            aria-label="Shuffle companions"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {shuffled.map((comp, index) => (
              <div key={index} className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden hover:border-primary/40 transition-all hover:scale-[1.02] group">
                <div className="w-full aspect-[3/4] relative" style={{ background: "linear-gradient(135deg, rgb(255, 20, 147), rgb(0, 191, 255))" }}>
                  <img 
                    src={comp.img} 
                    alt={comp.name} 
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" 
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.background = 'linear-gradient(135deg, #ff1493, #00bfff)';
                      target.style.backgroundSize = 'cover';
                      target.src = '';
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <p className="text-sm font-bold text-white truncate">{comp.name}</p>
                    <p className="text-[10px] text-white/70 truncate">{comp.subtitle}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}