import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Trophy, Users, MapPin, Calendar, ChevronRight, Check, X, UserPlus, Search } from 'lucide-react';
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle,
  DrawerFooter
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { TrainerCategory } from '@/hooks/useTrainerCategories';
import { useCreateMatch } from '@/hooks/useCreateMatch';
import { useMatchFields } from '@/hooks/useMatchFields';
import { usePlayers } from '@/hooks/usePlayers';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface CreateMatchFlowProps {
  isOpen: boolean;
  onClose: () => void;
  categories: TrainerCategory[];
}

interface PlayerAttendance {
  player_id: string;
  full_name: string;
  position: string | null;
  category_id: string | null;
  attended: boolean;
  is_guest: boolean;
}

type FlowStep = 'info' | 'attendance' | 'confirm';

export function CreateMatchFlow({ isOpen, onClose, categories }: CreateMatchFlowProps) {
  const { organization } = useAuth();
  const { createMatch } = useCreateMatch();
  const { fields, addField } = useMatchFields();
  const { players: categoryPlayers } = usePlayers();
  
  // Form state
  const [step, setStep] = useState<FlowStep>('info');
  const [categoryId, setCategoryId] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [matchDate, setMatchDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [rivalName, setRivalName] = useState('');
  const [matchType, setMatchType] = useState<'liga' | 'torneo' | 'amistoso'>('amistoso');
  
  // Attendance state - default ALL to ABSENT (ausente)
  const [playerAttendance, setPlayerAttendance] = useState<PlayerAttendance[]>([]);
  
  // Guest players from other categories
  const [showGuestSearch, setShowGuestSearch] = useState(false);
  const [guestSearch, setGuestSearch] = useState('');
  const [availableGuests, setAvailableGuests] = useState<PlayerAttendance[]>([]);

  // Get category info
  const selectedCategory = categories.find(c => c.id === categoryId);

  // Filter players by selected category
  const thisCategoryPlayers = categoryPlayers.filter(p => p.category_id === categoryId && p.is_active);

  // Initialize player attendance when category changes - ALL ABSENT by default
  useEffect(() => {
    if (categoryId && thisCategoryPlayers.length > 0) {
      setPlayerAttendance(thisCategoryPlayers.map(p => ({
        player_id: p.id,
        full_name: p.full_name,
        position: p.position,
        category_id: p.category_id,
        attended: false, // DEFAULT: AUSENTE
        is_guest: false,
      })));
    } else {
      setPlayerAttendance([]);
    }
  }, [categoryId, categoryPlayers.length]);

  // Set default field from category venue
  useEffect(() => {
    if (selectedCategory?.venue?.name) {
      setFieldName(selectedCategory.venue.name);
    }
  }, [selectedCategory]);

  // Load available guests (players from OTHER categories in same org)
  useEffect(() => {
    if (!organization?.id || !categoryId) return;

    const loadGuests = async () => {
      const { data, error } = await supabase
        .from('players')
        .select('id, full_name, position, category_id')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .neq('category_id', categoryId);

      if (!error && data) {
        setAvailableGuests(data.map(p => ({
          player_id: p.id,
          full_name: p.full_name,
          position: p.position,
          category_id: p.category_id,
          attended: false,
          is_guest: true,
        })));
      }
    };

    loadGuests();
  }, [organization?.id, categoryId]);

  const handleSubmit = () => {
    if (!categoryId || !rivalName.trim()) return;

    const matchNotes = fieldName 
      ? (fieldName ? `Campo: ${fieldName}` : '')
      : '';

    createMatch.mutate({
      category_id: categoryId,
      venue_id: selectedCategory?.venue_id || null,
      match_date: matchDate,
      rival_name: rivalName.trim(),
      match_type: matchType,
      status: 'programado', // Start as SCHEDULED, not finished
      goals_for: 0,
      goals_against: 0,
      notes: matchNotes || undefined,
      players: playerAttendance.map(p => ({
        player_id: p.player_id,
        attended: p.attended,
        goals: 0,
        assists: 0,
        points: 0,
        position: p.position,
        is_guest: p.is_guest,
      })),
    }, {
      onSuccess: () => {
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
    setPlayerAttendance([]);
    setStep('info');
    setShowGuestSearch(false);
    setGuestSearch('');
    onClose();
  };

  const toggleAttendance = (playerId: string) => {
    setPlayerAttendance(prev => 
      prev.map(p => p.player_id === playerId ? { ...p, attended: !p.attended } : p)
    );
  };

  const markAllPresent = () => {
    setPlayerAttendance(prev => prev.map(p => ({ ...p, attended: true })));
  };

  const addGuestPlayer = (guest: PlayerAttendance) => {
    if (!playerAttendance.find(p => p.player_id === guest.player_id)) {
      setPlayerAttendance(prev => [...prev, { ...guest, attended: true }]);
    }
    setShowGuestSearch(false);
    setGuestSearch('');
  };

  const removeGuestPlayer = (playerId: string) => {
    setPlayerAttendance(prev => prev.filter(p => p.player_id !== playerId));
  };

  const canProceed = categoryId && rivalName.trim();
  const attendingCount = playerAttendance.filter(p => p.attended).length;
  const guestCount = playerAttendance.filter(p => p.is_guest).length;

  const filteredGuests = availableGuests.filter(g => 
    g.full_name.toLowerCase().includes(guestSearch.toLowerCase()) &&
    !playerAttendance.find(p => p.player_id === g.player_id)
  );

  return (
    <Drawer open={isOpen} onOpenChange={() => handleClose()}>
      <DrawerContent className="max-h-[95dvh] flex flex-col overflow-hidden">
        <DrawerHeader className="border-b border-border pb-3 shrink-0">
          <DrawerTitle className="flex items-center gap-2 text-lg">
            <Trophy className="w-5 h-5 text-primary" />
            {step === 'info' && 'Crear Partido'}
            {step === 'attendance' && 'Pasar Lista'}
            {step === 'confirm' && 'Confirmar'}
          </DrawerTitle>
          
          {/* Step Indicator */}
          <div className="flex items-center gap-2 mt-3">
            <div className={cn(
              "flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium",
              step === 'info' ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"
            )}>
              1
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <div className={cn(
              "flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium",
              step === 'attendance' ? "bg-primary text-primary-foreground" : 
              step === 'confirm' ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            )}>
              2
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <div className={cn(
              "flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium",
              step === 'confirm' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              3
            </div>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
          {step === 'info' && (
            <div className="space-y-4">
              {/* Category Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Categoría *</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Selecciona categoría" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[50vh]">
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

              {/* Rival */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Rival *</Label>
                <Input
                  value={rivalName}
                  onChange={(e) => setRivalName(e.target.value)}
                  placeholder="Nombre del equipo rival"
                  className="h-12 text-base"
                  maxLength={100}
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
                  <Label className="text-sm font-medium">Fecha/Hora</Label>
                  <Input
                    type="datetime-local"
                    value={matchDate}
                    onChange={(e) => setMatchDate(e.target.value)}
                    className="h-12"
                  />
                </div>
              </div>

              {/* Field/Campo */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Campo de Juego</Label>
                <Input
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  placeholder="Ej: Juventud 2000, Cancha Norte..."
                  className="h-12 text-base"
                />
              </div>
            </div>
          )}

          {step === 'attendance' && (
            <div className="space-y-4">
              {/* Match Summary */}
              <div className="text-center pb-3 border-b border-border">
                <p className="font-medium">{selectedCategory?.name} vs {rivalName}</p>
                {fieldName && <p className="text-xs text-muted-foreground">{fieldName}</p>}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={markAllPresent}
                  className="flex-1 h-11"
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  Todos presentes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGuestSearch(!showGuestSearch)}
                  className="h-11 gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  Invitado
                </Button>
                <Badge variant="secondary" className="h-11 px-3 flex items-center font-medium">
                  {attendingCount}/{playerAttendance.length}
                </Badge>
              </div>

              {/* Guest Search */}
              {showGuestSearch && (
                <Card className="p-3 border-primary/30 bg-primary/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <Input
                      value={guestSearch}
                      onChange={(e) => setGuestSearch(e.target.value)}
                      placeholder="Buscar jugador de otra categoría..."
                      className="h-9 flex-1"
                      autoFocus
                    />
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowGuestSearch(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {filteredGuests.slice(0, 5).map(guest => (
                      <button
                        key={guest.player_id}
                        onClick={() => addGuestPlayer(guest)}
                        className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-primary/10 text-left"
                      >
                        <span className="flex-1 text-sm truncate">{guest.full_name}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">Invitado</Badge>
                      </button>
                    ))}
                    {filteredGuests.length === 0 && guestSearch && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        No se encontraron jugadores
                      </p>
                    )}
                  </div>
                </Card>
              )}

              {/* Players List - Fast Toggle UI */}
              <div className="space-y-2 max-h-[40vh] overflow-y-auto overflow-x-hidden">
                {playerAttendance.map((player) => (
                  <button
                    key={player.player_id}
                    onClick={() => toggleAttendance(player.player_id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border transition-all active:scale-[0.98]",
                      player.attended 
                        ? "bg-success/10 border-success/30" 
                        : "bg-card border-border"
                    )}
                  >
                    {/* Status Icon */}
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                      player.attended 
                        ? "bg-success text-success-foreground" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      {player.attended ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <X className="w-5 h-5" />
                      )}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-medium text-sm truncate">{player.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {player.position || 'Sin posición'}
                        {player.is_guest && ' • Invitado'}
                      </p>
                    </div>

                    {/* Guest badge & remove */}
                    {player.is_guest && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeGuestPlayer(player.player_id);
                        }}
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    )}
                  </button>
                ))}
              </div>

              {guestCount > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  {guestCount} jugador{guestCount > 1 ? 'es' : ''} invitado{guestCount > 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <Card className="p-4">
                <h4 className="font-medium mb-3">Resumen del Partido</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Categoría:</span>
                    <span className="font-medium">{selectedCategory?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rival:</span>
                    <span className="font-medium">{rivalName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo:</span>
                    <Badge variant="outline">{matchType === 'liga' ? 'Liga' : matchType === 'torneo' ? 'Torneo' : 'Amistoso'}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha:</span>
                    <span>{format(new Date(matchDate), 'dd/MM/yyyy HH:mm')}</span>
                  </div>
                  {fieldName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Campo:</span>
                      <span>{fieldName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Presentes:</span>
                    <Badge variant="secondary">{attendingCount}/{playerAttendance.length}</Badge>
                  </div>
                </div>
              </Card>

              <p className="text-sm text-muted-foreground text-center">
                El partido se creará como <strong>Programado</strong>. 
                Podrás cargar el resultado después del partido.
              </p>
            </div>
          )}
        </div>

        <DrawerFooter className="border-t border-border pt-3">
          <div className="flex gap-2 w-full">
            {step === 'info' ? (
              <>
                <Button variant="outline" onClick={handleClose} className="flex-1 h-12">
                  Cancelar
                </Button>
                <Button 
                  onClick={() => setStep('attendance')}
                  disabled={!canProceed || thisCategoryPlayers.length === 0}
                  className="flex-1 h-12 gap-2"
                >
                  <Users className="w-4 h-4" />
                  Siguiente
                </Button>
              </>
            ) : step === 'attendance' ? (
              <>
                <Button variant="outline" onClick={() => setStep('info')} className="h-12">
                  Atrás
                </Button>
                <Button 
                  onClick={() => setStep('confirm')}
                  className="flex-1 h-12 gap-2"
                >
                  Siguiente
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setStep('attendance')} className="h-12">
                  Atrás
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={createMatch.isPending}
                  className="flex-1 h-12 gap-2"
                >
                  <Trophy className="w-4 h-4" />
                  {createMatch.isPending ? 'Creando...' : 'Crear Partido'}
                </Button>
              </>
            )}
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
