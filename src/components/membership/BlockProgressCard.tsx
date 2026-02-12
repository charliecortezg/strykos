import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Calendar, Clock, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BlockProgressCardProps {
  blockName: string;
  evalCount: number;
  minEvaluations: number;
  attendancePct: number;
  minAttendancePct: number;
  blockEndDate: string | null;
  daysRemaining: number;
}

export function BlockProgressCard({
  blockName,
  evalCount,
  minEvaluations,
  attendancePct,
  minAttendancePct,
  blockEndDate,
  daysRemaining,
}: BlockProgressCardProps) {
  const evalPct = Math.min(100, (evalCount / Math.max(1, minEvaluations)) * 100);
  const attendanceOk = attendancePct >= minAttendancePct;
  const evalsOk = evalCount >= minEvaluations;

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Progreso: {blockName}</h3>
          {blockEndDate && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {daysRemaining}d restantes
            </span>
          )}
        </div>

        {/* Evaluations */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <CheckCircle className={`w-3.5 h-3.5 ${evalsOk ? 'text-emerald-500' : ''}`} />
              Evaluaciones
            </span>
            <span className={evalsOk ? 'text-emerald-600 font-medium' : 'text-foreground'}>
              {evalCount} / {minEvaluations}
            </span>
          </div>
          <Progress value={evalPct} className="h-2" />
        </div>

        {/* Attendance */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <BarChart3 className={`w-3.5 h-3.5 ${attendanceOk ? 'text-emerald-500' : ''}`} />
              Asistencia
            </span>
            <span className={attendanceOk ? 'text-emerald-600 font-medium' : 'text-foreground'}>
              {attendancePct}% / {minAttendancePct}%
            </span>
          </div>
          <Progress value={Math.min(100, (attendancePct / Math.max(1, minAttendancePct)) * 100)} className="h-2" />
        </div>

        {/* Cutoff date */}
        {blockEndDate && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t">
            <Calendar className="w-3.5 h-3.5" />
            Fecha de corte: {format(new Date(blockEndDate), "d 'de' MMMM, yyyy", { locale: es })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
