import { CheckCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { MembershipBlock } from '@/hooks/useMembershipBlocks';

interface MembershipTimelineProps {
  blocks: MembershipBlock[];
  currentStage: string;
}

const STAGE_ORDER = ['FOUNDATION', 'DEVELOPMENT', 'PROJECTION', 'CONSOLIDATION'];

const BLOCK_COLORS: Record<string, { active: string; completed: string }> = {
  FOUNDATION: {
    active: 'bg-blue-500 text-white border-blue-500',
    completed: 'bg-blue-500/20 text-blue-600 border-blue-500',
  },
  DEVELOPMENT: {
    active: 'bg-emerald-500 text-white border-emerald-500',
    completed: 'bg-emerald-500/20 text-emerald-600 border-emerald-500',
  },
  PROJECTION: {
    active: 'bg-amber-500 text-white border-amber-500',
    completed: 'bg-amber-500/20 text-amber-600 border-amber-500',
  },
  CONSOLIDATION: {
    active: 'bg-purple-500 text-white border-purple-500',
    completed: 'bg-purple-500/20 text-purple-600 border-purple-500',
  },
};

const BLOCK_ICONS: Record<string, string> = {
  FOUNDATION: '🏗️',
  DEVELOPMENT: '📈',
  PROJECTION: '🚀',
  CONSOLIDATION: '🏆',
};

export function MembershipTimeline({ blocks, currentStage }: MembershipTimelineProps) {
  const currentIdx = STAGE_ORDER.indexOf(currentStage);

  return (
    <TooltipProvider delayDuration={200}>
      {/* Desktop: horizontal */}
      <div className="hidden md:flex items-center justify-between gap-1 sm:gap-2 w-full py-2">
        {blocks.map((block, index) => {
          const stageIdx = STAGE_ORDER.indexOf(block.code);
          const isCompleted = currentIdx > stageIdx;
          const isCurrent = block.code === currentStage;
          const isFuture = currentIdx < stageIdx;
          const colors = BLOCK_COLORS[block.code] || BLOCK_COLORS.FOUNDATION;

          return (
            <div key={block.id} className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center gap-1 flex-1 min-w-0 cursor-default">
                    <div
                      className={cn(
                        'w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 transition-all',
                        isCurrent && colors.active,
                        isCompleted && colors.completed,
                        isFuture && 'bg-muted/50 text-muted-foreground border-muted-foreground/20',
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                      ) : (
                        <span className="text-lg">{BLOCK_ICONS[block.code]}</span>
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-[10px] sm:text-xs font-medium text-center truncate w-full',
                        isCurrent && 'text-foreground font-semibold',
                        isCompleted && 'text-muted-foreground',
                        isFuture && 'text-muted-foreground/60',
                      )}
                    >
                      {block.name}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs space-y-0.5">
                  <p className="font-semibold">{block.name}</p>
                  <p>Duración: {block.duration_months} meses</p>
                  <p>Evaluaciones mín: {block.min_evaluations}</p>
                  <p>Asistencia mín: {block.min_attendance_pct}%</p>
                </TooltipContent>
              </Tooltip>
              {index < blocks.length - 1 && (
                <ArrowRight
                  className={cn(
                    'w-4 h-4 shrink-0 mt-[-16px]',
                    currentIdx > index ? 'text-primary' : 'text-muted-foreground/30',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical */}
      <div className="md:hidden flex flex-col relative pl-6 py-2">
        {/* Vertical line */}
        <div className="absolute left-[18px] top-4 bottom-4 w-0.5 bg-muted-foreground/20" />
        {blocks.map((block) => {
          const stageIdx = STAGE_ORDER.indexOf(block.code);
          const isCompleted = currentIdx > stageIdx;
          const isCurrent = block.code === currentStage;
          const isFuture = currentIdx < stageIdx;
          const colors = BLOCK_COLORS[block.code] || BLOCK_COLORS.FOUNDATION;

          return (
            <div key={block.id} className="flex items-center gap-3 py-2 relative">
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center border-2 shrink-0 z-10 -ml-6',
                  isCurrent && colors.active,
                  isCompleted && colors.completed,
                  isFuture && 'bg-muted/50 text-muted-foreground border-muted-foreground/20',
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <span className="text-sm">{BLOCK_ICONS[block.code]}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className={cn(
                  'text-sm font-medium',
                  isCurrent && 'font-semibold text-foreground',
                  isCompleted && 'text-muted-foreground',
                  isFuture && 'text-muted-foreground/60',
                )}>
                  {block.name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {block.duration_months} meses · {block.min_evaluations} evals · {block.min_attendance_pct}% asist.
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
