import { useState } from "react";
import { RefreshCw } from "lucide-react";

const featuredCompanions = [
  {
    name: "Ravyn Nocturne",
    title: "Dark Seductress of Your Nightmares",
    image: "/assets/raven-nox-B2Lyg3eu.jpg", // replace with your actual image path if needed
  },
  {
    name: "Kira Lux",
    title: "Bratty, Beautiful, Unbreakable",
    image: "/assets/kira-lux-BAQtoFWU.jpg",
  },
  {
    name: "Lena Frost",
    title: "Cold Hands, Colder Heart",
    image: "/assets/lena-frost-CaLMRX9B.jpg",
  },
  {
    name: "Sage Evergreen",
    title: "Wild, Untamed, Addictive",
    image: "/assets/sage-evergreen-B9k12EVN.jpg",
  },
  {
    name: "Nova Quinn",
    title: "Cosmic Tease from Another Galaxy",
    image: "/assets/nova-quinn-BDTGLlmD.jpg",
  },
  {
    name: "Lilith Vesper",
    title: "Your Personal Goth Mommy",
    image: "/assets/lilith-vesper-DgzRo18X.jpg",
  },
];

export default function FeaturesGrid() {
  const [companions, setCompanions] = useState(featuredCompanions);

  const refreshCompanions = () => {
    // Shuffle for refresh effect
    const shuffled = [...featuredCompanions].sort(() => Math.random() - 0.5);
    setCompanions(shuffled);
  };

  return (
    <section className="py-16 px-6 bg-black/40">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-4xl font-gothic tracking-widest text-white">
            61+ COMPANIONS &amp; GROWING
          </h2>
          <button
            onClick={refreshCompanions}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all border border-white/20"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="text-sm font-medium">Refresh Companions</span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {companions.map((companion, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-3xl bg-black border border-white/10 hover:border-pink-500 transition-all duration-300"
            >
              <img
                src={companion.image}
                alt={companion.name}
                className="w-full h-80 object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6">
                <h3 className="text-xl font-bold text-white">{companion.name}</h3>
                <p className="text-pink-300 text-sm">{companion.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}