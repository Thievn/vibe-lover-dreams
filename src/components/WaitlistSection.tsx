import { useState } from "react";
import { Mail, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("waitlist")
        .insert([{ email: trimmedEmail }]);

      if (error) {
        if (error.code === "23505") { // unique violation
          toast.info("You're already on the waitlist! 🎉");
        } else {
          throw error;
        }
      } else {
        setIsSuccess(true);
        setEmail("");
        toast.success("You're officially on the waitlist! 🎉", {
          description: "We'll notify you when LustForge launches.",
          duration: 6000,
        });
      }
    } catch (err: any) {
      console.error("Waitlist error:", err);
      toast.error("Failed to join waitlist. Please try again later.");
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
            Get early access when we launch. No spam, ever.
          </p>

          {isSuccess ? (
            <div className="py-10 flex flex-col items-center gap-4">
              <CheckCircle className="h-16 w-16 text-primary" />
              <p className="text-2xl font-bold text-foreground">You're In! 🎉</p>
              <p className="text-muted-foreground">We'll email you as soon as we open the gates.</p>
              <button 
                onClick={() => setIsSuccess(false)}
                className="mt-4 text-primary hover:underline text-sm"
              >
                Join with another email
              </button>
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
                className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold glow-pink hover:scale-105 transition-transform disabled:opacity-50 flex items-center justify-center gap-2 min-w-[140px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Join Waitlist"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}