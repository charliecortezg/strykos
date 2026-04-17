import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock } from 'lucide-react';
import { useCompleteComponent } from '@/hooks/useTraining';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

interface TareaCampoViewProps {
  componentId: string;
  moduleId: string;
  title: string;
  description: string;
  alreadyCompleted: boolean;
}

export function TareaCampoView({
  componentId,
  moduleId,
  title,
  description,
  alreadyCompleted,
}: TareaCampoViewProps) {
  const navigate = useNavigate();
  const completeComponent = useCompleteComponent();

  const handleMarkDone = async () => {
    try {
      await completeComponent.mutateAsync({ componentId, moduleId });
      toast.success('Tarea marcada como completada');
      navigate(`/training/modules/${moduleId}`);
    } catch (e) {
      toast.error('Error al marcar la tarea');
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(`/training/modules/${moduleId}`)} className="-ml-2">
        <ArrowLeft className="mr-1 h-4 w-4" /> Volver al módulo
      </Button>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-3 font-semibold">Lo que necesitas hacer:</h2>
          <p className="whitespace-pre-wrap leading-relaxed text-foreground">{description}</p>
        </CardContent>
      </Card>

      <Card
        className={`border-l-4 ${
          alreadyCompleted ? 'border-l-success bg-success/5' : 'border-l-primary bg-primary/5'
        }`}
      >
        <CardContent className="flex items-start gap-4 p-5">
          {alreadyCompleted ? (
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-success" />
          ) : (
            <Clock className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
          )}
          <div>
            <h3 className="font-semibold">
              {alreadyCompleted ? 'Tarea completada' : 'Verificación manual'}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {alreadyCompleted
                ? 'Has marcado esta tarea como completada.'
                : 'Realiza la tarea en campo y márcala como completada cuando termines. Tu Director Deportivo podrá revisarla.'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleMarkDone}
        disabled={alreadyCompleted || completeComponent.isPending}
        className="w-full"
        size="lg"
      >
        {alreadyCompleted
          ? 'Tarea completada ✓'
          : completeComponent.isPending
          ? 'Guardando...'
          : 'Marcar como completada'}
      </Button>
    </div>
  );
}
