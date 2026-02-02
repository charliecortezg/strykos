import { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { StrykChallenge, ChallengeFormData, ChallengeCriteria } from '@/types/stryk-way';
import { CHALLENGE_CRITERIA_LABELS } from '@/types/stryk-way';

interface ChallengeFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ChallengeFormData) => void;
  challenge?: StrykChallenge | null;
  isLoading?: boolean;
}

export function ChallengeFormModal({ open, onClose, onSubmit, challenge, isLoading }: ChallengeFormModalProps) {
  const [formData, setFormData] = useState<ChallengeFormData>({
    key: '',
    name: '',
    description: '',
    xp_reward: 50,
    criteria_type: 'weekly_attendance',
    criteria_threshold: 3,
    start_at: '',
    end_at: '',
    is_active: true,
  });

  useEffect(() => {
    if (challenge) {
      setFormData({
        key: challenge.key,
        name: challenge.name,
        description: challenge.description || '',
        xp_reward: challenge.xp_reward,
        criteria_type: challenge.criteria.type,
        criteria_threshold: challenge.criteria.threshold,
        start_at: challenge.start_at ? challenge.start_at.split('T')[0] : '',
        end_at: challenge.end_at ? challenge.end_at.split('T')[0] : '',
        is_active: challenge.is_active,
      });
    } else {
      setFormData({
        key: '',
        name: '',
        description: '',
        xp_reward: 50,
        criteria_type: 'weekly_attendance',
        criteria_threshold: 3,
        start_at: '',
        end_at: '',
        is_active: true,
      });
    }
  }, [challenge, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const generateKey = (name: string) => {
    return name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{challenge ? 'Editar Reto' : 'Nuevo Reto'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => {
                const name = e.target.value;
                setFormData(prev => ({
                  ...prev,
                  name,
                  key: challenge ? prev.key : generateKey(name),
                }));
              }}
              placeholder="Ej: Asiste 3 veces esta semana"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="key">Clave única</Label>
            <Input
              id="key"
              value={formData.key}
              onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
              placeholder="ej: weekly_3"
              required
              disabled={!!challenge}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descripción del reto..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="xp_reward">Recompensa XP</Label>
            <Input
              id="xp_reward"
              type="number"
              min={1}
              value={formData.xp_reward}
              onChange={(e) => setFormData(prev => ({ ...prev, xp_reward: parseInt(e.target.value) || 1 }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="criteria_type">Criterio</Label>
              <Select
                value={formData.criteria_type}
                onValueChange={(value: ChallengeCriteria['type']) => setFormData(prev => ({ ...prev, criteria_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CHALLENGE_CRITERIA_LABELS) as ChallengeCriteria['type'][]).map(type => (
                    <SelectItem key={type} value={type}>
                      {CHALLENGE_CRITERIA_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="criteria_threshold">Meta</Label>
              <Input
                id="criteria_threshold"
                type="number"
                min={1}
                value={formData.criteria_threshold}
                onChange={(e) => setFormData(prev => ({ ...prev, criteria_threshold: parseInt(e.target.value) || 1 }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_at">Fecha inicio (opcional)</Label>
              <Input
                id="start_at"
                type="date"
                value={formData.start_at}
                onChange={(e) => setFormData(prev => ({ ...prev, start_at: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_at">Fecha fin (opcional)</Label>
              <Input
                id="end_at"
                type="date"
                value={formData.end_at}
                onChange={(e) => setFormData(prev => ({ ...prev, end_at: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Activo</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando...' : challenge ? 'Actualizar' : 'Crear Reto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
