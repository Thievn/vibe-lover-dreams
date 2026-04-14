import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Flame } from "lucide-react";

const NEON = "#FF2D7B";

interface AgeGateProps {
  onConfirm: () => void;
}

export default function AgeGate({ onConfirm }: AgeGateProps) {
  const [showModal, setShowModal] = useState(true);

  useEffect(() => {
    const hasConfirmedAge = localStorage.getItem("ageConfirmed");
    if (hasConfirmedAge === "true") {
      setShowModal(false);
      onConfirm();
    }
  }, [onConfirm]);

  const handleConfirm = () => {
    localStorage.setItem("ageConfirmed", "true");
    setShowModal(false);
    onConfirm();
  };

  const handleDeny = () => {
    window.location.href = "https://www.wikipedia.org/";
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans">
      <div className="absolute inset-0 bg-[#020203]/98 backdrop-blur-xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, ${NEON}22 0%, transparent 45%),
            radial-gradient(circle at 80% 70%, hsl(280 60% 40% / 0.2) 0%, transparent 40%),
            radial-gradient(circle at 50% 100%, hsl(170 80% 35% / 0.12) 0%, transparent 50%)`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,45,123,0.06)_1px,transparent_1px)] [background-size:48px_48px] opacity-40" />

      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/[0.1] bg-black/60 p-8 text-center shadow-2xl backdrop-blur-2xl md:p-10"
        style={{ boxShadow: `0 0 80px ${NEON}14, inset 0 1px 0 rgba(255,255,255,0.06)` }}
      >
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-[#FF2D7B]/30 to-[hsl(280_45%_25%)]/50 shadow-[0_0_32px_rgba(255,45,123,0.25)]">
          <Flame className="h-7 w-7 text-white" style={{ filter: `drop-shadow(0 0 8px ${NEON})` }} />
        </div>

        <p className="font-gothic text-[11px] uppercase tracking-[0.45em] text-[#FF2D7B]/90 mb-3">Restricted entry</p>
        <h1 className="font-gothic text-4xl md:text-5xl text-white mb-2 tracking-wide" style={{ textShadow: `0 0 40px ${NEON}44` }}>
          18+
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-sm mx-auto">
          This experience contains mature themes, AI companions, and optional intimate hardware integration. You must be{" "}
          <span className="text-foreground/90">18 or older</span> to continue.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <button
            type="button"
            onClick={handleConfirm}
            className="min-h-[48px] flex-1 rounded-2xl px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] sm:flex-none sm:min-w-[160px]"
            style={{
              background: `linear-gradient(135deg, ${NEON}, hsl(280 48% 42%))`,
              boxShadow: `0 0 36px ${NEON}40, inset 0 1px 0 rgba(255,255,255,0.2)`,
            }}
          >
            Enter — I am 18+
          </button>
          <button
            type="button"
            onClick={handleDeny}
            className="min-h-[48px] flex-1 rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-[hsl(170_80%_45%)]/40 hover:text-foreground hover:bg-[hsl(170_80%_45%)]/10 sm:flex-none sm:min-w-[160px]"
          >
            Leave — under 18
          </button>
        </div>

        <p className="mt-8 text-[11px] leading-relaxed text-muted-foreground/90">
          By entering you acknowledge our{" "}
          <Link to="/terms-of-service" className="text-[#FF2D7B] hover:underline underline-offset-2">
            Terms
          </Link>
          ,{" "}
          <Link to="/privacy-policy" className="text-[hsl(170_100%_42%)] hover:underline underline-offset-2">
            Privacy
          </Link>
          , and{" "}
          <Link to="/18-plus-disclaimer" className="text-[hsl(280_60%_65%)] hover:underline underline-offset-2">
            18+ disclaimer
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
