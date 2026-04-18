/** Routes where the fixed bottom app nav appears (immersive chat excludes). */
export function showMobileBottomNav(pathname: string): boolean {
  if (/^\/chat(\/|$)/.test(pathname)) return false;
  return /^\/(dashboard|create-companion|companions\/|account|settings)(\/|$)/.test(pathname);
}

export const MOBILE_NAV_SAFE_BOTTOM =
  "pb-[max(5.75rem,calc(4.75rem+env(safe-area-inset-bottom,0px)))]" as const;
