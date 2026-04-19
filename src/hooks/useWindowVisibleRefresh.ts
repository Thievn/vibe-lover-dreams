import { useEffect } from "react";

/**
 * Runs `onVisible` when the tab becomes visible or the window gains focus — keeps
 * device/toy state in sync after pairing in another app (e.g. Lovense Remote).
 */
export function useWindowVisibleRefresh(onVisible: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const run = () => {
      if (document.visibilityState === "visible") onVisible();
    };
    document.addEventListener("visibilitychange", run);
    window.addEventListener("focus", run);
    return () => {
      document.removeEventListener("visibilitychange", run);
      window.removeEventListener("focus", run);
    };
  }, [onVisible, enabled]);
}
