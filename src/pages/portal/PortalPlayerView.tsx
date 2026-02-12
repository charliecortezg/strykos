import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import { usePlayerProgress, usePlayerBadges, usePlayerActivity, useActiveChallenges } from '@/hooks/usePortal';
import { ProgressCard, PlayerCard, BadgesGrid, ChallengesActive, ActivityFeed } from '@/components/portal';
import { MembershipTimeline } from '@/components/membership/MembershipTimeline';
import { MembershipHeroCard } from '@/components/membership/MembershipHeroCard';
import { usePlayerMembershipProgress } from '@/hooks/useMembershipBlocks';
import type { RadarAttributes } from '@/types/stryk-way';

export default function PortalPlayerView() {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const { linkedPlayers, organizationName, logout } = usePortalAuth();
  const [activityFilter, setActivityFilter] = useState<'block' | 'all'>('all');

  const handleLogout = () => {
    logout();
    navigate('/portal/login');
  };

  // Check if player is linked
  const player = linkedPlayers.find(p => p.id === playerId);

  const { progress, xpProgress, xpNeeded, xpPercentage, isLoading: loadingProgress } = usePlayerProgress(playerId || null);
  const { earnedBadges, lockedBadges, isLoading: loadingBadges } = usePlayerBadges(playerId || null);
  const { events, isLoading: loadingActivity } = usePlayerActivity(playerId || null);
  const { activeChallenges, isLoading: loadingChallenges } = useActiveChallenges(playerId || null);
  const membership = usePlayerMembershipProgress(playerId || null);

  // Redirect if player not linked
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

  // Default radar if not available
  const radar: RadarAttributes = progress?.radar || {
    tecnica: 50,
    tactica: 50,
    fisica: 50,
    mental: 50,
    social: 50,
    disciplina: 50,
  };

  // Block date range for filtering
  const blockDateRange = membership.blockStartDate && membership.blockEndDate
    ? { start: membership.blockStartDate, end: membership.blockEndDate }
    : null;

  // Filter activity events by block if needed
  const filteredEvents = activityFilter === 'block' && blockDateRange
    ? events.filter(e => {
        const d = e.created_at;
        return d >= blockDateRange.start && d <= blockDateRange.end;
      })
    : events;

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

      {/* Content */}
      <main className="container px-4 py-6 space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-32 bg-muted animate-pulse rounded-lg" />
            <div className="h-64 bg-muted animate-pulse rounded-lg" />
          </div>
        ) : (
          <>
            {/* 1. Membership Hero Card */}
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

            {/* 2. Membership Timeline */}
            {membership.blocks.length > 0 && (
              <MembershipTimeline blocks={membership.blocks} currentStage={membership.currentStage} />
            )}

            {/* 3. Progress Card */}
            <ProgressCard
              xpTotal={progress?.xp_total || 0}
              level={progress?.level || 1}
              streak={progress?.streak || 0}
              xpProgress={xpProgress}
              xpNeeded={xpNeeded}
              xpPercentage={xpPercentage}
            />

            {/* 4. Player Card */}
            <PlayerCard
              playerName={player.full_name}
              categoryName={player.category_name}
              ovr={progress?.ovr || 50}
              radar={radar}
              topBadges={earnedBadges.slice(0, 3).map(eb => eb.badge)}
            />

            {/* 5. Tabs with block context */}
            <Tabs defaultValue="challenges" className="mt-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="challenges">Retos</TabsTrigger>
                <TabsTrigger value="badges">Logros</TabsTrigger>
                <TabsTrigger value="activity">Actividad</TabsTrigger>
              </TabsList>

              <TabsContent value="challenges" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Retos Activos</CardTitle>
                    {membership.currentBlock && (
                      <p className="text-xs text-muted-foreground">
                        Retos activos del bloque {membership.currentBlock.name}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <ChallengesActive challenges={activeChallenges} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="badges" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Logros ({earnedBadges.length}/{earnedBadges.length + lockedBadges.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BadgesGrid
                      earnedBadges={earnedBadges}
                      lockedBadges={lockedBadges}
                      blockDateRange={blockDateRange}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Actividad Reciente</CardTitle>
                      {blockDateRange && (
                        <div className="flex gap-1">
                          <Button
                            variant={activityFilter === 'block' ? 'default' : 'outline'}
                            size="sm"
                            className="text-xs h-7 px-2"
                            onClick={() => setActivityFilter('block')}
                          >
                            Este bloque
                          </Button>
                          <Button
                            variant={activityFilter === 'all' ? 'default' : 'outline'}
                            size="sm"
                            className="text-xs h-7 px-2"
                            onClick={() => setActivityFilter('all')}
                          >
                            Todo
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ActivityFeed events={filteredEvents} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}
