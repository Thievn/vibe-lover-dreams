import { useState } from "react";
import { Sparkles, Dice6, Zap } from "lucide-react";

export default function CompanionCreator() {
  const [numCompanions, setNumCompanions] = useState(1);

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="h-8 w-8 text-purple-400" />
          <h1 className="font-gothic text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            COMPANION CREATOR
          </h1>
        </div>
        <p className="text-muted-foreground text-lg mb-8">Design your own AI companion with limitless customization. Each companion costs 250 tokens.</p>

        {/* Token Balance */}
        <div className="bg-gradient-to-r from-emerald-900/80 to-cyan-900/80 border border-emerald-400/30 rounded-3xl p-5 flex items-center gap-4 mb-8">
          <div className="bg-emerald-400 text-black rounded-2xl p-3">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-emerald-300">Balance</p>
            <p className="text-3xl font-bold text-white">10,965 tokens</p>
          </div>
          <div className="ml-auto text-xs text-emerald-300 bg-black/50 px-4 py-2 rounded-2xl">
            250 tokens per companion created
          </div>
        </div>

        {/* Randomize Button */}
        <button className="w-full py-5 rounded-3xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white font-bold text-xl flex items-center justify-center gap-3 hover:scale-[1.02] transition-all mb-10 shadow-xl">
          <Dice6 className="h-7 w-7" />
          Randomize / Roulette
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Left Column */}
          <div className="space-y-8">
            <div>
              <label className="text-sm text-muted-foreground block mb-3">Number of Companions</label>
              <div className="flex gap-2 flex-wrap">
                {[1, 3, 5, 10].map(n => (
                  <button
                    key={n}
                    onClick={() => setNumCompanions(n)}
                    className={`px-6 py-3 rounded-2xl font-medium transition-all ${numCompanions === n ? "bg-pink-500 text-white" : "bg-muted hover:bg-muted/80"}`}
                  >
                    {n}
                  </button>
                ))}
                <button className="px-6 py-3 rounded-2xl font-medium bg-muted hover:bg-muted/80">Custom</button>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground block mb-3">Name Prefix (optional)</label>
              <input type="text" placeholder='e.g. "Shadow" → Shadow Nova, Shadow Veil...' className="w-full px-5 py-4 rounded-2xl bg-muted border border-border text-sm focus:outline-none focus:border-primary" />
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <label className="text-sm text-muted-foreground block mb-3">Appearance Style</label>
                <select className="w-full px-5 py-4 rounded-2xl bg-muted border border-border text-sm focus:outline-none focus:border-primary">
                  <option>Realistic</option>
                  <option>Anime</option>
                  <option>Fantasy</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-3">Body Type</label>
                <select className="w-full px-5 py-4 rounded-2xl bg-muted border border-border text-sm focus:outline-none focus:border-primary">
                  <option>Curvy</option>
                  <option>Athletic</option>
                  <option>Petite</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <div>
              <label className="text-sm text-muted-foreground block mb-3">Art Style Preference</label>
              <select className="w-full px-5 py-4 rounded-2xl bg-muted border border-border text-sm focus:outline-none focus:border-primary">
                <option>Realistic</option>
                <option>Stylized</option>
                <option>Hyper-Realistic</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground block mb-3">Special Traits (comma-separated)</label>
              <input type="text" placeholder="Tattoos, Horns, Glowing Eyes..." className="w-full px-5 py-4 rounded-2xl bg-muted border border-border text-sm focus:outline-none focus:border-primary" />
            </div>
          </div>
        </div>

        {/* Gender / Identity */}
        <div className="mt-10">
          <label className="text-sm text-muted-foreground block mb-3">Gender / Identity</label>
          <div className="flex flex-wrap gap-2">
            {["Female", "Male", "Trans Woman", "Trans Man", "Non-Binary", "Enby", "Furry"].map((g) => (
              <button key={g} className="px-5 py-2.5 rounded-2xl bg-muted hover:bg-pink-500/20 hover:text-pink-400 transition-all">
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Personality Archetype */}
        <div className="mt-10">
          <label className="text-sm text-muted-foreground block mb-3">Personality Archetype</label>
          <div className="flex flex-wrap gap-2">
            {["Dominant", "Submissive", "Switch", "Bratty", "Gentle", "Yandere", "Himbo", "Gremlin", "Sadistic", "Caring Mommy/Daddy", "Teasing", "Shy", "Chaotic", "Romantic", "Possessive", "Playful", "Dark", "Wholesome-to-Filthy", "Furry"].map((p) => (
              <button key={p} className="px-5 py-2.5 rounded-2xl bg-muted hover:bg-purple-500/20 hover:text-purple-400 transition-all text-sm">
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Vibe / Theme */}
        <div className="mt-10">
          <label className="text-sm text-muted-foreground block mb-3">Vibe / Theme</label>
          <div className="flex flex-wrap gap-2">
            {["Goth", "Cyberpunk", "Fantasy", "Sci-Fi", "Horror", "Medieval", "Modern", "Anime", "Monster", "Alien", "Pirate", "Vampire", "Witch", "Succubus/Incubus"].map((v) => (
              <button key={v} className={`px-5 py-2.5 rounded-2xl transition-all text-sm ${v === "Cyberpunk" ? "bg-cyan-500 text-black" : "bg-muted hover:bg-cyan-500/20 hover:text-cyan-400"}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Generation Preview */}
        <div className="mt-12 bg-card border border-border rounded-3xl p-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-purple-400" />
            <span className="font-medium">GENERATION PREVIEW</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="px-5 py-2 bg-muted rounded-2xl text-sm">1x companions</div>
            <div className="px-5 py-2 bg-muted rounded-2xl text-sm">Realistic</div>
            <div className="px-5 py-2 bg-muted rounded-2xl text-sm">Curvy</div>
            <div className="px-5 py-2 bg-muted rounded-2xl text-sm">Realistic art</div>
            <div className="px-5 py-2 bg-pink-500 text-white rounded-2xl text-sm">Female</div>
            <div className="px-5 py-2 bg-purple-500 text-white rounded-2xl text-sm">Dominant</div>
            <div className="px-5 py-2 bg-cyan-500 text-black rounded-2xl text-sm">Cyberpunk</div>
          </div>
        </div>

        {/* Admin Note + Generate Button */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Admin — Free (no token cost)
        </div>

        <button className="w-full mt-6 py-6 rounded-3xl bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white font-bold text-2xl flex items-center justify-center gap-3 hover:scale-[1.02] transition-all shadow-2xl">
          ✨ Generate 1 Companion with Grok
        </button>
      </div>
    </div>
  );
}