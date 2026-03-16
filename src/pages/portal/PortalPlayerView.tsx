import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, LogOut, ClipboardCheck, Target, TrendingUp, Activity, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import { usePlayerProgress, usePlayerBadges, usePlayerActivity, useActiveChallenges } from '@/hooks/usePortal';
import { ProgressCard, BadgesGrid, ChallengesActive, ActivityFeed, LastEvaluationCard, IDPCard } from '@/components/portal';
import { MembershipTimeline } from '@/components/membership/MembershipTimeline';
import { MembershipHeroCard } from '@/components/membership/MembershipHeroCard';
import { usePlayerMembershipProgress } from '@/hooks/useMembershipBlocks';
import { usePlayerIDP } from '@/hooks/usePortal/usePlayerIDP';
import { IDPSessionModal } from '@/components/portal/IDPSessionModal';
import type { RadarAttributes } from '@/types/stryk-way';
import { RadarChart } from '@/components/portal/RadarChart';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PortalPlayerView() {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const { linkedPlayers, organizationName, logout } = usePortalAuth();
  const [activityFilter, setActivityFilter] = useState<'block' | 'all'>('all');
  const [showSessionModal, setShowSessionModal] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/portal/login');
  };

  const player = linkedPlayers.find(p => p.id === playerId);
  const { progress, xpProgress, xpNeeded, xpPercentage, isLoading: loadingProgress } = usePlayerProgress(playerId || null);
  const { earnedBadges, lockedBadges, isLoading: loadingBadges } = usePlayerBadges(playerId || null);
  const { events, isLoading: loadingActivity } = usePlayerActivity(playerId || null);
  const { activeChallenges, isLoading: loadingChallenges } = useActiveChallenges(playerId || null);
  const membership = usePlayerMembershipProgress(playerId || null);
  const { idpCycle, sessions, hasSessionToday, registerSession } = usePlayerIDP(playerId || null);

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

  const isLoading = loadingProgress || loadingBadges || loadingActivity || loadingChallenges;

  const radar: RadarAttributes = progress?.radar || {
    tecnica: 50, tactica: 50, fisica: 50, mental: 50, social: 50, disciplina: 50,
  };

  const ovr = progress?.ovr || 50;
  const level = progress?.level || 1;
  const xpTotal = progress?.xp_total || 0;

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
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-32 bg-muted animate-pulse rounded-lg" />
            <div className="h-48 bg-muted animate-pulse rounded-lg" />
          </div>
        ) : (
          <>
            {/* Compact Hero: OVR + Radar + Level + XP Progress */}
            <CompactPlayerHeader
              playerName={player.full_name}
              categoryName={player.category_name}
              ovr={ovr}
              level={level}
              xpTotal={xpTotal}
              xpProgress={xpProgress}
              xpNeeded={xpNeeded}
              xpPercentage={xpPercentage}
              streak={progress?.streak || 0}
              radar={radar}
            />

            {/* Main Tabs */}
            <Tabs defaultValue="evaluacion" className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-auto">
                <TabsTrigger value="evaluacion" className="text-xs px-1 py-2 gap-1 flex-col sm:flex-row">
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Evaluación</span>
                  <span className="sm:hidden">Eval</span>
                </TabsTrigger>
                <TabsTrigger value="plan" className="text-xs px-1 py-2 gap-1 flex-col sm:flex-row">
                  <Target className="h-3.5 w-3.5" />
                  Plan
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
                <LastEvaluationCard playerId={playerId!} />
              </TabsContent>

              <TabsContent value="plan" className="mt-4 space-y-4">
                <IDPCard playerId={playerId!} />
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
                {/* ProgressCard removed - XP/Level info is now in the compact header above */}
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
          </>
        )}
      </main>

      {/* Floating Session Button */}
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

function CompactPlayerHeader({
  playerName, categoryName, ovr, level, xpTotal, xpProgress, xpNeeded, xpPercentage, streak, radar,
}: {
  playerName: string;
  categoryName: string | null;
  ovr: number;
  level: number;
  xpTotal: number;
  xpProgress: number;
  xpNeeded: number;
  xpPercentage: number;
  streak: number;
  radar: RadarAttributes;
}) {
  const tierStyle = ovr >= 85
    ? { bg: 'from-amber-400 to-orange-500', text: 'text-white' }
    : ovr >= 70
      ? { bg: 'from-purple-500 to-pink-500', text: 'text-white' }
      : ovr >= 55
        ? { bg: 'from-blue-500 to-cyan-400', text: 'text-white' }
        : { bg: 'from-slate-400 to-slate-500', text: 'text-white' };

  return (
    <div className="rounded-2xl overflow-hidden border shadow-sm">
      <div className={cn('p-4 bg-gradient-to-r', tierStyle.bg)}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-white/80" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className={cn('font-bold text-base truncate', tierStyle.text)}>{playerName}</h2>
            {categoryName && (
              <p className={cn('text-xs opacity-80', tierStyle.text)}>{categoryName}</p>
            )}
          </div>
          <div className="flex flex-col items-center">
            <span className={cn('text-3xl font-black', tierStyle.text)}>{ovr}</span>
            <span className={cn('text-[10px] font-medium uppercase tracking-wider opacity-80', tierStyle.text)}>OVR</span>
          </div>
        </div>
        {/* Level + XP + Streak chips */}
        <div className="flex gap-2 mt-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-xs text-white font-medium">
            Nv {level}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-xs text-white font-medium">
            {xpTotal} XP
          </span>
          {streak > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-xs text-white font-medium">
              🔥 {streak}d
            </span>
          )}
        </div>
        {/* XP Progress bar */}
        <div className="mt-2">
          <div className="flex justify-between text-[10px] text-white/70 mb-0.5">
            <span>Nivel {level + 1}</span>
            <span>{xpProgress}/{xpNeeded} XP</span>
          </div>
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white/80 rounded-full transition-all" style={{ width: `${xpPercentage}%` }} />
          </div>
        </div>
      </div>
      {/* Radar - proper size with legend */}
      <div className="bg-card px-4 py-4">
        <div className="flex justify-center">
          <RadarChart data={radar} size={180} />
        </div>
        <div className="grid grid-cols-3 gap-x-3 gap-y-1 mt-2 text-[10px] text-muted-foreground">
          <span><strong className="text-foreground">CTRL</strong> Control</span>
          <span><strong className="text-foreground">DEC</strong> Decisión</span>
          <span><strong className="text-foreground">PAS</strong> Pase</span>
          <span><strong className="text-foreground">ACT</strong> Actitud</span>
          <span><strong className="text-foreground">AUT</strong> Autonomía</span>
          <span><strong className="text-foreground">DIS</strong> Disciplina</span>
        </div>
      </div>
    </div>
  );
}
