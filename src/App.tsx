import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PlatformAuthProvider } from "@/contexts/PlatformAuthContext";
import { PortalAuthProvider } from "@/contexts/PortalAuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PlatformAuthGuard } from "@/components/platform/PlatformAuthGuard";
import { PortalAuthGuard } from "@/components/portal/PortalAuthGuard";
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
import AssessmentLabDashboard from "./pages/dashboard/AssessmentLabDashboard";
// Fichajes (Intake) Pages
import TerminalPage from "./pages/fichajes/TerminalPage";
import HistorialPage from "./pages/fichajes/HistorialPage";
// Platform Admin Pages
import PlatformLogin from "./pages/platform/PlatformLogin";
import PlatformDashboard from "./pages/platform/PlatformDashboard";
import OrganizationsPage from "./pages/platform/OrganizationsPage";
import UpgradeRequestsPage from "./pages/platform/UpgradeRequestsPage";
import AuditLogPage from "./pages/platform/AuditLogPage";
// STRYK Way Pages
import StudioPage from "./pages/stryk-way/StudioPage";
// Portal Familiar Pages
import PortalLogin from "./pages/portal/PortalLogin";
import PortalDashboard from "./pages/portal/PortalDashboard";
import PortalPlayerView from "./pages/portal/PortalPlayerView";

const queryClient = new QueryClient();

// Platform Admin Routes - Completely isolated with its own provider
function PlatformRoutes() {
  return (
    <PlatformAuthProvider>
      <Routes>
        <Route path="login" element={<PlatformLogin />} />
        <Route path="" element={
          <PlatformAuthGuard>
            <PlatformDashboard />
          </PlatformAuthGuard>
        } />
        <Route path="organizations" element={
          <PlatformAuthGuard>
            <OrganizationsPage />
          </PlatformAuthGuard>
        } />
        <Route path="upgrade-requests" element={
          <PlatformAuthGuard>
            <UpgradeRequestsPage />
          </PlatformAuthGuard>
        } />
        <Route path="audit-log" element={
          <PlatformAuthGuard>
            <AuditLogPage />
          </PlatformAuthGuard>
        } />
      </Routes>
    </PlatformAuthProvider>
  );
}

// Portal Familiar Routes - Isolated auth for guardians/tutors
function PortalFamiliarRoutes() {
  return (
    <PortalAuthProvider>
      <Routes>
        <Route path="login" element={<PortalLogin />} />
        <Route path="" element={
          <PortalAuthGuard>
            <PortalDashboard />
          </PortalAuthGuard>
        } />
        <Route path="jugador/:playerId" element={
          <PortalAuthGuard>
            <PortalPlayerView />
          </PortalAuthGuard>
        } />
      </Routes>
    </PortalAuthProvider>
  );
}

// Academy Routes - Regular auth provider
function AcademyRoutes() {
  return (
    <AuthProvider>
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
        {/* Assessment Lab Route */}
        <Route path="/dashboard/assessment-lab" element={
          <ProtectedRoute allowedRoles={['entrenador', 'director_deportivo', 'org_owner']}>
            <AssessmentLabDashboard />
          </ProtectedRoute>
        } />
        {/* Fichajes Routes */}
        <Route path="/fichajes/terminal" element={
          <ProtectedRoute allowedRoles={['org_owner', 'director_deportivo', 'administrativo', 'entrenador']}>
            <TerminalPage />
          </ProtectedRoute>
        } />
        <Route path="/fichajes/historial" element={
          <ProtectedRoute allowedRoles={['org_owner', 'director_deportivo', 'administrativo']}>
            <HistorialPage />
          </ProtectedRoute>
        } />
        {/* STRYK Way Routes */}
        <Route path="/stryk-way" element={
          <ProtectedRoute allowedRoles={['org_owner', 'director_deportivo']}>
            <StudioPage />
          </ProtectedRoute>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Platform Admin - Completely isolated routing tree */}
          <Route path="/platform-admin/*" element={<PlatformRoutes />} />
          
          {/* Portal Familiar - Isolated routing for guardians */}
          <Route path="/portal/*" element={<PortalFamiliarRoutes />} />
          
          {/* Academy routes - Everything else */}
          <Route path="/*" element={<AcademyRoutes />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
