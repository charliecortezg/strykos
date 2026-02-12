import { CheckCircle, Circle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
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
    <div className="flex items-center justify-between gap-1 sm:gap-2 w-full overflow-x-auto py-2">
      {blocks.map((block, index) => {
        const stageIdx = STAGE_ORDER.indexOf(block.code);
        const isCompleted = currentIdx > stageIdx;
        const isCurrent = block.code === currentStage;
        const isFuture = currentIdx < stageIdx;
        const colors = BLOCK_COLORS[block.code] || BLOCK_COLORS.FOUNDATION;

        return (
          <div key={block.id} className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
            <div
              className={cn(
                'flex flex-col items-center gap-1 flex-1 min-w-0',
              )}
            >
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
  );
}
