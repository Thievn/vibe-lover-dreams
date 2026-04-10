import { useState } from "react";
import { Mail, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("waitlist")
        .insert([{ email: email.trim().toLowerCase() }]);

      if (error) throw error;

      setIsSuccess(true);
      setEmail("");
      toast.success("You're on the waitlist! 🎉 We'll email you when we launch.");
      
      // Reset success message after 5 seconds
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section id="waitlist" className="py-20 px-4">
      <div className="max-w-xl mx-auto">
        <div className="rounded-2xl border border-primary/30 bg-card p-8 md:p-12 text-center glow-pink">
          <Mail className="mx-auto h-10 w-10 text-primary mb-4" />
          
          <h2 className="font-gothic text-2xl md:text-3xl font-bold text-foreground mb-2">
            Join the <span className="gradient-vice-text">Waitlist</span>
          </h2>
          
          <p className="text-muted-foreground text-sm mb-6">
            Get early access to premium features, new companions, and exclusive updates. No spam — ever.
          </p>

          {isSuccess ? (
            <div className="flex flex-col items-center gap-3 py-8 text-primary">
              <CheckCircle className="h-12 w-12" />
              <p className="font-bold text-lg">You're on the list!</p>
              <p className="text-muted-foreground text-sm">We'll notify you as soon as we open the gates.</p>
            </div>
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
                disabled={isLoading}
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold glow-pink hover:scale-105 transition-transform disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {isLoading ? "Joining..." : "Join Waitlist"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}