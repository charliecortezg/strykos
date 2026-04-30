import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Trophy, Star } from 'lucide-react';
import { type MatchImportance, getXpMultiplier } from '@/types/matches';
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle,
  DrawerFooter
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { TrainerCategory } from '@/hooks/useTrainerCategories';
import { useCreateMatch } from '@/hooks/useCreateMatch';
import { useMatchFields } from '@/hooks/useMatchFields';

interface CreateMatchFlowProps {
  isOpen: boolean;
  onClose: () => void;
  categories: TrainerCategory[];
}

export function CreateMatchFlow({ isOpen, onClose, categories }: CreateMatchFlowProps) {
  const { createMatch } = useCreateMatch();
  const { addField } = useMatchFields();
  
  const [categoryId, setCategoryId] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [matchDate, setMatchDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [rivalName, setRivalName] = useState('');
  const [matchType, setMatchType] = useState<'liga' | 'torneo' | 'amistoso'>('amistoso');
  const [importance, setImportance] = useState<MatchImportance>('regular');

  const selectedCategory = categories.find(c => c.id === categoryId);
  const xpMultiplier = getXpMultiplier(matchType, importance);

  useEffect(() => {
    if (selectedCategory?.venue?.name) {
      setFieldName(selectedCategory.venue.name);
    }
  }, [selectedCategory]);

  const handleSubmit = () => {
    if (!categoryId || !rivalName.trim()) return;

    const matchNotes = fieldName ? `Campo: ${fieldName}` : '';

    createMatch.mutate({
      category_id: categoryId,
      venue_id: selectedCategory?.venue_id || null,
      match_date: matchDate,
      rival_name: rivalName.trim(),
      match_type: matchType,
      status: 'programado',
      goals_for: 0,
      goals_against: 0,
      notes: matchNotes || undefined,
      importance,
      xp_multiplier: xpMultiplier,
      players: [],
    }, {
      onSuccess: () => {
        if (fieldName) addField(fieldName);
        handleClose();
      },
    });
  };

  const handleClose = () => {
    setCategoryId('');
    setFieldName('');
    setMatchDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setRivalName('');
    setMatchType('amistoso');
    setImportance('regular');
    onClose();
  };

  const canSubmit = categoryId && rivalName.trim();

  return (
    <Drawer open={isOpen} onOpenChange={() => handleClose()}>
      <DrawerContent className="max-h-[95dvh] flex flex-col overflow-hidden">
        <DrawerHeader className="border-b border-border pb-3 shrink-0">
          <DrawerTitle className="flex items-center gap-2 text-lg">
            <Trophy className="w-5 h-5 text-primary" />
            Programar Partido
          </DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
          <div className="space-y-4">
            {/* Category Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Categoría *</Label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="flex h-12 w-full items-center rounded-md border border-input bg-background px-3 text-base ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="" disabled>Selecciona categoría</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}{cat.sport?.name ? ` · ${cat.sport.name}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Rival */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Rival *</Label>
              <Input
                value={rivalName}
                onChange={(e) => setRivalName(e.target.value)}
                placeholder="Nombre del equipo rival"
                className="h-12 text-base"
                maxLength={100}
              />
            </div>

            {/* Match Type & Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tipo</Label>
                <select
                  value={matchType}
                  onChange={(e) => setMatchType(e.target.value as any)}
                  className="flex h-12 w-full items-center rounded-md border border-input bg-background px-3 text-base ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="amistoso">Amistoso</option>
                  <option value="liga">Liga</option>
                  <option value="torneo">Torneo</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Fecha/Hora</Label>
                <Input
                  type="datetime-local"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  className="h-12"
                />
              </div>
            </div>

            {/* Importance (only for liga/torneo) */}
            {(matchType === 'liga' || matchType === 'torneo') && (
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-warning" />
                  Importancia
                </Label>
                <select
                  value={importance}
                  onChange={(e) => setImportance(e.target.value as MatchImportance)}
                  className="flex h-12 w-full items-center rounded-md border border-input bg-background px-3 text-base ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="regular">Regular (×{getXpMultiplier(matchType, 'regular')})</option>
                  <option value="importante">⭐ Importante (×{getXpMultiplier(matchType, 'importante')})</option>
                  <option value="eliminacion">🔥 Eliminación (×{getXpMultiplier(matchType, 'eliminacion')})</option>
                  <option value="final">👑 Final (×{getXpMultiplier(matchType, 'final')})</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Multiplicador XP: ×{xpMultiplier}
                </p>
              </div>
            )}

            {/* Field/Campo */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Campo de Juego</Label>
              <Input
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder="Ej: Juventud 2000, Cancha Norte..."
                className="h-12 text-base"
              />
            </div>
          </div>
        </div>

        <DrawerFooter className="border-t border-border pt-3">
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={handleClose} className="flex-1 h-12">
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!canSubmit || createMatch.isPending}
              className="flex-1 h-12 gap-2"
            >
              <Trophy className="w-4 h-4" />
              {createMatch.isPending ? 'Programando...' : 'Programar Partido'}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
