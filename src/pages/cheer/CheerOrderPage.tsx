import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;
const MAX_ITEMS = 5;
const MAX_NAME = 12;

// STRYK colors (match UniformOrderPage)
const GOLD = '#d4a030';
const BG = '#0d1a33';
const CARD = '#1a2a4a';
const BORDER = '#2a3a5a';

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div className="text-center space-y-4">
          <div
            className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto"
            style={{ borderColor: GOLD, borderTopColor: 'transparent' }}
          />
          <p className="text-white/60 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: BG }}>
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-white text-xl font-bold">Link inválido o expirado</p>
          <p className="text-white/60 text-sm">
            Contacta a White Lions Academy para obtener el link correcto.
          </p>
        </div>
      </div>
    );
  }

  if (isClosed && step !== 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: BG }}>
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-white text-xl font-bold">Período cerrado</p>
          <p className="text-white/60 text-sm">
            Esta campaña ya está cerrada y no acepta más pedidos. Contacta a White Lions Academy si tienes dudas.
          </p>
        </div>
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
      <div className="min-h-screen px-4 py-8" style={{ background: BG }}>
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center">
            <p className="text-3xl mb-2">✅</p>
            <h1 className="text-2xl font-bold text-white">¡Pedido recibido!</h1>
            <p className="text-white/60 text-sm mt-2">
              Te contactaremos al WhatsApp proporcionado para confirmar tu pago.
            </p>
          </div>

          <div
            className="rounded-xl p-4 space-y-2 text-sm"
            style={{ borderColor: BORDER, background: CARD, border: `1px solid ${BORDER}` }}
          >
            <Row label="Comprador" value={confirmation.buyer_name} />
            <Row label="WhatsApp" value={confirmation.buyer_whatsapp} />
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-bold text-white/80">Camisetas</h2>
            <div className="space-y-2">
              {confirmation.items.map((it: any) => (
                <div
                  key={it.id}
                  className="rounded-lg p-3 flex items-center justify-between text-sm"
                  style={{ background: CARD, border: `1px solid ${BORDER}` }}
                >
                  <div className="min-w-0">
                    <p className="text-white font-semibold truncate">{it.name_on_jersey}</p>
                    <p className="text-white/50 text-xs">
                      {it.number_on_jersey ? `#${it.number_on_jersey}` : 'Sin número'} · Talla {it.size}
                    </p>
                  </div>
                  <p className="font-black" style={{ color: GOLD }}>${it.item_price}</p>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-xl p-4 text-center"
            style={{ background: CARD, border: `1px solid ${GOLD}60` }}
          >
            <p className="text-white/60 text-xs uppercase tracking-wide">Total</p>
            <p className="text-2xl font-black mt-1" style={{ color: GOLD }}>
              ${confirmation.total_price} MXN
            </p>
          </div>

          <PaymentInfoCard price={confirmation.total_price} />

          <p className="text-center text-white/60 text-sm">🦁 Gracias. Vamos con todo.</p>
        </div>
      </div>
    );
  }

  // ---------- Render ----------
  return (
    <div className="min-h-screen px-4 py-6" style={{ background: BG }}>
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold text-white">🦁 White Lions Academy</h1>
          <p className="text-sm font-semibold" style={{ color: GOLD }}>
            {data.name}
          </p>
          <p className="text-xs text-white/50">Camisetas de porra · ${price} MXN c/u</p>
          {data.notes && (
            <p className="text-xs text-white/50 italic mt-2">{data.notes}</p>
          )}
        </div>

        {step === 'buyer' && (
          <form onSubmit={handleBuyerSubmit} className="space-y-6">
            <Section title="1. Tus datos">
              <input
                className="w-full rounded-lg px-4 py-3 text-white text-sm outline-none placeholder:text-white/30"
                style={{ background: CARD, border: `1px solid ${BORDER}` }}
                placeholder="Nombre completo"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                maxLength={120}
                required
              />
              <input
                className="w-full rounded-lg px-4 py-3 text-white text-sm outline-none placeholder:text-white/30 mt-3"
                style={{ background: CARD, border: `1px solid ${BORDER}` }}
                placeholder="WhatsApp (10 dígitos)"
                inputMode="numeric"
                value={buyerWhatsapp}
                onChange={(e) => setBuyerWhatsapp(e.target.value)}
                maxLength={20}
                required
              />
            </Section>

            <button
              type="submit"
              className="w-full py-4 rounded-xl font-black text-lg transition-all"
              style={{ background: GOLD, color: '#000' }}
            >
              CONTINUAR
            </button>
          </form>
        )}

        {step === 'items' && (
          <>
            <Section title="2. Tus camisetas">
              {items.length === 0 && !showItemForm && (
                <p className="text-sm text-white/40 text-center py-4">
                  Aún no has agregado ninguna camiseta.
                </p>
              )}

              <div className="space-y-2">
                {items.map((it, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg p-3 flex items-center justify-between"
                    style={{ background: CARD, border: `1px solid ${BORDER}` }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-semibold truncate">{it.name_on_jersey}</p>
                      <p className="text-white/50 text-xs">
                        {it.number_on_jersey ? `#${it.number_on_jersey}` : 'Sin número'} · Talla {it.size}
                      </p>
                    </div>
                    <p className="font-black mr-3" style={{ color: GOLD }}>${price}</p>
                    <button
                      onClick={() => removeItem(idx)}
                      className="text-white/40 hover:text-red-400 transition-colors text-lg px-2"
                      aria-label="Eliminar camiseta"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {showItemForm && items.length < MAX_ITEMS && (
                <div
                  className="rounded-xl p-4 space-y-4 mt-3"
                  style={{ background: CARD, border: `1px solid ${GOLD}60` }}
                >
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-xs font-bold text-white/80">
                        Nombre en camiseta
                      </label>
                      <span className="text-xs text-white/40">
                        {draftName.length} / {MAX_NAME}
                      </span>
                    </div>
                    <input
                      className="w-full rounded-lg px-4 py-3 text-white text-sm outline-none uppercase placeholder:text-white/30"
                      style={{ background: BG, border: `1px solid ${BORDER}` }}
                      placeholder="EJ: SOFIA"
                      maxLength={MAX_NAME}
                      value={draftName}
                      onChange={(e) =>
                        setDraftName(e.target.value.toUpperCase().slice(0, MAX_NAME))
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-white/80 block mb-2">
                      Número en camiseta (opcional)
                    </label>
                    <input
                      className="w-full rounded-lg px-4 py-3 text-white text-sm outline-none placeholder:text-white/30"
                      style={{ background: BG, border: `1px solid ${BORDER}` }}
                      placeholder="1 - 99"
                      inputMode="numeric"
                      value={draftNumber}
                      onChange={(e) =>
                        setDraftNumber(e.target.value.replace(/\D/g, '').slice(0, 2))
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-white/80 block mb-2">Talla</label>
                    <div className="grid grid-cols-6 gap-2">
                      {SIZES.map((s) => {
                        const selected = draftSize === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setDraftSize(s)}
                            className="rounded-lg py-3 text-sm font-bold transition-all"
                            style={{
                              background: selected ? GOLD : BG,
                              color: selected ? '#000' : '#fff',
                              border: `2px solid ${selected ? GOLD : BORDER}`,
                              boxShadow: selected ? `0 0 8px ${GOLD}50` : undefined,
                            }}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowItemForm(false);
                        setDraftName('');
                        setDraftNumber('');
                        setDraftSize('');
                      }}
                      className="py-3 rounded-lg font-bold text-sm transition-all"
                      style={{ background: 'transparent', color: '#fff', border: `1px solid ${BORDER}` }}
                    >
                      CANCELAR
                    </button>
                    <button
                      type="button"
                      onClick={addItem}
                      className="py-3 rounded-lg font-bold text-sm transition-all"
                      style={{ background: GOLD, color: '#000' }}
                    >
                      AGREGAR
                    </button>
                  </div>
                </div>
              )}

              {!showItemForm && items.length < MAX_ITEMS && (
                <button
                  onClick={() => setShowItemForm(true)}
                  className="w-full py-3 rounded-lg font-bold text-sm transition-all mt-3"
                  style={{
                    background: 'transparent',
                    color: GOLD,
                    border: `2px dashed ${GOLD}80`,
                  }}
                >
                  + AGREGAR CAMISETA
                </button>
              )}

              {items.length >= MAX_ITEMS && (
                <p className="text-xs text-center text-white/40 mt-3">
                  Máximo {MAX_ITEMS} camisetas por pedido
                </p>
              )}
            </Section>

            {items.length > 0 && (
              <div
                className="rounded-xl p-4 text-center"
                style={{ background: CARD, border: `1px solid ${GOLD}40` }}
              >
                <p className="text-white/60 text-xs">
                  {items.length} {items.length === 1 ? 'camiseta' : 'camisetas'} × ${price}
                </p>
                <p className="text-2xl font-black mt-1" style={{ color: GOLD }}>
                  Total: ${total} MXN
                </p>
              </div>
            )}

            <PaymentInfoCard price={total} />

            <button
              onClick={submitOrder}
              disabled={submitting || items.length < 1}
              className="w-full py-4 rounded-xl font-black text-lg transition-all disabled:opacity-40"
              style={{
                background: items.length > 0 && !submitting ? GOLD : BORDER,
                color: items.length > 0 && !submitting ? '#000' : '#556',
              }}
            >
              {submitting ? 'ENVIANDO...' : 'ENVIAR PEDIDO'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-bold text-white/80">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-white/50">{label}:</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}

function PaymentInfoCard({ price }: { price: number }) {
  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: '#0f1e38', border: `1px solid ${GOLD}60` }}
    >
      <p className="font-bold text-white flex items-center gap-2">💳 Información de pago</p>
      <div className="rounded-lg p-3 text-sm" style={{ background: CARD }}>
        <p className="text-white/60">
          ⚠️ El pago debe ser el monto COMPLETO. Pagos parciales no son válidos.
        </p>
      </div>
      {price > 0 && (
        <p className="text-2xl font-black text-center" style={{ color: GOLD }}>
          ${price} MXN
        </p>
      )}
      <div className="text-sm text-white/80 space-y-1">
        <p className="font-semibold text-white">Transfiere o deposita a:</p>
        <p>Nombre: Carlos Mario Cortez Gurrola</p>
        <p>Banco: Citibanamex</p>
        <p className="font-mono tracking-wider">Tarjeta: 5256 7840 0306 7195</p>
      </div>
      <p className="text-xs text-white/50">
        Guarda tu comprobante de pago. El equipo de White Lions Academy lo verificará.
      </p>
    </div>
  );
}
