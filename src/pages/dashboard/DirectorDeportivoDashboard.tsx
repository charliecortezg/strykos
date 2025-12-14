import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { useAuth } from '@/contexts/AuthContext';
import { Users, ClipboardList, BarChart3, Calendar } from 'lucide-react';

export default function DirectorDeportivoDashboard() {
  const { user, organization } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-semibold text-foreground mb-2">
            Panel del Director Deportivo
          </h1>
          <p className="text-muted-foreground">
            Bienvenido, {user?.full_name}. Control deportivo de {organization?.name}.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="stryk-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-semibold">0</p>
                <p className="text-sm text-muted-foreground">Jugadores</p>
              </div>
            </div>
          </div>
          <div className="stryk-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-display font-semibold">0</p>
                <p className="text-sm text-muted-foreground">Categorías</p>
              </div>
            </div>
          </div>
          <div className="stryk-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-display font-semibold">0</p>
                <p className="text-sm text-muted-foreground">Sesiones hoy</p>
              </div>
            </div>
          </div>
          <div className="stryk-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-display font-semibold">0%</p>
                <p className="text-sm text-muted-foreground">Asistencia</p>
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
            Próximamente podrás gestionar jugadores, categorías y ver reportes deportivos.
          </p>
        </div>
      </main>
    </div>
  );
}
