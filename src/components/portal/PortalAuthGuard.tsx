import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface PortalAuthGuardProps {
  children: ReactNode;
}

export function PortalAuthGuard({ children }: PortalAuthGuardProps) {
  const { status, isLoading } = usePortalAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (status !== 'authenticated') {
    return <Navigate to="/portal/login" replace />;
  }

  return <>{children}</>;
}
