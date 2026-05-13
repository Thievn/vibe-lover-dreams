import { Link, useNavigate } from "react-router-dom";
import { Flame, Shield, LogOut, UserRound, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isPlatformAdmin } from "@/config/auth";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const applySession = async (session: Session | null) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setIsAdmin(false);
        return;
      }
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", session.user.id)
        .maybeSingle();
      setIsAdmin(isPlatformAdmin(session.user, { profileDisplayName: prof?.display_name ?? null }));
    };

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await applySession(session);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    setMobileOpen(false);
    await supabase.auth.signOut();
    navigate("/");
  };

  const sheetLinkClass =
    "flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.06] active:bg-white/[0.08] touch-manipulation";

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-[#050508]/94 backdrop-blur-xl border-b border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
      style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-5 py-2 flex items-center justify-between gap-2 min-h-[2.75rem]">
        <Link to="/" className="flex items-center gap-2 sm:gap-2.5 group shrink-0 min-w-0 touch-manipulation py-1">
          <Flame className="h-6 w-6 sm:h-7 sm:w-7 text-[#FF2D7B] shrink-0 drop-shadow-[0_0_10px_rgba(255,45,123,0.45)]" />
          <span className="font-gothic text-xl sm:text-2xl font-bold leading-none tracking-tight flex items-baseline gap-1 sm:gap-1.5 truncate">
            <span className="gradient-vice-text">LustForge</span>
            <span className="text-foreground/90 text-lg sm:text-xl font-bold">AI</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm shrink-0">
          {user ? (
            <>
              <div className="hidden md:flex items-center gap-4">
                <Link
                  to="/dashboard"
                  className="text-muted-foreground hover:text-[#FF2D7B] transition-colors py-2 min-h-10 inline-flex items-center"
                >
                  Dashboard
                </Link>
                <Link
                  to="/account"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#FF2D7B]/35 bg-[#FF2D7B]/[0.08] px-3 py-1.5 sm:px-3.5 sm:py-2 text-[#FF2D7B] hover:bg-[#FF2D7B]/15 hover:border-[#FF2D7B]/55 transition-all shadow-[0_0_16px_rgba(255,45,123,0.12)] min-h-10"
                >
                  <UserRound className="h-4 w-4" />
                  Account
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-[hsl(280_50%_35%)] to-[#FF2D7B] text-white font-medium hover:scale-[1.02] transition-transform shadow-md shadow-[#FF2D7B]/20 border border-white/10 text-xs sm:text-sm min-h-10"
                  >
                    <Shield className="h-4 w-4" />
                    Admin
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-sm text-muted-foreground hover:text-[hsl(170_100%_45%)] transition-colors py-2 min-h-10 inline-flex items-center"
                >
                  Logout
                </button>
              </div>

              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className="md:hidden inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-foreground hover:bg-white/[0.08] transition-colors touch-manipulation"
                    aria-label="Open menu"
                  >
                    <Menu className="h-6 w-6 text-[#FF2D7B]" />
                  </button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="flex w-[min(100vw-1rem,20rem)] flex-col border-l border-white/10 bg-[#050508]/98 p-0 pt-[max(1rem,env(safe-area-inset-top))]"
                >
                  <SheetTitle className="sr-only">Main menu</SheetTitle>
                  <div className="border-b border-white/[0.06] px-4 py-3">
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
                    <Link
                      to="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className={sheetLinkClass}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/create-companion"
                      onClick={() => setMobileOpen(false)}
                      className={sheetLinkClass}
                    >
                      Companion Forge
                    </Link>
                    <Link
                      to="/account"
                      onClick={() => setMobileOpen(false)}
                      className={cn(sheetLinkClass, "text-[#FF2D7B] border border-[#FF2D7B]/25 bg-[#FF2D7B]/[0.06]")}
                    >
                      <UserRound className="h-4 w-4 shrink-0" />
                      Account
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setMobileOpen(false)}
                      className={sheetLinkClass}
                    >
                      Preferences
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          sheetLinkClass,
                          "bg-gradient-to-r from-[hsl(280_50%_35%)] to-[#FF2D7B] text-white border border-white/10 justify-center font-semibold",
                        )}
                      >
                        <Shield className="h-4 w-4 shrink-0" />
                        Admin
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleLogout()}
                      className={cn(sheetLinkClass, "text-muted-foreground hover:text-[hsl(170_100%_45%)] mt-auto")}
                    >
                      <LogOut className="h-4 w-4 shrink-0" />
                      Log out
                    </button>
                  </div>
                </SheetContent>
              </Sheet>
            </>
          ) : (
            <>
              <div className="hidden md:flex items-center gap-4">
                <Link to="/" className="text-muted-foreground hover:text-[#FF2D7B] transition-colors py-2 min-h-10 inline-flex items-center">
                  Home
                </Link>
                <Link
                  to="/auth"
                  className="px-4 py-2 sm:px-5 sm:py-2 rounded-xl font-semibold text-white text-xs sm:text-sm transition-transform hover:scale-[1.02] border border-white/10 min-h-10 inline-flex items-center"
                  style={{
                    background: "linear-gradient(135deg, #FF2D7B, hsl(280 48% 40%))",
                    boxShadow: "0 0 20px rgba(255,45,123,0.28)",
                  }}
                >
                  Sign In
                </Link>
              </div>

              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className="md:hidden inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-foreground hover:bg-white/[0.08] transition-colors touch-manipulation"
                    aria-label="Open menu"
                  >
                    <Menu className="h-6 w-6 text-[#FF2D7B]" />
                  </button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="flex w-[min(100vw-1rem,20rem)] flex-col border-l border-white/10 bg-[#050508]/98 p-0 pt-[max(1rem,env(safe-area-inset-top))]"
                >
                  <SheetTitle className="sr-only">Menu</SheetTitle>
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <Link to="/" onClick={() => setMobileOpen(false)} className={sheetLinkClass}>
                      Home
                    </Link>
                    <Link
                      to="/auth"
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        sheetLinkClass,
                        "mt-2 justify-center font-semibold text-white border border-white/10",
                      )}
                      style={{
                        background: "linear-gradient(135deg, #FF2D7B, hsl(280 48% 40%))",
                        boxShadow: "0 0 20px rgba(255,45,123,0.28)",
                      }}
                    >
                      Sign In
                    </Link>
                  </div>
                </SheetContent>
              </Sheet>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
