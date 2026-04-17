import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useCompleteComponent } from '@/hooks/useTraining';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface LecturaViewProps {
  componentId: string;
  moduleId: string;
  title: string;
  content: string;
  alreadyCompleted: boolean;
}

export function LecturaView({ componentId, moduleId, title, content, alreadyCompleted }: LecturaViewProps) {
  const navigate = useNavigate();
  const [scrollProgress, setScrollProgress] = useState(alreadyCompleted ? 100 : 0);
  const completeComponent = useCompleteComponent();

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 0) {
      setScrollProgress(100);
      return;
    }
    setScrollProgress(Math.min(100, (el.scrollTop / max) * 100));
  };

  const handleCompleted = async () => {
    try {
      await completeComponent.mutateAsync({ componentId, moduleId });
      toast.success('Lectura completada');
      navigate(`/training/modules/${moduleId}`);
    } catch (e) {
      toast.error('Error al completar la lectura');
    }
  };

  const isFullyScrolled = scrollProgress > 95 || alreadyCompleted;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(`/training/modules/${moduleId}`)} className="-ml-2">
        <ArrowLeft className="mr-1 h-4 w-4" /> Volver al módulo
      </Button>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>

      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-0">
          <div className="max-h-[60vh] overflow-y-auto p-6 leading-relaxed text-foreground" onScroll={handleScroll}>
            <div className="whitespace-pre-wrap">{content}</div>
          </div>
        </CardContent>
      </Card>

      <div>
        <Progress value={scrollProgress} className="h-1" />
        <p className="mt-2 text-sm text-muted-foreground">
          {isFullyScrolled ? '✓ Has leído el material completo' : 'Desplázate hasta el final para continuar'}
        </p>
      </div>

      <Button
        onClick={handleCompleted}
        disabled={!isFullyScrolled || completeComponent.isPending || alreadyCompleted}
        className="w-full"
        size="lg"
      >
        {alreadyCompleted
          ? 'Lectura ya completada ✓'
          : completeComponent.isPending
          ? 'Guardando...'
          : 'He leído este material'}
      </Button>
    </div>
  );
}
