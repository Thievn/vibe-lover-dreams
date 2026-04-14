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
      className="fixed top-0 left-0 right-0 z-50 bg-[#050508]/92 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_0_40px_rgba(255,45,123,0.06)]"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <Flame className="h-8 w-8 text-[#FF2D7B] drop-shadow-[0_0_12px_rgba(255,45,123,0.5)]" />
          <span className="font-gothic text-2xl tracking-widest gradient-vice-text">LUSTFORGE</span>
        </Link>

        <div className="flex items-center gap-4 sm:gap-6 text-sm">
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
                className="inline-flex items-center gap-2 rounded-2xl border border-[#FF2D7B]/35 bg-[#FF2D7B]/[0.08] px-4 py-2 text-[#FF2D7B] hover:bg-[#FF2D7B]/15 hover:border-[#FF2D7B]/55 transition-all shadow-[0_0_20px_rgba(255,45,123,0.15)]"
              >
                <UserRound className="h-4 w-4" />
                Account
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[hsl(280_50%_35%)] to-[#FF2D7B] text-white font-medium hover:scale-[1.02] transition-transform shadow-lg shadow-[#FF2D7B]/25 border border-white/10"
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
                className="px-6 py-2.5 rounded-2xl font-semibold text-white transition-transform hover:scale-[1.02] border border-white/10"
                style={{
                  background: "linear-gradient(135deg, #FF2D7B, hsl(280 48% 40%))",
                  boxShadow: "0 0 28px rgba(255,45,123,0.35)",
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