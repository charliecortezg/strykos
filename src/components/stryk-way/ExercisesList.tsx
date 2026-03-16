import { useState } from 'react';
import { Plus, Pencil, Trash2, Dumbbell, Clock, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ExerciseFormModal } from './ExerciseFormModal';
import { useExercises, getCategoryConfig, DIFFICULTY_OPTIONS } from '@/hooks/useStrykWay/useExercises';
import type { Exercise, ExerciseFormData } from '@/hooks/useStrykWay/useExercises';

export function ExercisesList() {
  const { exercises, isLoading, createExercise, updateExercise, deleteExercise, isCreating, isUpdating, isDeleting } = useExercises();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const activeCount = exercises.filter(e => e.is_active).length;

  const handleCreate = () => { setEditingExercise(null); setModalOpen(true); };
  const handleEdit = (ex: Exercise) => { setEditingExercise(ex); setModalOpen(true); };

  const handleSubmit = (data: ExerciseFormData) => {
    if (editingExercise) {
      updateExercise({ id: editingExercise.id, formData: data }, { onSuccess: () => setModalOpen(false) });
    } else {
      createExercise(data, { onSuccess: () => setModalOpen(false) });
    }
  };

  const handleDelete = () => {
    if (deleteConfirm) deleteExercise(deleteConfirm, { onSuccess: () => setDeleteConfirm(null) });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Banco de Ejercicios</h3>
          <p className="text-sm text-muted-foreground">{activeCount} ejercicios activos</p>
        </div>
        <Button onClick={handleCreate} size="sm">
          <Plus className="w-4 h-4 mr-2" /> Nuevo Ejercicio
        </Button>
      </div>

      {exercises.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Dumbbell className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Aún no hay ejercicios.<br />Crea tu primer ejercicio para el banco.
            </p>
            <Button onClick={handleCreate} className="mt-4"><Plus className="w-4 h-4 mr-2" /> Crear ejercicio</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exercises.map(ex => {
            const catConfig = getCategoryConfig(ex.category);
            const diffConfig = DIFFICULTY_OPTIONS.find(d => d.value === ex.difficulty);
            return (
              <Card key={ex.id} className={!ex.is_active ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    {/* Thumbnail */}
                    <div className="w-[60px] h-[60px] rounded-lg bg-muted overflow-hidden shrink-0">
                      {ex.thumbnail_url ? (
                        <img src={ex.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${catConfig.color}`}>
                          <Dumbbell className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{ex.title}</h4>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <Badge variant="outline" className={`text-[10px] ${catConfig.color}`}>{catConfig.label}</Badge>
                        <span className="text-[10px] text-muted-foreground">{ex.age_min}-{ex.age_max} años</span>
                        {ex.duration_minutes && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" /> {ex.duration_minutes} min
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {ex.partner_required ? '👥 Pareja' : '👤 Individual'}
                        </span>
                        {diffConfig && <span className="text-[10px]">{diffConfig.emoji}</span>}
                        {!ex.is_active && <Badge variant="secondary" className="text-[10px]">Inactivo</Badge>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(ex)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteConfirm(ex.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ExerciseFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        exercise={editingExercise}
        isLoading={isCreating || isUpdating}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar ejercicio?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
