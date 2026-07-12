import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, LogOut, ClipboardCheck, Target, TrendingUp, Activity, Dumbbell, User, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import { usePlayerActivity, useActiveChallenges, usePlayerBadges } from '@/hooks/usePortal';
import { BadgesGrid, ChallengesActive, ActivityFeed, IDPCard } from '@/components/portal';
import { ExercisesTab } from '@/components/portal/ExercisesTab';
import { WLFamilyProfile } from '@/components/wl/portal/WLFamilyProfile';
import { WLPlayerHistory } from '@/components/wl/portal/WLPlayerHistory';
import { useWLFamilyProfile } from '@/hooks/useWLFamilyProfile';
import { useWLPlayerHistory } from '@/hooks/useWLPlayerHistory';
import { MembershipTimeline } from '@/components/membership/MembershipTimeline';
import { MembershipHeroCard } from '@/components/membership/MembershipHeroCard';
import { usePlayerMembershipProgress } from '@/hooks/useMembershipBlocks';
import { usePlayerIDP } from '@/hooks/usePortal/usePlayerIDP';
import { IDPSessionModal } from '@/components/portal/IDPSessionModal';

export default function PortalPlayerView() {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const { linkedPlayers, logout } = usePortalAuth();
  const [activityFilter, setActivityFilter] = useState<'block' | 'all'>('all');
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [exerciseCategory, setExerciseCategory] = useState<string | null>(null);
  const [exerciseSkillName, setExerciseSkillName] = useState<string | null>(null);
  const [exercisePaywallScores, setExercisePaywallScores] = useState<{ current: number; target: number } | null>(null);
  const [activeTab, setActiveTab] = useState('evaluacion');

  const handleLogout = () => {
    logout();
    navigate('/portal/login');
  };

  const player = linkedPlayers.find(p => p.id === playerId);
  const { earnedBadges, lockedBadges } = usePlayerBadges(playerId || null);
  const { events } = usePlayerActivity(playerId || null);
  const { activeChallenges } = useActiveChallenges(playerId || null);
  const membership = usePlayerMembershipProgress(playerId || null);
  const { idpCycle, sessions, hasSessionToday, registerSession } = usePlayerIDP(playerId || null);
  const { hasData: hasWLData, isLoading: loadingWL } = useWLFamilyProfile(playerId || null);

  if (!player) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">No tienes acceso a este jugador.</p>
            <Button onClick={() => navigate('/portal')}>Volver al inicio</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const firstName = player.full_name.split(' ')[0] || player.full_name;

  const blockDateRange = membership.blockStartDate && membership.blockEndDate
    ? { start: membership.blockStartDate, end: membership.blockEndDate }
    : null;

  const filteredEvents = activityFilter === 'block' && blockDateRange
    ? events.filter(e => e.created_at >= blockDateRange.start && e.created_at <= blockDateRange.end)
    : events;

  const showFloatingButton = !!idpCycle && !hasSessionToday && idpCycle.status !== 'completed';

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4 px-4">
          {linkedPlayers.length > 1 && (
            <Link to="/portal">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
          )}
          <div className="flex items-center gap-2 flex-1">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold truncate">{player.full_name}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Salir
          </Button>
        </div>
      </header>

      <main className="container px-4 py-4 space-y-4 pb-24">
        {/* Simple player header — no numbers, no OVR, no XP */}
        <Card className="border-primary/10">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-base truncate">{player.full_name}</h1>
              {player.category_name && (
                <p className="text-xs text-muted-foreground">{player.category_name}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-auto">
            <TabsTrigger value="evaluacion" className="text-xs px-1 py-2 gap-1 flex-col sm:flex-row">
              <ClipboardCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Evaluación</span>
              <span className="sm:hidden">Eval</span>
            </TabsTrigger>
            <TabsTrigger value="plan" className="text-xs px-1 py-2 gap-1 flex-col sm:flex-row">
              <Target className="h-3.5 w-3.5" />
              Plan
            </TabsTrigger>
            <TabsTrigger value="ejercicios" className="text-xs px-1 py-2 gap-1 flex-col sm:flex-row">
              <Dumbbell className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ejercicios</span>
              <span className="sm:hidden">Ejer</span>
            </TabsTrigger>
            <TabsTrigger value="progreso" className="text-xs px-1 py-2 gap-1 flex-col sm:flex-row">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Progreso</span>
              <span className="sm:hidden">Prog</span>
            </TabsTrigger>
            <TabsTrigger value="actividad" className="text-xs px-1 py-2 gap-1 flex-col sm:flex-row">
              <Activity className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Actividad</span>
              <span className="sm:hidden">Act</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="evaluacion" className="mt-4 space-y-4">
            {loadingWL ? (
              <div className="space-y-3">
                <div className="h-6 w-48 bg-muted animate-pulse rounded" />
                <div className="h-28 bg-muted animate-pulse rounded-lg" />
              </div>
            ) : hasWLData ? (
              <WLFamilyProfile playerId={playerId!} playerName={player.full_name} />
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center space-y-2">
                  <Sparkles className="h-6 w-6 text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    El perfil formativo de {firstName} se construye mes a mes durante la temporada.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="plan" className="mt-4 space-y-4">
            <IDPCard
              playerId={playerId!}
              onExerciseLink={(category, skillName, scores) => {
                setExerciseCategory(category);
                setExerciseSkillName(skillName);
                setExercisePaywallScores(scores);
                setActiveTab('ejercicios');
              }}
            />
          </TabsContent>

          <TabsContent value="ejercicios" className="mt-4 space-y-4">
            <ExercisesTab
              playerId={playerId!}
              playerName={player.full_name}
              initialCategory={exerciseCategory}
              paywallSkillName={exerciseSkillName}
              paywallScores={exercisePaywallScores}
            />
          </TabsContent>

          <TabsContent value="progreso" className="mt-4 space-y-4">
            <MembershipHeroCard
              currentBlock={membership.currentBlock}
              currentStage={membership.currentStage}
              blockStartDate={membership.blockStartDate}
              blockEndDate={membership.blockEndDate}
              evalCount={membership.eval_count}
              attendancePct={membership.attendance_pct}
              daysRemaining={membership.days_remaining}
              eligibleForProgression={membership.eligibleForProgression}
            />
            {membership.blocks.length > 0 && (
              <MembershipTimeline blocks={membership.blocks} currentStage={membership.currentStage} />
            )}
          </TabsContent>

          <TabsContent value="actividad" className="mt-4 space-y-4">
            <Card>
              <CardContent className="pt-4">
                <ChallengesActive challenges={activeChallenges} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Logros ({earnedBadges.length})</h3>
                </div>
                <BadgesGrid
                  earnedBadges={earnedBadges}
                  lockedBadges={lockedBadges}
                  blockDateRange={blockDateRange}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Actividad Reciente</h3>
                  {blockDateRange && (
                    <div className="flex gap-1">
                      <Button
                        variant={activityFilter === 'block' ? 'default' : 'outline'}
                        size="sm" className="text-xs h-7 px-2"
                        onClick={() => setActivityFilter('block')}
                      >Este bloque</Button>
                      <Button
                        variant={activityFilter === 'all' ? 'default' : 'outline'}
                        size="sm" className="text-xs h-7 px-2"
                        onClick={() => setActivityFilter('all')}
                      >Todo</Button>
                    </div>
                  )}
                </div>
                <ActivityFeed events={filteredEvents} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Floating Session Button (IDP — usada por la familia, se mantiene) */}
      {showFloatingButton && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 px-4">
          <Button
            size="lg"
            className="shadow-lg rounded-full px-6 gap-2"
            onClick={() => setShowSessionModal(true)}
          >
            <Target className="h-5 w-5" />
            Registrar Sesión de Entrenamiento
          </Button>
        </div>
      )}

      <IDPSessionModal
        open={showSessionModal}
        onOpenChange={setShowSessionModal}
        sessionNumber={(sessions?.length || 0) + 1}
        onConfirm={() => {
          registerSession.mutate();
          setShowSessionModal(false);
        }}
        isPending={registerSession.isPending}
      />
    </div>
  );
}
