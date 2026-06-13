import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { usePortalAuth } from '@/contexts/PortalAuthContext';

export default function PortalUnavailable() {
  const navigate = useNavigate();
  const { logout } = usePortalAuth();

  const handleExit = () => {
    logout();
    navigate('/portal/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-display font-semibold">Portal no disponible</h1>
        <p className="text-muted-foreground">
          El Portal Familiar no está habilitado en esta academia. Contacta con tu
          academia para más información.
        </p>
        <Button variant="outline" onClick={handleExit}>Salir</Button>
      </div>
    </div>
  );
}
