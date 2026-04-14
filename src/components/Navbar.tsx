import { Link, useNavigate } from "react-router-dom";
import { Flame, Shield, LogOut, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      if (session?.user?.email === "lustforgeapp@gmail.com") {
        setIsAdmin(true);
      }
    };

    checkUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAdmin(session?.user?.email === "lustforgeapp@gmail.com");
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-[#050508]/94 backdrop-blur-xl border-b border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
      style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-5 py-2 flex items-center justify-between gap-2 min-h-[2.75rem]">
        <Link to="/" className="flex items-center gap-2 sm:gap-2.5 group shrink-0 min-w-0">
          <Flame className="h-6 w-6 sm:h-7 sm:w-7 text-[#FF2D7B] shrink-0 drop-shadow-[0_0_10px_rgba(255,45,123,0.45)]" />
          <span className="font-gothic text-lg sm:text-xl tracking-[0.18em] gradient-vice-text truncate">
            LUSTFORGE
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm shrink-0">
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="text-muted-foreground hover:text-[#FF2D7B] transition-colors"
              >
                Dashboard
              </Link>
              <Link
                to="/account"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#FF2D7B]/35 bg-[#FF2D7B]/[0.08] px-3 py-1.5 sm:px-3.5 sm:py-2 text-[#FF2D7B] hover:bg-[#FF2D7B]/15 hover:border-[#FF2D7B]/55 transition-all shadow-[0_0_16px_rgba(255,45,123,0.12)]"
              >
                <UserRound className="h-4 w-4" />
                Account
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-[hsl(280_50%_35%)] to-[#FF2D7B] text-white font-medium hover:scale-[1.02] transition-transform shadow-md shadow-[#FF2D7B]/20 border border-white/10 text-xs sm:text-sm"
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="text-sm text-muted-foreground hover:text-[hsl(170_100%_45%)] transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/" className="text-muted-foreground hover:text-[#FF2D7B] transition-colors">
                Home
              </Link>
              <Link
                to="/auth"
                className="px-4 py-2 sm:px-5 sm:py-2 rounded-xl font-semibold text-white text-xs sm:text-sm transition-transform hover:scale-[1.02] border border-white/10"
                style={{
                  background: "linear-gradient(135deg, #FF2D7B, hsl(280 48% 40%))",
                  boxShadow: "0 0 20px rgba(255,45,123,0.28)",
                }}
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;