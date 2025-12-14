import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, User, TrendingUp, Calendar, CreditCard, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePlayerAttendance } from '@/hooks/usePlayerAttendance';
import { PAYMENT_STATUS_LABELS, ATTENDANCE_STATUS_LABELS, type Player } from '@/types/categories';

interface PlayerProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: Player | null;
}

export function PlayerProfileModal({ open, onOpenChange, player }: PlayerProfileModalProps) {
  const { attendance, stats, isLoading } = usePlayerAttendance(player?.id || null);

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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="bg-primary/5 p-6 border-b border-border">
          <DialogHeader className="mb-4">
            <DialogTitle className="font-display text-2xl flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              {player.full_name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
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

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 p-6 border-b border-border">
          <div className="text-center">
            <p className="text-2xl font-display font-semibold text-primary">{stats.attendanceRate}%</p>
            <p className="text-xs text-muted-foreground">Asistencia</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-display font-semibold text-foreground">—</p>
            <p className="text-xs text-muted-foreground">Partidos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-display font-semibold text-foreground">—</p>
            <p className="text-xs text-muted-foreground">Pagos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-display font-semibold text-foreground">—</p>
            <p className="text-xs text-muted-foreground">Puntos</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="p-6">
          <Tabs defaultValue="historial" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="historial">Historial</TabsTrigger>
              <TabsTrigger value="partidos">Partidos</TabsTrigger>
              <TabsTrigger value="pagos">Pagos</TabsTrigger>
              <TabsTrigger value="documentos">Documentos</TabsTrigger>
            </TabsList>

            <TabsContent value="historial" className="space-y-4">
              {/* Attendance Summary */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
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
              {isLoading ? (
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
                          {record.notes && (
                            <p className="text-xs text-muted-foreground">{record.notes}</p>
                          )}
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

            <TabsContent value="partidos">
              <div className="p-8 text-center text-muted-foreground">
                <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>Módulo de partidos próximamente.</p>
              </div>
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

            <TabsContent value="documentos">
              <div className="p-8 text-center text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>Documentos próximamente.</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
