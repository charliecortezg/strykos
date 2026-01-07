import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PlatformAuthProvider } from "@/contexts/PlatformAuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PlatformAuthGuard } from "@/components/platform/PlatformAuthGuard";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import RegistroAcademia from "./pages/RegistroAcademia";
import Login from "./pages/Login";
import CambiarPassword from "./pages/CambiarPassword";
import RecuperarPassword from "./pages/RecuperarPassword";
import Onboarding from "./pages/Onboarding";
import OrgOwnerDashboard from "./pages/dashboard/OrgOwnerDashboard";
import DirectorDeportivoDashboard from "./pages/dashboard/DirectorDeportivoDashboard";
import EntrenadorDashboard from "./pages/dashboard/EntrenadorDashboard";
import AdministrativoDashboard from "./pages/dashboard/AdministrativoDashboard";
// Platform Admin Pages
import PlatformDashboard from "./pages/platform/PlatformDashboard";
import OrganizationsPage from "./pages/platform/OrganizationsPage";
import UpgradeRequestsPage from "./pages/platform/UpgradeRequestsPage";
import AuditLogPage from "./pages/platform/AuditLogPage";

const queryClient = new QueryClient();

// Conditional provider component to isolate platform-admin from regular auth
function ConditionalAuthProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isPlatformRoute = location.pathname.startsWith('/platform-admin');

  // For platform routes, only use PlatformAuthProvider (no AuthProvider interference)
  if (isPlatformRoute) {
    return (
      <PlatformAuthProvider>
        {children}
      </PlatformAuthProvider>
    );
  }

  // For all other routes, use AuthProvider (no PlatformAuthProvider interference)
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}

const AppRoutes = () => (
  <ConditionalAuthProvider>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/registro-academia" element={<RegistroAcademia />} />
      <Route path="/login" element={<Login />} />
      <Route path="/recuperar-password" element={<RecuperarPassword />} />
      <Route path="/onboarding" element={
        <ProtectedRoute allowedRoles={['org_owner']}>
          <Onboarding />
        </ProtectedRoute>
      } />
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
      
      {/* Platform Admin Routes - Completely isolated */}
      <Route path="/platform-admin" element={
        <PlatformAuthGuard>
          <PlatformDashboard />
        </PlatformAuthGuard>
      } />
      <Route path="/platform-admin/organizations" element={
        <PlatformAuthGuard>
          <OrganizationsPage />
        </PlatformAuthGuard>
      } />
      <Route path="/platform-admin/upgrade-requests" element={
        <PlatformAuthGuard>
          <UpgradeRequestsPage />
        </PlatformAuthGuard>
      } />
      <Route path="/platform-admin/audit-log" element={
        <PlatformAuthGuard>
          <AuditLogPage />
        </PlatformAuthGuard>
      } />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  </ConditionalAuthProvider>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
