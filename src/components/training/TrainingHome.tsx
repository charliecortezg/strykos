import { useAuth } from '@/contexts/AuthContext';
import { useTrainingModules, useTrainerProgress, useTrainerCertifications } from '@/hooks/useTraining';
import { ModuleCard } from './ModuleCard';
import { CertificationBadge } from './CertificationBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useTrainingComponents } from '@/hooks/useTraining';
import { useQueries } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function TrainingHome() {
  const { user } = useAuth();
  const { data: modules = [], isLoading: modulesLoading } = useTrainingModules('WL-C1');
  const { data: progress, isLoading: progressLoading } = useTrainerProgress();
  const { data: certifications = [], isLoading: certsLoading } = useTrainerCertifications();

  // Fetch components for all modules to compute per-module progress
  const componentQueries = useQueries({
    queries: modules.map((m) => ({
      queryKey: ['training-components', m.id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('training_components')
          .select('id')
          .eq('module_id', m.id)
          .eq('is_active', true);
        if (error) throw error;
        return data || [];
      },
      enabled: modules.length > 0,
    })),
  });

  const isLoading = modulesLoading || progressLoading || certsLoading;

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const modulesWithProgress = modules.map((mod, idx) => {
    const modProgress = progress?.modules.find((mp) => mp.module_id === mod.id);
    const moduleCompIds = (componentQueries[idx]?.data || []).map((c) => c.id);
    const completedComps = (progress?.components || []).filter(
      (cp) => moduleCompIds.includes(cp.component_id) && cp.completed
    ).length;
    const totalComps = moduleCompIds.length;
    return {
      module: mod,
      status: modProgress?.status ?? 'not_started',
      completedComps,
      totalComps,
      progressPercent: totalComps > 0 ? (completedComps / totalComps) * 100 : 0,
    };
  });

  const currentCert = certifications[0] ?? null;
  const allModulesComplete =
    modulesWithProgress.length > 0 && modulesWithProgress.every((m) => m.status === 'completed');
  const completedCount = modulesWithProgress.filter((m) => m.status === 'completed').length;
  const overallPercent =
    modulesWithProgress.length > 0 ? (completedCount / modulesWithProgress.length) * 100 : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Portal de Capacitación White Lions</h1>
        <p className="mt-1 text-muted-foreground">
          Bienvenido{user?.full_name ? `, ${user.full_name}` : ''}
        </p>
      </header>

      <Card className="border-l-4 border-l-primary">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Tu nivel actual</p>
            <CertificationBadge level={currentCert?.certification_level ?? null} />
          </div>
          {allModulesComplete && !currentCert && (
            <div className="text-right">
              <p className="font-semibold text-success">¡Apto para certificación!</p>
              <p className="text-xs text-muted-foreground">Espera confirmación del Director Deportivo</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h2 className="text-lg font-bold">WL-C1 · Entrenador Base</h2>
          <div className="mt-4">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium">
                {completedCount} de {modulesWithProgress.length} módulos completados
              </span>
              <span className="text-muted-foreground">{Math.round(overallPercent)}%</span>
            </div>
            <Progress value={overallPercent} className="h-3" />
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h3 className="text-base font-bold">Módulos de Aprendizaje</h3>
        {modulesWithProgress.map(({ module, status, completedComps, totalComps, progressPercent }) => (
          <ModuleCard
            key={module.id}
            module={module}
            status={status}
            completedComps={completedComps}
            totalComps={totalComps}
            progressPercent={progressPercent}
          />
        ))}
      </section>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-5">
          <h4 className="font-bold">¿Cómo funciona la certificación?</h4>
          <p className="mt-2 text-sm text-muted-foreground">
            Completa los 4 módulos de WL-C1 (lecturas, videos, exámenes y tareas de campo). Cuando todos
            estén completados, el Director Deportivo verificará tu progreso y emitirá la certificación.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Cada examen requiere 70% mínimo para aprobar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
