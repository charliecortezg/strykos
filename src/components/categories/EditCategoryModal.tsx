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
import { useCategories } from '@/hooks/useCategories';
import { useSports } from '@/hooks/useSports';
import { useVenues } from '@/hooks/useVenues';
import { useTrainers } from '@/hooks/useTrainers';
import { useToast } from '@/hooks/use-toast';
import { useOrgFeatures } from '@/hooks/useOrgFeatures';
import { DAYS_OF_WEEK, AGE_GROUPS, type Category } from '@/types/categories';
import { SmartSportSelector } from '@/components/ui/smart-sport-selector';

const formSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(50),
  sport_id: z.string().optional(),
  venue_id: z.string().optional(),
  trainer_id: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  days_of_week: z.array(z.string()).default([]),
  age_group: z.string().default('8-9'),
});

type FormValues = z.infer<typeof formSchema>;

interface EditCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  onCategoryUpdated: () => void;
}

export function EditCategoryModal({ open, onOpenChange, category, onCategoryUpdated }: EditCategoryModalProps) {
  const { updateCategory } = useCategories();
  const { sports, isLoading: loadingSports, createSport } = useSports();
  const { venues, isLoading: loadingVenues } = useVenues();
  const { trainers, isLoading: loadingTrainers } = useTrainers();
  const { isEnabled } = useOrgFeatures();
  const venuesEnabled = isEnabled('venues');
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      sport_id: '',
      venue_id: '',
      trainer_id: '',
      start_time: '',
      end_time: '',
      days_of_week: [],
      age_group: '8-9',
    },
  });

  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        sport_id: category.sport_id || '',
        venue_id: category.venue_id || '',
        trainer_id: category.trainer_id || '',
        start_time: category.start_time?.slice(0, 5) || '',
        end_time: category.end_time?.slice(0, 5) || '',
        days_of_week: category.days_of_week || [],
        age_group: category.age_group || '8-9',
      });
    }
  }, [category, form]);

  const onSubmit = async (values: FormValues) => {
    if (!category) return;

    setIsSubmitting(true);

    const success = await updateCategory(category.id, {
      name: values.name,
      sport_id: values.sport_id || undefined,
      venue_id: values.venue_id || undefined,
      trainer_id: values.trainer_id || undefined,
      start_time: values.start_time || undefined,
      end_time: values.end_time || undefined,
      days_of_week: values.days_of_week,
      age_group: values.age_group,
    });

    setIsSubmitting(false);

    if (success) {
      toast({
        title: 'Categoría actualizada',
        description: `${values.name} ha sido actualizada.`,
      });
      onOpenChange(false);
      onCategoryUpdated();
    } else {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la categoría.',
        variant: 'destructive',
      });
    }
  };

  const handleCreateSport = async (name: string): Promise<string | null> => {
    const newId = await createSport(name);
    if (newId) {
      toast({
        title: 'Deporte agregado',
        description: `"${name}" ha sido agregado a la lista.`,
      });
    }
    return newId;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Editar Categoría</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Sub-12 Varonil" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="age_group"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grupo de edad</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AGE_GROUPS.map(ag => (
                        <SelectItem key={ag.value} value={ag.value}>
                          {ag.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className={venuesEnabled ? "grid grid-cols-2 gap-4" : ""}>
              <FormField
                control={form.control}
                name="sport_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deporte</FormLabel>
                    <FormControl>
                      <SmartSportSelector
                        sports={sports}
                        value={field.value || ''}
                        onChange={field.onChange}
                        onCreateSport={handleCreateSport}
                        isLoading={loadingSports}
                        placeholder="Buscar deporte..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {venuesEnabled && (
                <FormField
                  control={form.control}
                  name="venue_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sede</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {loadingVenues ? (
                            <SelectItem value="_loading" disabled>Cargando...</SelectItem>
                          ) : venues.length === 0 ? (
                            <SelectItem value="_empty" disabled>Sin sedes</SelectItem>
                          ) : (
                            venues.map(venue => (
                              <SelectItem key={venue.id} value={venue.id}>
                                {venue.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="trainer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entrenador asignado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin asignar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loadingTrainers ? (
                        <SelectItem value="_loading" disabled>Cargando...</SelectItem>
                      ) : trainers.length === 0 ? (
                        <SelectItem value="_empty" disabled>Sin entrenadores</SelectItem>
                      ) : (
                        trainers.map(trainer => (
                          <SelectItem key={trainer.id} value={trainer.id}>
                            {trainer.full_name}
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
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora inicio</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora fin</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="days_of_week"
              render={() => (
                <FormItem>
                  <FormLabel>Días de entrenamiento</FormLabel>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <FormField
                        key={day.value}
                        control={form.control}
                        name="days_of_week"
                        render={({ field }) => (
                          <FormItem key={day.value} className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(day.value)}
                                onCheckedChange={(checked) => {
                                  const newValue = checked
                                    ? [...(field.value || []), day.value]
                                    : field.value?.filter((d) => d !== day.value) || [];
                                  field.onChange(newValue);
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              {day.label}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
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
