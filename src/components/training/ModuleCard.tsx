import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, PlayCircle, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { ModuleProgressStatus, TrainingModule } from '@/types/training';

interface ModuleCardProps {
  module: TrainingModule;
  status: ModuleProgressStatus;
  completedComps: number;
  totalComps: number;
  progressPercent: number;
}

export function ModuleCard({ module, status, completedComps, totalComps, progressPercent }: ModuleCardProps) {
  const navigate = useNavigate();

  const StatusIcon = status === 'completed' ? CheckCircle2 : status === 'in_progress' ? PlayCircle : Circle;
  const statusColor =
    status === 'completed' ? 'text-success' : status === 'in_progress' ? 'text-primary' : 'text-muted-foreground';

  return (
    <Card
      className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
      onClick={() => navigate(`/training/modules/${module.id}`)}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <StatusIcon className={`mt-1 h-6 w-6 shrink-0 ${statusColor}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="font-semibold leading-tight">
                  Módulo {module.module_order}: {module.title}
                </h4>
                {module.description && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{module.description}</p>
                )}
              </div>
              <Badge variant="outline" className="shrink-0 gap-1">
                <Clock className="h-3 w-3" />
                {module.estimated_minutes} min
              </Badge>
            </div>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>
                  {completedComps} de {totalComps} componentes
                </span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
