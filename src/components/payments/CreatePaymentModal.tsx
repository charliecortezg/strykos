import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Button } from '@/components/ui/button';
import { usePayments } from '@/hooks/usePayments';
import { usePlayers } from '@/hooks/usePlayers';
import { toast } from 'sonner';
import { Upload, X, Search } from 'lucide-react';
import type { PaymentMethod } from '@/types/categories';
import { getCurrentMonthValue, parseDateOnly } from '@/lib/time-utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
  const [searchQuery, setSearchQuery] = useState('');
  const { createPayment } = usePayments();
  const { players, refetch: refetchPlayers } = usePlayers({ isActive: true });

  // Refetch players when modal opens to ensure fresh data
  useEffect(() => {
    if (open) {
      refetchPlayers();
    }
  }, [open, refetchPlayers]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      player_id: defaultPlayerId || '',
      amount: 0,
      payment_method: 'efectivo',
      payment_month: getCurrentMonthValue(),
      concept: 'Mensualidad',
      notes: '',
    },
  });

  // Filter players based on search
  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return players;
    const query = searchQuery.toLowerCase();
    return players.filter(
      (p) =>
        p.full_name.toLowerCase().includes(query) ||
        p.category?.name?.toLowerCase().includes(query)
    );
  }, [players, searchQuery]);

  // Generate months for selector (using local dates to avoid timezone issues)
  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const year = now.getFullYear();
      const month = now.getMonth() - i + 1;
      const date = new Date(year, month, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
      const label = format(date, 'MMMM yyyy', { locale: es });
      return { value, label };
    });
  }, []);

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
      setSearchQuery('');
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

  // Get selected player name for display
  const selectedPlayer = players.find((p) => p.id === form.watch('player_id'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Registrar Nuevo Pago</DialogTitle>
          <DialogDescription>
            Busca al jugador y registra el pago
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Player Search */}
            <FormField
              control={form.control}
              name="player_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Buscar Jugador</FormLabel>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar jugador por nombre, categoría o deporte..."
                      value={selectedPlayer ? selectedPlayer.full_name : searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (field.value) {
                          field.onChange('');
                        }
                      }}
                      className="pl-10"
                    />
                  </div>
                  
                  {/* Player suggestions dropdown */}
                  {searchQuery && !field.value && (
                    <div className="mt-1 border rounded-md bg-popover shadow-md max-h-48 overflow-y-auto">
                      {filteredPlayers.length === 0 ? (
                        <p className="p-3 text-sm text-muted-foreground">No se encontraron jugadores</p>
                      ) : (
                        filteredPlayers.slice(0, 8).map((player) => (
                          <button
                            key={player.id}
                            type="button"
                            onClick={() => {
                              field.onChange(player.id);
                              handlePlayerChange(player.id);
                              setSearchQuery('');
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-muted transition-colors text-sm"
                          >
                            <span className="font-medium">{player.full_name}</span>
                            {player.category?.name && (
                              <span className="text-muted-foreground ml-2">
                                — {player.category.name}
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  
                  {/* Clear selection button */}
                  {field.value && (
                    <button
                      type="button"
                      onClick={() => {
                        field.onChange('');
                        setSearchQuery('');
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Monto + Método in two columns */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
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

            {/* Mes + Concepto in two columns */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="payment_month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mes Correspondiente</FormLabel>
                    <FormControl>
                      <Input
                        type="month"
                        value={field.value.slice(0, 7)}
                        onChange={(e) => field.onChange(e.target.value + '-01')}
                      />
                    </FormControl>
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
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Notas adicionales" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Evidence upload */}
            <div className="space-y-2">
              <FormLabel>Evidencia de Pago (opcional)</FormLabel>
              {evidenceFile ? (
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                  <span className="text-sm truncate flex-1">{evidenceFile.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEvidenceFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Clic para subir imagen
                  </span>
                  <span className="text-xs text-muted-foreground">
                    JPG, PNG o WEBP (máx. 5MB)
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              )}
            </div>

            {/* Submit button */}
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Guardando...' : 'Registrar Pago'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
