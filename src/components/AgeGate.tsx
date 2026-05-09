import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

const NEON = "#FF2D7B";

interface AgeGateProps {
  onConfirm: () => void;
}

export default function AgeGate({ onConfirm }: AgeGateProps) {
  const [showModal, setShowModal] = useState(true);

  const confirm = useCallback(() => {
    localStorage.setItem("ageConfirmed", "true");
    setShowModal(false);
    trackEvent("age_gate_confirm");
    onConfirm();
  }, [onConfirm]);

  useEffect(() => {
    const hasConfirmedAge = localStorage.getItem("ageConfirmed");
    if (hasConfirmedAge === "true") {
      setShowModal(false);
      onConfirm();
    }
  }, [onConfirm]);

  const handleDeny = () => {
    window.location.href = "https://www.wikipedia.org/";
  };

  if (!showModal) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans antialiased"
      style={{ WebkitFontSmoothing: "antialiased" }}
    >
      <div className="absolute inset-0 bg-[#020203] backdrop-blur-xl" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.32]"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, ${NEON}20 0%, transparent 45%),
            radial-gradient(circle at 80% 70%, hsl(280 60% 40% / 0.18) 0%, transparent 40%),
            radial-gradient(circle at 50% 100%, hsl(170 80% 35% / 0.1) 0%, transparent 50%)`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] bg-[radial-gradient(circle_at_1px_1px,rgba(255,45,123,0.05)_1px,transparent_1px)] [background-size:40px_40px]"
        aria-hidden
      />

      <div
        className={cn(
          "relative w-full max-w-md overflow-hidden rounded-3xl border border-white/[0.12]",
          "bg-black/75 p-8 text-center shadow-2xl md:p-10",
          "isolate contain-layout",
        )}
        style={{ boxShadow: `0 0 64px ${NEON}12, inset 0 1px 0 rgba(255,255,255,0.07)` }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="age-gate-title"
        aria-describedby="age-gate-desc"
      >
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-[#FF2D7B]/25 to-[hsl(280_45%_25%)]/45 shadow-[0_0_28px_rgba(255,45,123,0.22)]">
          <Flame className="h-7 w-7 text-white" style={{ filter: `drop-shadow(0 0 6px ${NEON})` }} aria-hidden />
        </div>

        <p className="mb-3 font-gothic text-[10px] uppercase tracking-[0.22em] text-[#FF2D7B]/95">
          Restricted entry
        </p>
        <h1
          id="age-gate-title"
          className="mb-3 font-gothic text-4xl tabular-nums text-white md:text-5xl"
          style={{ textShadow: `0 0 28px ${NEON}33` }}
        >
          18+
        </h1>
        <p id="age-gate-desc" className="mx-auto mb-8 max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground">
          This experience contains mature themes, AI companions, and optional intimate hardware integration. You must be{" "}
          <span className="text-foreground/90">18 or older</span> to continue.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <button
            type="button"
            onClick={confirm}
            className="min-h-[48px] flex-1 rounded-2xl px-6 py-3 text-sm font-semibold text-white transition-[filter,box-shadow] hover:brightness-110 active:brightness-95 sm:flex-none sm:min-w-[168px] touch-manipulation"
            style={{
              background: `linear-gradient(135deg, ${NEON}, hsl(280 48% 42%))`,
              boxShadow: `0 0 28px ${NEON}35, inset 0 1px 0 rgba(255,255,255,0.18)`,
            }}
          >
            Enter — I am 18+
          </button>
          <button
            type="button"
            onClick={handleDeny}
            className="min-h-[48px] flex-1 rounded-2xl border border-white/15 bg-white/[0.05] px-6 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-[hsl(170_80%_45%)]/45 hover:bg-[hsl(170_80%_45%)]/10 hover:text-foreground sm:flex-none sm:min-w-[168px] touch-manipulation"
          >
            Leave — under 18
          </button>
        </div>

        <p className="mt-8 text-[11px] leading-relaxed text-muted-foreground/90">
          By entering you acknowledge our{" "}
          <Link to="/terms-of-service" className="text-[#FF2D7B] underline-offset-2 hover:underline">
            Terms
          </Link>
          ,{" "}
          <Link to="/privacy-policy" className="text-[hsl(170_100%_42%)] underline-offset-2 hover:underline">
            Privacy
          </Link>
          , and{" "}
          <Link to="/18-plus-disclaimer" className="text-[hsl(280_60%_65%)] underline-offset-2 hover:underline">
            18+ disclaimer
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
