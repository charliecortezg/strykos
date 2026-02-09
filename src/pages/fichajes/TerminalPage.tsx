import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { IntakeTerminal } from '@/components/fichajes/IntakeTerminal';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardPath } from '@/lib/auth-routing';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function TerminalPage() {
  const { organization, activeRole, roles } = useAuth();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(getDashboardPath(activeRole, roles));
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container px-0 sm:px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 sm:px-0 mb-4">
          <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-display font-semibold text-foreground">
              Nuevo Fichaje
            </h1>
            <p className="text-sm text-muted-foreground">
              {organization?.name}
            </p>
          </div>
        </div>

        <IntakeTerminal />
      </main>
    </div>
  );
}
