import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share } from "lucide-react";
import { trackPwaGaAndDb } from "@/lib/pwaTelemetry";

const DISMISS_KEY = "lustforge-install-dismiss";
const AUTO_SESSION_KEY = "lustforge-install-auto-prompt";
const SHOWN_SESSION_KEY = "lustforge-install-prompt-logged";

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
  const loggedShownRef = useRef(false);

  const markAutoShown = useCallback(() => sessionStorage.setItem(AUTO_SESSION_KEY, "1"), []);

  const logPromptShownOnce = useCallback(() => {
    if (loggedShownRef.current) return;
    if (sessionStorage.getItem(SHOWN_SESSION_KEY)) return;
    loggedShownRef.current = true;
    sessionStorage.setItem(SHOWN_SESSION_KEY, "1");
    trackPwaGaAndDb("install_prompt_shown");
  }, []);

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

    const tIos = window.setTimeout(() => {
      if (localStorage.getItem(DISMISS_KEY)) return;
      if (sessionStorage.getItem(AUTO_SESSION_KEY)) return;
      if (!isIos()) return;
      markAutoShown();
      setOpen(true);
    }, 2200);

    const tAndroidFallback = window.setTimeout(() => {
      if (localStorage.getItem(DISMISS_KEY)) return;
      if (sessionStorage.getItem(AUTO_SESSION_KEY)) return;
      if (isIos()) return;
      if (!/Android/i.test(navigator.userAgent || "")) return;
      markAutoShown();
      setOpen(true);
    }, 3200);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.clearTimeout(tIos);
      window.clearTimeout(tAndroidFallback);
    };
  }, [markAutoShown]);

  useEffect(() => {
    if (open) logPromptShownOnce();
  }, [open, logPromptShownOnce]);

  /** Let other screens (Account, Settings) surface the same install sheet. */
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
    trackPwaGaAndDb("install_prompt_dismiss");
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setOpen(false);
  }, []);

  const install = async () => {
    if (!deferred) {
      dismiss();
      return;
    }
    await deferred.prompt();
    const choice = await deferred.userChoice.catch(() => null);
    if (choice?.outcome === "accepted") {
      trackPwaGaAndDb("install_prompt_accept");
    }
    setDeferred(null);
    setOpen(false);
  };

  if (isStandalone()) return null;
  if (!isMobileOrTablet()) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 360, damping: 30 }}
          className="fixed inset-x-0 bottom-0 z-[95] flex justify-center px-3 pt-2 pointer-events-none"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div
            className="pointer-events-auto w-full max-w-md rounded-t-3xl border border-[#FF2D7B]/40 bg-[#050508]/[0.97] px-4 pb-4 pt-3 shadow-[0_-8px_48px_rgba(255,45,123,0.35)] backdrop-blur-xl sm:rounded-3xl sm:border sm:shadow-[0_0_48px_rgba(255,45,123,0.28)]"
            role="dialog"
            aria-labelledby="lf-install-title"
          >
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/20 sm:hidden" aria-hidden />
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF2D7B]/35 to-[#00E5C8]/25 border border-white/10">
                  <Download className="h-5 w-5 text-[#FF2D7B]" />
                </div>
                <div className="min-w-0">
                  <p id="lf-install-title" className="font-gothic text-base text-white tracking-wide">
                    Install LustForge
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Full-screen app, faster return visits, and your tab bar out of the way.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="shrink-0 rounded-lg p-2 text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Dismiss install prompt"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {deferred ? (
              <button
                type="button"
                onClick={() => void install()}
                className="w-full rounded-xl py-3.5 text-sm font-bold text-white bg-gradient-to-r from-[#FF2D7B] via-[#7B2D8E] to-[#00b89a] shadow-lg shadow-[#FF2D7B]/25 active:scale-[0.98] transition-transform"
              >
                Add to home screen
              </button>
            ) : isIos() ? (
              <p className="text-xs text-muted-foreground flex gap-2 items-start leading-relaxed">
                <Share className="h-4 w-4 shrink-0 text-[#00E5C8] mt-0.5" aria-hidden />
                <span>
                  In <strong className="text-foreground">Safari</strong>: tap{" "}
                  <strong className="text-foreground">Share</strong>, then{" "}
                  <strong className="text-foreground">Add to Home Screen</strong>, then Add.
                </span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Use your browser <strong className="text-foreground">menu (⋮)</strong> →{" "}
                <strong className="text-foreground">Install app</strong> or{" "}
                <strong className="text-foreground">Add to Home screen</strong>.
              </p>
            )}
            <p className="mt-2 text-[10px] text-center text-muted-foreground/80">
              Dismiss hides this until you clear site data or we nudge you again from Account.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
