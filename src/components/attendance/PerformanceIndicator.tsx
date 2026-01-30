import { cn } from '@/lib/utils';
import { HelpCircle } from 'lucide-react';
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
    description: 'Actitud y desempeño ejemplar',
    bgColor: 'bg-success',
    ringColor: 'ring-success/30',
  },
  focus: {
    label: 'Enfoque',
    description: 'Requiere mejorar concentración',
    bgColor: 'bg-warning',
    ringColor: 'ring-warning/30',
  },
  challenge: {
    label: 'Reto',
    description: 'Atención inmediata requerida',
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
        <TooltipContent side="top" className="text-sm max-w-[180px]">
          <p className="font-medium">{config.label}</p>
          <p className="text-xs text-muted-foreground">{config.description}</p>
          <p className="text-xs text-muted-foreground/70 mt-1 italic">Tap para cambiar</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Stats display component for header with help tooltip
interface PerformanceStatsProps {
  excellent: number;
  focus: number;
  challenge: number;
  showHelp?: boolean;
}

export function PerformanceStats({ excellent, focus, challenge, showHelp = false }: PerformanceStatsProps) {
  return (
    <TooltipProvider delayDuration={300}>
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
        {showHelp && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                <HelpCircle className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end" className="max-w-[280px] p-3">
              <p className="font-semibold mb-2">Semáforo de Rendimiento</p>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded-full bg-success mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Excelente:</span> Actitud y esfuerzo ejemplar en el entrenamiento.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded-full bg-warning mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Enfoque:</span> Necesita mejorar concentración o actitud esta semana.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Reto:</span> Requiere atención inmediata del cuerpo técnico.
                  </div>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

// Exportamos el config para uso externo si se necesita
export { PERFORMANCE_CONFIG };
