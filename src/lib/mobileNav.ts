/** Routes where the fixed bottom app nav appears (`/chat` is immersive — no nav; composer uses safe-area only). */
export function showMobileBottomNav(pathname: string): boolean {
  if (/^\/chat(\/|$)/.test(pathname)) return false;
  /** Forge has its own Controls / Preview bar — stacking both caused touch + scroll fights on small screens. */
  if (/^\/create-companion(\/|$)/.test(pathname)) return false;
  return /^\/(dashboard|companions\/|account|settings)(\/|$)/.test(pathname);
}

export const MOBILE_NAV_SAFE_BOTTOM =
  "pb-[max(5.75rem,calc(4.75rem+env(safe-area-inset-bottom,0px)))]" as const;
