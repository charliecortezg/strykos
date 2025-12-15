import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Save, Users, CreditCard } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTrainingAttendance, PlayerAttendanceRecord } from '@/hooks/useTrainingAttendance';
import { AttendanceStatus, PAYMENT_STATUS_LABELS } from '@/types/categories';
import { cn } from '@/lib/utils';

interface AttendanceRegistrationProps {
  categoryId: string;
  date: string;
}

const ATTENDANCE_OPTIONS: { value: AttendanceStatus; label: string; icon: typeof CheckCircle; color: string }[] = [
  { value: 'presente', label: 'Presente', icon: CheckCircle, color: 'text-success' },
  { value: 'ausente', label: 'Ausente', icon: XCircle, color: 'text-destructive' },
  { value: 'justificado', label: 'Justificado', icon: AlertCircle, color: 'text-warning' },
];

const ABSENCE_REASONS = [
  { value: 'injustificada', label: 'Injustificada' },
  { value: 'enfermedad', label: 'Enfermedad / Lesión' },
  { value: 'permiso', label: 'Permiso' },
  { value: 'otro', label: 'Otro motivo' },
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
      prev.map(p => (p.player_id === playerId ? { ...p, status, notes: status === 'presente' ? '' : p.notes } : p))
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
    absent: localPlayers.filter(p => p.status === 'ausente').length,
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
      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </Card>
        <Card className="p-3 text-center bg-success/5 border-success/20">
          <p className="text-2xl font-bold text-success">{stats.present}</p>
          <p className="text-xs text-muted-foreground">Presentes</p>
        </Card>
        <Card className="p-3 text-center bg-destructive/5 border-destructive/20">
          <p className="text-2xl font-bold text-destructive">{stats.absent}</p>
          <p className="text-xs text-muted-foreground">Ausentes</p>
        </Card>
        <Card className="p-3 text-center bg-warning/5 border-warning/20">
          <p className="text-2xl font-bold text-warning">{stats.justified}</p>
          <p className="text-xs text-muted-foreground">Justificados</p>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasExistingAttendance && (
            <Badge variant="outline" className="bg-primary/10 text-primary">
              Editando registro existente
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={markAllPresent}>
            Marcar todos presente
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || saveAttendance.isPending}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {saveAttendance.isPending ? 'Guardando...' : 'Guardar asistencia'}
          </Button>
        </div>
      </div>

      {/* Players Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Jugador</TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <CreditCard className="w-4 h-4" />
                  Pago
                </div>
              </TableHead>
              <TableHead className="text-center">Asistencia</TableHead>
              <TableHead>Motivo / Nota</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localPlayers.map((player) => (
              <TableRow key={player.player_id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{player.full_name}</p>
                    {player.position && (
                      <p className="text-xs text-muted-foreground">{player.position}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs',
                      player.payment_status === 'al_dia' && 'bg-success/10 text-success border-success/20',
                      player.payment_status === 'pendiente' && 'bg-warning/10 text-warning border-warning/20',
                      player.payment_status === 'atrasado' && 'bg-destructive/10 text-destructive border-destructive/20'
                    )}
                  >
                    {PAYMENT_STATUS_LABELS[player.payment_status as keyof typeof PAYMENT_STATUS_LABELS] || player.payment_status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center gap-1">
                    {ATTENDANCE_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const isSelected = player.status === option.value;
                      return (
                        <Button
                          key={option.value}
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updatePlayerStatus(player.player_id, option.value)}
                          className={cn(
                            'w-10 h-10 p-0',
                            isSelected && option.value === 'presente' && 'bg-success hover:bg-success/90',
                            isSelected && option.value === 'ausente' && 'bg-destructive hover:bg-destructive/90',
                            isSelected && option.value === 'justificado' && 'bg-warning hover:bg-warning/90'
                          )}
                          title={option.label}
                        >
                          <Icon className="w-5 h-5" />
                        </Button>
                      );
                    })}
                  </div>
                </TableCell>
                <TableCell>
                  {player.status !== 'presente' && (
                    <div className="flex gap-2">
                      <Select
                        value={player.notes?.split(':')[0] || ''}
                        onValueChange={(v) => updatePlayerNotes(player.player_id, v)}
                      >
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <SelectValue placeholder="Motivo..." />
                        </SelectTrigger>
                        <SelectContent>
                          {ABSENCE_REASONS.map((reason) => (
                            <SelectItem key={reason.value} value={reason.value}>
                              {reason.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
