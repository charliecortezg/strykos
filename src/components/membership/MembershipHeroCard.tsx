import { differenceInMonths } from 'date-fns';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Calendar, CheckCircle, BarChart3, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MembershipBlock } from '@/hooks/useMembershipBlocks';

const BLOCK_ICONS: Record<string, string> = {
  FOUNDATION: '🏗️',
  DEVELOPMENT: '📈',
  PROJECTION: '🚀',
  CONSOLIDATION: '🏆',
};

const NEXT_BLOCK_NAMES: Record<string, string> = {
  FOUNDATION: 'Desarrollo',
  DEVELOPMENT: 'Proyección',
  PROJECTION: 'Consolidación',
  CONSOLIDATION: '',
};

type PlayerStatus = 'elegible' | 'no_elegible' | 'en_revision' | 'en_progreso';

interface StatusConfig {
  label: string;
  color: string;
  bg: string;
  border: string;
}

const STATUS_MAP: Record<PlayerStatus, StatusConfig> = {
  en_progreso: {
    label: 'En progreso',
    color: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  en_revision: {
    label: 'En revisión',
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    border: 'border-amber-200 dark:border-amber-800',
  },
  no_elegible: {
    label: 'No elegible',
    color: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30',
    border: 'border-red-200 dark:border-red-800',
  },
  elegible: {
    label: 'Elegible para progresión',
    color: 'text-purple-700 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    border: 'border-purple-200 dark:border-purple-800',
  },
};

function computeStatus(
  eligibleForProgression: boolean,
  blockEndDate: string | null,
  daysRemaining: number,
  evalCount: number,
  minEvaluations: number,
  attendancePct: number,
  minAttendancePct: number,
): PlayerStatus {
  if (eligibleForProgression) return 'elegible';
  const now = new Date();
  if (blockEndDate && new Date(blockEndDate) < now && (evalCount < minEvaluations || attendancePct < minAttendancePct)) {
    return 'no_elegible';
  }
  if (daysRemaining <= 14 && (evalCount < minEvaluations || attendancePct < minAttendancePct)) {
    return 'en_revision';
  }
  return 'en_progreso';
}

function getMicrocopy(status: PlayerStatus, blockCode: string, evalCount: number, minEvals: number): string {
  const next = NEXT_BLOCK_NAMES[blockCode] || '';
  switch (status) {
    case 'elegible':
      return next ? `¡Listo para avanzar a ${next}!` : '¡Ha completado todo el camino formativo!';
    case 'no_elegible':
      return 'No cumplió los requisitos en el tiempo establecido.';
    case 'en_revision': {
      const missing = minEvals - evalCount;
      if (missing > 0) return `Completa ${missing} evaluación${missing > 1 ? 'es' : ''} más para avanzar.`;
      return 'Debe mejorar su asistencia para avanzar.';
    }
    default:
      return next ? `Está avanzando hacia ${next}.` : 'Continúa su camino formativo.';
  }
}

interface MembershipHeroCardProps {
  currentBlock: MembershipBlock | null;
  currentStage: string;
  blockStartDate: string | null;
  blockEndDate: string | null;
  evalCount: number;
  attendancePct: number;
  daysRemaining: number;
  eligibleForProgression: boolean;
}

export function MembershipHeroCard({
  currentBlock,
  currentStage,
  blockStartDate,
  blockEndDate,
  evalCount,
  attendancePct,
  daysRemaining,
  eligibleForProgression,
}: MembershipHeroCardProps) {
  // Fallback: no block assigned
  if (currentStage === 'none' || !currentBlock) {
    return (
      <Card className="border-muted bg-muted/30">
        <CardContent className="p-5 text-center">
          <Sparkles className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">El camino formativo aún no ha sido activado.</p>
        </CardContent>
      </Card>
    );
  }

  const status = computeStatus(
    eligibleForProgression,
    blockEndDate,
    daysRemaining,
    evalCount,
    currentBlock.min_evaluations,
    attendancePct,
    currentBlock.min_attendance_pct,
  );
  const statusConfig = STATUS_MAP[status];
  const icon = BLOCK_ICONS[currentBlock.code] || '🦁';

  // Month calculation
  const monthsElapsed = blockStartDate
    ? Math.min(differenceInMonths(new Date(), new Date(blockStartDate)) + 1, currentBlock.duration_months)
    : 1;

  // Temporal progress percentage
  const totalDays = blockStartDate && blockEndDate
    ? Math.max(1, Math.ceil((new Date(blockEndDate).getTime() - new Date(blockStartDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 1;
  const elapsedDays = blockStartDate
    ? Math.max(0, Math.ceil((Date.now() - new Date(blockStartDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const progressPct = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

  const evalsOk = evalCount >= currentBlock.min_evaluations;
  const attendanceOk = attendancePct >= currentBlock.min_attendance_pct;
  const microcopy = getMicrocopy(status, currentBlock.code, evalCount, currentBlock.min_evaluations);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10 overflow-hidden">
      <CardContent className="p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{icon}</span>
            <div>
              <h3 className="font-bold text-base leading-tight">{currentBlock.name}</h3>
              <p className="text-xs text-muted-foreground">
                Mes {monthsElapsed} de {currentBlock.duration_months}
              </p>
            </div>
          </div>
          {/* Status badge */}
          <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full border', statusConfig.bg, statusConfig.color, statusConfig.border)}>
            {statusConfig.label}
          </span>
        </div>

        {/* Temporal progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progreso del bloque</span>
            <span className="font-medium text-foreground">{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2.5" indicatorClassName="bg-primary" />
        </div>

        {/* Requirements grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Evaluations */}
          <div className="flex items-center gap-2 text-xs">
            <CheckCircle className={cn('w-4 h-4 shrink-0', evalsOk ? 'text-emerald-500' : 'text-muted-foreground')} />
            <div>
              <p className="text-muted-foreground">Evaluaciones</p>
              <p className={cn('font-semibold', evalsOk ? 'text-emerald-600' : 'text-foreground')}>
                {evalCount} / {currentBlock.min_evaluations}
              </p>
            </div>
          </div>
          {/* Attendance */}
          <div className="flex items-center gap-2 text-xs">
            <BarChart3 className={cn('w-4 h-4 shrink-0', attendanceOk ? 'text-emerald-500' : 'text-muted-foreground')} />
            <div>
              <p className="text-muted-foreground">Asistencia</p>
              <p className={cn('font-semibold', attendanceOk ? 'text-emerald-600' : 'text-foreground')}>
                {attendancePct}% <span className="font-normal text-muted-foreground">(mín. {currentBlock.min_attendance_pct}%)</span>
              </p>
            </div>
          </div>
        </div>

        {/* Dates & days remaining */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {blockStartDate && (
              <span>{format(new Date(blockStartDate), "d MMM yyyy", { locale: es })}</span>
            )}
            {blockStartDate && blockEndDate && <ArrowRight className="w-3 h-3" />}
            {blockEndDate && (
              <span>{format(new Date(blockEndDate), "d MMM yyyy", { locale: es })}</span>
            )}
          </div>
          {blockEndDate && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {daysRemaining}d restantes
            </span>
          )}
        </div>

        {/* Microcopy */}
        <p className="text-sm text-muted-foreground italic">{microcopy}</p>
      </CardContent>
    </Card>
  );
}
