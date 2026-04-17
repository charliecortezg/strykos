import { useParams, useNavigate } from 'react-router-dom';
import { useTrainingComponents, useTrainerProgress } from '@/hooks/useTraining';
import { LecturaView } from './LecturaView';
import { VideoView } from './VideoView';
import { ExamView } from './ExamView';
import { TareaCampoView } from './TareaCampoView';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function ComponentRouter() {
  const { moduleId, componentId } = useParams<{ moduleId: string; componentId: string }>();
  const navigate = useNavigate();
  const { data: components = [], isLoading: cLoading } = useTrainingComponents(moduleId);
  const { data: progress, isLoading: pLoading } = useTrainerProgress();

  if (cLoading || pLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const component = components.find((c) => c.id === componentId);
  if (!component || !moduleId) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/training/home')} className="-ml-2">
          <ArrowLeft className="mr-1 h-4 w-4" /> Volver al portal
        </Button>
        <p className="mt-4 text-muted-foreground">Componente no encontrado.</p>
      </div>
    );
  }

  const alreadyCompleted = !!progress?.components.find((cp) => cp.component_id === component.id && cp.completed);

  switch (component.component_type) {
    case 'lectura':
      return (
        <LecturaView
          componentId={component.id}
          moduleId={moduleId}
          title={component.title}
          content={component.content ?? null}
          documentUrl={component.document_url ?? null}
          documentSections={component.document_sections ?? null}
          readingGuide={component.reading_guide ?? null}
          alreadyCompleted={alreadyCompleted}
        />
      );
    case 'video':
      return (
        <VideoView
          componentId={component.id}
          moduleId={moduleId}
          title={component.title}
          videoUrl={component.video_url ?? ''}
          alreadyCompleted={alreadyCompleted}
        />
      );
    case 'examen':
      return <ExamView componentId={component.id} moduleId={moduleId} examTitle={component.title} />;
    case 'tarea_campo':
      return (
        <TareaCampoView
          componentId={component.id}
          moduleId={moduleId}
          title={component.title}
          description={component.content ?? ''}
          alreadyCompleted={alreadyCompleted}
        />
      );
    default:
      return <p className="p-6 text-muted-foreground">Tipo de componente no soportado.</p>;
  }
}
