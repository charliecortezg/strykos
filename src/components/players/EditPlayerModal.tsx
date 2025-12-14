import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { usePlayers } from '@/hooks/usePlayers';
import { useCategories } from '@/hooks/useCategories';
import { useToast } from '@/hooks/use-toast';
import { PAYMENT_STATUS_LABELS, type Player, type PaymentStatus } from '@/types/categories';

const formSchema = z.object({
  full_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  category_id: z.string().optional(),
  phone: z.string().optional(),
  tutor_name: z.string().optional(),
  position: z.string().optional(),
  plan: z.string().optional(),
  monthly_fee: z.string().optional(),
  payment_status: z.string().optional(),
  is_scholarship: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface EditPlayerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: Player | null;
  onPlayerUpdated: () => void;
}

export function EditPlayerModal({ open, onOpenChange, player, onPlayerUpdated }: EditPlayerModalProps) {
  const { updatePlayer } = usePlayers();
  const { categories, isLoading: loadingCategories } = useCategories();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: '',
      category_id: '',
      phone: '',
      tutor_name: '',
      position: '',
      plan: '',
      monthly_fee: '',
      payment_status: '',
      is_scholarship: false,
    },
  });

  useEffect(() => {
    if (player) {
      form.reset({
        full_name: player.full_name,
        category_id: player.category_id || '',
        phone: player.phone || '',
        tutor_name: player.tutor_name || '',
        position: player.position || '',
        plan: player.plan || '',
        monthly_fee: player.monthly_fee?.toString() || '',
        payment_status: player.payment_status,
        is_scholarship: player.is_scholarship,
      });
    }
  }, [player, form]);

  const onSubmit = async (values: FormValues) => {
    if (!player) return;

    setIsSubmitting(true);

    const success = await updatePlayer(player.id, {
      full_name: values.full_name,
      category_id: values.category_id || undefined,
      phone: values.phone || undefined,
      tutor_name: values.tutor_name || undefined,
      position: values.position || undefined,
      plan: values.plan || undefined,
      monthly_fee: values.monthly_fee ? parseFloat(values.monthly_fee) : undefined,
      payment_status: values.payment_status as PaymentStatus || undefined,
      is_scholarship: values.is_scholarship,
    });

    setIsSubmitting(false);

    if (success) {
      toast({
        title: 'Jugador actualizado',
        description: `${values.full_name} ha sido actualizado.`,
      });
      onOpenChange(false);
      onPlayerUpdated();
    } else {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el jugador.',
        variant: 'destructive',
      });
    }
  };

  const activeCategories = categories.filter(c => c.is_active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Editar Jugador</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Juan Pérez García" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loadingCategories ? (
                        <SelectItem value="_loading" disabled>Cargando...</SelectItem>
                      ) : activeCategories.length === 0 ? (
                        <SelectItem value="_empty" disabled>Sin categorías activas</SelectItem>
                      ) : (
                        activeCategories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: 555-123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tutor_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del tutor</FormLabel>
                    <FormControl>
                      <Input placeholder="Padre/Madre/Tutor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posición</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Delantero" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="plan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Mensual" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="monthly_fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cuota mensual</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado de pago</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_scholarship"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer">
                    Jugador becado
                  </FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
