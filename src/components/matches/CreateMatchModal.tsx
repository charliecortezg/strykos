import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Trophy, Users, MapPin, Calendar, Shield, Target, Plus, Minus, Check, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrainerCategory } from '@/hooks/useTrainerCategories';
import { useCreateMatch } from '@/hooks/useCreateMatch';
import { useVenues } from '@/hooks/useVenues';
import { usePlayers } from '@/hooks/usePlayers';
import { cn } from '@/lib/utils';

interface CreateMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: TrainerCategory[];
}

interface PlayerStats {
  player_id: string;
  full_name: string;
  position: string | null;
  attended: boolean;
  goals: number;
  assists: number;
  points: number;
}

export function CreateMatchModal({ isOpen, onClose, categories }: CreateMatchModalProps) {
  const { createMatch } = useCreateMatch();
  const { venues } = useVenues();
  const { players } = usePlayers();
  
  // Form state
  const [categoryId, setCategoryId] = useState('');
  const [venueId, setVenueId] = useState('');
  const [matchDate, setMatchDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [rivalName, setRivalName] = useState('');
  const [matchType, setMatchType] = useState<'liga' | 'torneo' | 'amistoso'>('amistoso');
  const [status, setStatus] = useState<'programado' | 'terminado'>('terminado');
  const [goalsFor, setGoalsFor] = useState(0);
  const [goalsAgainst, setGoalsAgainst] = useState(0);
  const [notes, setNotes] = useState('');
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [step, setStep] = useState<'info' | 'players'>('info');

  // Get category info
  const selectedCategory = categories.find(c => c.id === categoryId);
  const sportName = selectedCategory?.sport?.name?.toLowerCase() || '';
  const isFutbol = sportName.includes('fútbol') || sportName.includes('futbol') || sportName.includes('soccer');

  // Filter players by selected category
  const categoryPlayers = players.filter(p => p.category_id === categoryId && p.is_active);

  // Initialize player stats when category changes
  useEffect(() => {
    if (categoryId && categoryPlayers.length > 0) {
      setPlayerStats(categoryPlayers.map(p => ({
        player_id: p.id,
        full_name: p.full_name,
        position: p.position,
        attended: true,
        goals: 0,
        assists: 0,
        points: 0,
      })));
    } else {
      setPlayerStats([]);
    }
  }, [categoryId, players]);

  // Set default venue from category
  useEffect(() => {
    if (selectedCategory?.venue_id) {
      setVenueId(selectedCategory.venue_id);
    }
  }, [selectedCategory]);

  const handleSubmit = () => {
    if (!categoryId || !rivalName.trim()) return;

    createMatch.mutate({
      category_id: categoryId,
      venue_id: venueId || null,
      match_date: matchDate,
      rival_name: rivalName.trim(),
      match_type: matchType,
      status: status,
      goals_for: goalsFor,
      goals_against: goalsAgainst,
      notes: notes.trim() || undefined,
      players: playerStats.map(p => ({
        player_id: p.player_id,
        attended: p.attended,
        goals: p.goals,
        assists: p.assists,
        points: p.points,
      })),
    }, {
      onSuccess: () => {
        handleClose();
      },
    });
  };

  const handleClose = () => {
    setCategoryId('');
    setVenueId('');
    setMatchDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setRivalName('');
    setMatchType('amistoso');
    setStatus('terminado');
    setGoalsFor(0);
    setGoalsAgainst(0);
    setNotes('');
    setPlayerStats([]);
    setStep('info');
    onClose();
  };

  const updatePlayerStat = (playerId: string, field: keyof PlayerStats, value: boolean | number) => {
    setPlayerStats(prev => 
      prev.map(p => p.player_id === playerId ? { ...p, [field]: value } : p)
    );
  };

  const toggleAllAttendance = (attended: boolean) => {
    setPlayerStats(prev => prev.map(p => ({ ...p, attended })));
  };

  const activeVenues = venues.filter(v => v.is_active);
  const canProceed = categoryId && rivalName.trim();
  const attendingCount = playerStats.filter(p => p.attended).length;

  return (
    <Dialog open={isOpen} onOpenChange={() => handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <Trophy className="w-6 h-6 text-primary" />
            <span>Registrar Partido</span>
          </DialogTitle>
        </DialogHeader>

        {step === 'info' ? (
          <div className="space-y-6 mt-4">
            {/* Category Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                Categoría *
              </Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <span>{cat.name}</span>
                        {cat.sport?.name && (
                          <Badge variant="outline" className="text-xs">
                            {cat.sport.name}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Match Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Rival */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  Rival *
                </Label>
                <Input
                  value={rivalName}
                  onChange={(e) => setRivalName(e.target.value)}
                  placeholder="Nombre del equipo rival"
                  maxLength={100}
                />
              </div>

              {/* Match Type */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-muted-foreground" />
                  Tipo de Partido
                </Label>
                <Select value={matchType} onValueChange={(v) => setMatchType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="liga">Liga</SelectItem>
                    <SelectItem value="torneo">Torneo</SelectItem>
                    <SelectItem value="amistoso">Amistoso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  Fecha y Hora
                </Label>
                <Input
                  type="datetime-local"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                />
              </div>

              {/* Venue */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  Sede
                </Label>
                <Select value={venueId || 'none'} onValueChange={(v) => setVenueId(v === 'none' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona sede" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin sede</SelectItem>
                    {activeVenues.map((venue) => (
                      <SelectItem key={venue.id} value={venue.id}>
                        {venue.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Estado del Partido</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="terminado">Terminado</SelectItem>
                    <SelectItem value="programado">Programado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Score Section */}
            {status === 'terminado' && (
              <div className="stryk-card p-4 bg-muted/30">
                <Label className="flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-primary" />
                  Marcador Final
                </Label>
                <div className="flex items-center justify-center gap-8">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Nosotros</p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setGoalsFor(Math.max(0, goalsFor - 1))}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="text-3xl font-display font-bold w-12 text-center text-primary">
                        {goalsFor}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setGoalsFor(goalsFor + 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <span className="text-3xl text-muted-foreground font-light">—</span>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Rival</p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setGoalsAgainst(Math.max(0, goalsAgainst - 1))}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="text-3xl font-display font-bold w-12 text-center">
                        {goalsAgainst}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setGoalsAgainst(goalsAgainst + 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label>Observaciones (Opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas sobre el partido..."
                rows={2}
                maxLength={500}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                onClick={() => setStep('players')}
                disabled={!canProceed || categoryPlayers.length === 0}
                className="gap-2"
              >
                <Users className="w-4 h-4" />
                Continuar a Jugadores
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Asistencia y Estadísticas
                </h3>
                <p className="text-sm text-muted-foreground">
                  vs {rivalName} • {selectedCategory?.name}
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => toggleAllAttendance(true)}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Todos presentes
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => toggleAllAttendance(false)}
                >
                  <X className="w-4 h-4 mr-1" />
                  Ninguno
                </Button>
              </div>
            </div>

            {/* Attendance Badge */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                {attendingCount} de {playerStats.length} jugadores asistieron
              </Badge>
            </div>

            {/* Players Table */}
            {playerStats.length > 0 ? (
              <div className="rounded-lg border border-border overflow-hidden max-h-[40vh] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow className="bg-muted/50">
                      <TableHead>Jugador</TableHead>
                      <TableHead>Posición</TableHead>
                      <TableHead className="text-center w-24">Asistió</TableHead>
                      {isFutbol ? (
                        <>
                          <TableHead className="text-center w-20">Goles</TableHead>
                          <TableHead className="text-center w-20">Asist.</TableHead>
                        </>
                      ) : (
                        <TableHead className="text-center w-20">Puntos</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {playerStats.map((player) => (
                      <TableRow key={player.player_id} className={cn(!player.attended && "opacity-50")}>
                        <TableCell className="font-medium">{player.full_name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {player.position || '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={player.attended}
                            onCheckedChange={(checked) => updatePlayerStat(player.player_id, 'attended', !!checked)}
                          />
                        </TableCell>
                        {isFutbol ? (
                          <>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  disabled={!player.attended}
                                  onClick={() => updatePlayerStat(player.player_id, 'goals', Math.max(0, player.goals - 1))}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className={cn("w-6 text-center font-medium", player.goals > 0 && "text-success")}>
                                  {player.goals}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  disabled={!player.attended}
                                  onClick={() => updatePlayerStat(player.player_id, 'goals', player.goals + 1)}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  disabled={!player.attended}
                                  onClick={() => updatePlayerStat(player.player_id, 'assists', Math.max(0, player.assists - 1))}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className={cn("w-6 text-center font-medium", player.assists > 0 && "text-primary")}>
                                  {player.assists}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  disabled={!player.attended}
                                  onClick={() => updatePlayerStat(player.player_id, 'assists', player.assists + 1)}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </>
                        ) : (
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                disabled={!player.attended}
                                onClick={() => updatePlayerStat(player.player_id, 'points', Math.max(0, player.points - 1))}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-6 text-center font-medium">{player.points}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                disabled={!player.attended}
                                onClick={() => updatePlayerStat(player.player_id, 'points', player.points + 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay jugadores en esta categoría
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t border-border">
              <Button variant="ghost" onClick={() => setStep('info')}>
                ← Volver
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={createMatch.isPending}
                  className="gap-2"
                >
                  <Trophy className="w-4 h-4" />
                  {createMatch.isPending ? 'Guardando...' : 'Registrar Partido'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
