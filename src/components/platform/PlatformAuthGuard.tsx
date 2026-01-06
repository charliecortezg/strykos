import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface PlatformAuthGuardProps {
  children: React.ReactNode;
}

export function PlatformAuthGuard({ children }: PlatformAuthGuardProps) {
  const { status, isPlatformAdmin } = usePlatformAuth();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // If not a platform admin, show 404 (not redirect to login)
  if (status === 'unauthorized' || !isPlatformAdmin) {
    return <Navigate to="/404" replace />;
  }

  return <>{children}</>;
}
