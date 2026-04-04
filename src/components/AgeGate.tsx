import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck } from "lucide-react";

interface AgeGateProps {
  onVerified: () => void;
}

const AgeGate = ({ onVerified }: AgeGateProps) => {
  const [checked, setChecked] = useState(false);

  const handleEnter = () => {
    if (checked) {
      localStorage.setItem("lustforge-age-verified", "true");
      onVerified();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-xl"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mx-4 max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center glow-purple"
        >
          <ShieldCheck className="mx-auto mb-4 h-16 w-16 text-primary" />
          <h1 className="font-gothic text-2xl font-bold text-primary mb-2">
            Age Verification Required
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            LustForge AI contains mature adult content including interactive roleplay and adult themes.
            You must be 18 years or older to enter.
          </p>

          <label className="flex items-start gap-3 text-left cursor-pointer mb-6 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-border accent-primary"
            />
            <span className="text-sm text-foreground">
              I confirm I am <strong className="text-primary">18 years of age or older</strong> and I consent to viewing adult content.
              I understand all content is AI-generated fiction and not real.
            </span>
          </label>

          <button
            onClick={handleEnter}
            disabled={!checked}
            className="w-full py-3 rounded-xl font-bold text-lg transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed bg-primary text-primary-foreground hover:glow-pink"
          >
            Enter LustForge AI
          </button>

          <p className="mt-4 text-xs text-muted-foreground">
            By entering, you agree to our Terms of Service and Privacy Policy.
            All interactions are private. Safe-word support is available in every chat.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AgeGate;
