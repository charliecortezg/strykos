import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, Calendar, MapPin, User, Trophy, Edit2, Save, XCircle, Clock, Shield, Target, Users, Crown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Match, MatchPlayer, getMatchResult } from '@/types/matches';
import { PerformanceIndicator } from '@/components/attendance/PerformanceIndicator';
import type { PerformanceStatus } from '@/components/attendance/PerformanceIndicator';
import { useMatchPlayers } from '@/hooks/useMatches';
import { useVenues } from '@/hooks/useVenues';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface MatchDetailModalProps {
  match: Match | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (matchId: string, updates: Partial<Match>, userId: string) => void;
  onUpdatePlayers: (players: Partial<MatchPlayer>[]) => void;
  canEdit: boolean;
}

export function MatchDetailModal({ 
  match, 
  isOpen, 
  onClose, 
  onUpdate, 
  onUpdatePlayers,
  canEdit 
}: MatchDetailModalProps) {
  const { user } = useAuth();
  const { venues } = useVenues();
  const { matchPlayers, isLoading: loadingPlayers } = useMatchPlayers(match?.id || null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedMatch, setEditedMatch] = useState<Partial<Match>>({});
  const [editedPlayers, setEditedPlayers] = useState<MatchPlayer[]>([]);

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

  const updatePlayerStat = (playerId: string, field: keyof MatchPlayer, value: boolean | number) => {
    setEditedPlayers(prev => 
      prev.map(p => p.player_id === playerId ? { ...p, [field]: value } : p)
    );
  };

  // Calculate KPIs from player stats (fixes bug where KPIs showed 0)
  const totalPlayerGoals = matchPlayers.reduce((sum, p) => sum + (p.goals || 0), 0);
  const totalPlayerAssists = matchPlayers.reduce((sum, p) => sum + (p.assists || 0), 0);
  
  // Use player stats if available, otherwise use match scoreboard
  const goalsFor = isEditing ? (editedMatch.goals_for ?? 0) : (totalPlayerGoals > 0 ? totalPlayerGoals : match.goals_for);
  const goalsAgainst = isEditing ? (editedMatch.goals_against ?? 0) : match.goals_against;
  const difference = goalsFor - goalsAgainst;
  const currentResult = getMatchResult(goalsFor, goalsAgainst);

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <Trophy className="w-6 h-6 text-primary" />
              <span>Detalle del Partido</span>
              {isFinished && (
                <Badge 
                  variant="outline"
                  className={cn(
                    "ml-2",
                    result === 'victoria' && "bg-success/10 text-success border-success/20",
                    result === 'empate' && "bg-warning/10 text-warning border-warning/20",
                    result === 'derrota' && "bg-destructive/10 text-destructive border-destructive/20"
                  )}
                >
                  {result === 'victoria' ? 'Victoria' : result === 'empate' ? 'Empate' : 'Derrota'}
                </Badge>
              )}
            </DialogTitle>
            {canEdit && !isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-2">
                <Edit2 className="w-4 h-4" />
                Editar partido
              </Button>
            )}
            {!canEdit && isFinished && (
              <Badge variant="outline" className="bg-muted text-muted-foreground text-xs flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Partido cerrado
              </Badge>
            )}
            {isEditing && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancel} className="gap-2">
                  <XCircle className="w-4 h-4" />
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSave} className="gap-2">
                  <Save className="w-4 h-4" />
                  Guardar cambios
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-4">
          <TabsList className="mb-4">
            <TabsTrigger value="info" className="gap-2">
              <Trophy className="w-4 h-4" />
              Información
            </TabsTrigger>
            <TabsTrigger value="players" className="gap-2">
              <Users className="w-4 h-4" />
              Jugadores ({matchPlayers.length})
            </TabsTrigger>
            <TabsTrigger value="kpis" className="gap-2">
              <Target className="w-4 h-4" />
              KPIs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6">
            {/* Match Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="stryk-card p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Fecha y hora</span>
                </div>
                {isEditing ? (
                  <Input
                    type="datetime-local"
                    value={editedMatch.match_date?.slice(0, 16) || ''}
                    onChange={(e) => setEditedMatch({ ...editedMatch, match_date: e.target.value })}
                    className="mt-2"
                  />
                ) : (
                  <p className="font-medium">
                    {format(new Date(match.match_date), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                  </p>
                )}
              </div>

              <div className="stryk-card p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm">Rival</span>
                </div>
                <p className="font-medium">{match.rival_name}</p>
              </div>

              <div className="stryk-card p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <User className="w-4 h-4" />
                  <span className="text-sm">Categoría / Deporte</span>
                </div>
                <p className="font-medium">{match.category?.name}</p>
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
                <p className="font-medium">{match.trainer?.full_name || '—'}</p>
              </div>

              <div className="stryk-card p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">Sede</span>
                </div>
                {isEditing ? (
                  <Select 
                    value={editedMatch.venue_id || 'none'} 
                    onValueChange={(v) => setEditedMatch({ ...editedMatch, venue_id: v === 'none' ? null : v })}
                  >
                    <SelectTrigger className="mt-2">
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
                  <p className="font-medium">{match.venue?.name || '—'}</p>
                )}
              </div>

              <div className="stryk-card p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Trophy className="w-4 h-4" />
                  <span className="text-sm">Tipo de partido</span>
                </div>
                {isEditing ? (
                  <Select 
                    value={editedMatch.match_type} 
                    onValueChange={(v) => setEditedMatch({ ...editedMatch, match_type: v as any })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="liga">Liga</SelectItem>
                      <SelectItem value="torneo">Torneo</SelectItem>
                      <SelectItem value="amistoso">Amistoso</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary" className="mt-1">
                    {match.match_type === 'liga' ? 'Liga' : match.match_type === 'torneo' ? 'Torneo' : 'Amistoso'}
                  </Badge>
                )}
              </div>
            </div>

            {/* Score Section */}
            <div className="stryk-card p-6">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Marcador Final
              </h4>
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Nosotros</p>
                  {isEditing ? (
                    <Input
                      type="number"
                      min="0"
                      value={editedMatch.goals_for ?? 0}
                      onChange={(e) => setEditedMatch({ ...editedMatch, goals_for: parseInt(e.target.value) || 0 })}
                      className="w-20 text-center text-2xl font-display font-bold"
                    />
                  ) : (
                    <p className="text-4xl font-display font-bold text-primary">{match.goals_for}</p>
                  )}
                </div>
                <span className="text-3xl text-muted-foreground font-light">—</span>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Rival</p>
                  {isEditing ? (
                    <Input
                      type="number"
                      min="0"
                      value={editedMatch.goals_against ?? 0}
                      onChange={(e) => setEditedMatch({ ...editedMatch, goals_against: parseInt(e.target.value) || 0 })}
                      className="w-20 text-center text-2xl font-display font-bold"
                    />
                  ) : (
                    <p className="text-4xl font-display font-bold">{match.goals_against}</p>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="mt-6 pt-4 border-t border-border">
                <Label className="text-sm text-muted-foreground">Estado del partido</Label>
                {isEditing ? (
                  <Select 
                    value={editedMatch.status} 
                    onValueChange={(v) => setEditedMatch({ ...editedMatch, status: v as any })}
                  >
                    <SelectTrigger className="mt-2 w-48">
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
                      "mt-2",
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
              <div className="stryk-card p-4 flex items-center gap-3 bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800">
                <Crown className="w-6 h-6 text-yellow-500 fill-yellow-400 flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">MVP del Partido</p>
                  <p className="font-semibold">{match.mvp_player.full_name}</p>
                </div>
              </div>
            )}

            {/* Notes Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="stryk-card p-4">
                <Label className="text-sm text-muted-foreground">Observaciones</Label>
                {isEditing ? (
                  <Textarea
                    value={editedMatch.notes || ''}
                    onChange={(e) => setEditedMatch({ ...editedMatch, notes: e.target.value })}
                    className="mt-2"
                    rows={3}
                    placeholder="Observaciones del partido..."
                  />
                ) : (
                  <p className="mt-2 text-sm">{match.notes || 'Sin observaciones'}</p>
                )}
              </div>
              <div className="stryk-card p-4">
                <Label className="text-sm text-muted-foreground">Notas Técnicas</Label>
                {isEditing ? (
                  <Textarea
                    value={editedMatch.technical_notes || ''}
                    onChange={(e) => setEditedMatch({ ...editedMatch, technical_notes: e.target.value })}
                    className="mt-2"
                    rows={3}
                    placeholder="Notas técnicas..."
                  />
                ) : (
                  <p className="mt-2 text-sm">{match.technical_notes || 'Sin notas técnicas'}</p>
                )}
              </div>
            </div>

            {/* Traceability */}
            <div className="stryk-card p-4 bg-muted/30">
              <h4 className="font-medium mb-3 text-sm text-muted-foreground">Trazabilidad</h4>
              <div className="flex flex-wrap gap-4 text-sm">
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

          <TabsContent value="players">
            {loadingPlayers ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : matchPlayers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No hay jugadores registrados para este partido</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Jugador</TableHead>
                      <TableHead>Posición</TableHead>
                      <TableHead className="text-center">Rendimiento</TableHead>
                      <TableHead className="text-center">Asistió</TableHead>
                      {isFutbol ? (
                        <>
                          <TableHead className="text-center">Goles</TableHead>
                          <TableHead className="text-center">Asistencias</TableHead>
                        </>
                      ) : (
                        <TableHead className="text-center">Puntos</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(isEditing ? editedPlayers : matchPlayers).map((mp) => (
                      <TableRow key={mp.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-1.5">
                            {match.mvp_player_id === mp.player_id && (
                              <Crown className="w-4 h-4 text-yellow-500 fill-yellow-400 flex-shrink-0" />
                            )}
                            {mp.player?.full_name}
                            {mp.is_guest && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground border-border ml-1">
                                INVITADO
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{mp.player?.position || '—'}</TableCell>
                        <TableCell className="text-center">
                          {mp.attended && mp.performance ? (
                            <PerformanceIndicator
                              status={mp.performance as PerformanceStatus}
                              onChange={() => {}}
                              disabled
                              size="sm"
                            />
                          ) : !mp.attended ? (
                            <div className="w-5 h-5 min-w-[20px] rounded-full bg-destructive ring-2 ring-destructive/30 mx-auto" />
                          ) : null}
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditing ? (
                            <Checkbox
                              checked={mp.attended}
                              onCheckedChange={(checked) => updatePlayerStat(mp.player_id, 'attended', !!checked)}
                            />
                          ) : (
                            <Badge variant={mp.attended ? 'default' : 'outline'}>
                              {mp.attended ? 'Sí' : 'No'}
                            </Badge>
                          )}
                        </TableCell>
                        {isFutbol ? (
                          <>
                            <TableCell className="text-center">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  min="0"
                                  value={mp.goals}
                                  onChange={(e) => updatePlayerStat(mp.player_id, 'goals', parseInt(e.target.value) || 0)}
                                  className="w-16 text-center"
                                />
                              ) : (
                                <span className={cn("font-medium", mp.goals > 0 && "text-success")}>{mp.goals}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  min="0"
                                  value={mp.assists}
                                  onChange={(e) => updatePlayerStat(mp.player_id, 'assists', parseInt(e.target.value) || 0)}
                                  className="w-16 text-center"
                                />
                              ) : (
                                <span className={cn("font-medium", mp.assists > 0 && "text-primary")}>{mp.assists}</span>
                              )}
                            </TableCell>
                          </>
                        ) : (
                          <TableCell className="text-center">
                            {isEditing ? (
                              <Input
                                type="number"
                                min="0"
                                value={mp.points}
                                onChange={(e) => updatePlayerStat(mp.player_id, 'points', parseInt(e.target.value) || 0)}
                                className="w-16 text-center"
                              />
                            ) : (
                              <span className="font-medium">{mp.points}</span>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="kpis">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="stryk-card p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Resultado</p>
                <Badge 
                  className={cn(
                    "text-lg px-4 py-1",
                    currentResult === 'victoria' && "bg-success/10 text-success",
                    currentResult === 'empate' && "bg-warning/10 text-warning",
                    currentResult === 'derrota' && "bg-destructive/10 text-destructive"
                  )}
                >
                  {currentResult === 'victoria' ? 'G' : currentResult === 'empate' ? 'E' : 'P'}
                </Badge>
              </div>
              <div className="stryk-card p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Goles/Puntos a Favor</p>
                <p className="text-2xl font-display font-bold text-success">{goalsFor}</p>
              </div>
              <div className="stryk-card p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Goles/Puntos en Contra</p>
                <p className="text-2xl font-display font-bold text-destructive">{goalsAgainst}</p>
              </div>
              <div className="stryk-card p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Diferencia</p>
                <p className={cn(
                  "text-2xl font-display font-bold",
                  difference > 0 && "text-success",
                  difference < 0 && "text-destructive",
                  difference === 0 && "text-warning"
                )}>
                  {difference > 0 ? '+' : ''}{difference}
                </p>
              </div>
            </div>

            {/* Player Stats Summary */}
            {matchPlayers.length > 0 && (
              <div className="mt-6 stryk-card p-4">
                <h4 className="font-medium mb-4">Estadísticas de Jugadores</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Asistencia</p>
                    <p className="text-xl font-bold">
                      {matchPlayers.filter(p => p.attended).length}/{matchPlayers.length}
                    </p>
                  </div>
                  {isFutbol ? (
                    <>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Total Goles</p>
                        <p className="text-xl font-bold text-success">
                          {matchPlayers.reduce((sum, p) => sum + (p.goals || 0), 0)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Total Asistencias</p>
                        <p className="text-xl font-bold text-primary">
                          {matchPlayers.reduce((sum, p) => sum + (p.assists || 0), 0)}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Puntos</p>
                      <p className="text-xl font-bold">
                        {matchPlayers.reduce((sum, p) => sum + (p.points || 0), 0)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
