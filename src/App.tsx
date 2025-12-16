import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import RegistroAcademia from "./pages/RegistroAcademia";
import Login from "./pages/Login";
import CambiarPassword from "./pages/CambiarPassword";
import RecuperarPassword from "./pages/RecuperarPassword";
import OrgOwnerDashboard from "./pages/dashboard/OrgOwnerDashboard";
import DirectorDeportivoDashboard from "./pages/dashboard/DirectorDeportivoDashboard";
import EntrenadorDashboard from "./pages/dashboard/EntrenadorDashboard";
import AdministrativoDashboard from "./pages/dashboard/AdministrativoDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/registro-academia" element={<RegistroAcademia />} />
            <Route path="/login" element={<Login />} />
            <Route path="/recuperar-password" element={<RecuperarPassword />} />
            <Route path="/cambiar-password" element={
              <ProtectedRoute>
                <CambiarPassword />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/org-owner" element={
              <ProtectedRoute allowedRoles={['org_owner']}>
                <OrgOwnerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/director-deportivo" element={
              <ProtectedRoute allowedRoles={['director_deportivo']}>
                <DirectorDeportivoDashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/entrenador" element={
              <ProtectedRoute allowedRoles={['entrenador']}>
                <EntrenadorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/administrativo" element={
              <ProtectedRoute allowedRoles={['administrativo']}>
                <AdministrativoDashboard />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
