import { WandSparkles, Heart, Trophy, Flame } from "lucide-react";

export default function CreationSystem() {
  return (
    <section className="py-12 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-secondary/30 bg-secondary/10 text-secondary text-xs font-medium mb-4">
            <WandSparkles className="h-3 w-3" /> Creation System
          </span>
          <h2 className="font-gothic text-3xl md:text-4xl font-bold gradient-vice-text mb-3">
            The Creation & Customization System
          </h2>
          <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
            Build companions from scratch with limitless customization — or breed two together to create entirely new AI personalities. 
            Collect rare hybrids, design unique characters, and unlock exclusive toy patterns no one else has.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="rounded-2xl border border-border bg-card p-6 hover:border-primary/40 transition-all duration-300 hover:glow-pink">
            <div className="text-primary mb-4">
              <WandSparkles className="h-6 w-6" />
            </div>
            <h3 className="font-gothic text-lg font-bold text-foreground mb-2">Companion Creator</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Design companions from the ground up — full control over appearance, personality, traits, kinks, and art style. 
              Limitless customization powered by AI. The perfect launchpad for the Hybrid system.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl border border-border bg-card p-6 hover:border-primary/40 transition-all duration-300 hover:glow-pink">
            <div className="text-primary mb-4">
              <Heart className="h-6 w-6" />
            </div>
            <h3 className="font-gothic text-lg font-bold text-foreground mb-2">Breed Companions</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Select any two companions from your collection and combine them in the Creation Chamber to produce a unique hybrid offspring.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-2xl border border-border bg-card p-6 hover:border-primary/40 transition-all duration-300 hover:glow-pink">
            <div className="text-primary mb-4">
              <Trophy className="h-6 w-6" />
            </div>
            <h3 className="font-gothic text-lg font-bold text-foreground mb-2">Rarity System</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every hybrid has a rarity tier — Common, Rare, Epic, Legendary, or Mythic. Chase the rarest combinations to complete your collection.
            </p>
          </div>

          {/* Card 4 */}
          <div className="rounded-2xl border border-border bg-card p-6 hover:border-primary/40 transition-all duration-300 hover:glow-pink">
            <div className="text-primary mb-4">
              <Flame className="h-6 w-6" />
            </div>
            <h3 className="font-gothic text-lg font-bold text-foreground mb-2">Unlock Toy Patterns</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Each hybrid unlocks exclusive device vibration patterns. The rarer the hybrid, the more intense and unique the pattern.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground italic">
            Join the waitlist to be among the first creators when the Creation Chamber opens.
          </p>
        </div>
      </div>
    </section>
  );
}