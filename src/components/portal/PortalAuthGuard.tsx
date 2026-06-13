import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { supabase } from '@/integrations/supabase/client';
import { resolveFeature } from '@/lib/feature-profiles';
import PortalUnavailable from '@/pages/portal/PortalUnavailable';

interface PortalAuthGuardProps {
  children: ReactNode;
}

export function PortalAuthGuard({ children }: PortalAuthGuardProps) {
  const { status, isLoading, organizationId } = usePortalAuth();
  const [checking, setChecking] = useState(true);
  const [portalEnabled, setPortalEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (status !== 'authenticated' || !organizationId) {
      setChecking(false);
      return;
    }
    setChecking(true);
    (async () => {
      const { data } = await supabase
        .from('organizations')
        .select('feature_profile, features, feature_stryk_way_enabled')
        .eq('id', organizationId)
        .maybeSingle();
      if (cancelled) return;
      const enabled = resolveFeature(data as any, 'family_portal');
      setPortalEnabled(enabled);
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [status, organizationId]);

  if (isLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (status !== 'authenticated') {
    return <Navigate to="/portal/login" replace />;
  }

  if (portalEnabled === false) {
    return <PortalUnavailable />;
  }

  return <>{children}</>;
}
