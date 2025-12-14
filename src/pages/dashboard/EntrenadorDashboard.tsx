import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { useAuth } from '@/contexts/AuthContext';
import { Users, CheckCircle, Calendar } from 'lucide-react';

export default function EntrenadorDashboard() {
  const { user, organization } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-semibold text-foreground mb-2">
            Panel del Entrenador
          </h1>
          <p className="text-muted-foreground">
            Bienvenido, {user?.full_name}. Operación en cancha para {organization?.name}.
          </p>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="stryk-card p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
            <h3 className="font-display font-semibold text-foreground mb-2">
              Registrar asistencia
            </h3>
            <p className="text-sm text-muted-foreground">
              Registro rápido de asistencia para tu categoría.
            </p>
          </div>
          <div className="stryk-card p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-foreground mb-2">
              Ver jugadores
            </h3>
            <p className="text-sm text-muted-foreground">
              Lista de jugadores de tu categoría asignada.
            </p>
          </div>
          <div className="stryk-card p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-6 h-6 text-warning" />
            </div>
            <h3 className="font-display font-semibold text-foreground mb-2">
              Sesiones
            </h3>
            <p className="text-sm text-muted-foreground">
              Calendario de entrenamientos programados.
            </p>
          </div>
        </div>

        {/* Placeholder content */}
        <div className="stryk-card p-8 text-center">
          <h2 className="text-xl font-display font-semibold text-foreground mb-2">
            Módulo en desarrollo
          </h2>
          <p className="text-muted-foreground">
            Próximamente podrás registrar asistencia y gestionar tus sesiones de entrenamiento.
          </p>
        </div>
      </main>
    </div>
  );
}
