import { useState, useEffect } from "react";  // Added back useEffect for ProtectedRoute
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AgeGate from "./components/AgeGate";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import CompanionProfile from "./pages/CompanionProfile";
import CompanionCreator from "./pages/CompanionCreator";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Account from "./pages/Account";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import EighteenPlusDisclaimer from "./pages/EighteenPlusDisclaimer";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
        setLoading(false);
        if (!session) {
          navigate("/auth", { replace: true });
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setLoading(false);
      }
    };
    checkAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (!session && event === "SIGNED_OUT") {
        navigate("/auth", { replace: true });
      }
    });

    return () => listener?.subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/auth" replace />;
};

function App() {
  // Synchronous initial state from localStorage to prevent initial false render
  const [ageConfirmed, setAgeConfirmed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ageConfirmed') === 'true';
    }
    return false; // SSR fallback
  });
  const navigate = useNavigate();

  const handleAgeConfirm = () => {
    localStorage.setItem('ageConfirmed', 'true');
    setAgeConfirmed(true);
    // Use SPA navigation to avoid full reload and flicker
    navigate('/', { replace: true });
  };

  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground font-sans relative">
        {!ageConfirmed && <AgeGate onConfirm={handleAgeConfirm} />}
        
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/account" element={<Account />} />
          
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/18-plus-disclaimer" element={<EighteenPlusDisclaimer />} />

          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/chat" 
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/companions/:id" 
            element={
              <ProtectedRoute>
                <CompanionProfile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/create-companion" 
            element={
              <ProtectedRoute>
                <CompanionCreator />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            } 
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster position="top-right" richColors closeButton />
      </div>
    </Router>
  );
}

export default App;