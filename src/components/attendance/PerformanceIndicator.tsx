import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type PerformanceStatus = 'excellent' | 'focus' | 'challenge';

interface PerformanceIndicatorProps {
  status: PerformanceStatus;
  onChange: (status: PerformanceStatus) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

const PERFORMANCE_CONFIG = {
  excellent: {
    label: 'Excelente',
    bgColor: 'bg-success',
    ringColor: 'ring-success/30',
  },
  focus: {
    label: 'Enfoque',
    bgColor: 'bg-warning',
    ringColor: 'ring-warning/30',
  },
  challenge: {
    label: 'Reto',
    bgColor: 'bg-destructive',
    ringColor: 'ring-destructive/30',
  },
} as const;

const CYCLE_ORDER: PerformanceStatus[] = ['excellent', 'focus', 'challenge'];

export function PerformanceIndicator({ 
  status, 
  onChange, 
  disabled = false,
  size = 'md' 
}: PerformanceIndicatorProps) {
  const config = PERFORMANCE_CONFIG[status];
  
  const handleCycle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    
    const currentIndex = CYCLE_ORDER.indexOf(status);
    const nextIndex = (currentIndex + 1) % CYCLE_ORDER.length;
    onChange(CYCLE_ORDER[nextIndex]);
  };

  const sizeClasses = size === 'sm' 
    ? 'w-5 h-5 min-w-[20px]' 
    : 'w-8 h-8 min-w-[32px]';

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleCycle}
            disabled={disabled}
            className={cn(
              'rounded-full ring-2 transition-all duration-200 flex-shrink-0',
              'active:scale-90 focus:outline-none focus-visible:ring-offset-2',
              config.bgColor,
              config.ringColor,
              sizeClasses,
              disabled && 'opacity-50 cursor-not-allowed',
              !disabled && 'hover:ring-4 cursor-pointer'
            )}
            aria-label={`Rendimiento: ${config.label}. Tap para cambiar.`}
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-sm">
          <p className="font-medium">{config.label}</p>
          <p className="text-xs text-muted-foreground">Tap para cambiar</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Stats display component for header
interface PerformanceStatsProps {
  excellent: number;
  focus: number;
  challenge: number;
}

export function PerformanceStats({ excellent, focus, challenge }: PerformanceStatsProps) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-full bg-success" />
        <span className="font-medium">{excellent}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-full bg-warning" />
        <span className="font-medium">{focus}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-full bg-destructive" />
        <span className="font-medium">{challenge}</span>
      </div>
    </div>
  );
}
