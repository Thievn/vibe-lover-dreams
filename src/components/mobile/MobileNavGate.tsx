import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { showMobileBottomNav } from "@/lib/mobileNav";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";

/**
 * Renders the fixed bottom navigation on phone-sized viewports when the user is signed in
 * and the route is an “app shell” view (not chat, not marketing).
 */
export function MobileNavGate() {
  const { pathname } = useLocation();
  const [session, setSession] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!cancelled) setSession(!!s);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(!!s);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (session !== true || !showMobileBottomNav(pathname)) return null;

  return <MobileBottomNav />;
}
