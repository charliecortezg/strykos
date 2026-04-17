import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useCompleteComponent } from '@/hooks/useTraining';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

interface VideoViewProps {
  componentId: string;
  moduleId: string;
  title: string;
  videoUrl: string;
  alreadyCompleted: boolean;
}

function extractYouTubeId(url: string): string {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : '';
}

export function VideoView({ componentId, moduleId, title, videoUrl, alreadyCompleted }: VideoViewProps) {
  const navigate = useNavigate();
  const [watched, setWatched] = useState(alreadyCompleted);
  const completeComponent = useCompleteComponent();

  const videoId = extractYouTubeId(videoUrl);
  const embedUrl = videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : '';

  const handleWatched = async () => {
    try {
      await completeComponent.mutateAsync({ componentId, moduleId });
      setWatched(true);
      toast.success('Video marcado como visto');
      navigate(`/training/modules/${moduleId}`);
    } catch (e) {
      toast.error('Error al marcar el video');
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(`/training/modules/${moduleId}`)} className="-ml-2">
        <ArrowLeft className="mr-1 h-4 w-4" /> Volver al módulo
      </Button>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>

      <Card className="overflow-hidden">
        <div className="aspect-video bg-black">
          {embedUrl ? (
            <iframe
              className="h-full w-full"
              src={embedUrl}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="flex h-full items-center justify-center text-white/60">Video no disponible</div>
          )}
        </div>
      </Card>

      <Card>
        <CardContent className="p-4">
          {watched ? (
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">Video visto</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              👁️ Mira el video completo para continuar al siguiente componente.
            </p>
          )}
        </CardContent>
      </Card>

      <Button
        onClick={handleWatched}
        disabled={watched || completeComponent.isPending}
        className="w-full"
        size="lg"
      >
        {completeComponent.isPending
          ? 'Guardando...'
          : watched
          ? 'Video completado ✓'
          : 'He visto el video completo'}
      </Button>
    </div>
  );
}
