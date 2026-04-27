import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Calendar, MapPin, User, Trophy, Clock, Shield, Target, Users, Crown, Video } from 'lucide-react';
import { MatchVideoAnalysis } from '@/components/matches/MatchVideoAnalysis';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMatches, useMatchPlayers } from '@/hooks/useMatches';
import { getMatchResult } from '@/types/matches';
import { cn } from '@/lib/utils';

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { matches, isLoading } = useMatches();
  const match = matches.find((m) => m.id === id) || null;
  const { matchPlayers, isLoading: loadingPlayers } = useMatchPlayers(match?.id || null);

  const isFinished = match?.status === 'terminado';
  const result = match ? getMatchResult(match.goals_for, match.goals_against) : null;
  const sportName = match?.category?.sports?.name?.toLowerCase() || 'fútbol';
  const isFutbol = sportName.includes('fútbol') || sportName.includes('futbol') || sportName.includes('soccer');

  const totalPlayerGoals = matchPlayers.reduce((sum, p) => sum + (p.goals || 0), 0);
  const goalsFor = match ? (totalPlayerGoals > 0 ? totalPlayerGoals : match.goals_for) : 0;
  const goalsAgainst = match?.goals_against ?? 0;
  const difference = goalsFor - goalsAgainst;
  const currentResult = match ? getMatchResult(goalsFor, goalsAgainst) : 'empate';

  return (
    <div className="w-full min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0 h-10 w-10"
            aria-label="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary shrink-0" />
              <h1 className="font-display font-semibold text-base truncate">
                {match ? `vs ${match.rival_name}` : 'Detalle del partido'}
              </h1>
            </div>
            {match && (
              <p className="text-xs text-muted-foreground truncate">
                {format(new Date(match.match_date), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
              </p>
            )}
          </div>
          {isFinished && result && (
            <Badge
              variant="outline"
              className={cn(
                'shrink-0',
                result === 'victoria' && 'bg-success/10 text-success border-success/20',
                result === 'empate' && 'bg-warning/10 text-warning border-warning/20',
                result === 'derrota' && 'bg-destructive/10 text-destructive border-destructive/20',
              )}
            >
              {result === 'victoria' ? 'Victoria' : result === 'empate' ? 'Empate' : 'Derrota'}
            </Badge>
          )}
        </div>
      </header>

      {/* Body */}
      <main className="px-4 py-4 pb-24">
        {isLoading && !match ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !match ? (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Partido no encontrado</p>
            <Button onClick={() => navigate(-1)} variant="outline" className="mt-4">
              Volver
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="info">
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="info" className="flex-1 gap-1.5">
                <Trophy className="w-4 h-4" />
                Info
              </TabsTrigger>
              <TabsTrigger value="players" className="flex-1 gap-1.5">
                <Users className="w-4 h-4" />
                Jugadores ({matchPlayers.length})
              </TabsTrigger>
              <TabsTrigger value="kpis" className="flex-1 gap-1.5">
                <Target className="w-4 h-4" />
                KPIs
              </TabsTrigger>
              <TabsTrigger value="video" className="flex-1 gap-1.5">
                <Video className="w-4 h-4" />
                Video
              </TabsTrigger>
            </TabsList>

            {/* INFO TAB */}
            <TabsContent value="info" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="stryk-card p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Fecha y hora</span>
                  </div>
                  <p className="font-medium text-sm">
                    {format(new Date(match.match_date), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                  </p>
                </div>

                <div className="stryk-card p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Shield className="w-4 h-4" />
                    <span className="text-sm">Rival</span>
                  </div>
                  <p className="font-medium text-sm">{match.rival_name}</p>
                </div>

                <div className="stryk-card p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <User className="w-4 h-4" />
                    <span className="text-sm">Categoría</span>
                  </div>
                  <p className="font-medium text-sm">{match.category?.name}</p>
                  {match.category?.sports?.name && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      {match.category.sports.name}
                    </Badge>
                  )}
                </div>

                <div className="stryk-card p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <User className="w-4 h-4" />
                    <span className="text-sm">Entrenador</span>
                  </div>
                  <p className="font-medium text-sm">{match.trainer?.full_name || '—'}</p>
                </div>

                <div className="stryk-card p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">Sede</span>
                  </div>
                  <p className="font-medium text-sm">{match.venue?.name || '—'}</p>
                </div>

                <div className="stryk-card p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Trophy className="w-4 h-4" />
                    <span className="text-sm">Tipo</span>
                  </div>
                  <Badge variant="secondary" className="mt-1">
                    {match.match_type === 'liga' ? 'Liga' : match.match_type === 'torneo' ? 'Torneo' : 'Amistoso'}
                  </Badge>
                </div>
              </div>

              {/* Score */}
              <div className="stryk-card p-6">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  Marcador Final
                </h4>
                <div className="flex items-center justify-center gap-6">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-2">Nosotros</p>
                    <p className="text-4xl font-display font-bold text-primary">{match.goals_for}</p>
                  </div>
                  <span className="text-3xl text-muted-foreground font-light">—</span>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-2">Rival</p>
                    <p className="text-4xl font-display font-bold">{match.goals_against}</p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border">
                  <Label className="text-xs text-muted-foreground">Estado del partido</Label>
                  <Badge
                    className={cn(
                      'mt-2 ml-2',
                      match.status === 'terminado' && 'bg-success/10 text-success',
                      match.status === 'programado' && 'bg-primary/10 text-primary',
                      match.status === 'cancelado' && 'bg-destructive/10 text-destructive',
                    )}
                  >
                    {match.status === 'terminado' ? 'Terminado' : match.status === 'programado' ? 'Programado' : 'Cancelado'}
                  </Badge>
                </div>
              </div>

              {/* MVP */}
              {match.mvp_player_id && match.mvp_player && (
                <div className="stryk-card p-4 flex items-center gap-3 bg-warning/5 border-warning/30">
                  <Crown className="w-6 h-6 text-warning fill-warning/40 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">MVP del Partido</p>
                    <p className="font-semibold text-sm">{match.mvp_player.full_name}</p>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="grid grid-cols-1 gap-3">
                <div className="stryk-card p-4">
                  <Label className="text-xs text-muted-foreground">Observaciones</Label>
                  <p className="mt-2 text-sm">{match.notes || 'Sin observaciones'}</p>
                </div>
                <div className="stryk-card p-4">
                  <Label className="text-xs text-muted-foreground">Notas Técnicas</Label>
                  <p className="mt-2 text-sm">{match.technical_notes || 'Sin notas técnicas'}</p>
                </div>
              </div>

              {/* Traceability */}
              <div className="stryk-card p-4 bg-muted/30">
                <h4 className="font-medium mb-3 text-xs text-muted-foreground">Trazabilidad</h4>
                <div className="flex flex-col gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Registrado por:</span>{' '}
                    <span className="font-medium">{match.created_by_profile?.full_name || 'Sistema'}</span>
                  </div>
                  {match.last_edited_by && (
                    <div>
                      <span className="text-muted-foreground">Última edición:</span>{' '}
                      <span className="font-medium">{match.last_edited_by_profile?.full_name}</span>
                      {match.last_edited_at && (
                        <span className="text-muted-foreground">
                          {' '}— {format(new Date(match.last_edited_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* PLAYERS TAB */}
            <TabsContent value="players">
              {loadingPlayers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : matchPlayers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm">No hay jugadores registrados</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {matchPlayers.map((mp) => {
                    const attended = !!mp.attended;
                    const isMvp = match.mvp_player_id === mp.player_id;
                    const perfLabel =
                      mp.performance === 'outstanding' ? 'Destacado' :
                      mp.performance === 'excellent' ? 'Excelente' :
                      mp.performance === 'focus' ? 'En foco' : null;
                    const perfDot =
                      mp.performance === 'outstanding' ? 'bg-blue-500' :
                      mp.performance === 'excellent' ? 'bg-success' :
                      mp.performance === 'focus' ? 'bg-warning' : '';
                    const note = (mp as any).note as string | null | undefined;

                    return (
                      <div
                        key={mp.id}
                        className={cn(
                          'rounded-xl border border-border bg-card p-4',
                          !attended && 'opacity-40',
                          isMvp && 'border-l-[3px] border-l-warning',
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-bold text-sm text-foreground truncate">
                            {mp.player?.full_name}
                            {mp.is_guest && (
                              <span className="ml-2 text-[10px] font-medium text-muted-foreground">INVITADO</span>
                            )}
                          </p>
                          <span
                            className={cn(
                              'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
                              attended ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {attended ? 'Asistió' : 'No asistió'}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {mp.player?.position && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                              {mp.player.position}
                            </span>
                          )}
                          {attended && perfLabel && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground">
                              <span className={cn('w-2 h-2 rounded-full', perfDot)} />
                              {perfLabel}
                            </span>
                          )}
                          {isFutbol ? (
                            <>
                              {mp.goals > 0 && (
                                <span className="rounded-full bg-success/10 text-success px-2 py-0.5 text-[11px] font-medium">
                                  ⚽ {mp.goals}
                                </span>
                              )}
                              {mp.assists > 0 && (
                                <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium">
                                  🅰️ {mp.assists}
                                </span>
                              )}
                            </>
                          ) : (
                            mp.points > 0 && (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                                {mp.points} pts
                              </span>
                            )
                          )}
                          {isMvp && (
                            <span className="rounded-full bg-warning/15 text-warning px-2 py-0.5 text-[11px] font-medium">
                              👑 MVP
                            </span>
                          )}
                        </div>

                        {note && <p className="mt-2 text-xs italic text-muted-foreground">{note}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* KPIs TAB */}
            <TabsContent value="kpis" className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="stryk-card p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Resultado</p>
                  <Badge
                    className={cn(
                      'text-base px-3 py-1',
                      currentResult === 'victoria' && 'bg-success/10 text-success',
                      currentResult === 'empate' && 'bg-warning/10 text-warning',
                      currentResult === 'derrota' && 'bg-destructive/10 text-destructive',
                    )}
                  >
                    {currentResult === 'victoria' ? 'G' : currentResult === 'empate' ? 'E' : 'P'}
                  </Badge>
                </div>
                <div className="stryk-card p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Diferencia</p>
                  <p
                    className={cn(
                      'text-2xl font-display font-bold',
                      difference > 0 && 'text-success',
                      difference < 0 && 'text-destructive',
                      difference === 0 && 'text-warning',
                    )}
                  >
                    {difference > 0 ? '+' : ''}
                    {difference}
                  </p>
                </div>
                <div className="stryk-card p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">A Favor</p>
                  <p className="text-2xl font-display font-bold text-success">{goalsFor}</p>
                </div>
                <div className="stryk-card p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">En Contra</p>
                  <p className="text-2xl font-display font-bold text-destructive">{goalsAgainst}</p>
                </div>
              </div>

              {matchPlayers.length > 0 && (
                <div className="stryk-card p-4">
                  <h4 className="font-medium mb-4 text-sm">Estadísticas de Jugadores</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Asistencia</p>
                      <p className="text-lg font-bold">
                        {matchPlayers.filter((p) => p.attended).length}/{matchPlayers.length}
                      </p>
                    </div>
                    {isFutbol ? (
                      <>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Total Goles</p>
                          <p className="text-lg font-bold text-success">
                            {matchPlayers.reduce((sum, p) => sum + (p.goals || 0), 0)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Total Asistencias</p>
                          <p className="text-lg font-bold text-primary">
                            {matchPlayers.reduce((sum, p) => sum + (p.assists || 0), 0)}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Total Puntos</p>
                        <p className="text-lg font-bold">
                          {matchPlayers.reduce((sum, p) => sum + (p.points || 0), 0)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* VIDEO TAB */}
            <TabsContent value="video">
              <div style={{ height: '70vh' }}>
                <MatchVideoAnalysis
                  matchId={match.id}
                  organizationId={match.organization_id}
                  categoryName={match.category?.name ?? ''}
                  attendedPlayers={matchPlayers.filter(mp => mp.attended) as any}
                />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
