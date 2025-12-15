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
import { usePlans, PERIODICITY_OPTIONS, type Plan } from '@/hooks/usePlans';
import { useSports } from '@/hooks/useSports';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(50),
  price: z.string().min(1, 'El precio es requerido'),
  periodicity: z.string().min(1, 'La periodicidad es requerida'),
  sport_id: z.string().min(1, 'El deporte es requerido'),
});

type FormValues = z.infer<typeof formSchema>;

interface EditPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Plan | null;
  onPlanUpdated: () => void;
}

export function EditPlanModal({ open, onOpenChange, plan, onPlanUpdated }: EditPlanModalProps) {
  const { updatePlan } = usePlans();
  const { sports, isLoading: loadingSports } = useSports();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      price: '',
      periodicity: 'monthly',
      sport_id: '',
    },
  });

  useEffect(() => {
    if (plan) {
      form.reset({
        name: plan.name,
        price: plan.price.toString(),
        periodicity: plan.periodicity,
        sport_id: plan.sport_id || '',
      });
    }
  }, [plan, form]);

  const onSubmit = async (values: FormValues) => {
    if (!plan) return;

    setIsSubmitting(true);

    const success = await updatePlan(plan.id, {
      name: values.name,
      price: parseFloat(values.price),
      periodicity: values.periodicity,
      sport_id: values.sport_id,
    });

    setIsSubmitting(false);

    if (success) {
      toast({
        title: 'Plan actualizado',
        description: `${values.name} ha sido actualizado.`,
      });
      onOpenChange(false);
      onPlanUpdated();
    } else {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el plan.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Editar Plan</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del plan *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Mensual Básico" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sport_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deporte *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar deporte" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loadingSports ? (
                        <SelectItem value="_loading" disabled>Cargando...</SelectItem>
                      ) : sports.length === 0 ? (
                        <SelectItem value="_empty" disabled>Sin deportes</SelectItem>
                      ) : (
                        sports.map(sport => (
                          <SelectItem key={sport.id} value={sport.id}>
                            {sport.name}
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
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="periodicity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Periodicidad *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PERIODICITY_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
