import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { OrgRole } from '@/types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: OrgRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, roles, activeRole, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-body">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user must change password
  if (user?.must_change_password && location.pathname !== '/cambiar-password') {
    return <Navigate to="/cambiar-password" replace />;
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
