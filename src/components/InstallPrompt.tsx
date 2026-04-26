import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share } from "lucide-react";

const DISMISS_KEY = "lustforge-install-dismiss";
const AUTO_SESSION_KEY = "lustforge-install-auto-prompt";

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** PWA install UX only on phones/tablets — not desktop/laptop browsers. */
function isMobileOrTablet(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (isIos()) return true;
  if (/Android/i.test(ua)) return true;
  return false;
}

export default function InstallPrompt() {
  const [open, setOpen] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  const markAutoShown = useCallback(() => sessionStorage.setItem(AUTO_SESSION_KEY, "1"), []);

  useEffect(() => {
    if (isStandalone()) return;
    if (!isMobileOrTablet()) return;

    const onBip = (e: Event) => {
      if (!isMobileOrTablet()) return;
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      if (localStorage.getItem(DISMISS_KEY)) return;
      markAutoShown();
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    const t = window.setTimeout(() => {
      if (localStorage.getItem(DISMISS_KEY)) return;
      if (sessionStorage.getItem(AUTO_SESSION_KEY)) return;
      if (!isIos()) return;
      markAutoShown();
      setOpen(true);
    }, 5000);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.clearTimeout(t);
    };
  }, [markAutoShown]);

  /** Let other screens (Settings, live call) surface the same install sheet when alerts need a PWA. */
  useEffect(() => {
    const onHint = () => {
      if (!isMobileOrTablet()) return;
      if (isStandalone()) return;
      if (localStorage.getItem(DISMISS_KEY)) return;
      markAutoShown();
      setOpen(true);
    };
    window.addEventListener("lustforge-request-install-hint", onHint);
    return () => window.removeEventListener("lustforge-request-install-hint", onHint);
  }, [markAutoShown]);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setOpen(false);
  }, []);

  const install = async () => {
    if (!deferred) {
      dismiss();
      return;
    }
    await deferred.prompt();
    await deferred.userChoice.catch(() => {});
    setDeferred(null);
    setOpen(false);
  };

  if (isStandalone()) return null;
  if (!isMobileOrTablet()) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className="fixed bottom-4 left-4 right-4 z-[90] mx-auto max-w-md sm:left-auto sm:right-6 sm:mx-0"
        >
          <div
            className="rounded-2xl border border-[#FF2D7B]/35 bg-[#050508]/95 p-4 shadow-[0_0_48px_rgba(255,45,123,0.25)] backdrop-blur-xl"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF2D7B]/30 to-[#00E5C8]/20 border border-white/10">
                  <Download className="h-5 w-5 text-[#FF2D7B]" />
                </div>
                <div>
                  <p className="font-gothic text-sm text-white tracking-wide">Install LustForge</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">Quick access, full screen, app-like feel.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-lg p-1.5 text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {deferred ? (
              <button
                type="button"
                onClick={() => void install()}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white bg-gradient-to-r from-[#FF2D7B] via-[#7B2D8E] to-[#00b89a] shadow-lg shadow-[#FF2D7B]/20 active:scale-[0.98] transition-transform"
              >
                Add to home screen
              </button>
            ) : isIos() ? (
              <p className="text-xs text-muted-foreground flex gap-2 items-start">
                <Share className="h-4 w-4 shrink-0 text-[#00E5C8] mt-0.5" />
                <span>
                  On Safari: tap <strong className="text-foreground">Share</strong>, then{" "}
                  <strong className="text-foreground">Add to Home Screen</strong>.
                </span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Use your browser menu to install this app.</p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
