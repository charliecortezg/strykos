import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { useAuth } from '@/contexts/AuthContext';
import { FinanceModule } from '@/components/payments/FinanceModule';

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

        <FinanceModule />
      </main>
    </div>
  );
}
