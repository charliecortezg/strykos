import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Lightbulb } from 'lucide-react';
import type { Exercise, ExerciseFormData } from '@/hooks/useStrykWay/useExercises';
import { EXERCISE_CATEGORIES, DIFFICULTY_OPTIONS, extractYouTubeId } from '@/hooks/useStrykWay/useExercises';

interface ExerciseFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ExerciseFormData) => void;
  exercise?: Exercise | null;
  isLoading?: boolean;
}

export function ExerciseFormModal({ open, onClose, onSubmit, exercise, isLoading }: ExerciseFormModalProps) {
  const [formData, setFormData] = useState<ExerciseFormData>({
    title: '', category: 'control', description: '', coach_tip: '',
    age_min: 6, age_max: 18, duration_minutes: null, equipment_needed: '',
    partner_required: false, difficulty: 'beginner', video_source: 'youtube',
    video_url: '', is_active: true,
  });

  useEffect(() => {
    if (exercise) {
      setFormData({
        title: exercise.title,
        category: exercise.category,
        description: exercise.description || '',
        coach_tip: exercise.coach_tip || '',
        age_min: exercise.age_min,
        age_max: exercise.age_max,
        duration_minutes: exercise.duration_minutes,
        equipment_needed: exercise.equipment_needed || '',
        partner_required: exercise.partner_required,
        difficulty: exercise.difficulty,
        video_source: exercise.video_source,
        video_url: exercise.video_url,
        is_active: exercise.is_active,
      });
    } else {
      setFormData({
        title: '', category: 'control', description: '', coach_tip: '',
        age_min: 6, age_max: 18, duration_minutes: null, equipment_needed: '',
        partner_required: false, difficulty: 'beginner', video_source: 'youtube',
        video_url: '', is_active: true,
      });
    }
  }, [exercise, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const youtubeId = formData.video_source === 'youtube' ? extractYouTubeId(formData.video_url) : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{exercise ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label>Título del ejercicio *</Label>
            <Input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} required placeholder="Ej: Pase en triángulo" />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Categoría *</Label>
            <Select value={formData.category} onValueChange={v => setFormData(p => ({ ...p, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXERCISE_CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Describe el ejercicio..." />
          </div>

          {/* Coach Tip */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Lightbulb className="h-4 w-4 text-amber-500" /> Tip del entrenador
            </Label>
            <Textarea
              value={formData.coach_tip}
              onChange={e => setFormData(p => ({ ...p, coach_tip: e.target.value }))}
              rows={2}
              placeholder="Consejo para el jugador..."
              className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
            />
          </div>

          {/* Age Range */}
          <div className="space-y-2">
            <Label>Edad recomendada: {formData.age_min} – {formData.age_max} años</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Mínima</Label>
                <Input type="number" min={4} max={18} value={formData.age_min} onChange={e => setFormData(p => ({ ...p, age_min: parseInt(e.target.value) || 6 }))} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Máxima</Label>
                <Input type="number" min={4} max={18} value={formData.age_max} onChange={e => setFormData(p => ({ ...p, age_max: parseInt(e.target.value) || 18 }))} />
              </div>
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>Duración en minutos</Label>
            <Input type="number" min={1} value={formData.duration_minutes ?? ''} onChange={e => setFormData(p => ({ ...p, duration_minutes: e.target.value ? parseInt(e.target.value) : null }))} placeholder="10" />
          </div>

          {/* Equipment */}
          <div className="space-y-2">
            <Label>Material necesario</Label>
            <Input value={formData.equipment_needed} onChange={e => setFormData(p => ({ ...p, equipment_needed: e.target.value }))} placeholder="Ej: Balón, 4 conos" />
          </div>

          {/* Partner Required */}
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              {formData.partner_required ? '👥 Con pareja' : '👤 Individual'}
            </Label>
            <Switch checked={formData.partner_required} onCheckedChange={v => setFormData(p => ({ ...p, partner_required: v }))} />
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <Label>Dificultad</Label>
            <div className="flex gap-2">
              {DIFFICULTY_OPTIONS.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, difficulty: d.value }))}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    formData.difficulty === d.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {d.emoji} {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Video Source */}
          <div className="space-y-2">
            <Label>Fuente del video</Label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="video_source" value="youtube" checked={formData.video_source === 'youtube'} onChange={() => setFormData(p => ({ ...p, video_source: 'youtube' }))} />
                YouTube
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="video_source" value="upload" checked={formData.video_source === 'upload'} onChange={() => setFormData(p => ({ ...p, video_source: 'upload' }))} />
                Video propio
              </label>
            </div>
          </div>

          {/* Video URL */}
          <div className="space-y-2">
            <Label>URL del video *</Label>
            <Input value={formData.video_url} onChange={e => setFormData(p => ({ ...p, video_url: e.target.value }))} required placeholder={formData.video_source === 'youtube' ? 'https://youtube.com/watch?v=...' : 'URL del video'} />
            {formData.video_source === 'youtube' && youtubeId && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-green-600">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Video válido
                </div>
                <img
                  src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                  alt="Thumbnail"
                  className="w-full max-w-[200px] rounded-lg border"
                />
              </div>
            )}
          </div>

          {/* Active */}
          <div className="flex items-center justify-between">
            <Label>Estado</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{formData.is_active ? 'Activo' : 'Inactivo'}</span>
              <Switch checked={formData.is_active} onCheckedChange={v => setFormData(p => ({ ...p, is_active: v }))} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? 'Guardando...' : 'Guardar Ejercicio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
