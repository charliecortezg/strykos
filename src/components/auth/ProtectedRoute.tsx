import { Navigate, useLocation } from 'react-router-dom';
import { useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getTargetRoute } from '@/lib/auth-routing';
import type { OrgRole } from '@/types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: OrgRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { 
    status, 
    isAuthenticated, 
    roles, 
    activeRole, 
    user, 
    onboardingCompleted,
    organization,
  } = useAuth();
  const location = useLocation();
  const hasRedirectedRef = useRef(false);

  // Show loader while checking auth
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-body">Cargando...</p>
        </div>
      </div>
    );
  }

  // Get target route from centralized function
  const targetRoute = getTargetRoute({
    isAuthenticated,
    mustChangePassword: user?.must_change_password ?? false,
    roles,
    activeRole,
    onboardingCompleted,
    currentPath: location.pathname,
    organization,
  });

  // Need to redirect - do it only once
  if (targetRoute && !hasRedirectedRef.current) {
    hasRedirectedRef.current = true;
    return <Navigate to={targetRoute} state={{ from: location }} replace />;
  }

  // Check role permissions - user must have at least one of the allowed roles
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowedRole = allowedRoles.some(allowedRole => roles.includes(allowedRole));
    
    if (!hasAllowedRole) {
      // Redirect to appropriate dashboard based on active role
      if (activeRole) {
        const dashboardPath = `/dashboard/${activeRole.replace('_', '-')}`;
        return <Navigate to={dashboardPath} replace />;
      }
      // Fallback to first available role
      if (roles.length > 0) {
        const dashboardPath = `/dashboard/${roles[0].replace('_', '-')}`;
        return <Navigate to={dashboardPath} replace />;
      }
    }
  }

  return <>{children}</>;
}
