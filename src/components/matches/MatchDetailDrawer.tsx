import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, MapPin, User, Trophy, Edit2, Save, XCircle, Shield, Target, Users, Trash2, ShieldCheck, Crown, MessageSquare, Video } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Match, MatchPlayer, getMatchResult } from '@/types/matches';
import { PerformanceIndicator } from '@/components/attendance/PerformanceIndicator';
import type { PerformanceStatus } from '@/components/attendance/PerformanceIndicator';
import { useMatchPlayers } from '@/hooks/useMatches';
import { useVenues } from '@/hooks/useVenues';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface MatchDetailDrawerProps {
  match: Match | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (matchId: string, updates: Partial<Match>, userId: string) => void;
  onUpdatePlayers: (players: Partial<MatchPlayer>[]) => void;
  onDelete?: (matchId: string) => void;
  canEdit: boolean;
  canDelete?: boolean;
}

export function MatchDetailDrawer({ 
  match, 
  isOpen, 
  onClose, 
  onUpdate, 
  onUpdatePlayers,
  onDelete,
  canEdit,
  canDelete 
}: MatchDetailDrawerProps) {
  const { user } = useAuth();
  const { venues } = useVenues();
  const { matchPlayers, isLoading: loadingPlayers } = useMatchPlayers(match?.id || null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedMatch, setEditedMatch] = useState<Partial<Match>>({});
  const [editedPlayers, setEditedPlayers] = useState<MatchPlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<MatchPlayer | null>(null);

  useEffect(() => {
    if (match) {
      setEditedMatch({
        goals_for: match.goals_for,
        goals_against: match.goals_against,
        match_type: match.match_type,
        status: match.status,
        venue_id: match.venue_id,
        match_date: match.match_date,
        notes: match.notes,
        technical_notes: match.technical_notes,
      });
    }
  }, [match]);

  useEffect(() => {
    setEditedPlayers(matchPlayers);
  }, [matchPlayers]);

  if (!match) return null;

  const result = getMatchResult(match.goals_for, match.goals_against);
  const isFinished = match.status === 'terminado';
  const sportName = match.category?.sports?.name?.toLowerCase() || 'fútbol';
  const isFutbol = sportName.includes('fútbol') || sportName.includes('futbol') || sportName.includes('soccer');

  const handleSave = () => {
    if (user?.id) {
      onUpdate(match.id, editedMatch, user.id);
      if (editedPlayers.length > 0) {
        onUpdatePlayers(editedPlayers);
      }
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedMatch({
      goals_for: match.goals_for,
      goals_against: match.goals_against,
      match_type: match.match_type,
      status: match.status,
      venue_id: match.venue_id,
      match_date: match.match_date,
      notes: match.notes,
      technical_notes: match.technical_notes,
    });
    setEditedPlayers(matchPlayers);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(match.id);
      onClose();
    }
  };

  const updatePlayerStat = (playerId: string, field: keyof MatchPlayer, value: boolean | number) => {
    setEditedPlayers(prev => 
      prev.map(p => p.player_id === playerId ? { ...p, [field]: value } : p)
    );
  };

  // Calculate KPIs from player stats
  const totalPlayerGoals = matchPlayers.reduce((sum, p) => sum + (p.goals || 0), 0);
  const goalsFor = isEditing ? (editedMatch.goals_for ?? 0) : (totalPlayerGoals > 0 ? totalPlayerGoals : match.goals_for);
  const goalsAgainst = isEditing ? (editedMatch.goals_against ?? 0) : match.goals_against;
  const difference = goalsFor - goalsAgainst;
  const currentResult = getMatchResult(goalsFor, goalsAgainst);

  return (
    <>
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()} shouldScaleBackground={false}>
      <DrawerContent
        className="left-0 right-0 h-[95dvh] max-h-[95dvh] w-screen max-w-[100vw] flex flex-col overflow-hidden p-0"
        style={{ touchAction: 'manipulation' }}
      >
        <DrawerHeader className="border-b border-border pb-3 pt-2 px-4 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <DrawerTitle className="flex items-center gap-2 text-base flex-wrap min-w-0">
              <Trophy className="w-5 h-5 text-primary shrink-0" />
              <span className="truncate">Detalle del Partido</span>
              {isFinished && (
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0",
                    result === 'victoria' && "bg-success/10 text-success border-success/20",
                    result === 'empate' && "bg-warning/10 text-warning border-warning/20",
                    result === 'derrota' && "bg-destructive/10 text-destructive border-destructive/20"
                  )}
                >
                  {result === 'victoria' ? 'Victoria' : result === 'empate' ? 'Empate' : 'Derrota'}
                </Badge>
              )}
            </DrawerTitle>
          </div>
        </DrawerHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-3">
          <Tabs defaultValue="info" className="w-full">
            <div
              className="mb-4 -mx-4 px-4 overflow-x-scroll [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}
            >
              <TabsList className="inline-flex w-max flex-nowrap gap-1 h-auto bg-muted p-1">
                <TabsTrigger value="info" className="gap-1.5 px-3 py-1.5 text-xs flex-shrink-0 whitespace-nowrap">
                  <Trophy className="w-4 h-4" />
                  <span>Info</span>
                </TabsTrigger>
                <TabsTrigger value="players" className="gap-1.5 px-3 py-1.5 text-xs flex-shrink-0 whitespace-nowrap">
                  <Users className="w-4 h-4" />
                  <span>Jugadores ({matchPlayers.length})</span>
                </TabsTrigger>
                <TabsTrigger value="kpis" className="gap-1.5 px-3 py-1.5 text-xs flex-shrink-0 whitespace-nowrap">
                  <Target className="w-4 h-4" />
                  <span>KPIs</span>
                </TabsTrigger>
                <TabsTrigger value="video" className="gap-1.5 px-3 py-1.5 text-xs flex-shrink-0 whitespace-nowrap">
                  <Video className="w-4 h-4" />
                  <span>Video</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="info" className="space-y-4 pb-4">
              {/* Match Info Grid - Responsive */}
              <div className="grid grid-cols-2 gap-3">
                <div className="stryk-card p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-xs">Fecha</span>
                  </div>
                  {isEditing ? (
                    <Input
                      type="datetime-local"
                      value={editedMatch.match_date?.slice(0, 16) || ''}
                      onChange={(e) => setEditedMatch({ ...editedMatch, match_date: e.target.value })}
                      className="mt-1 h-8 text-sm"
                    />
                  ) : (
                    <p className="font-medium text-sm">
                      {format(new Date(match.match_date), "dd MMM yyyy HH:mm", { locale: es })}
                    </p>
                  )}
                </div>

                <div className="stryk-card p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Shield className="w-3.5 h-3.5" />
                    <span className="text-xs">Rival</span>
                  </div>
                  <p className="font-medium text-sm">{match.rival_name}</p>
                </div>

                <div className="stryk-card p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <User className="w-3.5 h-3.5" />
                    <span className="text-xs">Categoría</span>
                  </div>
                  <p className="font-medium text-sm">{match.category?.name}</p>
                  {match.category?.sports?.name && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      {match.category.sports.name}
                    </Badge>
                  )}
                </div>

                <div className="stryk-card p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="text-xs">Sede</span>
                  </div>
                  {isEditing ? (
                    <Select 
                      value={editedMatch.venue_id || 'none'} 
                      onValueChange={(v) => setEditedMatch({ ...editedMatch, venue_id: v === 'none' ? null : v })}
                    >
                      <SelectTrigger className="mt-1 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin sede</SelectItem>
                        {venues.filter(v => v.is_active).map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="font-medium text-sm">{match.venue?.name || '—'}</p>
                  )}
                </div>
              </div>

              {/* Score Section */}
              <div className="stryk-card p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2 text-sm">
                  <Trophy className="w-4 h-4 text-primary" />
                  Marcador Final
                </h4>
                <div className="flex items-center justify-center gap-6">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Nosotros</p>
                    {isEditing ? (
                      <Input
                        type="number"
                        min="0"
                        value={editedMatch.goals_for ?? 0}
                        onChange={(e) => setEditedMatch({ ...editedMatch, goals_for: parseInt(e.target.value) || 0 })}
                        className="w-16 text-center text-xl font-display font-bold h-12"
                      />
                    ) : (
                      <p className="text-3xl font-display font-bold text-primary">{match.goals_for}</p>
                    )}
                  </div>
                  <span className="text-2xl text-muted-foreground font-light">—</span>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Rival</p>
                    {isEditing ? (
                      <Input
                        type="number"
                        min="0"
                        value={editedMatch.goals_against ?? 0}
                        onChange={(e) => setEditedMatch({ ...editedMatch, goals_against: parseInt(e.target.value) || 0 })}
                        className="w-16 text-center text-xl font-display font-bold h-12"
                      />
                    ) : (
                      <p className="text-3xl font-display font-bold">{match.goals_against}</p>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="mt-4 pt-3 border-t border-border">
                  <Label className="text-xs text-muted-foreground">Estado</Label>
                  {isEditing ? (
                    <Select 
                      value={editedMatch.status} 
                      onValueChange={(v) => setEditedMatch({ ...editedMatch, status: v as any })}
                    >
                      <SelectTrigger className="mt-1 h-8 w-40 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="programado">Programado</SelectItem>
                        <SelectItem value="terminado">Terminado</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge 
                      className={cn(
                        "mt-1",
                        match.status === 'terminado' && "bg-success/10 text-success",
                        match.status === 'programado' && "bg-primary/10 text-primary",
                        match.status === 'cancelado' && "bg-destructive/10 text-destructive"
                      )}
                    >
                      {match.status === 'terminado' ? 'Terminado' : match.status === 'programado' ? 'Programado' : 'Cancelado'}
                    </Badge>
                  )}
                </div>
                </div>

                {/* MVP Badge */}
                {match.mvp_player_id && match.mvp_player && (
                  <div className="stryk-card p-3 flex items-center gap-2 bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800">
                    <Crown className="w-5 h-5 text-yellow-500 fill-yellow-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">MVP del Partido</p>
                      <p className="font-semibold text-sm">{match.mvp_player.full_name}</p>
                    </div>
                  </div>
                )}

              <div className="space-y-3">
                <div className="stryk-card p-3">
                  <Label className="text-xs text-muted-foreground">Observaciones</Label>
                  {isEditing ? (
                    <Textarea
                      value={editedMatch.notes || ''}
                      onChange={(e) => setEditedMatch({ ...editedMatch, notes: e.target.value })}
                      className="mt-1 text-sm"
                      rows={2}
                      placeholder="Observaciones..."
                    />
                  ) : (
                    <p className="mt-1 text-sm">{match.notes || 'Sin observaciones'}</p>
                  )}
                </div>
                <div className="stryk-card p-3">
                  <Label className="text-xs text-muted-foreground">Notas Técnicas</Label>
                  {isEditing ? (
                    <Textarea
                      value={editedMatch.technical_notes || ''}
                      onChange={(e) => setEditedMatch({ ...editedMatch, technical_notes: e.target.value })}
                      className="mt-1 text-sm"
                      rows={2}
                      placeholder="Notas técnicas..."
                    />
                  ) : (
                    <p className="mt-1 text-sm">{match.technical_notes || 'Sin notas técnicas'}</p>
                  )}
                </div>
              </div>

              {/* Traceability */}
              <div className="stryk-card p-3 bg-muted/30">
                <h4 className="font-medium mb-2 text-xs text-muted-foreground">Trazabilidad</h4>
                <div className="flex flex-col gap-1 text-xs">
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
                          {' '}— {format(new Date(match.last_edited_at), "dd/MM/yyyy HH:mm", { locale: es })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="players" className="pb-4">
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
                <div
                  className="-mx-4 w-[calc(100%+2rem)] overflow-x-scroll [scrollbar-width:thin]"
                  style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}
                >
                  <table className="border-collapse text-sm" style={{ minWidth: isFutbol ? 560 : 480 }}>
                    <thead>
                      <tr className="bg-muted/50 text-xs text-muted-foreground">
                        <th className="sticky left-0 z-[2] bg-muted/80 backdrop-blur px-3 py-2 text-left font-medium" style={{ minWidth: 180 }}>
                          Jugador
                        </th>
                        <th className="px-2 py-2 text-center font-medium" style={{ minWidth: 70 }}>Asist.</th>
                        <th className="px-2 py-2 text-center font-medium" style={{ minWidth: 90 }}>Rendim.</th>
                        {isFutbol ? (
                          <>
                            <th className="px-2 py-2 text-center font-medium" style={{ minWidth: 60 }}>G</th>
                            <th className="px-2 py-2 text-center font-medium" style={{ minWidth: 60 }}>A</th>
                          </>
                        ) : (
                          <th className="px-2 py-2 text-center font-medium" style={{ minWidth: 70 }}>Pts</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {(isEditing ? editedPlayers : matchPlayers).map((mp, idx) => (
                        <tr
                          key={mp.id}
                          className={cn(
                            "border-t border-border",
                            idx % 2 === 1 && "bg-muted/20",
                            !isEditing && "cursor-pointer active:bg-muted/40"
                          )}
                          onClick={() => { if (!isEditing) setSelectedPlayer(mp); }}
                        >
                          <td
                            className={cn(
                              "sticky left-0 z-[1] px-3 py-2 text-left",
                              idx % 2 === 1 ? "bg-[hsl(var(--muted)/0.6)] backdrop-blur" : "bg-card"
                            )}
                            style={{ minWidth: 180 }}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              {match.mvp_player_id === mp.player_id && (
                                <Crown className="w-3.5 h-3.5 text-yellow-500 fill-yellow-400 shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className="font-medium truncate">{mp.player?.full_name}</p>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {mp.player?.position || 'Sin posición'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-2 text-center" onClick={(e) => isEditing && e.stopPropagation()}>
                            {isEditing ? (
                              <Checkbox
                                checked={mp.attended}
                                onCheckedChange={(checked) => updatePlayerStat(mp.player_id, 'attended', !!checked)}
                              />
                            ) : (
                              <Badge variant={mp.attended ? 'default' : 'outline'} className="text-xs">
                                {mp.attended ? '✓' : '✗'}
                              </Badge>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex items-center justify-center">
                              {mp.attended && mp.performance ? (
                                <PerformanceIndicator
                                  status={mp.performance as PerformanceStatus}
                                  onChange={() => {}}
                                  disabled
                                  size="sm"
                                />
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </div>
                          </td>
                          {isFutbol ? (
                            <>
                              <td className="px-2 py-2 text-center" onClick={(e) => isEditing && e.stopPropagation()}>
                                {isEditing ? (
                                  <Input
                                    type="number" min="0" value={mp.goals}
                                    onChange={(e) => updatePlayerStat(mp.player_id, 'goals', parseInt(e.target.value) || 0)}
                                    className="w-12 h-7 text-center text-sm mx-auto"
                                  />
                                ) : (
                                  <span className={cn("font-medium", mp.goals > 0 && "text-success")}>{mp.goals}</span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-center" onClick={(e) => isEditing && e.stopPropagation()}>
                                {isEditing ? (
                                  <Input
                                    type="number" min="0" value={mp.assists}
                                    onChange={(e) => updatePlayerStat(mp.player_id, 'assists', parseInt(e.target.value) || 0)}
                                    className="w-12 h-7 text-center text-sm mx-auto"
                                  />
                                ) : (
                                  <span className={cn("font-medium", mp.assists > 0 && "text-primary")}>{mp.assists}</span>
                                )}
                              </td>
                            </>
                          ) : (
                            <td className="px-2 py-2 text-center" onClick={(e) => isEditing && e.stopPropagation()}>
                              {isEditing ? (
                                <Input
                                  type="number" min="0" value={mp.points}
                                  onChange={(e) => updatePlayerStat(mp.player_id, 'points', parseInt(e.target.value) || 0)}
                                  className="w-14 h-7 text-center text-sm mx-auto"
                                />
                              ) : (
                                <span className="font-medium">{mp.points}</span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="kpis" className="pb-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="stryk-card p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Resultado</p>
                  <Badge 
                    className={cn(
                      "text-base px-3 py-0.5",
                      currentResult === 'victoria' && "bg-success/10 text-success",
                      currentResult === 'empate' && "bg-warning/10 text-warning",
                      currentResult === 'derrota' && "bg-destructive/10 text-destructive"
                    )}
                  >
                    {currentResult === 'victoria' ? 'G' : currentResult === 'empate' ? 'E' : 'P'}
                  </Badge>
                </div>
                <div className="stryk-card p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Diferencia</p>
                  <p className={cn(
                    "text-xl font-display font-bold",
                    difference > 0 && "text-success",
                    difference < 0 && "text-destructive",
                    difference === 0 && "text-warning"
                  )}>
                    {difference > 0 ? '+' : ''}{difference}
                  </p>
                </div>
                <div className="stryk-card p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">A Favor</p>
                  <p className="text-xl font-display font-bold text-success">{goalsFor}</p>
                </div>
                <div className="stryk-card p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">En Contra</p>
                  <p className="text-xl font-display font-bold text-destructive">{goalsAgainst}</p>
                </div>
              </div>

              {/* Player Stats Summary */}
              {matchPlayers.length > 0 && (
                <div className="mt-4 stryk-card p-3">
                  <h4 className="font-medium mb-3 text-sm">Estadísticas de Jugadores</h4>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Asistencia</p>
                      <p className="text-lg font-bold">
                        {matchPlayers.filter(p => p.attended).length}/{matchPlayers.length}
                      </p>
                    </div>
                    {isFutbol ? (
                      <>
                        <div>
                          <p className="text-xs text-muted-foreground">Goles</p>
                          <p className="text-lg font-bold text-success">
                            {matchPlayers.reduce((sum, p) => sum + (p.goals || 0), 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Asistencias</p>
                          <p className="text-lg font-bold text-primary">
                            {matchPlayers.reduce((sum, p) => sum + (p.assists || 0), 0)}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Puntos Totales</p>
                        <p className="text-lg font-bold">
                          {matchPlayers.reduce((sum, p) => sum + (p.points || 0), 0)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="video" className="pb-4">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Video className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Análisis de video — próximamente</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DrawerFooter className="border-t border-border pt-3 pb-3 px-4 shrink-0">
          {isEditing ? (
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={handleCancel} className="flex-1 gap-2">
                <XCircle className="w-4 h-4" />
                Cancelar
              </Button>
              <Button onClick={handleSave} className="flex-1 gap-2">
                <Save className="w-4 h-4" />
                Guardar
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 w-full">
              {canDelete && onDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar partido?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. Se eliminarán todos los datos del partido incluyendo estadísticas de jugadores.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Eliminar partido
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {canEdit && (
                <Button variant="outline" onClick={() => setIsEditing(true)} className="flex-1 gap-2">
                  <Edit2 className="w-4 h-4" />
                  Editar partido
                </Button>
              )}
              <Button variant="outline" onClick={onClose} className={cn(!canEdit && "flex-1")}>
                Cerrar
              </Button>
            </div>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>

    {/* Player Detail Bottom Sheet */}
    <Sheet open={!!selectedPlayer} onOpenChange={(open) => !open && setSelectedPlayer(null)}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[60vh] overflow-y-auto px-5 pb-6">
        <SheetHeader className="pb-3">
          <SheetTitle className="flex items-center gap-2">
            {selectedPlayer?.player?.full_name || 'Jugador'}
            <Badge variant={selectedPlayer?.attended ? 'default' : 'outline'} className="text-xs">
              {selectedPlayer?.attended ? 'Presente' : 'Ausente'}
            </Badge>
            {match?.mvp_player_id === selectedPlayer?.player_id && (
              <Crown className="w-4 h-4 text-yellow-500 fill-yellow-400" />
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Stats */}
          {selectedPlayer?.attended && (
            <div className="flex items-center gap-4">
              {selectedPlayer.performance && (
                <div className="flex items-center gap-2">
                  <PerformanceIndicator
                    status={selectedPlayer.performance as PerformanceStatus}
                    onChange={() => {}}
                    disabled
                    size="sm"
                  />
                  <span className="text-sm text-muted-foreground capitalize">
                    {selectedPlayer.performance === 'outstanding' ? 'Sobresaliente' :
                     selectedPlayer.performance === 'excellent' ? 'Excelente' : 'Enfoque'}
                  </span>
                </div>
              )}
              {isFutbol ? (
                <div className="flex items-center gap-3 text-sm">
                  <span className={cn("font-medium", (selectedPlayer?.goals || 0) > 0 && "text-success")}>
                    {selectedPlayer?.goals || 0} Goles
                  </span>
                  <span className={cn("font-medium", (selectedPlayer?.assists || 0) > 0 && "text-primary")}>
                    {selectedPlayer?.assists || 0} Asistencias
                  </span>
                </div>
              ) : (
                <span className="font-medium text-sm">{selectedPlayer?.points || 0} Puntos</span>
              )}
            </div>
          )}

          <Separator />

          {/* Full coach comment - editable */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Comentario del entrenador</Label>
            <Textarea
              value={selectedPlayer?.note || ''}
              onChange={(e) => {
                const newNote = e.target.value;
                if (selectedPlayer) {
                  setSelectedPlayer({ ...selectedPlayer, note: newNote });
                  updatePlayerStat(selectedPlayer.player_id, 'note' as keyof MatchPlayer, newNote as any);
                }
              }}
              onBlur={() => {
                if (selectedPlayer && editedPlayers.length > 0) {
                  onUpdatePlayers(editedPlayers);
                }
              }}
              placeholder="Escribe un comentario sobre el desempeño del jugador..."
              rows={4}
              className="text-sm"
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
    </>
  );
}
