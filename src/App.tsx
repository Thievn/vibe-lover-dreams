import { useState, useEffect, Component, ReactNode } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
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

// Simple Error Boundary to catch runtime errors and prevent black screen
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): { hasError: boolean } {
    return { hasError: true };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ error: error.message });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 text-foreground">
          <div className="text-center max-w-md bg-card rounded-lg p-6 border shadow-lg">
            <h2 className="text-2xl font-bold text-destructive mb-4">Oops! Something went wrong</h2>
            <p className="text-muted-foreground mb-2">Error: {this.state.error || 'Unknown error'}</p>
            <p className="text-sm mb-4">Check the console for details. Try refreshing.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Updated ProtectedRoute with admin check
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const ADMIN_EMAIL = 'lustforgeapp@gmail.com';

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const authenticated = !!session;
        const admin = authenticated && session?.user?.email === ADMIN_EMAIL;
        setIsAuthenticated(authenticated);
        setIsAdmin(admin);
        setLoading(false);

        // For /admin path: Redirect non-admins to /dashboard
        if (location.pathname === '/admin' && authenticated && !admin) {
          navigate('/dashboard', { replace: true });
          return;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setLoading(false);
      }
    };

    checkAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const authenticated = !!session;
      const admin = authenticated && session?.user?.email === ADMIN_EMAIL;
      setIsAuthenticated(authenticated);
      setIsAdmin(admin);

      if (!session && event === 'SIGNED_OUT') {
        navigate('/auth', { replace: true });
        return;
      }

      // Handle /admin specifically on auth change
      if (location.pathname === '/admin' && authenticated && !admin) {
        navigate('/dashboard', { replace: true });
      }
    });

    return () => listener?.subscription.unsubscribe();
  }, [navigate, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  // For /admin, only allow if isAdmin
  if (location.pathname === '/admin' && !isAdmin) {
    return null; // Redirect handled above
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/auth" replace />;
};

function App() {
  // Synchronous initial state with SSR safety—no useNavigate here to avoid context error
  const [ageConfirmed, setAgeConfirmed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ageConfirmed') === 'true';
    }
    return false;
  });

  const handleAgeConfirm = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ageConfirmed', 'true');
    }
    setAgeConfirmed(true);
    // Use window.location for reliable redirect (no hook needed, no context issue)
    window.location.href = '/';
  };

  return (
    <Router>
      <ErrorBoundary>
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
      </ErrorBoundary>
    </Router>
  );
}

export default App;