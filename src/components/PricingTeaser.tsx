import { motion } from "framer-motion";
import { Check, Sparkles, Zap } from "lucide-react";

const PricingTeaser = () => {
  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-gothic text-3xl md:text-4xl font-bold gradient-vice-text mb-3">
            Simple Pricing
          </h2>
          <p className="text-muted-foreground text-sm">
            Start free. Upgrade when you're ready for more.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Free Tier */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card p-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-electric-teal" />
              <h3 className="font-gothic text-xl font-bold text-foreground">Free</h3>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold text-foreground">$0</span>
              <span className="text-muted-foreground text-sm"> /month</span>
            </div>
            <ul className="space-y-3 mb-8">
              {[
                "Limited messages per day",
                "All 20 pre-made companions",
                "Basic device integration",
                "Safe word support",
                "Privacy protection",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-electric-teal shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <button className="w-full py-3 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors">
              Get Started Free
            </button>
          </motion.div>

          {/* Paid Tier */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-primary/50 bg-card p-8 relative glow-pink"
          >
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold">
              Most Popular
            </span>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-gothic text-xl font-bold text-foreground">Premium</h3>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold text-foreground">$14.99</span>
              <span className="text-muted-foreground text-sm"> /month</span>
            </div>
            <ul className="space-y-3 mb-8">
              {[
                "10,000 ChatTokens/month (resets monthly)",
                "All 20 companions + custom creation",
                "Full device control with intensity presets",
                "Conversation memory & relationship building",
                "Priority AI responses",
                "Extra token top-ups available",
                "Early access to new features",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <button className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold glow-pink hover:scale-[1.02] transition-transform">
              Coming Soon
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PricingTeaser;
