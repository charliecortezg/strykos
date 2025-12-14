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
import { useVenues } from '@/hooks/useVenues';
import { toast } from 'sonner';
import type { Venue } from '@/types/categories';

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  address: z.string().max(200).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditVenueModalProps {
  venue: Venue | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditVenueModal({
  venue,
  open,
  onOpenChange,
  onSuccess,
}: EditVenueModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { updateVenue } = useVenues();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      address: '',
    },
  });

  useEffect(() => {
    if (venue) {
      form.reset({
        name: venue.name,
        address: venue.address || '',
      });
    }
  }, [venue, form]);

  const onSubmit = async (values: FormValues) => {
    if (!venue) return;

    setIsLoading(true);

    const success = await updateVenue(venue.id, {
      name: values.name,
      address: values.address,
    });

    setIsLoading(false);

    if (success) {
      toast.success('Sede actualizada');
      onSuccess();
    } else {
      toast.error('Error al actualizar la sede');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Editar Sede</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección (opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
