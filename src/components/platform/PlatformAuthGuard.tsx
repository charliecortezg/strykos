import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { Navigate } from 'react-router-dom';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

interface PlatformAuthGuardProps {
  children: React.ReactNode;
}

const LOADING_TIMEOUT = 10000; // 10 seconds max loading

export function PlatformAuthGuard({ children }: PlatformAuthGuardProps) {
  const { status, isPlatformAdmin, error, refetch } = usePlatformAuth();
  const [timedOut, setTimedOut] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (status === 'loading') {
      setTimedOut(false);
      timer = setTimeout(() => {
        console.log('[PlatformAuthGuard] Loading timeout reached');
        setTimedOut(true);
      }, LOADING_TIMEOUT);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [status]);

  const handleRetry = async () => {
    setIsRetrying(true);
    setTimedOut(false);
    try {
      await refetch();
    } finally {
      setIsRetrying(false);
    }
  };

  // Show loading state (but with timeout protection)
  if (status === 'loading' && !timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // Show error state or timeout
  if (status === 'error' || timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 max-w-md text-center p-6">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">No se pudo verificar el acceso</h2>
          <p className="text-muted-foreground">
            {error || (timedOut ? 'La verificación tardó demasiado. Esto puede deberse a un problema de conexión.' : 'Ocurrió un error al verificar tus permisos.')}
          </p>
          <div className="flex gap-3 mt-4">
            <Button 
              onClick={handleRetry} 
              disabled={isRetrying}
              variant="default"
            >
              {isRetrying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reintentando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reintentar
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/login'}
            >
              Ir a Login
            </Button>
          </div>
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
