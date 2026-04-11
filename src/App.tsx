import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import CompanionProfile from "./pages/CompanionProfile";
import Chat from "./pages/Chat";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Settings from "./pages/Settings";
import CompanionCreator from "./pages/CompanionCreator";   // ← This is the new page we just made
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import EmergencyStop from "./components/EmergencyStop";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/companion/:id" element={<CompanionProfile />} />
          <Route path="/chat/:id" element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          } />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />
          {/* New Companion Creator Route */}
          <Route path="/companion-creator" element={
            <ProtectedRoute>
              <CompanionCreator />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <EmergencyStop />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;