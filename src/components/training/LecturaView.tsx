import { useState, useEffect, useRef } from 'react';
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
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (el && el.scrollHeight - el.clientHeight <= 10) {
      setScrollProgress(100);
    }
  }, [content]);

  useEffect(() => {
    const el = document.getElementById('lectura-content');
    if (!el) return;
    if (el.scrollHeight - el.clientHeight <= 10) {
      setScrollProgress(100);
    }
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 10) {
      setScrollProgress(100);
      return;
    }
    const pct = (el.scrollTop / max) * 100;
    setScrollProgress(Math.min(100, pct));
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

  const isFullyScrolled = scrollProgress >= 100 || alreadyCompleted;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(`/training/modules/${moduleId}`)} className="-ml-2">
        <ArrowLeft className="mr-1 h-4 w-4" /> Volver al módulo
      </Button>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>

      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-0">
          <div
            id="lectura-content"
            ref={contentRef}
            className="max-h-[60vh] overflow-y-auto p-6 leading-relaxed text-foreground"
            onScroll={handleScroll}
          >
            <div className="whitespace-pre-wrap">{content}</div>
          </div>
        </CardContent>
      </Card>

      <div>
        <Progress value={scrollProgress} className="h-1" />
        <p className="mt-2 text-sm text-muted-foreground">
          {scrollProgress >= 100
            ? '✓ Has leído el material completo'
            : content.length < 500
            ? 'Lee el material para continuar'
            : 'Desplázate hasta el final para continuar'}
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
