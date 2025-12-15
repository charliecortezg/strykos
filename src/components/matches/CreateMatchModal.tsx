import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Trophy, Users, MapPin, Calendar, Shield, Target, Plus, Minus, Check, X, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { TrainerCategory } from '@/hooks/useTrainerCategories';
import { useCreateMatch } from '@/hooks/useCreateMatch';
import { useMatchFields } from '@/hooks/useMatchFields';
import { usePlayers } from '@/hooks/usePlayers';
import { FieldSelector } from '@/components/ui/field-selector';
import { cn } from '@/lib/utils';

// Football positions
const FOOTBALL_POSITIONS = [
  { value: 'portero', label: 'Portero' },
  { value: 'defensa', label: 'Defensa' },
  { value: 'medio', label: 'Medio' },
  { value: 'delantero', label: 'Delantero' },
];

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
  const { fields, addField } = useMatchFields();
  const { players } = usePlayers();
  
  // Form state
  const [categoryId, setCategoryId] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [matchDate, setMatchDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [rivalName, setRivalName] = useState('');
  const [matchType, setMatchType] = useState<'liga' | 'torneo' | 'amistoso'>('amistoso');
  const [goalsFor, setGoalsFor] = useState(0);
  const [goalsAgainst, setGoalsAgainst] = useState(0);
  const [notes, setNotes] = useState('');
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [step, setStep] = useState<'info' | 'players'>('info');

  // Get category info
  const selectedCategory = categories.find(c => c.id === categoryId);
  const sportName = selectedCategory?.sport?.name?.toLowerCase() || '';
  const isFutbol = sportName.includes('fútbol') || sportName.includes('futbol') || sportName.includes('soccer') || sportName.includes('football');

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

  // Set default field from category venue
  useEffect(() => {
    if (selectedCategory?.venue?.name) {
      setFieldName(selectedCategory.venue.name);
    }
  }, [selectedCategory]);

  const handleSubmit = () => {
    if (!categoryId || !rivalName.trim()) return;

    // Store field name with match notes
    const matchNotes = fieldName 
      ? (notes.trim() ? `Campo: ${fieldName}\n${notes.trim()}` : `Campo: ${fieldName}`)
      : notes.trim();

    createMatch.mutate({
      category_id: categoryId,
      venue_id: selectedCategory?.venue_id || null,
      match_date: matchDate,
      rival_name: rivalName.trim(),
      match_type: matchType,
      status: 'terminado',
      goals_for: goalsFor,
      goals_against: goalsAgainst,
      notes: matchNotes || undefined,
      players: playerStats.map(p => ({
        player_id: p.player_id,
        attended: p.attended,
        goals: p.goals,
        assists: p.assists,
        points: p.points,
        position: p.position,
      })),
    }, {
      onSuccess: () => {
        // Save the field for future use
        if (fieldName) addField(fieldName);
        handleClose();
      },
    });
  };

  const handleClose = () => {
    setCategoryId('');
    setFieldName('');
    setMatchDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setRivalName('');
    setMatchType('amistoso');
    setGoalsFor(0);
    setGoalsAgainst(0);
    setNotes('');
    setPlayerStats([]);
    setStep('info');
    onClose();
  };

  const updatePlayerStat = (playerId: string, field: keyof PlayerStats, value: boolean | number | string) => {
    setPlayerStats(prev => 
      prev.map(p => p.player_id === playerId ? { ...p, [field]: value } : p)
    );
  };

  const toggleAllAttendance = (attended: boolean) => {
    setPlayerStats(prev => prev.map(p => ({ ...p, attended })));
  };

  const canProceed = categoryId && rivalName.trim();
  const attendingCount = playerStats.filter(p => p.attended).length;

  return (
    <Dialog open={isOpen} onOpenChange={() => handleClose()}>
      <DialogContent className="max-w-lg max-h-[95vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Trophy className="w-5 h-5 text-primary" />
            {step === 'info' ? 'Registrar Partido' : 'Asistencia y Stats'}
          </DialogTitle>
        </DialogHeader>

        {step === 'info' ? (
          <div className="space-y-4 mt-3">
            {/* Category Selection - Large touch target */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Categoría *</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Selecciona categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="py-3">
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

            {/* Rival - Most important field */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                Rival *
              </Label>
              <Input
                value={rivalName}
                onChange={(e) => setRivalName(e.target.value)}
                placeholder="Nombre del equipo rival"
                className="h-12 text-base"
                maxLength={100}
              />
            </div>

            {/* Field/Campo Selection - Search + Create */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                Campo de Juego
              </Label>
              <FieldSelector
                value={fieldName}
                onChange={setFieldName}
                fields={fields}
                onAddField={addField}
                placeholder="Ej: Juventud 2000, Cancha Norte..."
              />
            </div>

            {/* Match Type & Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tipo</Label>
                <Select value={matchType} onValueChange={(v) => setMatchType(v as any)}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amistoso" className="py-3">Amistoso</SelectItem>
                    <SelectItem value="liga" className="py-3">Liga</SelectItem>
                    <SelectItem value="torneo" className="py-3">Torneo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  Fecha
                </Label>
                <Input
                  type="datetime-local"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  className="h-12"
                />
              </div>
            </div>

            {/* Score Section - Large buttons for field use */}
            <Card className="p-4 bg-muted/30">
              <Label className="flex items-center gap-2 mb-4 text-sm font-medium">
                <Target className="w-4 h-4 text-primary" />
                Marcador Final
              </Label>
              <div className="flex items-center justify-center gap-4 sm:gap-6">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">Nosotros</p>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-12 w-12"
                      onClick={() => setGoalsFor(Math.max(0, goalsFor - 1))}
                    >
                      <Minus className="w-5 h-5" />
                    </Button>
                    <span className="text-4xl font-display font-bold w-14 text-center text-primary">
                      {goalsFor}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-12 w-12"
                      onClick={() => setGoalsFor(goalsFor + 1)}
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
                <span className="text-3xl text-muted-foreground font-light">—</span>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">Rival</p>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-12 w-12"
                      onClick={() => setGoalsAgainst(Math.max(0, goalsAgainst - 1))}
                    >
                      <Minus className="w-5 h-5" />
                    </Button>
                    <span className="text-4xl font-display font-bold w-14 text-center">
                      {goalsAgainst}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-12 w-12"
                      onClick={() => setGoalsAgainst(goalsAgainst + 1)}
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Notas (Opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones del partido..."
                rows={2}
                maxLength={500}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-3 border-t border-border">
              <Button variant="outline" onClick={handleClose} className="flex-1 h-12">
                Cancelar
              </Button>
              <Button 
                onClick={() => setStep('players')}
                disabled={!canProceed || categoryPlayers.length === 0}
                className="flex-1 h-12 gap-2"
              >
                <Users className="w-4 h-4" />
                Asistencia
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mt-3">
            {/* Match Summary */}
            <div className="flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">{selectedCategory?.name} vs {rivalName}</p>
                {fieldName && <p className="text-xs text-muted-foreground">{fieldName}</p>}
              </div>
              <Badge variant={goalsFor > goalsAgainst ? 'default' : goalsFor < goalsAgainst ? 'destructive' : 'secondary'}>
                {goalsFor} - {goalsAgainst}
              </Badge>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => toggleAllAttendance(true)}
                className="flex-1 h-10"
              >
                <Check className="w-4 h-4 mr-1" />
                Todos
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => toggleAllAttendance(false)}
                className="flex-1 h-10"
              >
                <X className="w-4 h-4 mr-1" />
                Ninguno
              </Button>
              <Badge variant="secondary" className="h-10 px-3 flex items-center">
                {attendingCount}/{playerStats.length}
              </Badge>
            </div>

            {/* Players List - Mobile optimized cards */}
            <div className="space-y-2 max-h-[45vh] overflow-y-auto">
              {playerStats.map((player) => (
                <Card 
                  key={player.player_id} 
                  className={cn(
                    "p-3 transition-opacity",
                    !player.attended && "opacity-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Attendance Checkbox */}
                    <Checkbox
                      checked={player.attended}
                      onCheckedChange={(checked) => updatePlayerStat(player.player_id, 'attended', !!checked)}
                      className="h-6 w-6"
                    />
                    
                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{player.full_name}</p>
                      {/* Position selector for football */}
                      {isFutbol ? (
                        <Select
                          value={player.position || ''}
                          onValueChange={(v) => updatePlayerStat(player.player_id, 'position', v)}
                        >
                          <SelectTrigger className="h-7 w-28 text-xs mt-1">
                            <SelectValue placeholder="Posición" />
                          </SelectTrigger>
                          <SelectContent>
                            {FOOTBALL_POSITIONS.map((pos) => (
                              <SelectItem key={pos.value} value={pos.value} className="text-xs py-2">
                                {pos.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {player.position || 'Sin posición'}
                        </p>
                      )}
                    </div>

                    {/* Stats - Compact for mobile */}
                    {player.attended && (
                      <div className="flex items-center gap-2">
                        {isFutbol ? (
                          <>
                            {/* Goals */}
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updatePlayerStat(player.player_id, 'goals', Math.max(0, player.goals - 1))}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className={cn(
                                "w-5 text-center text-sm font-medium",
                                player.goals > 0 && "text-success"
                              )}>
                                {player.goals}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updatePlayerStat(player.player_id, 'goals', player.goals + 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                            <span className="text-[10px] text-muted-foreground">G</span>
                            
                            {/* Assists */}
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updatePlayerStat(player.player_id, 'assists', Math.max(0, player.assists - 1))}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className={cn(
                                "w-5 text-center text-sm font-medium",
                                player.assists > 0 && "text-primary"
                              )}>
                                {player.assists}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updatePlayerStat(player.player_id, 'assists', player.assists + 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                            <span className="text-[10px] text-muted-foreground">A</span>
                          </>
                        ) : (
                          <>
                            {/* Points for other sports */}
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updatePlayerStat(player.player_id, 'points', Math.max(0, player.points - 1))}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className={cn(
                                "w-5 text-center text-sm font-medium",
                                player.points > 0 && "text-primary"
                              )}>
                                {player.points}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updatePlayerStat(player.player_id, 'points', player.points + 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                            <span className="text-[10px] text-muted-foreground">Pts</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-3 border-t border-border sticky bottom-0 bg-background">
              <Button variant="outline" onClick={() => setStep('info')} className="h-12">
                Atrás
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createMatch.isPending}
                className="flex-1 h-12 gap-2"
              >
                <Save className="w-4 h-4" />
                {createMatch.isPending ? 'Guardando...' : 'Guardar Partido'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
