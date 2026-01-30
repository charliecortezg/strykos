import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { IntakeHistory } from '@/components/fichajes/IntakeHistory';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function HistorialPage() {
  const { organization } = useAuth();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  const handleNewIntake = () => {
    navigate('/fichajes/terminal');
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-display font-semibold text-foreground">
                Historial de Fichajes
              </h1>
              <p className="text-sm text-muted-foreground">
                {organization?.name}
              </p>
            </div>
          </div>
          <Button onClick={handleNewIntake} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo</span>
          </Button>
        </div>

        <IntakeHistory />
      </main>
    </div>
  );
}
