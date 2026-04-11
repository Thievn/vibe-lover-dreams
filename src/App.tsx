import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import CompanionProfile from "./pages/CompanionProfile";
import Chat from "./pages/Chat";
import ResetPassword from "./pages/ResetPassword";
import Settings from "./pages/Settings";
import CreateCharacter from "./pages/CreateCharacter";
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
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected User Dashboard */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* Other protected routes */}
          <Route path="/companion/:id" element={
            <ProtectedRoute>
              <CompanionProfile />
            </ProtectedRoute>
          } />

          <Route path="/chat/:id" element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />

          <Route path="/create-character" element={
            <ProtectedRoute>
              <CreateCharacter />
            </ProtectedRoute>
          } />

          {/* Admin Only */}
          <Route path="/admin" element={
            <ProtectedRoute requireAdmin>
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