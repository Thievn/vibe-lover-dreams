import { Link, useNavigate } from "react-router-dom";
import { Flame, Shield, LogIn, LogOut } from "lucide-react";
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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <Flame className="h-8 w-8 text-pink-500" />
          <span className="font-gothic text-2xl tracking-widest gradient-vice-text">LUSTFORGE</span>
        </Link>

        {/* Right side links */}
        <div className="flex items-center gap-6 text-sm">
          {user ? (
            <>
              <Link to="/dashboard" className="hover:text-pink-400 transition-colors">
                Dashboard
              </Link>

              {/* Admin Button - ONLY visible to you */}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:scale-105 transition-all shadow-lg shadow-purple-500/30"
                >
                  <Shield className="h-4 w-4" />
                  Admin Panel
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="text-sm text-muted-foreground hover:text-white transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/" className="hover:text-pink-400 transition-colors">Home</Link>
              <Link
                to="/auth"
                className="px-6 py-2.5 rounded-2xl bg-pink-600 hover:bg-pink-700 text-white font-medium transition-all"
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