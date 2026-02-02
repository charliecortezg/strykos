import { useState } from 'react';
import { Plus, Pencil, Trash2, Trophy, Medal, Star, Flame, Target, Award, Crown, Zap, Heart, Shield } from 'lucide-react';
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
import { BadgeFormModal } from './BadgeFormModal';
import { useBadges } from '@/hooks/useStrykWay';
import type { StrykBadge, BadgeFormData } from '@/types/stryk-way';
import { RARITY_COLORS, RARITY_LABELS, CRITERIA_TYPE_LABELS } from '@/types/stryk-way';

const ICON_MAP: Record<string, typeof Trophy> = {
  trophy: Trophy,
  medal: Medal,
  star: Star,
  flame: Flame,
  target: Target,
  award: Award,
  crown: Crown,
  zap: Zap,
  heart: Heart,
  shield: Shield,
};

interface BadgesListProps {
  packId: string | null;
}

export function BadgesList({ packId }: BadgesListProps) {
  const { badges, isLoading, createBadge, updateBadge, deleteBadge, isCreating, isUpdating, isDeleting } = useBadges(packId);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<StrykBadge | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleCreate = () => {
    setEditingBadge(null);
    setModalOpen(true);
  };

  const handleEdit = (badge: StrykBadge) => {
    setEditingBadge(badge);
    setModalOpen(true);
  };

  const handleSubmit = (data: BadgeFormData) => {
    if (editingBadge) {
      updateBadge({ id: editingBadge.id, formData: data }, {
        onSuccess: () => setModalOpen(false),
      });
    } else {
      createBadge(data, {
        onSuccess: () => setModalOpen(false),
      });
    }
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      deleteBadge(deleteConfirm, {
        onSuccess: () => setDeleteConfirm(null),
      });
    }
  };

  if (!packId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Activa STRYK Way para gestionar badges
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Badges ({badges.length})</h3>
        <Button onClick={handleCreate} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Badge
        </Button>
      </div>

      {badges.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Trophy className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Aún no hay badges configurados.<br />
              Crea tu primer badge para comenzar.
            </p>
            <Button onClick={handleCreate} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Crear primer badge
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map(badge => {
            const IconComponent = ICON_MAP[badge.icon] || Trophy;
            return (
              <Card key={badge.id} className={!badge.is_active ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${RARITY_COLORS[badge.rarity]}`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-medium">{badge.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {CRITERIA_TYPE_LABELS[badge.criteria.type]}: {badge.criteria.threshold}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(badge)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(badge.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="outline" className={RARITY_COLORS[badge.rarity]}>
                      {RARITY_LABELS[badge.rarity]}
                    </Badge>
                    {!badge.is_active && (
                      <Badge variant="secondary">Inactivo</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <BadgeFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        badge={editingBadge}
        isLoading={isCreating || isUpdating}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar badge?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El badge será eliminado permanentemente.
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
