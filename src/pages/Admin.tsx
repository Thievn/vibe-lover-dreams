import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import ParticleBackground from "@/components/ParticleBackground";
import { motion } from "framer-motion";
import { Shield, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ADMIN_EMAIL = "lustforgeapp@gmail.com";

const Admin = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);

  // Forge Studio states
  const [imagePrompt, setImagePrompt] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [style, setStyle] = useState("cyber-goth");
  const [randomize, setRandomize] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          navigate("/auth", { replace: true });
          return;
        }

        if (session.user.email !== ADMIN_EMAIL) {
          toast.error("Access denied. Admin only.");
          navigate("/dashboard", { replace: true });
          return;
        }

        setUser(session.user);
      } catch (error) {
        console.error("Auth check failed:", error);
        navigate("/dashboard", { replace: true });
      } finally {
        setAuthLoading(false);
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const generateImage = async () => {
    if (!imagePrompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            prompt: imagePrompt,
            characterName,
            subtitle,
            style,
            randomize,
            portrait,
            userId: user.id,
            isPortrait: portrait,
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        setPreviewImage(data.imageUrl);
        toast.success("Image generated successfully!");
      } else {
        throw new Error(data.error || "Generation failed");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to generate image");
    } finally {
      setGenerating(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <ParticleBackground />
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-8 relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <Shield className="h-9 w-9 text-pink-500" />
          <div>
            <h1 className="font-gothic text-4xl font-bold gradient-vice-text">Admin Panel</h1>
            <p className="text-muted-foreground">Forge Studio • Management Tools</p>
          </div>
        </div>

        {/* Forge Studio - Main Tool */}
        <div className="bg-card border border-border rounded-3xl p-8 mb-10">
          <div className="flex items-center gap-3 mb-6">
            <ImageIcon className="h-7 w-7 text-pink-500" />
            <h2 className="text-2xl font-semibold">Forge Studio</h2>
            <span className="text-xs text-muted-foreground">Powered by Grok</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Image Prompt</label>
                <textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  rows={5}
                  className="w-full bg-muted border border-border rounded-2xl p-4 text-foreground focus:outline-none focus:border-pink-500"
                  placeholder="Describe your companion (e.g., seductive goth woman with long black hair...)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Character Name</label>
                  <input
                    type="text"
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    className="w-full bg-muted border border-border rounded-2xl p-4 text-foreground focus:outline-none focus:border-pink-500"
                    placeholder="Nyx Shadowveil"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Subtitle</label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="w-full bg-muted border border-border rounded-2xl p-4 text-foreground focus:outline-none focus:border-pink-500"
                    placeholder="Eternal Temptress"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Style</label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full bg-muted border border-border rounded-2xl p-4 text-foreground focus:outline-none focus:border-pink-500"
                >
                  <option value="cyber-goth">Cyber-Goth</option>
                  <option value="dark-fantasy">Dark Fantasy</option>
                  <option value="neon-noir">Neon Noir</option>
                  <option value="gothic-elegance">Gothic Elegance</option>
                  <option value="anime">Anime Style</option>
                </select>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={randomize}
                    onChange={(e) => setRandomize(e.target.checked)}
                  />
                  Randomize elements
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={portrait}
                    onChange={(e) => setPortrait(e.target.checked)}
                  />
                  Portrait mode
                </label>
              </div>

              <button
                onClick={generateImage}
                disabled={generating || !imagePrompt.trim()}
                className="w-full py-4 bg-pink-600 hover:bg-pink-700 disabled:bg-pink-800 rounded-2xl font-medium text-lg transition-all"
              >
                {generating ? "Generating..." : "Generate Image"}
              </button>
            </div>

            {/* Preview Area */}
            <div className="bg-zinc-950 border border-border rounded-3xl p-6 flex items-center justify-center min-h-[400px]">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt="Generated"
                  className="max-h-[420px] rounded-2xl shadow-2xl"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Your generated image will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Future sections can go here */}
        <div className="text-center text-muted-foreground py-8">
          More admin tools coming soon (User Management, Analytics, etc.)
        </div>
      </div>
    </div>
  );
};

export default Admin;
