import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Trash2, Plus, CheckCircle2, Shirt } from 'lucide-react';
import { toast } from 'sonner';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;
const MAX_ITEMS = 5;
const MAX_NAME = 12;

interface CampaignData {
  id: string;
  name: string;
  deadline: string | null;
  notes: string | null;
  status: string;
  price_per_item: number;
}

interface DraftItem {
  name_on_jersey: string;
  number_on_jersey: number | null;
  size: (typeof SIZES)[number];
}

type Step = 'buyer' | 'items' | 'done';

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cheer-campaign`;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5 space-y-4">
      <h2 className="text-lg font-display font-semibold">{title}</h2>
      {children}
    </Card>
  );
}

export default function CheerOrderPage() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['cheer-public', token],
    queryFn: async () => {
      const res = await fetch(`${FUNCTIONS_URL}?token=${token}`, {
        headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error al cargar campaña');
      return json.campaign as CampaignData;
    },
    enabled: !!token,
    retry: false,
  });

  const [step, setStep] = useState<Step>('buyer');
  const [buyerName, setBuyerName] = useState('');
  const [buyerWhatsapp, setBuyerWhatsapp] = useState('');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [showItemForm, setShowItemForm] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftNumber, setDraftNumber] = useState('');
  const [draftSize, setDraftSize] = useState<(typeof SIZES)[number] | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<any>(null);

  const price = data?.price_per_item ?? 350;
  const total = useMemo(() => items.length * price, [items.length, price]);

  const deadlinePassed =
    data?.deadline && new Date(data.deadline + 'T23:59:59').getTime() < Date.now();
  const isClosed = data?.status === 'closed' || deadlinePassed;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-8 max-w-md text-center space-y-3">
          <h1 className="text-xl font-display font-semibold">
            Campaña no disponible
          </h1>
          <p className="text-muted-foreground text-sm">
            El enlace que recibiste no es válido o expiró. Contacta a la academia.
          </p>
        </Card>
      </div>
    );
  }

  if (isClosed && step !== 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-8 max-w-md text-center space-y-3">
          <h1 className="text-xl font-display font-semibold">{data.name}</h1>
          <p className="text-muted-foreground text-sm">
            Esta campaña ya está cerrada y no acepta más pedidos.
          </p>
        </Card>
      </div>
    );
  }

  // ---------- Step 1: Buyer ----------
  function handleBuyerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!buyerName.trim() || buyerName.trim().length < 3) {
      toast.error('Escribe tu nombre completo');
      return;
    }
    if (!buyerWhatsapp.trim() || buyerWhatsapp.replace(/\D/g, '').length < 10) {
      toast.error('Escribe un WhatsApp válido (10 dígitos)');
      return;
    }
    setStep('items');
  }

  // ---------- Step 2: Items ----------
  function addItem() {
    const cleanName = draftName.trim().toUpperCase();
    if (!cleanName) {
      toast.error('Nombre requerido');
      return;
    }
    if (cleanName.length > MAX_NAME) {
      toast.error(`Máximo ${MAX_NAME} caracteres`);
      return;
    }
    if (!draftSize) {
      toast.error('Selecciona una talla');
      return;
    }
    let num: number | null = null;
    if (draftNumber.trim()) {
      const n = parseInt(draftNumber, 10);
      if (!Number.isInteger(n) || n < 1 || n > 99) {
        toast.error('El número debe estar entre 1 y 99');
        return;
      }
      num = n;
    }
    setItems((prev) => [
      ...prev,
      { name_on_jersey: cleanName, number_on_jersey: num, size: draftSize },
    ]);
    setDraftName('');
    setDraftNumber('');
    setDraftSize('');
    setShowItemForm(false);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submitOrder() {
    if (items.length < 1) {
      toast.error('Agrega al menos una camiseta');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(FUNCTIONS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          token,
          buyer_name: buyerName.trim(),
          buyer_whatsapp: buyerWhatsapp.trim(),
          items,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error al enviar pedido');
      setConfirmation(json.order);
      setStep('done');
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al enviar pedido');
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- Step 3: Done ----------
  if (step === 'done' && confirmation) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-lg mx-auto space-y-4 py-8">
          <div className="text-center space-y-2">
            <CheckCircle2 className="w-14 h-14 text-success mx-auto" />
            <h1 className="text-2xl font-display font-bold">¡Pedido recibido!</h1>
            <p className="text-muted-foreground text-sm">
              Te contactaremos al WhatsApp proporcionado.
            </p>
          </div>

          <Section title="Resumen">
            <div className="text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">Comprador: </span>
                <span className="font-medium">{confirmation.buyer_name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">WhatsApp: </span>
                <span className="font-medium">{confirmation.buyer_whatsapp}</span>
              </div>
            </div>
            <div className="space-y-2 pt-2">
              {confirmation.items.map((it: any) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between border rounded-md p-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Shirt className="w-4 h-4 text-primary" />
                    <span className="font-medium">{it.name_on_jersey}</span>
                    <span className="text-muted-foreground">
                      {it.number_on_jersey ? `#${it.number_on_jersey}` : 'Sin #'}
                    </span>
                    <span className="text-muted-foreground">· {it.size}</span>
                  </div>
                  <span className="font-medium">${it.item_price}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-3 border-t font-display font-semibold">
              <span>Total</span>
              <span>${confirmation.total_price} MXN</span>
            </div>
          </Section>
        </div>
      </div>
    );
  }

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto space-y-4 py-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-display font-bold">{data.name}</h1>
          <p className="text-sm text-muted-foreground">
            Camisetas de porra · ${price} MXN c/u
          </p>
          {data.notes && (
            <p className="text-xs text-muted-foreground italic mt-2">{data.notes}</p>
          )}
        </div>

        {step === 'buyer' && (
          <form onSubmit={handleBuyerSubmit}>
            <Section title="Tus datos">
              <div className="space-y-2">
                <Label htmlFor="bname">Nombre completo</Label>
                <Input
                  id="bname"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Ej. María González"
                  maxLength={120}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bwa">WhatsApp</Label>
                <Input
                  id="bwa"
                  inputMode="numeric"
                  value={buyerWhatsapp}
                  onChange={(e) => setBuyerWhatsapp(e.target.value)}
                  placeholder="10 dígitos"
                  maxLength={20}
                  required
                />
              </div>
              <Button type="submit" className="w-full" size="lg">
                Continuar
              </Button>
            </Section>
          </form>
        )}

        {step === 'items' && (
          <>
            <Section title="Camisetas">
              {items.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aún no has agregado ninguna camiseta.
                </p>
              )}

              <div className="space-y-2">
                {items.map((it, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between border rounded-md p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Shirt className="w-5 h-5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{it.name_on_jersey}</div>
                        <div className="text-xs text-muted-foreground">
                          {it.number_on_jersey ? `#${it.number_on_jersey}` : 'Sin número'} · Talla {it.size} · ${price}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(idx)}
                      aria-label="Eliminar camiseta"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              {showItemForm && items.length < MAX_ITEMS && (
                <div className="border rounded-md p-3 space-y-3 bg-muted/30">
                  <div className="space-y-1">
                    <Label htmlFor="iname">
                      Nombre en camiseta{' '}
                      <span className="text-xs text-muted-foreground">
                        ({draftName.length}/{MAX_NAME})
                      </span>
                    </Label>
                    <Input
                      id="iname"
                      value={draftName}
                      onChange={(e) =>
                        setDraftName(e.target.value.toUpperCase().slice(0, MAX_NAME))
                      }
                      placeholder="EJ. SOFIA"
                      maxLength={MAX_NAME}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="inum">Número en camiseta (opcional)</Label>
                    <Input
                      id="inum"
                      inputMode="numeric"
                      value={draftNumber}
                      onChange={(e) =>
                        setDraftNumber(e.target.value.replace(/\D/g, '').slice(0, 2))
                      }
                      placeholder="1 - 99"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Talla</Label>
                    <Select
                      value={draftSize}
                      onValueChange={(v) => setDraftSize(v as (typeof SIZES)[number])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona talla" />
                      </SelectTrigger>
                      <SelectContent>
                        {SIZES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowItemForm(false);
                        setDraftName('');
                        setDraftNumber('');
                        setDraftSize('');
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button className="flex-1" onClick={addItem}>
                      Agregar
                    </Button>
                  </div>
                </div>
              )}

              {!showItemForm && items.length < MAX_ITEMS && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowItemForm(true)}
                >
                  <Plus className="w-4 h-4 mr-1" /> Agregar camiseta
                </Button>
              )}

              {items.length >= MAX_ITEMS && (
                <p className="text-xs text-center text-muted-foreground">
                  Máximo {MAX_ITEMS} camisetas por pedido
                </p>
              )}

              {items.length > 0 && (
                <div className="flex justify-between pt-3 border-t font-display font-semibold">
                  <span>
                    Total ({items.length} × ${price})
                  </span>
                  <span>${total} MXN</span>
                </div>
              )}
            </Section>

            <Button
              className="w-full"
              size="lg"
              onClick={submitOrder}
              disabled={submitting || items.length < 1}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Enviando...
                </>
              ) : (
                'Enviar pedido'
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
