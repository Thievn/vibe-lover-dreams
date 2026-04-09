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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-2xl"
      >
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-primary/30 rounded-full"
              initial={{
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                opacity: 0
              }}
              animate={{
                y: [null, -20, window.innerHeight + 20],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
            />
          ))}
        </div>

        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mx-4 max-w-lg w-full rounded-3xl border-2 border-primary/50 bg-card/95 backdrop-blur-xl p-10 text-center shadow-2xl shadow-primary/20 glow-purple"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
          >
            <ShieldCheck className="mx-auto mb-6 h-20 w-20 text-primary drop-shadow-lg" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="font-gothic text-3xl md:text-4xl font-bold text-primary mb-3"
          >
            18+ Age Verification
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-muted-foreground text-base mb-8 leading-relaxed"
          >
            LustForge AI contains explicit adult content, interactive roleplay,
            and real-time smart device integration. This experience is designed
            exclusively for consenting adults.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <label className="flex items-start gap-4 text-left cursor-pointer mb-8 p-4 rounded-xl border-2 border-border/50 hover:border-primary/50 transition-all duration-300 bg-muted/20 hover:bg-muted/40">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-2 border-border accent-primary focus:ring-primary/50"
              />
              <span className="text-sm text-foreground leading-relaxed">
                I confirm I am <strong className="text-primary text-lg">18 years of age or older</strong> and I consent to viewing and interacting with adult content. I understand this is a fictional AI experience.
              </span>
            </label>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9 }}
            onClick={handleEnter}
            disabled={!checked}
            className="w-full px-8 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg glow-pink hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300 shadow-lg shadow-primary/30"
          >
            Enter LustForge AI
          </motion.button>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="text-xs text-muted-foreground mt-4"
          >
            By entering, you agree to our terms of service and privacy policy.
          </motion.p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AgeGate;
