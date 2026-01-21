import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { User, Calendar, CreditCard, CheckCircle, XCircle, AlertCircle, Trophy, Target } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePlayerAttendance, usePlayerMatches } from '@/hooks/usePlayerAttendance';
import { PAYMENT_STATUS_LABELS, ATTENDANCE_STATUS_LABELS, type Player } from '@/types/categories';
import { getMatchResult } from '@/types/matches';
import { cn } from '@/lib/utils';

interface PlayerProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: Player | null;
}

export function PlayerProfileModal({ open, onOpenChange, player }: PlayerProfileModalProps) {
  const { attendance, stats, isLoading: loadingAttendance } = usePlayerAttendance(player?.id || null);
  const { matches, matchStats, isLoading: loadingMatches } = usePlayerMatches(player?.id || null);

  if (!player) return null;

  const getPaymentBadgeClass = (status: string) => {
    switch (status) {
      case 'al_dia': return 'bg-success text-success-foreground';
      case 'pendiente': return 'bg-warning text-warning-foreground';
      case 'atrasado': return 'bg-destructive text-destructive-foreground';
      default: return '';
    }
  };

  const getAttendanceIcon = (status: string) => {
    switch (status) {
      case 'presente': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'ausente': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'justificado': return <AlertCircle className="w-4 h-4 text-warning" />;
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] max-h-[85dvh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Fixed Header - won't scroll */}
        <div className="flex-shrink-0 bg-primary/5 p-4 sm:p-6 border-b border-border">
          <DialogHeader className="mb-3">
            <DialogTitle className="font-display text-xl sm:text-2xl flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <span className="truncate">{player.full_name}</span>
              {player.is_trial && (
                <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/20 flex-shrink-0">
                  Clase Muestra
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{player.category?.name || 'Sin categoría'}</span>
            {player.position && (
              <>
                <span>•</span>
                <span>{player.position}</span>
              </>
            )}
            {player.is_scholarship && (
              <Badge variant="outline" className="text-xs">Becado</Badge>
            )}
            <Badge className={getPaymentBadgeClass(player.payment_status)}>
              {PAYMENT_STATUS_LABELS[player.payment_status]}
            </Badge>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain min-h-0">
          {/* KPIs - inside scrollable area */}
          <div className="grid grid-cols-4 gap-2 sm:gap-4 p-4 sm:p-6 border-b border-border">
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-display font-semibold text-primary">{stats.attendanceRate}%</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Asistencia</p>
            </div>
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-display font-semibold text-foreground">{matchStats.attended}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Partidos</p>
            </div>
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-display font-semibold text-success">{matchStats.goals}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Goles</p>
            </div>
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-display font-semibold text-primary">{matchStats.assists}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Asistencias</p>
            </div>
          </div>

          {/* Tabs - inside scrollable area */}
          <div className="p-4 sm:p-6">
            <Tabs defaultValue="asistencia" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="asistencia" className="text-xs sm:text-sm">Asistencia</TabsTrigger>
                <TabsTrigger value="partidos" className="text-xs sm:text-sm">Partidos</TabsTrigger>
                <TabsTrigger value="pagos" className="text-xs sm:text-sm">Pagos</TabsTrigger>
                <TabsTrigger value="info" className="text-xs sm:text-sm">Info</TabsTrigger>
              </TabsList>

            {/* Attendance Tab */}
            <TabsContent value="asistencia" className="space-y-4">
              {/* Attendance Summary */}
              <div className="grid grid-cols-4 gap-3 p-4 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <p className="text-lg font-semibold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-success">{stats.present}</p>
                  <p className="text-xs text-muted-foreground">Presentes</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-destructive">{stats.absent}</p>
                  <p className="text-xs text-muted-foreground">Ausencias</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-warning">{stats.justified}</p>
                  <p className="text-xs text-muted-foreground">Justificadas</p>
                </div>
              </div>

              {/* Attendance List */}
              {loadingAttendance ? (
                <div className="p-8 text-center">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : attendance.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Calendar className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>No hay registros de asistencia.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {attendance.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getAttendanceIcon(record.status)}
                        <div>
                          <p className="text-sm font-medium">
                            {format(new Date(record.date), "EEEE d 'de' MMMM", { locale: es })}
                          </p>
                          <div className="flex items-center gap-2">
                            {record.category && (
                              <span className="text-xs text-muted-foreground">{record.category.name}</span>
                            )}
                            {record.notes && (
                              <span className="text-xs text-muted-foreground">• {record.notes}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {ATTENDANCE_STATUS_LABELS[record.status]}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Matches Tab */}
            <TabsContent value="partidos" className="space-y-4">
              {/* Match Stats Summary */}
              <div className="grid grid-cols-4 gap-3 p-4 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <p className="text-lg font-semibold">{matchStats.total}</p>
                  <p className="text-xs text-muted-foreground">Convocado</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-success">{matchStats.attended}</p>
                  <p className="text-xs text-muted-foreground">Jugados</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-primary">{matchStats.goals}</p>
                  <p className="text-xs text-muted-foreground">Goles</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-warning">{matchStats.assists}</p>
                  <p className="text-xs text-muted-foreground">Asistencias</p>
                </div>
              </div>

              {/* Match List */}
              {loadingMatches ? (
                <div className="p-8 text-center">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : matches.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Trophy className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>No hay registros de partidos.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {matches.map((mp) => {
                    const match = mp.match as any;
                    if (!match) return null;
                    
                    const result = getMatchResult(match.goals_for, match.goals_against);
                    const isFinished = match.status === 'terminado';
                    const sportName = match.category?.sports?.name?.toLowerCase() || '';
                    const isFutbol = sportName.includes('fútbol') || sportName.includes('futbol') || sportName.includes('soccer') || sportName.includes('football');
                    
                    // Position labels for football
                    const positionLabels: Record<string, string> = {
                      portero: 'POR',
                      defensa: 'DEF',
                      medio: 'MED',
                      delantero: 'DEL',
                    };
                    
                    // Match type labels
                    const matchTypeLabels: Record<string, string> = {
                      liga: 'Liga',
                      torneo: 'Torneo',
                      amistoso: 'Amistoso',
                    };
                    
                    return (
                      <div
                        key={mp.id}
                        className={cn(
                          "p-3 bg-muted/20 rounded-lg",
                          !mp.attended && "opacity-60"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 min-w-0">
                            <Trophy className={cn(
                              "w-4 h-4 mt-0.5 flex-shrink-0",
                              mp.attended ? "text-success" : "text-muted-foreground"
                            )} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium">
                                  vs {match.rival_name}
                                </p>
                                {/* Match result badge */}
                                {isFinished && (
                                  <Badge className={cn(
                                    "text-xs px-1.5",
                                    result === 'victoria' && "bg-success/10 text-success",
                                    result === 'empate' && "bg-warning/10 text-warning",
                                    result === 'derrota' && "bg-destructive/10 text-destructive"
                                  )}>
                                    {match.goals_for}-{match.goals_against}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                                <span>{format(new Date(match.match_date), "d MMM yyyy", { locale: es })}</span>
                                {match.category?.name && (
                                  <span>• {match.category.name}</span>
                                )}
                                {match.match_type && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                                    {matchTypeLabels[match.match_type] || match.match_type}
                                  </Badge>
                                )}
                              </div>
                              {/* Position played for football */}
                              {mp.attended && isFutbol && mp.position && (
                                <div className="mt-1">
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {positionLabels[mp.position] || mp.position}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Player stats for this match */}
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            {mp.attended ? (
                              <div className="flex items-center gap-1">
                                {isFutbol ? (
                                  <>
                                    {mp.goals > 0 && (
                                      <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs px-1.5">
                                        {mp.goals} ⚽
                                      </Badge>
                                    )}
                                    {mp.assists > 0 && (
                                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs px-1.5">
                                        {mp.assists} 🅰️
                                      </Badge>
                                    )}
                                    {mp.goals === 0 && mp.assists === 0 && (
                                      <span className="text-xs text-muted-foreground">—</span>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    {mp.points > 0 && (
                                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs px-1.5">
                                        {mp.points} pts
                                      </Badge>
                                    )}
                                  </>
                                )}
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                No jugó
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="pagos">
              <div className="p-8 text-center text-muted-foreground">
                <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>Historial de pagos próximamente.</p>
                {player.monthly_fee && (
                  <p className="mt-2 text-sm">
                    Cuota mensual: <span className="font-semibold">${player.monthly_fee}</span>
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="info">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Teléfono</p>
                    <p className="font-medium">{player.phone || '—'}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Tutor</p>
                    <p className="font-medium">{player.tutor_name || '—'}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Plan</p>
                    <p className="font-medium">{player.plan || '—'}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Posición</p>
                    <p className="font-medium">{player.position || '—'}</p>
                  </div>
                </div>
                {player.is_trial && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      <p className="font-medium text-primary">Jugador en Clase Muestra</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Este jugador asistió a una clase de prueba. Puedes convertirlo en jugador regular editando su perfil.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
        </div> {/* End scrollable content area */}
      </DialogContent>
    </Dialog>
  );
}
