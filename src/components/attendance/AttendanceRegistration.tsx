import { useState, useEffect, useMemo } from 'react';
import { Check, X, Save, Users, CheckCheck, Filter, CheckCircle2, Clock, UserCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTrainingAttendance, PlayerAttendanceRecord, PerformanceStatus } from '@/hooks/useTrainingAttendance';
import { AttendanceStatus, PAYMENT_STATUS_LABELS } from '@/types/categories';
import { PerformanceIndicator, PerformanceStats } from './PerformanceIndicator';
import { useOrgFeatures } from '@/hooks/useOrgFeatures';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AttendanceRegistrationProps {
  categoryId: string;
  date: string;
}

const ABSENCE_REASONS = [
  { value: 'justificada', label: 'Justificada' },
  { value: 'injustificada', label: 'Injustificada' },
  { value: 'enfermedad', label: 'Enfermedad / Lesión' },
];

type PerformanceFilter = 'all' | 'outstanding' | 'challenge';

export function AttendanceRegistration({ categoryId, date }: AttendanceRegistrationProps) {
  const { playersWithAttendance, isLoading, saveAttendance, hasExistingAttendance, performanceStats, traceabilityInfo } = useTrainingAttendance(categoryId, date);
  const [localPlayers, setLocalPlayers] = useState<PlayerAttendanceRecord[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [performanceFilter, setPerformanceFilter] = useState<PerformanceFilter>('all');

  useEffect(() => {
    setLocalPlayers(playersWithAttendance);
    setHasChanges(false);
  }, [playersWithAttendance]);

  const updatePlayerStatus = (playerId: string, status: AttendanceStatus) => {
    setLocalPlayers(prev =>
      prev.map(p => {
        if (p.player_id === playerId) {
          // If marking present, clear notes and set default performance to excellent
          // If marking absent, clear performance_status
          const newNotes = status === 'presente' ? '' : (p.notes || 'injustificada');
          const newPerformance = status === 'presente' ? 'excellent' : null;
          return { ...p, status, notes: newNotes, performance_status: newPerformance };
        }
        return p;
      })
    );
    setHasChanges(true);
  };

  const updatePlayerPerformance = (playerId: string, performance: PerformanceStatus) => {
    setLocalPlayers(prev =>
      prev.map(p => (p.player_id === playerId ? { ...p, performance_status: performance } : p))
    );
    setHasChanges(true);
  };

  const updatePlayerNotes = (playerId: string, notes: string) => {
    setLocalPlayers(prev =>
      prev.map(p => (p.player_id === playerId ? { ...p, notes } : p))
    );
    setHasChanges(true);
  };

  const handleSave = () => {
    saveAttendance.mutate(localPlayers, {
      onSuccess: () => setHasChanges(false),
    });
  };

  const markAllPresent = () => {
    setLocalPlayers(prev => prev.map(p => ({ 
      ...p, 
      status: 'presente' as AttendanceStatus, 
      notes: '',
      performance_status: 'excellent' as PerformanceStatus 
    })));
    setHasChanges(true);
  };

  // Calculate local stats (for immediate UI feedback)
  const localStats = useMemo(() => {
    const present = localPlayers.filter(p => p.status === 'presente');
    return {
      total: localPlayers.length,
      present: present.length,
      absent: localPlayers.filter(p => p.status === 'ausente' || p.status === 'justificado').length,
      justified: localPlayers.filter(p => p.status === 'justificado').length,
      outstanding: present.filter(p => p.performance_status === 'outstanding').length,
      excellent: present.filter(p => p.performance_status === 'excellent' || !p.performance_status).length,
      focus: present.filter(p => p.performance_status === 'focus').length,
      challenge: present.filter(p => p.performance_status === 'challenge').length,
    };
  }, [localPlayers]);

  // Filtered players based on performance filter
  const filteredPlayers = useMemo(() => {
    if (performanceFilter === 'challenge') {
      return localPlayers.filter(p => p.performance_status === 'challenge');
    }
    if (performanceFilter === 'outstanding') {
      return localPlayers.filter(p => p.performance_status === 'outstanding');
    }
    return localPlayers;
  }, [localPlayers, performanceFilter]);

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  if (localPlayers.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Sin jugadores</h3>
        <p className="text-muted-foreground text-sm">
          Aún no hay jugadores en esta categoría.
        </p>
        <p className="text-muted-foreground text-xs mt-1">
          Agrega jugadores desde el módulo de Plantilla.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4 overflow-x-hidden">
      {/* Sticky Stats Bar - Mobile optimized */}
      <div className="sticky top-0 z-10 bg-background pb-3">
        <div className="grid grid-cols-4 gap-2 md:gap-4">
          <Card className="p-2 md:p-3 text-center">
            <p className="text-xl md:text-2xl font-bold">{localStats.total}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">Total</p>
          </Card>
          <Card className="p-2 md:p-3 text-center bg-success/10 border-success/30">
            <p className="text-xl md:text-2xl font-bold text-success">{localStats.present}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">Presentes</p>
          </Card>
          <Card className="p-2 md:p-3 text-center bg-destructive/10 border-destructive/30">
            <p className="text-xl md:text-2xl font-bold text-destructive">{localStats.absent}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">Ausentes</p>
          </Card>
          <Card className="p-2 md:p-3 text-center bg-warning/10 border-warning/30">
            <p className="text-xl md:text-2xl font-bold text-warning">{localStats.justified}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">Justificados</p>
          </Card>
        </div>

        {/* Performance Stats Row */}
        <div className="flex items-center justify-between mt-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Rendimiento:</span>
            <PerformanceStats 
              outstanding={localStats.outstanding}
              excellent={localStats.excellent} 
              focus={localStats.focus} 
              challenge={localStats.challenge}
              showHelp
            />
          </div>
          {/* Quick Filters for Outstanding and Challenge */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={performanceFilter === 'outstanding' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPerformanceFilter(prev => prev === 'outstanding' ? 'all' : 'outstanding')}
              className={cn(
                'h-8 text-xs gap-1.5',
                performanceFilter === 'outstanding' && 'bg-blue-500 hover:bg-blue-600'
              )}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-white/50" />
              <span className="hidden sm:inline">MVP</span>
              {localStats.outstanding > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] ml-1">
                  {localStats.outstanding}
                </Badge>
              )}
            </Button>
            <Button
              type="button"
              variant={performanceFilter === 'challenge' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPerformanceFilter(prev => prev === 'challenge' ? 'all' : 'challenge')}
              className={cn(
                'h-8 text-xs gap-1.5',
                performanceFilter === 'challenge' && 'bg-destructive hover:bg-destructive/90'
              )}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-destructive border border-white/50" />
              <span className="hidden sm:inline">Reto</span>
              {localStats.challenge > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] ml-1">
                  {localStats.challenge}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Global Actions - Large touch targets with explicit button type */}
        <div className="flex gap-2 mt-3">
          <Button 
            type="button"
            variant="outline" 
            onClick={markAllPresent}
            className="flex-1 h-12 text-base gap-2"
          >
            <CheckCheck className="w-5 h-5" />
            Todos presente
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || saveAttendance.isPending}
            className="flex-1 h-12 text-base gap-2"
          >
            <Save className="w-5 h-5" />
            {saveAttendance.isPending ? 'Guardando...' : 'Guardar asistencia'}
          </Button>
        </div>

        {/* Traceability Footer - Shows when attendance exists */}
        {hasExistingAttendance && traceabilityInfo && (
          <Card className="mt-3 p-3 bg-success/5 border-success/20">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-success">Registro guardado</span>
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(traceabilityInfo.updatedAt), "HH:mm", { locale: es })}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <UserCheck className="w-3 h-3" />
                    {traceabilityInfo.recordedBy}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {hasExistingAttendance && (
          <Badge variant="outline" className="mt-2 bg-primary/10 text-primary w-full justify-center">
            Editando registro existente
          </Badge>
        )}

        {/* Filter active indicator */}
        {performanceFilter === 'outstanding' && (
          <Badge 
            variant="outline" 
            className="mt-2 bg-blue-500/10 text-blue-600 border-blue-500/30 w-full justify-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            Mostrando solo Sobresalientes ({filteredPlayers.length})
          </Badge>
        )}
        {performanceFilter === 'challenge' && (
          <Badge 
            variant="outline" 
            className="mt-2 bg-destructive/10 text-destructive border-destructive/30 w-full justify-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-destructive" />
            Mostrando solo jugadores en Reto ({filteredPlayers.length})
          </Badge>
        )}
      </div>

      {/* Players List - Mobile optimized cards */}
      <div className="space-y-3">
        {filteredPlayers.length === 0 && performanceFilter !== 'all' ? (
          <Card className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-success/10 mx-auto mb-4 flex items-center justify-center">
              <Check className="w-6 h-6 text-success" />
            </div>
            <h3 className="text-lg font-medium mb-2">Sin jugadores en Reto</h3>
            <p className="text-muted-foreground text-sm">
              No hay jugadores con estado de rendimiento "Reto" hoy
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPerformanceFilter('all')}
              className="mt-4"
            >
              Ver todos
            </Button>
          </Card>
        ) : (
          filteredPlayers.map((player) => {
            const isPresent = player.status === 'presente';
            const isAbsent = player.status === 'ausente' || player.status === 'justificado';
            
            return (
              <Card key={player.player_id} className="p-3 md:p-4">
                {/* Player Info Row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-base truncate">{player.full_name}</p>
                      {/* Performance Indicator - Only visible when present */}
                      {isPresent && player.performance_status && (
                        <PerformanceIndicator
                          status={player.performance_status}
                          onChange={(status) => updatePlayerPerformance(player.player_id, status)}
                          size="sm"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {player.position && (
                        <span className="text-xs text-muted-foreground">{player.position}</span>
                      )}
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] px-1.5 py-0',
                          player.payment_status === 'al_dia' && 'bg-success/10 text-success border-success/20',
                          player.payment_status === 'pendiente' && 'bg-warning/10 text-warning border-warning/20',
                          player.payment_status === 'atrasado' && 'bg-destructive/10 text-destructive border-destructive/20'
                        )}
                      >
                        {PAYMENT_STATUS_LABELS[player.payment_status as keyof typeof PAYMENT_STATUS_LABELS] || player.payment_status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Large Toggle Buttons - Mobile friendly with explicit type */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={isPresent ? 'default' : 'outline'}
                    onClick={() => updatePlayerStatus(player.player_id, 'presente')}
                    className={cn(
                      'flex-1 h-14 text-lg font-semibold gap-2 transition-all',
                      isPresent 
                        ? 'bg-success hover:bg-success/90 text-success-foreground shadow-md' 
                        : 'border-success/30 text-success hover:bg-success/10'
                    )}
                  >
                    <Check className="w-6 h-6" />
                    Presente
                    {/* Show performance indicator in button when present */}
                    {isPresent && player.performance_status && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          const current = player.performance_status || 'excellent';
                          const cycle: PerformanceStatus[] = ['outstanding', 'excellent', 'focus', 'challenge'];
                          const nextIndex = (cycle.indexOf(current) + 1) % cycle.length;
                          updatePlayerPerformance(player.player_id, cycle[nextIndex]);
                        }}
                        className={cn(
                          'ml-2 w-6 h-6 rounded-full ring-2 ring-white/50 cursor-pointer',
                          'active:scale-90 transition-transform',
                          player.performance_status === 'outstanding' && 'bg-blue-500',
                          player.performance_status === 'excellent' && 'bg-success-foreground',
                          player.performance_status === 'focus' && 'bg-warning',
                          player.performance_status === 'challenge' && 'bg-destructive'
                        )}
                      />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant={isAbsent ? 'default' : 'outline'}
                    onClick={() => updatePlayerStatus(player.player_id, 'ausente')}
                    className={cn(
                      'flex-1 h-14 text-lg font-semibold gap-2 transition-all',
                      isAbsent 
                        ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-md' 
                        : 'border-destructive/30 text-destructive hover:bg-destructive/10'
                    )}
                  >
                    <X className="w-6 h-6" />
                    Ausente
                  </Button>
                </div>

                {/* Absence Reason - Only shown when absent */}
                {isAbsent && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <Select
                      value={player.notes || 'injustificada'}
                      onValueChange={(v) => {
                        // If "justificada" or "enfermedad" is selected, mark as justified status
                        const newStatus = v === 'injustificada' ? 'ausente' : 'justificado';
                        setLocalPlayers(prev =>
                          prev.map(p => (p.player_id === player.player_id ? { ...p, status: newStatus as AttendanceStatus, notes: v, performance_status: null } : p))
                        );
                        setHasChanges(true);
                      }}
                    >
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder="Seleccionar motivo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ABSENCE_REASONS.map((reason) => (
                          <SelectItem key={reason.value} value={reason.value} className="text-base py-3">
                            {reason.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}