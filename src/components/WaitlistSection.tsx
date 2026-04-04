import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const WaitlistSection = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);

    try {
      const { error } = await supabase.from("waitlist").insert({ email: email.trim() });
      if (error) {
        if (error.code === "23505") {
          toast.info("You're already on the waitlist!");
        } else {
          throw error;
        }
      }
      setSubmitted(true);
      toast.success("You're on the list! We'll be in touch.");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-20 px-4">
      <div className="max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-primary/30 bg-card p-8 md:p-12 text-center glow-pink"
        >
          <Mail className="mx-auto h-10 w-10 text-primary mb-4" />
          <h2 className="font-gothic text-2xl md:text-3xl font-bold text-foreground mb-2">
            Join the <span className="gradient-vice-text">Waitlist</span>
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Get early access to premium features, new companions, and exclusive updates. No spam — ever.
          </p>

          {submitted ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-2 text-primary"
            >
              <CheckCircle className="h-12 w-12" />
              <p className="font-bold text-lg">You're in!</p>
              <p className="text-muted-foreground text-sm">We'll notify you when new features drop.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold glow-pink hover:scale-105 transition-transform disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join Waitlist"}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default WaitlistSection;
