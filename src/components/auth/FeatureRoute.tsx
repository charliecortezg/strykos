import { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useOrgFeatures } from '@/hooks/useOrgFeatures';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardPath } from '@/lib/auth-routing';
import type { FeatureKey } from '@/lib/feature-profiles';

interface FeatureRouteProps {
  featureKey: FeatureKey;
  children: ReactNode;
}

/**
 * Guard that allows a route only when the org has the given feature enabled.
 * When disabled: redirects to the user's dashboard and surfaces the standard toast.
 */
export function FeatureRoute({ featureKey, children }: FeatureRouteProps) {
  const { isEnabled, isLoading } = useOrgFeatures();
  const { activeRole, roles } = useAuth();
  const enabled = isEnabled(featureKey);

  useEffect(() => {
    if (!isLoading && !enabled) {
      toast.error('Esta función no está disponible');
    }
  }, [isLoading, enabled]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!enabled) {
    return <Navigate to={getDashboardPath(activeRole, roles)} replace />;
  }

  return <>{children}</>;
}
