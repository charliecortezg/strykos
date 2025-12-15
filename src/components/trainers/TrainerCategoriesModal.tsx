import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ClipboardList, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCategories } from '@/hooks/useCategories';

interface TrainerCategoriesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainer: {
    id: string;
    full_name: string;
    categories: { id: string; name: string }[];
  } | null;
  onUpdate?: () => void;
  readOnly?: boolean;
}

export function TrainerCategoriesModal({ 
  open, 
  onOpenChange, 
  trainer, 
  onUpdate,
  readOnly = false 
}: TrainerCategoriesModalProps) {
  const { organization } = useAuth();
  const { categories: allCategories, refetch: refetchCategories } = useCategories();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const activeCategories = allCategories.filter(c => c.is_active);

  useEffect(() => {
    if (trainer) {
      setSelectedCategories(trainer.categories.map(c => c.id));
    }
  }, [trainer]);

  const handleToggleCategory = (categoryId: string) => {
    if (readOnly) return;
    
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSave = async () => {
    if (!trainer || !organization || readOnly) return;

    setIsSaving(true);

    try {
      // Get current assignments for this trainer
      const currentAssignments = trainer.categories.map(c => c.id);
      
      // Categories to unassign (were assigned, now not selected)
      const toUnassign = currentAssignments.filter(id => !selectedCategories.includes(id));
      
      // Categories to assign (now selected, weren't assigned before)
      const toAssign = selectedCategories.filter(id => !currentAssignments.includes(id));

      // Unassign categories
      if (toUnassign.length > 0) {
        const { error: unassignError } = await supabase
          .from('categories')
          .update({ trainer_id: null })
          .in('id', toUnassign)
          .eq('organization_id', organization.id);

        if (unassignError) throw unassignError;
      }

      // Assign categories
      if (toAssign.length > 0) {
        const { error: assignError } = await supabase
          .from('categories')
          .update({ trainer_id: trainer.id })
          .in('id', toAssign)
          .eq('organization_id', organization.id);

        if (assignError) throw assignError;
      }

      await refetchCategories();
      onUpdate?.();
      toast.success('Asignaciones actualizadas');
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating assignments:', error);
      toast.error('Error al actualizar asignaciones');
    } finally {
      setIsSaving(false);
    }
  };

  if (!trainer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            {readOnly ? 'Categorías asignadas' : 'Asignar categorías'}
          </DialogTitle>
        </DialogHeader>

        {/* Trainer info */}
        <div className="p-3 bg-muted/30 rounded-lg border border-border">
          <p className="font-display font-semibold text-foreground">{trainer.full_name}</p>
        </div>

        {/* Categories list */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {activeCategories.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No hay categorías activas
            </div>
          ) : (
            activeCategories.map(category => {
              const isSelected = selectedCategories.includes(category.id);
              const isAssignedToOther = category.trainer_id && category.trainer_id !== trainer.id;
              
              return (
                <div
                  key={category.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    isSelected 
                      ? 'bg-primary/5 border-primary/30' 
                      : 'bg-background border-border hover:bg-muted/30'
                  } ${readOnly ? '' : 'cursor-pointer'}`}
                  onClick={() => !isAssignedToOther && handleToggleCategory(category.id)}
                >
                  <div className="flex items-center gap-3">
                    {!readOnly && (
                      <Checkbox 
                        checked={isSelected}
                        disabled={Boolean(isAssignedToOther)}
                        onCheckedChange={() => !isAssignedToOther && handleToggleCategory(category.id)}
                      />
                    )}
                    <div>
                      <Label className="font-medium text-foreground cursor-pointer">
                        {category.name}
                      </Label>
                      {category.sport && (
                        <p className="text-xs text-muted-foreground">{category.sport.name}</p>
                      )}
                    </div>
                  </div>
                  {isAssignedToOther && category.trainer && (
                    <Badge variant="secondary" className="text-xs">
                      {category.trainer.full_name}
                    </Badge>
                  )}
                  {isSelected && !isAssignedToOther && (
                    <Badge variant="default" className="bg-primary text-primary-foreground">
                      Asignada
                    </Badge>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Actions */}
        {!readOnly && (
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Guardar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
