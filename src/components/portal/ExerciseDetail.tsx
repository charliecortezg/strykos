import { ArrowLeft, Clock, Dumbbell, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { Exercise } from '@/hooks/useStrykWay/useExercises';
import { getCategoryConfig, DIFFICULTY_OPTIONS, extractYouTubeId } from '@/hooks/useStrykWay/useExercises';

interface ExerciseDetailProps {
  exercise: Exercise;
  onBack: () => void;
}

export function ExerciseDetail({ exercise, onBack }: ExerciseDetailProps) {
  const catConfig = getCategoryConfig(exercise.category);
  const diffConfig = DIFFICULTY_OPTIONS.find(d => d.value === exercise.difficulty);
  const youtubeId = exercise.video_source === 'youtube' ? extractYouTubeId(exercise.video_url) : null;

  const equipmentList = exercise.equipment_needed
    ? exercise.equipment_needed.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Ejercicios
      </button>

      {/* Video Player */}
      <div className="rounded-xl overflow-hidden border bg-black aspect-video">
        {exercise.video_source === 'youtube' && youtubeId ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=0`}
            className="w-full h-full"
            allow="fullscreen"
            allowFullScreen
            title={exercise.title}
          />
        ) : (
          <video controls className="w-full h-full" src={exercise.video_url}>
            Tu navegador no soporta el reproductor de video.
          </video>
        )}
      </div>

      {/* Title & Metadata */}
      <div className="space-y-2">
        <h1 className="text-lg font-bold">{exercise.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={catConfig.color}>{catConfig.label}</Badge>
          <span className="text-xs text-muted-foreground">{exercise.age_min}-{exercise.age_max} años</span>
          {exercise.duration_minutes && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <Clock className="h-3 w-3" /> {exercise.duration_minutes} min
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {exercise.partner_required ? '👥 Con pareja' : '👤 Individual'}
          </span>
          {diffConfig && (
            <Badge variant="outline" className="text-xs">{diffConfig.emoji} {diffConfig.label}</Badge>
          )}
        </div>
      </div>

      {/* Description */}
      {exercise.description && (
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Descripción</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{exercise.description}</p>
        </div>
      )}

      {/* Equipment */}
      {equipmentList.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold">🧰 Material necesario</h3>
          <div className="flex flex-wrap gap-1.5">
            {equipmentList.map((item, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{item}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Coach Tip */}
      {exercise.coach_tip && (
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-semibold text-amber-900 dark:text-amber-200">Tip del entrenador</span>
            </div>
            <p className="text-sm text-amber-800 dark:text-amber-300 italic">{exercise.coach_tip}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
