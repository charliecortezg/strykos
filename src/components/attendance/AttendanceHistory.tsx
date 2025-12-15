import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Users, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAttendanceHistory } from '@/hooks/useTrainingAttendance';
import { cn } from '@/lib/utils';

interface AttendanceHistoryProps {
  categoryId: string;
}

export function AttendanceHistory({ categoryId }: AttendanceHistoryProps) {
  const { history, isLoading } = useAttendanceHistory(categoryId);

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Sin historial</h3>
        <p className="text-muted-foreground">
          Aún no hay entrenamientos registrados para esta categoría
        </p>
      </Card>
    );
  }

  // Calculate overall stats
  const totalSessions = history.length;
  const avgAttendance = history.length > 0
    ? Math.round(history.reduce((acc, h) => acc + (h.present / h.total) * 100, 0) / history.length)
    : 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <Calendar className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold">{totalSessions}</p>
          <p className="text-xs text-muted-foreground">Entrenamientos</p>
        </Card>
        <Card className="p-4 text-center">
          <CheckCircle className="w-6 h-6 text-success mx-auto mb-2" />
          <p className="text-2xl font-bold">{avgAttendance}%</p>
          <p className="text-xs text-muted-foreground">Asistencia promedio</p>
        </Card>
        <Card className="p-4 text-center">
          <Users className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-2xl font-bold text-success">
            {history.reduce((acc, h) => acc + h.present, 0)}
          </p>
          <p className="text-xs text-muted-foreground">Total presentes</p>
        </Card>
        <Card className="p-4 text-center">
          <XCircle className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-2xl font-bold text-destructive">
            {history.reduce((acc, h) => acc + h.absent, 0)}
          </p>
          <p className="text-xs text-muted-foreground">Total ausencias</p>
        </Card>
      </div>

      {/* History Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Fecha</TableHead>
              <TableHead className="text-center">Total</TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle className="w-4 h-4 text-success" />
                  Presentes
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <XCircle className="w-4 h-4 text-destructive" />
                  Ausentes
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <AlertCircle className="w-4 h-4 text-warning" />
                  Justificados
                </div>
              </TableHead>
              <TableHead className="text-center">Asistencia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((session) => {
              const attendanceRate = Math.round((session.present / session.total) * 100);
              return (
                <TableRow key={session.date}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {format(new Date(session.date), "EEEE d", { locale: es })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(session.date), "MMMM yyyy", { locale: es })}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-medium">{session.total}</TableCell>
                  <TableCell className="text-center">
                    <span className="text-success font-medium">{session.present}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-destructive font-medium">{session.absent}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-warning font-medium">{session.justified}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={cn(
                        attendanceRate >= 80 && 'bg-success/10 text-success border-success/20',
                        attendanceRate >= 50 && attendanceRate < 80 && 'bg-warning/10 text-warning border-warning/20',
                        attendanceRate < 50 && 'bg-destructive/10 text-destructive border-destructive/20'
                      )}
                    >
                      {attendanceRate}%
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
