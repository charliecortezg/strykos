import { useState, useEffect } from 'react';
import { Check, X, Save, Users, CheckCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTrainingAttendance, PlayerAttendanceRecord } from '@/hooks/useTrainingAttendance';
import { AttendanceStatus, PAYMENT_STATUS_LABELS } from '@/types/categories';
import { cn } from '@/lib/utils';

interface AttendanceRegistrationProps {
  categoryId: string;
  date: string;
}

const ABSENCE_REASONS = [
  { value: 'justificada', label: 'Justificada' },
  { value: 'injustificada', label: 'Injustificada' },
  { value: 'enfermedad', label: 'Enfermedad / Lesión' },
];

export function AttendanceRegistration({ categoryId, date }: AttendanceRegistrationProps) {
  const { playersWithAttendance, isLoading, saveAttendance, hasExistingAttendance } = useTrainingAttendance(categoryId, date);
  const [localPlayers, setLocalPlayers] = useState<PlayerAttendanceRecord[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalPlayers(playersWithAttendance);
    setHasChanges(false);
  }, [playersWithAttendance]);

  const updatePlayerStatus = (playerId: string, status: AttendanceStatus) => {
    setLocalPlayers(prev =>
      prev.map(p => {
        if (p.player_id === playerId) {
          // If marking present, clear notes. If marking absent/justified, keep/set default notes
          const newNotes = status === 'presente' ? '' : (p.notes || 'injustificada');
          return { ...p, status, notes: newNotes };
        }
        return p;
      })
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
    setLocalPlayers(prev => prev.map(p => ({ ...p, status: 'presente' as AttendanceStatus, notes: '' })));
    setHasChanges(true);
  };

  const stats = {
    total: localPlayers.length,
    present: localPlayers.filter(p => p.status === 'presente').length,
    absent: localPlayers.filter(p => p.status === 'ausente' || p.status === 'justificado').length,
    justified: localPlayers.filter(p => p.status === 'justificado').length,
  };

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
        <p className="text-muted-foreground">
          No hay jugadores activos en esta categoría
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sticky Stats Bar - Mobile optimized */}
      <div className="sticky top-0 z-10 bg-background pb-3">
        <div className="grid grid-cols-4 gap-2 md:gap-4">
          <Card className="p-2 md:p-3 text-center">
            <p className="text-xl md:text-2xl font-bold">{stats.total}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">Total</p>
          </Card>
          <Card className="p-2 md:p-3 text-center bg-success/10 border-success/30">
            <p className="text-xl md:text-2xl font-bold text-success">{stats.present}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">Presentes</p>
          </Card>
          <Card className="p-2 md:p-3 text-center bg-destructive/10 border-destructive/30">
            <p className="text-xl md:text-2xl font-bold text-destructive">{stats.absent}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">Ausentes</p>
          </Card>
          <Card className="p-2 md:p-3 text-center bg-warning/10 border-warning/30">
            <p className="text-xl md:text-2xl font-bold text-warning">{stats.justified}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">Justificados</p>
          </Card>
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
            {saveAttendance.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>

        {hasExistingAttendance && (
          <Badge variant="outline" className="mt-2 bg-primary/10 text-primary w-full justify-center">
            Editando registro existente
          </Badge>
        )}
      </div>

      {/* Players List - Mobile optimized cards */}
      <div className="space-y-3">
        {localPlayers.map((player) => {
          const isPresent = player.status === 'presente';
          const isAbsent = player.status === 'ausente' || player.status === 'justificado';
          
          return (
            <Card key={player.player_id} className="p-3 md:p-4">
              {/* Player Info Row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-base truncate">{player.full_name}</p>
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
                        prev.map(p => (p.player_id === player.player_id ? { ...p, status: newStatus as AttendanceStatus, notes: v } : p))
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
        })}
      </div>
    </div>
  );
}
