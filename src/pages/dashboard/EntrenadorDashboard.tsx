import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { useAuth } from '@/contexts/AuthContext';
import { Users, CheckCircle, Trophy, ClipboardList, UserPlus, ClipboardCheck, History } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTrainerCategories } from '@/hooks/useTrainerCategories';
import { TrainerMatchesModule } from '@/components/matches/TrainerMatchesModule';
import { TrainingAttendanceModule } from '@/components/attendance/TrainingAttendanceModule';
import { usePlayers } from '@/hooks/usePlayers';
import { IntakeHistory } from '@/components/fichajes/IntakeHistory';
import { EvaluationsModule } from '@/components/evaluations/EvaluationsModule';
import { CoachExternalEvaluationsView } from '@/components/evaluations/CoachExternalEvaluationsView';
import { EvaluationsTabsWrapper } from '@/components/evaluations/EvaluationsTabsWrapper';
import { useFeatureFlags } from '@/hooks/useStrykWay';
import { BottomNavBar } from '@/components/sessions/BottomNavBar';
import { SessionHome } from '@/components/sessions/SessionHome';
import { HistorialSesiones } from '@/components/sessions/HistorialSesiones';
import { SincronizacionStryk } from '@/components/sessions/SincronizacionStryk';

export default function EntrenadorDashboard() {
  const navigate = useNavigate();
  const { user, organization } = useAuth();
  const { categories, hasCategories, isLoading } = useTrainerCategories();
  const { players } = usePlayers();
  // Asistencia is the default - it's the most frequent action for trainers
  const [activeTab, setActiveTab] = useState('sesion');
  const { feature_evaluations_enabled } = useFeatureFlags();

  // Filter players to only show those in trainer's categories
  const trainerCategoryIds = categories.map(c => c.id);
  const trainerPlayers = players.filter(p => p.category_id && trainerCategoryIds.includes(p.category_id));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="container px-4 py-6">
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

      <main className="container px-3 sm:px-4 py-4 sm:py-6 pb-20 lg:pb-6">
        {/* Compact Header for Mobile */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-semibold text-foreground">
              Hola, {user?.full_name?.split(' ')[0]}
            </h1>
            <p className="text-sm text-muted-foreground">
              {organization?.name}
            </p>
          </div>
          {/* Quick Action: New Intake */}
          <Button 
            onClick={() => navigate('/fichajes/terminal')}
            size="sm"
            className="gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Fichaje</span>
            <span className="sm:hidden">Fichar</span>
          </Button>
        </div>

        {!hasCategories ? (
          // Empty state when no categories assigned
          <div className="stryk-card p-8 sm:p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-7 h-7 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-display font-semibold text-foreground mb-2">
              Aún no tienes categorías asignadas.
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              El Fundador o Director Deportivo debe asignarte una categoría.
            </p>
          </div>
        ) : (
          <>
            {/* Categories Quick View - Compact for Mobile */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4">
              {categories.map((cat) => (
                <Badge key={cat.id} variant="secondary" className="text-xs sm:text-sm py-1 px-2 sm:px-3">
                  {cat.name}
                  {cat.sport?.name && (
                    <span className="hidden sm:inline ml-1.5 text-muted-foreground">
                      • {cat.sport.name}
                    </span>
                  )}
                </Badge>
              ))}
            </div>

            {/* Tabs - Priority Order: Asistencia, Partidos, Jugadores */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={`w-full hidden lg:grid mb-4 h-12 ${feature_evaluations_enabled ? 'grid-cols-8' : 'grid-cols-7'}`}>
                <TabsTrigger value="sesion" className="gap-1.5 text-xs sm:text-sm">
                  <ClipboardList className="w-4 h-4" />
                  Sesión
                </TabsTrigger>
                <TabsTrigger value="asistencia" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <CheckCircle className="w-4 h-4" />
                  Asistencia
                </TabsTrigger>
                <TabsTrigger value="partidos" className="gap-1.5 text-xs sm:text-sm">
                  <Trophy className="w-4 h-4" />
                  Partidos
                </TabsTrigger>
                <TabsTrigger value="jugadores" className="gap-1.5 text-xs sm:text-sm">
                  <Users className="w-4 h-4" />
                  Jugadores
                </TabsTrigger>
                <TabsTrigger value="fichajes" className="gap-1.5 text-xs sm:text-sm">
                  <UserPlus className="w-4 h-4" />
                  Fichajes
                </TabsTrigger>
                {feature_evaluations_enabled && (
                  <TabsTrigger value="evaluaciones" className="gap-1.5 text-xs sm:text-sm">
                    <ClipboardCheck className="w-4 h-4" />
                    Evaluaciones
                  </TabsTrigger>
                )}
                <TabsTrigger value="historial" className="gap-1.5 text-xs sm:text-sm">
                  <History className="w-4 h-4" />
                  Historial
                </TabsTrigger>
                <TabsTrigger value="sincronizacion" className="gap-1.5 text-xs sm:text-sm">
                  <ClipboardCheck className="w-4 h-4" />
                  Sync
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sesion" className="mt-0">
                <SessionHome onShowHistorial={() => setActiveTab('historial')} />
              </TabsContent>

              <TabsContent value="asistencia" className="mt-0">
                <TrainingAttendanceModule categories={categories} />
              </TabsContent>

              <TabsContent value="partidos" className="mt-0">
                <TrainerMatchesModule categories={categories} />
              </TabsContent>

              <TabsContent value="jugadores" className="mt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      <h2 className="text-lg font-display font-semibold">
                        Mis Jugadores
                      </h2>
                    </div>
                    <Badge variant="outline">{trainerPlayers.length}</Badge>
                  </div>
                  {trainerPlayers.length === 0 ? (
                    <div className="stryk-card p-8 text-center">
                      <p className="text-muted-foreground">
                        No hay jugadores en tus categorías.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {trainerPlayers.map((player) => (
                        <div 
                          key={player.id} 
                          className="flex items-center justify-between p-3 bg-card border border-border rounded-lg"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{player.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {player.category?.name || 'Sin categoría'}
                              {player.position && ` • ${player.position}`}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={`ml-2 text-xs shrink-0 ${
                              player.payment_status === 'al_dia' ? 'bg-success/10 text-success border-success/20' :
                              player.payment_status === 'pendiente' ? 'bg-warning/10 text-warning border-warning/20' :
                              'bg-destructive/10 text-destructive border-destructive/20'
                            }`}
                          >
                            {player.payment_status === 'al_dia' ? 'Al día' : 
                             player.payment_status === 'pendiente' ? 'Pendiente' : 'Atrasado'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="fichajes" className="mt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-display font-semibold">Mis Fichajes</h2>
                    <Button onClick={() => navigate('/fichajes/terminal')} size="sm" className="gap-1.5">
                      <UserPlus className="w-4 h-4" />
                      <span className="hidden sm:inline">Nuevo</span>
                    </Button>
                  </div>
                  <IntakeHistory />
                </div>
              </TabsContent>

              {feature_evaluations_enabled && (
                <TabsContent value="evaluaciones" className="mt-0">
                  <EvaluationsTabsWrapper
                    internalView={<EvaluationsModule categories={categories} />}
                    externalView={<CoachExternalEvaluationsView />}
                    showBadge
                  />
                </TabsContent>
              )}

              <TabsContent value="historial" className="mt-0">
                <HistorialSesiones />
              </TabsContent>

              <TabsContent value="sincronizacion" className="mt-0">
                <SincronizacionStryk onNavigateEvaluations={() => setActiveTab('evaluaciones')} />
              </TabsContent>
            </Tabs>
          </>
        )}

        <BottomNavBar activeTab={activeTab} onTabChange={setActiveTab} />
      </main>
    </div>
  );
}
