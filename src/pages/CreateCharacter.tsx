import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import ParticleBackground from "@/components/ParticleBackground";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Loader2, User, MessageSquare, Globe } from "lucide-react";
import { toast } from "sonner";

const CreateCharacter = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [personality, setPersonality] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim() || !personality.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("custom_characters").insert({
        user_id: user.id,
        name: name.trim(),
        personality: personality.trim(),
        avatar_url: avatarUrl.trim() || null,
        is_public: isPublic,
      });

      if (error) throw error;
      toast.success("Character created!");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to create character");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <ParticleBackground />
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-8 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <h1 className="font-gothic text-3xl font-bold gradient-vice-text mb-2 flex items-center gap-3">
            <Sparkles className="h-7 w-7 text-primary" />
            Create Character
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            Design your own AI companion with a unique personality.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="rounded-xl border border-border bg-card p-6">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                <User className="h-4 w-4 text-primary" />
                Character Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Shadow, Luna, Blaze..."
                required
                maxLength={50}
                className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Personality */}
            <div className="rounded-xl border border-border bg-card p-6">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Personality Description
              </label>
              <p className="text-xs text-muted-foreground mb-3">
                Describe how this character talks, their backstory, interests, and behavior style.
              </p>
              <textarea
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                placeholder="A mysterious wanderer with a dry sense of humor and a hidden soft side..."
                required
                maxLength={2000}
                rows={6}
                className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {personality.length}/2000
              </p>
            </div>

            {/* Avatar URL */}
            <div className="rounded-xl border border-border bg-card p-6">
              <label className="text-sm font-medium text-foreground mb-2 block">
                Avatar URL <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Public toggle */}
            <div className="rounded-xl border border-border bg-card p-6">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Make Public</p>
                    <p className="text-xs text-muted-foreground">
                      Share with the community (requires admin approval)
                    </p>
                  </div>
                </div>
                <div
                  onClick={() => setIsPublic(!isPublic)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    isPublic ? "bg-primary" : "bg-muted border border-border"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      isPublic ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </div>
              </label>
            </div>

            <button
              type="submit"
              disabled={saving || !name.trim() || !personality.trim()}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold glow-pink hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Create Character
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default CreateCharacter;
