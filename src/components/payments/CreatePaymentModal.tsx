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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { usePayments } from '@/hooks/usePayments';
import { usePlayers } from '@/hooks/usePlayers';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';
import type { PaymentMethod } from '@/types/categories';

const formSchema = z.object({
  player_id: z.string().min(1, 'Selecciona un jugador'),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  payment_method: z.enum(['efectivo', 'transferencia', 'tarjeta', 'otro']),
  payment_month: z.string().min(1, 'Selecciona el mes'),
  concept: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreatePaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultPlayerId?: string;
}

export function CreatePaymentModal({
  open,
  onOpenChange,
  onSuccess,
  defaultPlayerId,
}: CreatePaymentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const { createPayment } = usePayments();
  const { players } = usePlayers({ isActive: true });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      player_id: defaultPlayerId || '',
      amount: 0,
      payment_method: 'efectivo',
      payment_month: new Date().toISOString().slice(0, 7) + '-01',
      concept: 'Mensualidad',
      notes: '',
    },
  });

  // Generate months for selector
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i + 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
    const label = date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    return { value, label };
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('El archivo debe ser menor a 5MB');
        return;
      }
      setEvidenceFile(file);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);

    const success = await createPayment(
      {
        player_id: values.player_id,
        amount: values.amount,
        payment_method: values.payment_method as PaymentMethod,
        payment_month: values.payment_month,
        concept: values.concept,
        notes: values.notes,
      },
      evidenceFile || undefined
    );

    setIsLoading(false);

    if (success) {
      toast.success('Pago registrado correctamente');
      form.reset();
      setEvidenceFile(null);
      onSuccess();
    } else {
      toast.error('Error al registrar el pago');
    }
  };

  // Auto-fill amount when player is selected
  const handlePlayerChange = (playerId: string) => {
    const player = players.find((p) => p.id === playerId);
    if (player?.monthly_fee) {
      form.setValue('amount', player.monthly_fee);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Registrar Pago</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="player_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jugador</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      handlePlayerChange(value);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un jugador" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {players.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.full_name}
                          {player.category?.name && ` - ${player.category.name}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="efectivo">Efectivo</SelectItem>
                        <SelectItem value="transferencia">Transferencia</SelectItem>
                        <SelectItem value="tarjeta">Tarjeta</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="payment_month"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mes del pago</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="concept"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Concepto</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Mensualidad" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Evidence upload */}
            <div className="space-y-2">
              <FormLabel>Comprobante (opcional)</FormLabel>
              {evidenceFile ? (
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <span className="text-sm truncate flex-1">{evidenceFile.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setEvidenceFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex items-center gap-2 p-4 border-2 border-dashed rounded-md cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Subir imagen (máx 5MB)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              )}
            </div>

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
                {isLoading ? 'Guardando...' : 'Registrar Pago'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
