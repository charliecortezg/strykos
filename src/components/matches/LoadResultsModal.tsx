import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Trophy, Target, Save, Camera, FileText, Plus, Minus, Check, Upload, X, ImageIcon, Crown, ChevronDown } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Match, MatchPlayer, MatchPerformance, getMatchResult, importanceIcons, importanceLabels } from '@/types/matches';
import { PerformanceIndicator, PerformanceStats } from '@/components/attendance/PerformanceIndicator';
import type { PerformanceStatus } from '@/components/attendance/PerformanceIndicator';
import { useMatchPlayers } from '@/hooks/useMatches';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LoadResultsModalProps {
  match: Match | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (matchId: string, updates: Partial<Match>, userId: string) => void;
  onUpdatePlayers: (players: Partial<MatchPlayer>[]) => void;
}

export function LoadResultsModal({ 
  match, 
  isOpen, 
  onClose, 
  onUpdate,
  onUpdatePlayers
}: LoadResultsModalProps) {
  const { user, organization } = useAuth();
  const { matchPlayers, isLoading: loadingPlayers } = useMatchPlayers(match?.id || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Result state
  const [goalsFor, setGoalsFor] = useState(0);
  const [goalsAgainst, setGoalsAgainst] = useState(0);
  const [notes, setNotes] = useState('');
  const [technicalNotes, setTechnicalNotes] = useState('');
  
  // Player stats state
  const [playerStats, setPlayerStats] = useState<MatchPlayer[]>([]);
  
  // MVP + Performance state
  const [mvpPlayerId, setMvpPlayerId] = useState<string | null>(null);

  // Evidence state
  const [uploadedImages, setUploadedImages] = useState<{ url: string; name: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const sportName = match?.category?.sports?.name?.toLowerCase() || 'fútbol';
  const isFutbol = sportName.includes('fútbol') || sportName.includes('futbol') || sportName.includes('soccer');

  // Initialize state from match
  useEffect(() => {
    if (match) {
      setGoalsFor(match.goals_for);
      setGoalsAgainst(match.goals_against);
      setNotes(match.notes || '');
      setTechnicalNotes(match.technical_notes || '');
      setMvpPlayerId(match.mvp_player_id || null);
    }
  }, [match]);

  // Initialize player stats from matchPlayers
  useEffect(() => {
    setPlayerStats(matchPlayers);
  }, [matchPlayers]);

  // Auto-calculate goals from player stats
  const calculateTotalGoals = () => {
    return playerStats.reduce((sum, p) => sum + (p.goals || 0), 0);
  };

  const calculateTotalAssists = () => {
    return playerStats.reduce((sum, p) => sum + (p.assists || 0), 0);
  };

  const calculateTotalPoints = () => {
    return playerStats.reduce((sum, p) => sum + (p.points || 0), 0);
  };

  // Sync goals with player stats
  useEffect(() => {
    if (isFutbol && playerStats.length > 0) {
      const calculatedGoals = calculateTotalGoals();
      if (calculatedGoals !== goalsFor) {
        setGoalsFor(calculatedGoals);
      }
    }
  }, [playerStats, isFutbol]);

  const updatePlayerStat = (playerId: string, field: keyof MatchPlayer, value: number) => {
    setPlayerStats(prev => 
      prev.map(p => p.player_id === playerId ? { ...p, [field]: value } : p)
    );
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !organization?.id || !match?.id) return;

    setIsUploading(true);
    
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${organization.id}/${match.id}/${Date.now()}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('match-evidence')
          .upload(fileName, file, { upsert: false });

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('match-evidence')
          .getPublicUrl(fileName);

        // Save to match_media table
        await supabase.from('match_media').insert({
          organization_id: organization.id,
          match_id: match.id,
          storage_path: fileName,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          created_by: user?.id,
        });

        setUploadedImages(prev => [...prev, { url: urlData.publicUrl, name: file.name }]);
      }
      toast.success('Evidencia subida correctamente');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error al subir evidencia');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!match || !user?.id) return;

    // Validation: At least one player must be present
    const presentPlayers = playerStats.filter(p => p.attended);
    if (presentPlayers.length === 0) {
      toast.error('Marca al menos un jugador como presente');
      return;
    }

    // Validation: Score must be defined (both >= 0)
    if (goalsFor < 0 || goalsAgainst < 0) {
      toast.error('El marcador no puede ser negativo');
      return;
    }

    setIsSaving(true);
    
    try {
      // Update match with result
      onUpdate(match.id, {
        goals_for: goalsFor,
        goals_against: goalsAgainst,
        notes: notes,
        technical_notes: technicalNotes,
        mvp_player_id: mvpPlayerId,
        status: 'terminado', // Mark as finished
      } as any, user.id);

      // Update player stats
      if (playerStats.length > 0) {
        onUpdatePlayers(playerStats);
      }

      toast.success('Resultado guardado correctamente');
      onClose();
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  if (!match) return null;

  const result = getMatchResult(goalsFor, goalsAgainst);
  const attendingPlayers = playerStats.filter(p => p.attended);
  const absentPlayers = playerStats.filter(p => !p.attended);

  // Performance stats for header
  const perfCounts = {
    outstanding: attendingPlayers.filter(p => (p.performance || 'excellent') === 'outstanding').length,
    excellent: attendingPlayers.filter(p => (p.performance || 'excellent') === 'excellent').length,
    focus: attendingPlayers.filter(p => (p.performance || 'excellent') === 'focus').length,
    challenge: absentPlayers.length,
  };

  const handleToggleMvp = (playerId: string) => {
    setMvpPlayerId(prev => prev === playerId ? null : playerId);
  };

  const handlePerformanceChange = (playerId: string, status: PerformanceStatus) => {
    // Map attendance PerformanceStatus to match PerformanceStatus (exclude 'challenge')
    const matchPerf: MatchPerformance = status === 'challenge' ? 'focus' : status;
    setPlayerStats(prev =>
      prev.map(p => p.player_id === playerId ? { ...p, performance: matchPerf } : p)
    );
  };
  return (
    <Drawer open={isOpen} onOpenChange={() => onClose()}>
      <DrawerContent className="max-h-[95vh]">
        <DrawerHeader className="border-b border-border pb-3">
          <DrawerTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-primary" />
            Cargar Resultado
          </DrawerTitle>
          <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
            <span>{match.category?.name} vs {match.rival_name}</span>
            {match.importance && match.importance !== 'regular' && (
              <Badge variant="outline" className="text-[10px] gap-0.5 bg-warning/10 text-warning border-warning/20">
                {importanceIcons[match.importance]} {importanceLabels[match.importance]}
              </Badge>
            )}
            <span className="mx-1">•</span>
            <span>{format(new Date(match.match_date), "dd MMM yyyy", { locale: es })}</span>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4">
          <Tabs defaultValue="result" className="w-full">
            <TabsList className="w-full grid grid-cols-3 mt-3">
              <TabsTrigger value="result" className="gap-1.5 text-xs">
                <Trophy className="w-4 h-4" />
                Marcador
              </TabsTrigger>
              <TabsTrigger value="stats" className="gap-1.5 text-xs">
                <Target className="w-4 h-4" />
                Stats
              </TabsTrigger>
              <TabsTrigger value="notes" className="gap-1.5 text-xs">
                <FileText className="w-4 h-4" />
                Notas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="result" className="py-4 space-y-4">
              {/* Score Display */}
              <Card className={cn(
                "p-6 text-center",
                result === 'victoria' && "bg-success/5 border-success/30",
                result === 'empate' && "bg-warning/5 border-warning/30",
                result === 'derrota' && "bg-destructive/5 border-destructive/30"
              )}>
                <Badge 
                  className={cn(
                    "mb-4",
                    result === 'victoria' && "bg-success text-success-foreground",
                    result === 'empate' && "bg-warning text-warning-foreground",
                    result === 'derrota' && "bg-destructive text-destructive-foreground"
                  )}
                >
                  {result === 'victoria' ? 'Victoria' : result === 'empate' ? 'Empate' : 'Derrota'}
                </Badge>

                <div className="flex items-center justify-center gap-3 sm:gap-6">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-2">Nosotros</p>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 sm:h-10 sm:w-10"
                        onClick={() => setGoalsFor(Math.max(0, goalsFor - 1))}
                        disabled={isFutbol} // Disabled if auto-calculated
                      >
                        <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                      <span className="text-3xl sm:text-4xl font-display font-bold w-10 sm:w-14 text-center text-primary">
                        {goalsFor}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 sm:h-10 sm:w-10"
                        onClick={() => setGoalsFor(goalsFor + 1)}
                        disabled={isFutbol}
                      >
                        <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <span className="text-xl sm:text-2xl text-muted-foreground font-light">—</span>
                  
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-2">Rival</p>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 sm:h-10 sm:w-10"
                        onClick={() => setGoalsAgainst(Math.max(0, goalsAgainst - 1))}
                      >
                        <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                      <span className="text-3xl sm:text-4xl font-display font-bold w-10 sm:w-14 text-center">
                        {goalsAgainst}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 sm:h-10 sm:w-10"
                        onClick={() => setGoalsAgainst(goalsAgainst + 1)}
                      >
                        <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {isFutbol && (
                  <p className="text-xs text-muted-foreground mt-4">
                    * Goles a favor se calculan automáticamente desde las estadísticas individuales
                  </p>
                )}
              </Card>

              {/* Quick Stats Summary */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Presentes</p>
                  <p className="text-xl font-bold">{attendingPlayers.length}</p>
                </Card>
                <Card className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">{isFutbol ? 'Goles' : 'Puntos'}</p>
                  <p className="text-xl font-bold text-success">
                    {isFutbol ? calculateTotalGoals() : calculateTotalPoints()}
                  </p>
                </Card>
                {isFutbol && (
                  <Card className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Asistencias</p>
                    <p className="text-xl font-bold text-primary">{calculateTotalAssists()}</p>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="stats" className="py-4 space-y-3">
              {loadingPlayers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : attendingPlayers.length === 0 && absentPlayers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay jugadores registrados en este partido
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Header hint + performance stats */}
                  {attendingPlayers.length > 0 && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        👑 Toca corona para MVP · Semáforo: rendimiento
                      </p>
                      <PerformanceStats {...perfCounts} />
                    </div>
                  )}

                  {/* Present players */}
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                    {attendingPlayers.map((player) => (
                      <Card key={player.id} className={cn(
                        "p-3",
                        mvpPlayerId === player.player_id && "ring-2 ring-yellow-400/50 bg-yellow-50/30 dark:bg-yellow-900/10"
                      )}>
                        <div className="flex items-center gap-2">
                          {/* MVP Crown */}
                          <button
                            type="button"
                            onClick={() => handleToggleMvp(player.player_id)}
                            className={cn(
                              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90",
                              mvpPlayerId === player.player_id
                                ? "bg-yellow-400/20 text-yellow-500"
                                : "text-muted-foreground/30 hover:text-muted-foreground/60"
                            )}
                            aria-label={mvpPlayerId === player.player_id ? 'Quitar MVP' : 'Marcar como MVP'}
                          >
                            <Crown className={cn(
                              "w-4 h-4",
                              mvpPlayerId === player.player_id && "fill-yellow-400"
                            )} />
                          </button>

                          {/* Performance Semaphore */}
                          <PerformanceIndicator
                            status={(player.performance || 'excellent') as PerformanceStatus}
                            onChange={(status) => handlePerformanceChange(player.player_id, status)}
                            size="sm"
                          />

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{player.player?.full_name}</p>
                            <p className="text-xs text-muted-foreground">{player.player?.position || 'Sin posición'}</p>
                          </div>

                          {isFutbol ? (
                            <div className="flex items-center gap-3">
                              {/* Goals */}
                              <div className="flex items-center gap-0.5">
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => updatePlayerStat(player.player_id, 'goals', Math.max(0, (player.goals || 0) - 1))}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <div className="text-center w-5">
                                  <span className={cn("font-medium text-sm", (player.goals || 0) > 0 && "text-success")}>
                                    {player.goals || 0}
                                  </span>
                                  <p className="text-[8px] text-muted-foreground">G</p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => updatePlayerStat(player.player_id, 'goals', (player.goals || 0) + 1)}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                              
                              {/* Assists */}
                              <div className="flex items-center gap-0.5">
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => updatePlayerStat(player.player_id, 'assists', Math.max(0, (player.assists || 0) - 1))}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <div className="text-center w-5">
                                  <span className={cn("font-medium text-sm", (player.assists || 0) > 0 && "text-primary")}>
                                    {player.assists || 0}
                                  </span>
                                  <p className="text-[8px] text-muted-foreground">A</p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => updatePlayerStat(player.player_id, 'assists', (player.assists || 0) + 1)}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-0.5">
                              <Button variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => updatePlayerStat(player.player_id, 'points', Math.max(0, (player.points || 0) - 1))}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <div className="text-center w-7">
                                <span className="font-medium text-sm">{player.points || 0}</span>
                                <p className="text-[8px] text-muted-foreground">Pts</p>
                              </div>
                              <Button variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => updatePlayerStat(player.player_id, 'points', (player.points || 0) + 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Absent players - collapsible */}
                {absentPlayers.length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-2">
                      <ChevronDown className="w-3 h-3" />
                      <span>Ausentes ({absentPlayers.length})</span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1.5 mt-1">
                      {absentPlayers.map((player) => (
                        <Card key={player.id} className="p-2.5 opacity-60">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 min-w-[20px] rounded-full bg-destructive ring-2 ring-destructive/30 flex-shrink-0" />
                            <p className="font-medium text-sm truncate flex-1">{player.player?.full_name}</p>
                            <span className="text-xs text-muted-foreground">Ausente</span>
                          </div>
                        </Card>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="py-4 space-y-4">
              {/* Technical Notes */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Notas Técnicas</Label>
                <Textarea
                  value={technicalNotes}
                  onChange={(e) => setTechnicalNotes(e.target.value)}
                  placeholder="Análisis táctico, rendimiento del equipo..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* General Notes */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Observaciones</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Comentarios generales..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Evidence Upload */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Evidencia (Fotos)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full h-12 gap-2"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      Subir Fotos
                    </>
                  )}
                </Button>

                {/* Uploaded Images Preview */}
                {uploadedImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {uploadedImages.map((img, idx) => (
                      <div key={idx} className="relative">
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground"
                          onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DrawerFooter className="border-t border-border pt-3">
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={onClose} className="h-12">
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 h-12 gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Guardando...' : 'Guardar Resultado'}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
