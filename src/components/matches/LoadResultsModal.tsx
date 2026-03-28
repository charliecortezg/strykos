import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Trophy, Target, Save, Camera, FileText, Plus, Minus, Check, X, ImageIcon, Crown, ChevronDown, CheckCheck, Users, Search, UserPlus, AlertTriangle } from 'lucide-react';
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle,
  DrawerFooter
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Match, MatchPlayer, MatchPerformance, getMatchResult, importanceIcons, importanceLabels } from '@/types/matches';
import { PerformanceIndicator, PerformanceStats } from '@/components/attendance/PerformanceIndicator';
import type { PerformanceStatus } from '@/components/attendance/PerformanceIndicator';
import { useMatchPlayers } from '@/hooks/useMatches';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LoadResultsModalProps {
  match: Match | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (matchId: string, updates: Partial<Match>, userId: string) => void;
  onUpdatePlayers: (players: Partial<MatchPlayer>[]) => void;
}

interface LocalPlayerAttendance {
  player_id: string;
  full_name: string;
  position: string | null;
  payment_status: string;
  attended: boolean;
  performance: MatchPerformance | null;
  goals: number;
  assists: number;
  points: number;
  absence_reason: string;
  is_guest?: boolean;
  category_name?: string;
}

const ABSENCE_REASONS = [
  { value: 'injustificada', label: 'Injustificada' },
  { value: 'justificada', label: 'Justificada' },
  { value: 'enfermedad', label: 'Enfermedad / Lesión' },
];

export function LoadResultsModal({ 
  match, 
  isOpen, 
  onClose, 
  onUpdate,
  onUpdatePlayers
}: LoadResultsModalProps) {
  const { user, organization } = useAuth();
  const { matchPlayers, isLoading: loadingPlayers, createMatchPlayers, updateMatchPlayers } = useMatchPlayers(match?.id || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Result state
  const [goalsFor, setGoalsFor] = useState(0);
  const [goalsAgainst, setGoalsAgainst] = useState(0);
  const [notes, setNotes] = useState('');
  const [technicalNotes, setTechnicalNotes] = useState('');
  
  // Local attendance state (used when no match_players exist yet)
  const [localAttendance, setLocalAttendance] = useState<LocalPlayerAttendance[]>([]);
  
  // Guest players state
  const [guestPlayers, setGuestPlayers] = useState<LocalPlayerAttendance[]>([]);
  const [guestSearch, setGuestSearch] = useState('');
  const [guestSearchResults, setGuestSearchResults] = useState<any[]>([]);
  const [showGuestSearch, setShowGuestSearch] = useState(false);
  const guestSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // Player stats state (derived from matchPlayers or localAttendance)
  const [playerStats, setPlayerStats] = useState<MatchPlayer[]>([]);
  
  // MVP + Performance state
  const [mvpPlayerId, setMvpPlayerId] = useState<string | null>(null);

  // Evidence state
  const [uploadedImages, setUploadedImages] = useState<{ url: string; name: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Unsaved changes protection
  const [isDirty, setIsDirty] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const sportName = match?.category?.sports?.name?.toLowerCase() || 'fútbol';
  const isFutbol = sportName.includes('fútbol') || sportName.includes('futbol') || sportName.includes('soccer');

  const hasExistingPlayers = matchPlayers.length > 0;

  // Fetch category players when no match_players exist
  const { data: categoryPlayers = [], isLoading: loadingCategoryPlayers } = useQuery({
    queryKey: ['category-players-for-match', match?.category_id, organization?.id],
    queryFn: async () => {
      if (!match?.category_id || !organization?.id) return [];
      const { data, error } = await supabase
        .from('players')
        .select('id, full_name, position, payment_status')
        .eq('organization_id', organization.id)
        .eq('category_id', match.category_id)
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!match?.category_id && !!organization?.id && !hasExistingPlayers && isOpen,
  });

  // Guest player search with debounce
  const searchGuestPlayers = useCallback(async (query: string) => {
    if (!query.trim() || !organization?.id || !match?.category_id) {
      setGuestSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, full_name, position, category_id, category:categories(name)')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .neq('category_id', match.category_id)
        .ilike('full_name', `%${query}%`)
        .limit(10);
      if (error) throw error;
      setGuestSearchResults(data || []);
    } catch {
      setGuestSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [organization?.id, match?.category_id]);

  useEffect(() => {
    if (guestSearchTimeoutRef.current) clearTimeout(guestSearchTimeoutRef.current);
    if (!guestSearch.trim()) {
      setGuestSearchResults([]);
      return;
    }
    guestSearchTimeoutRef.current = setTimeout(() => {
      searchGuestPlayers(guestSearch);
    }, 300);
    return () => {
      if (guestSearchTimeoutRef.current) clearTimeout(guestSearchTimeoutRef.current);
    };
  }, [guestSearch, searchGuestPlayers]);

  // Initialize state from match
  useEffect(() => {
    if (match) {
      setGoalsFor(match.goals_for);
      setGoalsAgainst(match.goals_against);
      setNotes(match.notes || '');
      setTechnicalNotes(match.technical_notes || '');
      setMvpPlayerId(match.mvp_player_id || null);
      setIsDirty(false);
    }
  }, [match]);

  // Initialize player stats from matchPlayers (when they exist)
  useEffect(() => {
    if (hasExistingPlayers) {
      setPlayerStats(matchPlayers);
    }
  }, [matchPlayers, hasExistingPlayers]);

  // Initialize local attendance from category players (when no match_players)
  useEffect(() => {
    if (!hasExistingPlayers && categoryPlayers.length > 0 && localAttendance.length === 0) {
      setLocalAttendance(categoryPlayers.map(p => ({
        player_id: p.id,
        full_name: p.full_name,
        position: p.position,
        payment_status: p.payment_status || 'pendiente',
        attended: false,
        performance: null,
        goals: 0,
        assists: 0,
        points: 0,
        absence_reason: 'injustificada',
        is_guest: false,
      })));
    }
  }, [categoryPlayers, hasExistingPlayers, localAttendance.length]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setLocalAttendance([]);
      setGuestPlayers([]);
      setGuestSearch('');
      setGuestSearchResults([]);
      setShowGuestSearch(false);
      setIsDirty(false);
      setShowExitConfirm(false);
    }
  }, [isOpen]);

  // Combined list for stats calculations
  const allLocalPlayers = useMemo(() => {
    return [...localAttendance, ...guestPlayers];
  }, [localAttendance, guestPlayers]);

  // Derive attending/absent from the right source
  const attendingPlayers = useMemo(() => {
    if (hasExistingPlayers) {
      return playerStats.filter(p => p.attended);
    }
    return allLocalPlayers.filter(p => p.attended);
  }, [hasExistingPlayers, playerStats, allLocalPlayers]);

  const absentPlayers = useMemo(() => {
    if (hasExistingPlayers) {
      return playerStats.filter(p => !p.attended);
    }
    return allLocalPlayers.filter(p => !p.attended);
  }, [hasExistingPlayers, playerStats, allLocalPlayers]);

  // Attendance stats (includes guests)
  const attendanceStats = useMemo(() => {
    const source = hasExistingPlayers ? playerStats : allLocalPlayers;
    const present = source.filter(p => p.attended);
    return {
      total: source.length,
      present: present.length,
      absent: source.filter(p => !p.attended).length,
    };
  }, [hasExistingPlayers, playerStats, allLocalPlayers]);

  // Auto-calculate goals from player stats
  const calculateTotalGoals = () => {
    if (hasExistingPlayers) {
      return playerStats.reduce((sum, p) => sum + (p.goals || 0), 0);
    }
    return allLocalPlayers.filter(p => p.attended).reduce((sum, p) => sum + p.goals, 0);
  };

  const calculateTotalAssists = () => {
    if (hasExistingPlayers) {
      return playerStats.reduce((sum, p) => sum + (p.assists || 0), 0);
    }
    return allLocalPlayers.filter(p => p.attended).reduce((sum, p) => sum + p.assists, 0);
  };

  const calculateTotalPoints = () => {
    if (hasExistingPlayers) {
      return playerStats.reduce((sum, p) => sum + (p.points || 0), 0);
    }
    return allLocalPlayers.filter(p => p.attended).reduce((sum, p) => sum + p.points, 0);
  };

  // Sync goals with player stats
  useEffect(() => {
    if (isFutbol) {
      const source = hasExistingPlayers ? playerStats : allLocalPlayers.filter(p => p.attended);
      if (source.length > 0) {
        const calculatedGoals = source.reduce((sum, p) => sum + (p.goals || 0), 0);
        if (calculatedGoals !== goalsFor) {
          setGoalsFor(calculatedGoals);
        }
      }
    }
  }, [playerStats, allLocalPlayers, isFutbol, hasExistingPlayers]);

  // --- Attendance handlers ---
  const toggleAttendance = (playerId: string, attended: boolean) => {
    // Check if it's a guest player
    const isGuest = guestPlayers.some(g => g.player_id === playerId);
    const setter = isGuest ? setGuestPlayers : setLocalAttendance;
    
    setter(prev =>
      prev.map(p => {
        if (p.player_id === playerId) {
          return {
            ...p,
            attended,
            performance: attended ? 'excellent' : null,
            goals: attended ? p.goals : 0,
            assists: attended ? p.assists : 0,
            points: attended ? p.points : 0,
            absence_reason: attended ? '' : 'injustificada',
          };
        }
        return p;
      })
    );
    setIsDirty(true);
  };

  const markAllPresent = () => {
    setLocalAttendance(prev =>
      prev.map(p => ({
        ...p,
        attended: true,
        performance: 'excellent' as MatchPerformance,
        absence_reason: '',
      }))
    );
    setGuestPlayers(prev =>
      prev.map(p => ({
        ...p,
        attended: true,
        performance: 'excellent' as MatchPerformance,
        absence_reason: '',
      }))
    );
    setIsDirty(true);
  };

  const updateLocalPerformance = (playerId: string, status: PerformanceStatus) => {
    const matchPerf: MatchPerformance = status === 'challenge' ? 'focus' : status;
    const isGuest = guestPlayers.some(g => g.player_id === playerId);
    const setter = isGuest ? setGuestPlayers : setLocalAttendance;
    setter(prev =>
      prev.map(p => p.player_id === playerId ? { ...p, performance: matchPerf } : p)
    );
    setIsDirty(true);
  };

  const updateLocalStat = (playerId: string, field: 'goals' | 'assists' | 'points', value: number) => {
    const isGuest = guestPlayers.some(g => g.player_id === playerId);
    const setter = isGuest ? setGuestPlayers : setLocalAttendance;
    setter(prev =>
      prev.map(p => p.player_id === playerId ? { ...p, [field]: value } : p)
    );
    setIsDirty(true);
  };

  const updateAbsenceReason = (playerId: string, reason: string) => {
    const isGuest = guestPlayers.some(g => g.player_id === playerId);
    const setter = isGuest ? setGuestPlayers : setLocalAttendance;
    setter(prev =>
      prev.map(p => p.player_id === playerId ? { ...p, absence_reason: reason } : p)
    );
    setIsDirty(true);
  };

  // --- Guest player handlers ---
  const addGuestPlayer = (player: any) => {
    const alreadyAdded = guestPlayers.some(g => g.player_id === player.id);
    if (alreadyAdded) return;

    setGuestPlayers(prev => [...prev, {
      player_id: player.id,
      full_name: player.full_name,
      position: player.position,
      payment_status: 'al_dia',
      attended: false,
      performance: null,
      goals: 0,
      assists: 0,
      points: 0,
      absence_reason: 'injustificada',
      is_guest: true,
      category_name: player.category?.name || '',
    }]);
    setGuestSearch('');
    setGuestSearchResults([]);
    setShowGuestSearch(false);
    setIsDirty(true);
  };

  const removeGuestPlayer = (playerId: string) => {
    setGuestPlayers(prev => prev.filter(g => g.player_id !== playerId));
    setIsDirty(true);
  };

  // --- Existing player stats handlers ---
  const updatePlayerStat = (playerId: string, field: keyof MatchPlayer, value: number) => {
    setPlayerStats(prev => 
      prev.map(p => p.player_id === playerId ? { ...p, [field]: value } : p)
    );
    setIsDirty(true);
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
    if (!match || !user?.id || !organization?.id) return;

    // Validation: At least one player must be present
    const presentCount = hasExistingPlayers
      ? playerStats.filter(p => p.attended).length
      : allLocalPlayers.filter(p => p.attended).length;

    if (presentCount === 0) {
      toast.error('Marca al menos un jugador como presente');
      return;
    }

    if (goalsFor < 0 || goalsAgainst < 0) {
      toast.error('El marcador no puede ser negativo');
      return;
    }

    setIsSaving(true);
    
    try {
      if (!hasExistingPlayers) {
        // Combine regular + guest players
        const allMatchPlayers = [
          ...localAttendance.map(p => ({ ...p, is_guest: false })),
          ...guestPlayers.map(p => ({ ...p, is_guest: true })),
        ];

        const playersToInsert = allMatchPlayers.map(p => ({
          match_id: match.id,
          player_id: p.player_id,
          organization_id: organization.id,
          attended: p.attended,
          goals: p.attended ? p.goals : 0,
          assists: p.attended ? p.assists : 0,
          points: p.attended ? p.points : 0,
          performance: p.attended ? (p.performance || 'excellent') : null,
          is_guest: p.is_guest,
        }));

        await createMatchPlayers.mutateAsync(playersToInsert);
      } else {
        // UPDATE existing match_players
        if (playerStats.length > 0) {
          onUpdatePlayers(playerStats);
        }
      }

      // Update match
      onUpdate(match.id, {
        goals_for: goalsFor,
        goals_against: goalsAgainst,
        notes: notes,
        technical_notes: technicalNotes,
        mvp_player_id: mvpPlayerId,
        status: 'terminado',
      } as any, user.id);

      toast.success('Resultado guardado correctamente');
      onClose();
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  // Performance stats for header
  const perfCounts = useMemo(() => {
    const attending = hasExistingPlayers
      ? playerStats.filter(p => p.attended)
      : allLocalPlayers.filter(p => p.attended);
    const absent = hasExistingPlayers
      ? playerStats.filter(p => !p.attended)
      : allLocalPlayers.filter(p => !p.attended);
    return {
      outstanding: attending.filter(p => (p.performance || 'excellent') === 'outstanding').length,
      excellent: attending.filter(p => (p.performance || 'excellent') === 'excellent').length,
      focus: attending.filter(p => (p.performance || 'excellent') === 'focus').length,
      challenge: absent.length,
    };
  }, [hasExistingPlayers, playerStats, allLocalPlayers]);

  const TAB_ORDER = ['attendance', 'stats', 'result', 'notes'] as const;
  const [activeTab, setActiveTab] = useState<string>(hasExistingPlayers ? 'result' : 'attendance');

  // Reset active tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(hasExistingPlayers ? 'result' : 'attendance');
    }
  }, [isOpen, hasExistingPlayers]);

  const goToNextTab = () => {
    const currentIdx = TAB_ORDER.indexOf(activeTab as typeof TAB_ORDER[number]);
    if (currentIdx < TAB_ORDER.length - 1) {
      setActiveTab(TAB_ORDER[currentIdx + 1]);
    }
  };

  // Close interceptor
  const handleClose = () => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  const confirmClose = () => {
    setShowExitConfirm(false);
    onClose();
  };

  if (!match) return null;

  const result = getMatchResult(goalsFor, goalsAgainst);

  const handleToggleMvp = (playerId: string) => {
    setMvpPlayerId(prev => prev === playerId ? null : playerId);
  };

  const handlePerformanceChange = (playerId: string, status: PerformanceStatus) => {
    const matchPerf: MatchPerformance = status === 'challenge' ? 'focus' : status;
    if (hasExistingPlayers) {
      setPlayerStats(prev =>
        prev.map(p => p.player_id === playerId ? { ...p, performance: matchPerf } : p)
      );
    } else {
      updateLocalPerformance(playerId, status);
    }
  };

  const isLoadingAny = loadingPlayers || loadingCategoryPlayers;

  // Stats source: either matchPlayers or allLocalPlayers (present only)
  const statsAttending = hasExistingPlayers
    ? playerStats.filter(p => p.attended)
    : allLocalPlayers.filter(p => p.attended);
  const statsAbsent = hasExistingPlayers
    ? playerStats.filter(p => !p.attended)
    : allLocalPlayers.filter(p => !p.attended);

  // Render a single player attendance card
  const renderPlayerCard = (player: LocalPlayerAttendance) => {
    const isPresent = player.attended;
    const isGuest = player.is_guest;

    return (
      <Card key={player.player_id} className="p-3">
        {/* Player Info */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-base truncate">{player.full_name}</p>
              {isGuest && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground border-border">
                  INVITADO
                </Badge>
              )}
              {isPresent && player.performance && (
                <PerformanceIndicator
                  status={player.performance as PerformanceStatus}
                  onChange={(status) => updateLocalPerformance(player.player_id, status)}
                  size="sm"
                />
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {player.position && (
                <span className="text-xs text-muted-foreground">{player.position}</span>
              )}
              {isGuest && player.category_name && (
                <span className="text-xs text-muted-foreground">• {player.category_name}</span>
              )}
            </div>
          </div>
          {isGuest && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
              onClick={() => removeGuestPlayer(player.player_id)}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Large Toggle Buttons */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={isPresent ? 'default' : 'outline'}
            onClick={() => toggleAttendance(player.player_id, true)}
            className={cn(
              'flex-1 h-14 text-lg font-semibold gap-2 transition-all',
              isPresent
                ? 'bg-success hover:bg-success/90 text-success-foreground shadow-md'
                : 'border-success/30 text-success hover:bg-success/10'
            )}
          >
            <Check className="w-6 h-6" />
            Presente
            {isPresent && player.performance && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  const cycle: MatchPerformance[] = ['outstanding', 'excellent', 'focus'];
                  const currentIdx = cycle.indexOf(player.performance!);
                  const nextIdx = (currentIdx + 1) % cycle.length;
                  updateLocalPerformance(player.player_id, cycle[nextIdx] as PerformanceStatus);
                }}
                className={cn(
                  'ml-2 w-6 h-6 rounded-full ring-2 ring-white/50 cursor-pointer',
                  'active:scale-90 transition-transform',
                  player.performance === 'outstanding' && 'bg-blue-500',
                  player.performance === 'excellent' && 'bg-success-foreground',
                  player.performance === 'focus' && 'bg-warning'
                )}
              />
            )}
          </Button>
          <Button
            type="button"
            variant={!isPresent ? 'default' : 'outline'}
            onClick={() => toggleAttendance(player.player_id, false)}
            className={cn(
              'flex-1 h-14 text-lg font-semibold gap-2 transition-all',
              !isPresent && player.absence_reason
                ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-md'
                : 'border-destructive/30 text-destructive hover:bg-destructive/10'
            )}
          >
            <X className="w-6 h-6" />
            Ausente
          </Button>
        </div>

        {/* Absence Reason */}
        {!isPresent && (
          <div className="mt-3 pt-3 border-t border-border">
            <Select
              value={player.absence_reason || 'injustificada'}
              onValueChange={(v) => updateAbsenceReason(player.player_id, v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Motivo de ausencia" />
              </SelectTrigger>
              <SelectContent>
                {ABSENCE_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </Card>
    );
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DrawerContent className="max-h-[95vh]" onPointerDownOutside={(e) => { if (isDirty) e.preventDefault(); }}>
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-4 mt-3">
              <TabsTrigger value="attendance" className="gap-1 text-xs">
                <Users className="w-4 h-4" />
                Asistencia
              </TabsTrigger>
              <TabsTrigger value="stats" className="gap-1 text-xs">
                <Target className="w-4 h-4" />
                Stats
              </TabsTrigger>
              <TabsTrigger value="result" className="gap-1 text-xs">
                <Trophy className="w-4 h-4" />
                Marcador
              </TabsTrigger>
              <TabsTrigger value="notes" className="gap-1 text-xs">
                <FileText className="w-4 h-4" />
                Notas
              </TabsTrigger>
            </TabsList>

            {/* ==================== ATTENDANCE TAB ==================== */}
            <TabsContent value="attendance" className="py-4 space-y-3">
              {isLoadingAny ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : localAttendance.length === 0 && !hasExistingPlayers ? (
                <Card className="p-8 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Sin jugadores</h3>
                  <p className="text-muted-foreground text-sm">
                    No hay jugadores activos en esta categoría.
                  </p>
                </Card>
              ) : hasExistingPlayers ? (
                <Card className="p-6 text-center bg-success/5 border-success/30">
                  <Check className="w-8 h-8 text-success mx-auto mb-2" />
                  <p className="font-medium">Asistencia ya registrada</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {playerStats.filter(p => p.attended).length} presentes de {playerStats.length} jugadores
                  </p>
                </Card>
              ) : (
                <>
                  {/* Sticky Stats Bar */}
                  <div className="sticky top-0 z-10 bg-background pb-3">
                    <div className="grid grid-cols-3 gap-2">
                      <Card className="p-2 text-center">
                        <p className="text-xl font-bold">{attendanceStats.total}</p>
                        <p className="text-[10px] text-muted-foreground">Total</p>
                      </Card>
                      <Card className="p-2 text-center bg-success/10 border-success/30">
                        <p className="text-xl font-bold text-success">{attendanceStats.present}</p>
                        <p className="text-[10px] text-muted-foreground">Presentes</p>
                      </Card>
                      <Card className="p-2 text-center bg-destructive/10 border-destructive/30">
                        <p className="text-xl font-bold text-destructive">{attendanceStats.absent}</p>
                        <p className="text-[10px] text-muted-foreground">Ausentes</p>
                      </Card>
                    </div>

                    {/* Mark All Present */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={markAllPresent}
                      className="w-full h-12 text-base gap-2 mt-3"
                    >
                      <CheckCheck className="w-5 h-5" />
                      Todos presente
                    </Button>
                  </div>

                  {/* Regular Players List */}
                  <div className="space-y-3">
                    {localAttendance.map(renderPlayerCard)}
                  </div>

                  {/* Guest Players */}
                  {guestPlayers.length > 0 && (
                    <div className="space-y-3 mt-4">
                      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <UserPlus className="w-4 h-4" />
                        Invitados ({guestPlayers.length})
                      </h4>
                      {guestPlayers.map(renderPlayerCard)}
                    </div>
                  )}

                  {/* Add Guest Player Section */}
                  <div className="mt-4 pt-4 border-t border-border">
                    {!showGuestSearch ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowGuestSearch(true)}
                        className="w-full h-12 gap-2 border-dashed"
                      >
                        <UserPlus className="w-4 h-4" />
                        Agregar jugador de otra categoría
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              placeholder="Buscar jugador por nombre..."
                              value={guestSearch}
                              onChange={(e) => setGuestSearch(e.target.value)}
                              className="pl-9 h-10"
                              autoFocus
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setShowGuestSearch(false);
                              setGuestSearch('');
                              setGuestSearchResults([]);
                            }}
                            className="h-10 w-10 flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Search Results */}
                        {isSearching && (
                          <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                          </div>
                        )}
                        {!isSearching && guestSearch.trim() && guestSearchResults.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-3">
                            Sin resultados para "{guestSearch}"
                          </p>
                        )}
                        {guestSearchResults.length > 0 && (
                          <div className="space-y-1 max-h-48 overflow-y-auto rounded-lg border border-border">
                            {guestSearchResults.map((player) => {
                              const alreadyAdded = guestPlayers.some(g => g.player_id === player.id);
                              return (
                                <button
                                  key={player.id}
                                  type="button"
                                  disabled={alreadyAdded}
                                  onClick={() => addGuestPlayer(player)}
                                  className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                                    alreadyAdded
                                      ? "opacity-50 cursor-not-allowed bg-muted/50"
                                      : "hover:bg-muted/50 active:bg-muted"
                                  )}
                                >
                                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0">
                                    {player.full_name?.charAt(0)?.toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{player.full_name}</p>
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                      <span>{player.category?.name || 'Sin categoría'}</span>
                                      {player.position && (
                                        <>
                                          <span>•</span>
                                          <span>{player.position}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  {alreadyAdded && (
                                    <Check className="w-4 h-4 text-success flex-shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Next button */}
              <Button onClick={goToNextTab} className="w-full h-12 mt-4 gap-2" size="lg">
                Siguiente →
              </Button>
            </TabsContent>

            {/* ==================== RESULT TAB ==================== */}
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
                        disabled={isFutbol}
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
                        onClick={() => { setGoalsAgainst(Math.max(0, goalsAgainst - 1)); setIsDirty(true); }}
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
                  <p className="text-xl font-bold">{attendanceStats.present}</p>
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

              {/* Next button */}
              <Button onClick={goToNextTab} className="w-full h-12 mt-4 gap-2" size="lg">
                Siguiente →
              </Button>
            </TabsContent>

            {/* ==================== STATS TAB ==================== */}
            <TabsContent value="stats" className="py-4 space-y-3">
              {isLoadingAny ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : statsAttending.length === 0 && statsAbsent.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Sin jugadores presentes</p>
                  <p className="text-sm mt-1">Marca asistencia en el tab "Asistencia" primero</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Header hint + performance stats */}
                  {statsAttending.length > 0 && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        👑 Toca corona para MVP · Semáforo: rendimiento
                      </p>
                      <PerformanceStats {...perfCounts} />
                    </div>
                  )}

                  {/* Present players with stats */}
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                    {statsAttending.map((player) => {
                      const playerId = hasExistingPlayers ? (player as MatchPlayer).player_id : (player as LocalPlayerAttendance).player_id;
                      const playerName = hasExistingPlayers ? (player as MatchPlayer).player?.full_name : (player as LocalPlayerAttendance).full_name;
                      const playerPosition = hasExistingPlayers ? (player as MatchPlayer).player?.position : (player as LocalPlayerAttendance).position;
                      const isGuest = hasExistingPlayers ? (player as MatchPlayer).is_guest : (player as LocalPlayerAttendance).is_guest;
                      const perf = player.performance || 'excellent';
                      const goals = player.goals || 0;
                      const assists = player.assists || 0;
                      const points = player.points || 0;

                      return (
                        <Card key={playerId} className={cn(
                          "p-3",
                          mvpPlayerId === playerId && "ring-2 ring-yellow-400/50 bg-yellow-50/30 dark:bg-yellow-900/10"
                        )}>
                          <div className="flex items-center gap-2">
                            {/* MVP Crown */}
                            <button
                              type="button"
                              onClick={() => handleToggleMvp(playerId)}
                              className={cn(
                                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90",
                                mvpPlayerId === playerId
                                  ? "bg-yellow-400/20 text-yellow-500"
                                  : "text-muted-foreground/30 hover:text-muted-foreground/60"
                              )}
                              aria-label={mvpPlayerId === playerId ? 'Quitar MVP' : 'Marcar como MVP'}
                            >
                              <Crown className={cn(
                                "w-4 h-4",
                                mvpPlayerId === playerId && "fill-yellow-400"
                              )} />
                            </button>

                            {/* Performance Semaphore */}
                            <PerformanceIndicator
                              status={perf as PerformanceStatus}
                              onChange={(status) => handlePerformanceChange(playerId, status)}
                              size="sm"
                              cycleOrder={['outstanding', 'excellent', 'focus']}
                            />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-medium text-sm truncate">{playerName}</p>
                                {isGuest && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground border-border">
                                    INV
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{playerPosition || 'Sin posición'}</p>
                            </div>

                            {isFutbol ? (
                              <div className="flex items-center gap-3">
                                {/* Goals */}
                                <div className="flex items-center gap-0.5">
                                  <Button variant="ghost" size="icon" className="h-7 w-7"
                                    onClick={() => hasExistingPlayers
                                      ? updatePlayerStat(playerId, 'goals', Math.max(0, goals - 1))
                                      : updateLocalStat(playerId, 'goals', Math.max(0, goals - 1))
                                    }
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <div className="text-center w-5">
                                    <span className={cn("font-medium text-sm", goals > 0 && "text-success")}>
                                      {goals}
                                    </span>
                                    <p className="text-[8px] text-muted-foreground">G</p>
                                  </div>
                                  <Button variant="ghost" size="icon" className="h-7 w-7"
                                    onClick={() => hasExistingPlayers
                                      ? updatePlayerStat(playerId, 'goals', goals + 1)
                                      : updateLocalStat(playerId, 'goals', goals + 1)
                                    }
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>
                                
                                {/* Assists */}
                                <div className="flex items-center gap-0.5">
                                  <Button variant="ghost" size="icon" className="h-7 w-7"
                                    onClick={() => hasExistingPlayers
                                      ? updatePlayerStat(playerId, 'assists', Math.max(0, assists - 1))
                                      : updateLocalStat(playerId, 'assists', Math.max(0, assists - 1))
                                    }
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <div className="text-center w-5">
                                    <span className={cn("font-medium text-sm", assists > 0 && "text-primary")}>
                                      {assists}
                                    </span>
                                    <p className="text-[8px] text-muted-foreground">A</p>
                                  </div>
                                  <Button variant="ghost" size="icon" className="h-7 w-7"
                                    onClick={() => hasExistingPlayers
                                      ? updatePlayerStat(playerId, 'assists', assists + 1)
                                      : updateLocalStat(playerId, 'assists', assists + 1)
                                    }
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-0.5">
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => hasExistingPlayers
                                    ? updatePlayerStat(playerId, 'points', Math.max(0, points - 1))
                                    : updateLocalStat(playerId, 'points', Math.max(0, points - 1))
                                  }
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <div className="text-center w-7">
                                  <span className="font-medium text-sm">{points}</span>
                                  <p className="text-[8px] text-muted-foreground">Pts</p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => hasExistingPlayers
                                    ? updatePlayerStat(playerId, 'points', points + 1)
                                    : updateLocalStat(playerId, 'points', points + 1)
                                  }
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Absent players - collapsible */}
                  {statsAbsent.length > 0 && (
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-2">
                        <ChevronDown className="w-3 h-3" />
                        <span>Ausentes ({statsAbsent.length})</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-1.5 mt-1">
                        {statsAbsent.map((player) => {
                          const playerId = hasExistingPlayers ? (player as MatchPlayer).player_id : (player as LocalPlayerAttendance).player_id;
                          const playerName = hasExistingPlayers ? (player as MatchPlayer).player?.full_name : (player as LocalPlayerAttendance).full_name;
                          const isGuest = hasExistingPlayers ? (player as MatchPlayer).is_guest : (player as LocalPlayerAttendance).is_guest;
                          return (
                            <Card key={playerId} className="p-2.5 opacity-60">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 min-w-[20px] rounded-full bg-destructive ring-2 ring-destructive/30 flex-shrink-0" />
                                <p className="font-medium text-sm truncate flex-1">{playerName}</p>
                                {isGuest && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground border-border">
                                    INV
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">Ausente</span>
                              </div>
                            </Card>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              )}

              {/* Next button */}
              <Button onClick={goToNextTab} className="w-full h-12 mt-4 gap-2" size="lg">
                Siguiente →
              </Button>
            </TabsContent>

            {/* ==================== NOTES TAB ==================== */}
            <TabsContent value="notes" className="py-4 space-y-4">
              {/* Technical Notes */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Notas Técnicas</Label>
                <Textarea
                  value={technicalNotes}
                  onChange={(e) => { setTechnicalNotes(e.target.value); setIsDirty(true); }}
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
                  onChange={(e) => { setNotes(e.target.value); setIsDirty(true); }}
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
            <Button variant="outline" onClick={handleClose} className="h-12">
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

      {/* Unsaved changes confirmation */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-lg p-6 mx-4 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <h3 className="font-display font-semibold text-foreground">¿Salir sin guardar?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Tienes cambios sin guardar. Si sales ahora, perderás toda la información que ingresaste.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowExitConfirm(false)} className="flex-1 h-11">
                Seguir editando
              </Button>
              <Button variant="destructive" onClick={confirmClose} className="flex-1 h-11">
                Salir sin guardar
              </Button>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
