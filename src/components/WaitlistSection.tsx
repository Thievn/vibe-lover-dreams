import { useState } from "react";
import { Mail, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getEdgeFunctionInvokeMessage } from "@/lib/edgeFunction";
import { trackEvent } from "@/lib/analytics";

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
      const { data, error } = await supabase.functions.invoke("waitlist-signup", {
        body: { email: trimmedEmail },
      });
      if (error) {
        throw new Error(await getEdgeFunctionInvokeMessage(error, data));
      }

      const res = (data ?? {}) as {
        status?: "created" | "duplicate";
        email_status?: "email_sent" | "email_failed";
      };

      // Success feedback
      setIsSuccess(true);
      setEmail("");

      if (res.status === "duplicate") {
        toast.success("You're already on the waitlist! 🎉", {
          description: "You're still on the list. We will keep you posted.",
          duration: 5000,
        });
      } else {
        toast.success("You're officially on the waitlist! 🎉", {
          description: "We emailed you a confirmation.",
          duration: 5000,
        });
      }

      if (res.email_status === "email_failed") {
        toast.warning("Waitlist saved, but email delivery failed.", {
          description: "Your signup is safe. We will retry notifications from the admin side.",
          duration: 6500,
        });
      }

      trackEvent("waitlist_submit", {
        result: res.status === "duplicate" ? "duplicate" : "created",
        email_delivered: res.email_status === "email_sent",
      });

    } catch (err: unknown) {
      console.error("Waitlist error:", err);
      toast.error("Failed to join waitlist. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section id="waitlist" className="py-20 sm:py-24 px-4 relative">
      <div className="absolute inset-x-0 bottom-0 h-32 pointer-events-none bg-gradient-to-t from-primary/[0.06] to-transparent" aria-hidden />
      <div className="max-w-xl mx-auto relative z-10">
        <div className="rounded-[1.75rem] border border-primary/35 bg-card/85 backdrop-blur-xl p-8 md:p-12 text-center glow-pink shadow-[0_0_60px_rgba(255,45,123,0.12)] ring-1 ring-white/[0.06]">
          <Mail className="mx-auto h-10 w-10 text-primary mb-4" />
          
          <h2 className="font-gothic text-2xl md:text-3xl font-bold text-foreground mb-2">
            Join the <span className="gradient-vice-text">Waitlist</span>
          </h2>
          
          <p className="text-muted-foreground/90 text-sm mb-6 leading-relaxed">
            Get early access when we launch. No spam, ever.
          </p>

          {isSuccess ? (
            <div className="py-10 flex flex-col items-center gap-4">
              <CheckCircle className="h-16 w-16 text-primary" />
              <p className="text-2xl font-bold text-foreground">You're In! 🎉</p>
              <p className="text-muted-foreground">We'll email you as soon as we open the gates.</p>
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
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/25 border border-white/10 text-foreground text-sm placeholder:text-muted-foreground/80 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/25 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold glow-pink border border-white/10 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.99] transition-transform disabled:opacity-50 flex items-center justify-center gap-2 min-w-[140px]"
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