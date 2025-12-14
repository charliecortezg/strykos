import { useState } from 'react';
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

const formSchema = z.object({
  full_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  category_id: z.string().optional(),
  phone: z.string().optional(),
  tutor_name: z.string().optional(),
  position: z.string().optional(),
  plan: z.string().optional(),
  monthly_fee: z.string().optional(),
  is_scholarship: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface CreatePlayerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlayerCreated: () => void;
}

export function CreatePlayerModal({ open, onOpenChange, onPlayerCreated }: CreatePlayerModalProps) {
  const { createPlayer } = usePlayers();
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
      is_scholarship: false,
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);

    const success = await createPlayer({
      full_name: values.full_name,
      category_id: values.category_id || undefined,
      phone: values.phone || undefined,
      tutor_name: values.tutor_name || undefined,
      position: values.position || undefined,
      plan: values.plan || undefined,
      monthly_fee: values.monthly_fee ? parseFloat(values.monthly_fee) : undefined,
      is_scholarship: values.is_scholarship,
    });

    setIsSubmitting(false);

    if (success) {
      toast({
        title: 'Jugador registrado',
        description: `${values.full_name} ha sido agregado.`,
      });
      form.reset();
      onOpenChange(false);
      onPlayerCreated();
    } else {
      toast({
        title: 'Error',
        description: 'No se pudo registrar el jugador.',
        variant: 'destructive',
      });
    }
  };

  const activeCategories = categories.filter(c => c.is_active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Nuevo Jugador</DialogTitle>
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
                name="is_scholarship"
                render={({ field }) => (
                  <FormItem className="flex flex-col justify-end">
                    <div className="flex items-center space-x-2 h-10">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        Becado
                      </FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Registrando...' : 'Registrar jugador'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
