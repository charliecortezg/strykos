import { useState } from 'react';
import { Plus, Pencil, Trash2, Target, Zap, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ChallengeFormModal } from './ChallengeFormModal';
import { useChallenges } from '@/hooks/useStrykWay';
import type { StrykChallenge, ChallengeFormData } from '@/types/stryk-way';
import { CHALLENGE_CRITERIA_LABELS } from '@/types/stryk-way';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ChallengesListProps {
  packId: string | null;
}

export function ChallengesList({ packId }: ChallengesListProps) {
  const { challenges, isLoading, createChallenge, updateChallenge, deleteChallenge, isCreating, isUpdating, isDeleting } = useChallenges(packId);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<StrykChallenge | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleCreate = () => {
    setEditingChallenge(null);
    setModalOpen(true);
  };

  const handleEdit = (challenge: StrykChallenge) => {
    setEditingChallenge(challenge);
    setModalOpen(true);
  };

  const handleSubmit = (data: ChallengeFormData) => {
    if (editingChallenge) {
      updateChallenge({ id: editingChallenge.id, formData: data }, {
        onSuccess: () => setModalOpen(false),
      });
    } else {
      createChallenge(data, {
        onSuccess: () => setModalOpen(false),
      });
    }
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      deleteChallenge(deleteConfirm, {
        onSuccess: () => setDeleteConfirm(null),
      });
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return format(new Date(dateStr), 'd MMM', { locale: es });
    } catch {
      return null;
    }
  };

  if (!packId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Activa STRYK Way para gestionar retos
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Retos ({challenges.length})</h3>
        <Button onClick={handleCreate} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Reto
        </Button>
      </div>

      {challenges.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Target className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Aún no hay retos configurados.<br />
              Crea tu primer reto para motivar a los jugadores.
            </p>
            <Button onClick={handleCreate} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Crear primer reto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {challenges.map(challenge => {
            const startDate = formatDate(challenge.start_at);
            const endDate = formatDate(challenge.end_at);
            const hasDateRange = startDate || endDate;

            return (
              <Card key={challenge.id} className={!challenge.is_active ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Target className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-medium">{challenge.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {CHALLENGE_CRITERIA_LABELS[challenge.criteria.type]}: {challenge.criteria.threshold}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(challenge)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(challenge.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <Badge variant="secondary" className="gap-1">
                      <Zap className="w-3 h-3" />
                      +{challenge.xp_reward} XP
                    </Badge>
                    {hasDateRange && (
                      <Badge variant="outline" className="gap-1">
                        <Calendar className="w-3 h-3" />
                        {startDate && endDate 
                          ? `${startDate} - ${endDate}`
                          : startDate 
                            ? `Desde ${startDate}`
                            : `Hasta ${endDate}`
                        }
                      </Badge>
                    )}
                    {!challenge.is_active && (
                      <Badge variant="secondary">Inactivo</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ChallengeFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        challenge={editingChallenge}
        isLoading={isCreating || isUpdating}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar reto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El reto será eliminado permanentemente.
            </AlertDialogDescription>
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
