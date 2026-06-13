import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle, XCircle, AlertTriangle, Users, Clock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCategories } from '@/hooks/useCategories';
import { useDirectorAttendance } from '@/hooks/useDirectorAttendance';
import { PerformanceIndicator } from '@/components/attendance/PerformanceIndicator';
import { useOrgFeatures } from '@/hooks/useOrgFeatures';
import { cn } from '@/lib/utils';

export function DirectorAttendanceView() {
  const { categories } = useCategories();
  const { isEnabled } = useOrgFeatures();
  const strykWayEnabled = isEnabled('stryk_way');
  const activeCategories = categories.filter(c => c.is_active);
  const [categoryId, setCategoryId] = useState<string>('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { records, categoryPlayers, lowAttendancePlayers, stats, isLoading } = useDirectorAttendance(
    categoryId || null,
    date || null
  );

  // Build a map of attendance records by player_id
  const attendanceMap = new Map(records.map(r => [r.player_id, r]));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Asistencia por Categoría</h2>
        <p className="text-sm text-muted-foreground">Vista de solo lectura de la asistencia diaria</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Categoría</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona categoría" />
            </SelectTrigger>
            <SelectContent>
              {activeCategories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Fecha</Label>
          <Input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
      </div>

      {!categoryId && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>Selecciona una categoría para ver la asistencia</p>
        </div>
      )}

      {categoryId && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-success">{stats.present}</p>
              <p className="text-xs text-muted-foreground">Presentes</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-destructive">{stats.absent}</p>
              <p className="text-xs text-muted-foreground">Ausentes</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-warning">{stats.justified}</p>
              <p className="text-xs text-muted-foreground">Justificados</p>
            </Card>
            <Card className="p-4 text-center">
              <p className={cn("text-2xl font-bold", stats.attendanceRate >= 70 ? "text-success" : stats.attendanceRate >= 50 ? "text-warning" : "text-destructive")}>
                {stats.attendanceRate}%
              </p>
              <p className="text-xs text-muted-foreground">Asistencia</p>
            </Card>
          </div>

          {/* Low attendance alerts */}
          {lowAttendancePlayers.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Jugadores en riesgo</AlertTitle>
              <AlertDescription>
                {lowAttendancePlayers.map(p => (
                  <span key={p.player_id} className="inline-flex items-center gap-1 mr-3">
                    <strong>{p.full_name}</strong> ({p.rate}%)
                  </span>
                ))}
                <span className="block text-xs mt-1">Menos de 50% de asistencia en las últimas 4 semanas</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Player list */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {format(new Date(date), "EEEE d 'de' MMMM, yyyy", { locale: es })}
              </p>
              {categoryPlayers.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No hay jugadores en esta categoría</p>
              ) : (
                <div className="space-y-1.5">
                  {categoryPlayers.map(player => {
                    const record = attendanceMap.get(player.id);
                    const status = record?.status || 'sin_registro';
                    const perfStatus = record?.performance_status;

                    return (
                      <div
                        key={player.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border",
                          status === 'presente' && "bg-success/5 border-success/20",
                          status === 'ausente' && "bg-destructive/5 border-destructive/20",
                          status === 'justificado' && "bg-warning/5 border-warning/20",
                          status === 'sin_registro' && "bg-muted/30 border-border"
                        )}
                      >
                        {/* Status icon */}
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                          status === 'presente' && "bg-success text-success-foreground",
                          status === 'ausente' && "bg-destructive text-destructive-foreground",
                          status === 'justificado' && "bg-warning text-warning-foreground",
                          status === 'sin_registro' && "bg-muted text-muted-foreground"
                        )}>
                          {status === 'presente' && <CheckCircle className="w-4 h-4" />}
                          {status === 'ausente' && <XCircle className="w-4 h-4" />}
                          {status === 'justificado' && <Clock className="w-4 h-4" />}
                          {status === 'sin_registro' && <span className="text-xs">—</span>}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{player.full_name}</p>
                          <p className="text-xs text-muted-foreground">{player.position || 'Sin posición'}</p>
                        </div>

                        {/* Performance indicator - gated by stryk_way */}
                        {strykWayEnabled && perfStatus && (
                          <PerformanceIndicator status={perfStatus as any} size="sm" onChange={() => {}} disabled />
                        )}

                        {/* Status badge */}
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] shrink-0",
                            status === 'presente' && "bg-success/10 text-success border-success/20",
                            status === 'ausente' && "bg-destructive/10 text-destructive border-destructive/20",
                            status === 'justificado' && "bg-warning/10 text-warning border-warning/20",
                            status === 'sin_registro' && "bg-muted text-muted-foreground"
                          )}
                        >
                          {status === 'presente' ? 'Presente' : status === 'ausente' ? 'Ausente' : status === 'justificado' ? 'Justificado' : 'Sin registro'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
