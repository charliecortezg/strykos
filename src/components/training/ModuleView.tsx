import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTrainingComponents, useTrainerProgress, useTrainingModules } from '@/hooks/useTraining';
import { ComponentCard } from './ComponentCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

export function ModuleView() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { data: components = [], isLoading: compsLoading } = useTrainingComponents(moduleId);
  const { data: progress, isLoading: progressLoading } = useTrainerProgress();
  const { data: modules = [] } = useTrainingModules();

  const module = modules.find((m) => m.id === moduleId);
  const isLoading = compsLoading || progressLoading;

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const componentsWithProgress = components.map((comp) => {
    const cp = progress?.components.find((c) => c.component_id === comp.id);
    return { ...comp, completed: !!cp?.completed };
  });

  const completedCount = componentsWithProgress.filter((c) => c.completed).length;
  const totalComps = componentsWithProgress.length;
  const progressPercent = totalComps > 0 ? (completedCount / totalComps) * 100 : 0;

  const isComponentAccessible = (idx: number): boolean => {
    if (idx === 0) return true;
    return componentsWithProgress[idx - 1]?.completed === true;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/training/home')} className="-ml-2 mb-2">
          <ArrowLeft className="mr-1 h-4 w-4" /> Volver
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{module?.title ?? 'Módulo'}</h1>
        {module?.description && <p className="mt-1 text-muted-foreground">{module.description}</p>}
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-medium">
              {completedCount} de {totalComps} completados
            </span>
            <span className="text-muted-foreground">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-3" />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {componentsWithProgress.map((comp, idx) => (
          <ComponentCard
            key={comp.id}
            component={comp}
            completed={comp.completed}
            isAccessible={isComponentAccessible(idx)}
            componentIndex={idx + 1}
            totalComponents={totalComps}
          />
        ))}
      </div>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            💡 Los componentes se desbloquean en orden. Completa cada uno para acceder al siguiente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
