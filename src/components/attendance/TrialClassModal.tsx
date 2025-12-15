import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrainerCategory } from '@/hooks/useTrainerCategories';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TrialClassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: TrainerCategory[];
  selectedCategoryId?: string;
  selectedDate?: string;
  onSuccess?: () => void;
}

export function TrialClassModal({ 
  open, 
  onOpenChange, 
  categories,
  selectedCategoryId,
  selectedDate,
  onSuccess 
}: TrialClassModalProps) {
  const { organization, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    tutor_name: '',
    category_id: selectedCategoryId || categories[0]?.id || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!organization?.id || !user?.id || !formData.full_name.trim() || !formData.category_id) {
      toast.error('Completa los campos requeridos');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create the trial player
      const { data: newPlayer, error: playerError } = await supabase
        .from('players')
        .insert({
          organization_id: organization.id,
          full_name: formData.full_name.trim(),
          phone: formData.phone || null,
          tutor_name: formData.tutor_name || null,
          category_id: formData.category_id,
          is_trial: true,
          is_active: true,
          payment_status: 'pendiente',
        })
        .select('id')
        .single();

      if (playerError) throw playerError;

      // 2. Automatically mark as present for today's date
      const attendanceDate = selectedDate || format(new Date(), 'yyyy-MM-dd');
      
      const { error: attendanceError } = await supabase
        .from('attendance')
        .insert({
          organization_id: organization.id,
          player_id: newPlayer.id,
          category_id: formData.category_id,
          date: attendanceDate,
          status: 'presente',
          notes: 'Clase muestra',
          recorded_by: user.id,
        });

      if (attendanceError) {
        console.error('Error registering attendance:', attendanceError);
        // Player was created, just couldn't register attendance
        toast.warning('Jugador creado, pero no se pudo registrar asistencia automática');
      } else {
        toast.success('Clase muestra registrada correctamente');
      }

      // Reset form and close
      setFormData({
        full_name: '',
        phone: '',
        tutor_name: '',
        category_id: selectedCategoryId || categories[0]?.id || '',
      });
      onOpenChange(false);
      onSuccess?.();

    } catch (error) {
      console.error('Error creating trial player:', error);
      toast.error('Error al registrar clase muestra');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Registrar Clase Muestra
          </DialogTitle>
          <DialogDescription>
            Registra un nuevo jugador como clase de prueba. Se marcará automáticamente como presente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre completo *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Nombre del jugador"
              className="h-12 text-base"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoría *</Label>
            <Select 
              value={formData.category_id} 
              onValueChange={(v) => setFormData({ ...formData, category_id: v })}
            >
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Selecciona categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="text-base py-3">
                    {cat.name}
                    {cat.sport?.name && (
                      <span className="ml-2 text-muted-foreground">• {cat.sport.name}</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono de contacto</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Opcional"
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tutor_name">Nombre del tutor</Label>
            <Input
              id="tutor_name"
              value={formData.tutor_name}
              onChange={(e) => setFormData({ ...formData, tutor_name: e.target.value })}
              placeholder="Opcional"
              className="h-12 text-base"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-12"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 h-12"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registrando...' : 'Registrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
