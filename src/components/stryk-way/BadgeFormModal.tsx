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
import { Trophy, Medal, Star, Flame, Target, Award, Crown, Zap, Heart, Shield } from 'lucide-react';
import type { StrykBadge, BadgeFormData, BadgeRarity, BadgeCriteria } from '@/types/stryk-way';
import { RARITY_LABELS, CRITERIA_TYPE_LABELS } from '@/types/stryk-way';

interface BadgeFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: BadgeFormData) => void;
  badge?: StrykBadge | null;
  isLoading?: boolean;
}

const ICONS: { name: string; icon: typeof Trophy }[] = [
  { name: 'trophy', icon: Trophy },
  { name: 'medal', icon: Medal },
  { name: 'star', icon: Star },
  { name: 'flame', icon: Flame },
  { name: 'target', icon: Target },
  { name: 'award', icon: Award },
  { name: 'crown', icon: Crown },
  { name: 'zap', icon: Zap },
  { name: 'heart', icon: Heart },
  { name: 'shield', icon: Shield },
];

export function BadgeFormModal({ open, onClose, onSubmit, badge, isLoading }: BadgeFormModalProps) {
  const [formData, setFormData] = useState<BadgeFormData>({
    key: '',
    name: '',
    description: '',
    icon: 'trophy',
    rarity: 'common',
    criteria_type: 'attendance_count',
    criteria_threshold: 10,
    is_active: true,
  });

  useEffect(() => {
    if (badge) {
      setFormData({
        key: badge.key,
        name: badge.name,
        description: badge.description || '',
        icon: badge.icon,
        rarity: badge.rarity,
        criteria_type: badge.criteria.type,
        criteria_threshold: badge.criteria.threshold,
        is_active: badge.is_active,
      });
    } else {
      setFormData({
        key: '',
        name: '',
        description: '',
        icon: 'trophy',
        rarity: 'common',
        criteria_type: 'attendance_count',
        criteria_threshold: 10,
        is_active: true,
      });
    }
  }, [badge, open]);

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
          <DialogTitle>{badge ? 'Editar Badge' : 'Nuevo Badge'}</DialogTitle>
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
                  key: badge ? prev.key : generateKey(name),
                }));
              }}
              placeholder="Ej: Primer Entrenamiento"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="key">Clave única</Label>
            <Input
              id="key"
              value={formData.key}
              onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
              placeholder="ej: primer_entrenamiento"
              required
              disabled={!!badge}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descripción del badge..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Icono</Label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map(({ name, icon: Icon }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, icon: name }))}
                  className={`p-2 rounded-md border transition-colors ${
                    formData.icon === name 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rarity">Rareza</Label>
            <Select
              value={formData.rarity}
              onValueChange={(value: BadgeRarity) => setFormData(prev => ({ ...prev, rarity: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(RARITY_LABELS) as BadgeRarity[]).map(rarity => (
                  <SelectItem key={rarity} value={rarity}>
                    {RARITY_LABELS[rarity]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="criteria_type">Criterio</Label>
              <Select
                value={formData.criteria_type}
                onValueChange={(value: BadgeCriteria['type']) => setFormData(prev => ({ ...prev, criteria_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CRITERIA_TYPE_LABELS) as BadgeCriteria['type'][]).map(type => (
                    <SelectItem key={type} value={type}>
                      {CRITERIA_TYPE_LABELS[type]}
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
              {isLoading ? 'Guardando...' : badge ? 'Actualizar' : 'Crear Badge'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
