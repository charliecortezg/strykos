import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { useAuth } from '@/contexts/AuthContext';
import { Users, CheckCircle, Trophy, ClipboardList } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useTrainerCategories } from '@/hooks/useTrainerCategories';
import { TrainerMatchesModule } from '@/components/matches/TrainerMatchesModule';

export default function EntrenadorDashboard() {
  const { user, organization } = useAuth();
  const { categories, hasCategories, isLoading } = useTrainerCategories();
  const [activeTab, setActiveTab] = useState('partidos');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="container px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    );
  }

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

        {!hasCategories ? (
          // Empty state when no categories assigned
          <div className="stryk-card p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
              <ClipboardList className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-display font-semibold text-foreground mb-3">
              Aún no tienes categorías asignadas.
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              El Fundador o Director Deportivo de tu academia debe asignarte una categoría para comenzar a operar.
            </p>
          </div>
        ) : (
          <>
            {/* Categories Overview */}
            <div className="stryk-card p-4 mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Mis Categorías</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <Badge key={cat.id} variant="secondary" className="text-sm py-1 px-3">
                    {cat.name}
                    {cat.sport?.name && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        • {cat.sport.name}
                      </span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="partidos" className="gap-2">
                  <Trophy className="w-4 h-4" />
                  Partidos
                </TabsTrigger>
                <TabsTrigger value="asistencia" className="gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Asistencia
                </TabsTrigger>
                <TabsTrigger value="jugadores" className="gap-2">
                  <Users className="w-4 h-4" />
                  Jugadores
                </TabsTrigger>
              </TabsList>

              <TabsContent value="partidos">
                <TrainerMatchesModule categories={categories} />
              </TabsContent>

              <TabsContent value="asistencia">
                <div className="stryk-card p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-xl font-display font-semibold text-foreground mb-2">
                    Registro de Asistencia
                  </h2>
                  <p className="text-muted-foreground">
                    Próximamente podrás registrar la asistencia de tus entrenamientos.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="jugadores">
                <div className="stryk-card p-8 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-xl font-display font-semibold text-foreground mb-2">
                    Mis Jugadores
                  </h2>
                  <p className="text-muted-foreground">
                    Próximamente podrás ver el listado de jugadores de tus categorías.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}
