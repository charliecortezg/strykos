import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard, TrendingUp, Users, AlertCircle } from 'lucide-react';

export default function AdministrativoDashboard() {
  const { user, organization } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-semibold text-foreground mb-2">
            Panel Administrativo
          </h1>
          <p className="text-muted-foreground">
            Bienvenido, {user?.full_name}. Control financiero de {organization?.name}.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="stryk-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-display font-semibold">$0</p>
                <p className="text-sm text-muted-foreground">Ingresos mes</p>
              </div>
            </div>
          </div>
          <div className="stryk-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-semibold">0</p>
                <p className="text-sm text-muted-foreground">Pagos al día</p>
              </div>
            </div>
          </div>
          <div className="stryk-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-display font-semibold">0</p>
                <p className="text-sm text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </div>
          <div className="stryk-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-display font-semibold">0%</p>
                <p className="text-sm text-muted-foreground">Cobranza</p>
              </div>
            </div>
          </div>
        </div>

        {/* Placeholder content */}
        <div className="stryk-card p-8 text-center">
          <h2 className="text-xl font-display font-semibold text-foreground mb-2">
            Módulo en desarrollo
          </h2>
          <p className="text-muted-foreground">
            Próximamente podrás gestionar pagos, ver reportes financieros y dar seguimiento a cobranza.
          </p>
        </div>
      </main>
    </div>
  );
}
