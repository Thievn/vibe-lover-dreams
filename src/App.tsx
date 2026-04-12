import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
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

  // Note: useNavigate removed here too—handle redirects in parent if needed

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
        setLoading(false);
        // Redirect logic moved to avoid context issues; use window.location if needed
      } catch (error) {
        console.error("Auth check failed:", error);
        setLoading(false);
      }
    };
    checkAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  // Simplified: Use Navigate for unauth, but no navigate hook here
  return isAuthenticated ? <>{children}</> : <Navigate to="/auth" replace />;
};

function App() {
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  useEffect(() => {
    const hasConfirmedAge = localStorage.getItem('ageConfirmed');
    if (hasConfirmedAge === 'true') {
      setAgeConfirmed(true);
    }
  }, []);

  const handleAgeConfirm = () => {
    try {
      localStorage.setItem('ageConfirmed', 'true');
      setAgeConfirmed(true);
      // Force redirect to landing page (reliable in production)
      window.location.href = '/';
    } catch (error) {
      console.error("Age confirmation failed:", error);
    }
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