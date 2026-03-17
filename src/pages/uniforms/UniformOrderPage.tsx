import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

const PERMANENT_BLOCKS = [67, 69];

const PRICES: Record<string, number> = {
  manga_corta: 500,
  manga_larga: 600,
};

const SIZE_GROUPS = [
  {
    label: 'INFANTIL CORTE RECTO',
    sizes: [
      { value: '4', label: 'Talla 4', alto: 41, ancho: 34 },
      { value: '6', label: 'Talla 6', alto: 44, ancho: 36 },
      { value: '8', label: 'Talla 8', alto: 52.5, ancho: 49 },
      { value: '10', label: 'Talla 10', alto: 55.5, ancho: 41.5 },
      { value: '12', label: 'Talla 12', alto: 57, ancho: 44.5 },
      { value: '14', label: 'Talla 14', alto: 61, ancho: 47.5 },
      { value: '16', label: 'Talla 16', alto: 64, ancho: 50.5 },
    ],
  },
  {
    label: 'MASCULINO',
    sizes: [
      { value: 'S', label: 'S', alto: 67, ancho: 54 },
      { value: 'M', label: 'M', alto: 69, ancho: 57 },
      { value: 'L', label: 'L', alto: 71, ancho: 60 },
      { value: 'XL', label: 'XL', alto: 73, ancho: 63 },
      { value: 'XXL', label: 'XXL', alto: 75, ancho: 66 },
    ],
  },
  {
    label: 'FEMENINO',
    sizes: [
      { value: 'S-F', label: 'S', alto: 61, ancho: 48 },
      { value: 'M-F', label: 'M', alto: 63, ancho: 51 },
      { value: 'L-F', label: 'L', alto: 65, ancho: 54 },
      { value: 'XL-F', label: 'XL', alto: 68, ancho: 57 },
    ],
  },
];

const GOLD = '#C9A84C';
const BG = '#0A0A0A';

type CampaignState = 'loading' | 'active' | 'closed' | 'invalid' | 'success';

interface Category { id: string; name: string }

export default function UniformOrderPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<CampaignState>('loading');
  const [campaignName, setCampaignName] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [occupied, setOccupied] = useState<number[]>([]);

  // Form
  const [playerName, setPlayerName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [uniformType, setUniformType] = useState<string>('');
  const [jerseySize, setJerseySize] = useState('');
  const [nameOnJersey, setNameOnJersey] = useState('');
  const [requestedNumber, setRequestedNumber] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Success data
  const [successData, setSuccessData] = useState<any>(null);

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uniform-campaign`;

  // Load campaign
  useEffect(() => {
    if (!token) { setState('invalid'); return; }
    fetch(`${baseUrl}?token=${token}`)
      .then(async (r) => {
        if (r.status === 404) { setState('invalid'); return; }
        if (r.status === 409) { setState('closed'); return; }
        const data = await r.json();
        if (data.error) { setState('invalid'); return; }
        setCampaignId(data.campaign_id);
        setCampaignName(data.campaign_name);
        setCategories(data.categories || []);
        setState('active');
      })
      .catch(() => setState('invalid'));
  }, [token]);

  // Load numbers when category changes
  useEffect(() => {
    if (!categoryId || !token) return;
    fetch(`${baseUrl}?token=${token}&action=available-numbers&category_id=${categoryId}`)
      .then((r) => r.json())
      .then((d) => setOccupied(d.occupied || []))
      .catch(() => {});
  }, [categoryId, token]);

  const selectedSizeInfo = useMemo(() => {
    for (const g of SIZE_GROUPS) {
      const s = g.sizes.find((s) => s.value === jerseySize);
      if (s) return s;
    }
    return null;
  }, [jerseySize]);

  const numberAvailable = requestedNumber !== null &&
    requestedNumber >= 1 && requestedNumber <= 99 &&
    !occupied.includes(requestedNumber);

  const numberInvalid = requestedNumber !== null &&
    (requestedNumber < 1 || requestedNumber > 99 || occupied.includes(requestedNumber));

  const canSubmit = playerName.trim() && categoryId && uniformType && jerseySize &&
    nameOnJersey.trim() && nameOnJersey.trim().length <= 12 && numberAvailable && !submitting;

  const categoryName = categories.find((c) => c.id === categoryId)?.name || '';
  const price = uniformType ? PRICES[uniformType] : 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${baseUrl}?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_name: playerName.trim(),
          category_id: categoryId,
          category_name: categoryName,
          uniform_type: uniformType,
          jersey_size: jerseySize,
          name_on_jersey: nameOnJersey.trim().toUpperCase(),
          requested_number: requestedNumber,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        setErrorMsg(data.message || data.error || 'Error al enviar pedido');
        // Refresh numbers
        if (categoryId && token) {
          const nr = await fetch(`${baseUrl}?token=${token}&action=available-numbers&category_id=${categoryId}`);
          const nd = await nr.json();
          setOccupied(nd.occupied || []);
        }
        setSubmitting(false);
        return;
      }

      setSuccessData(data.data);
      setState('success');
    } catch {
      setErrorMsg('Error de conexión. Intenta de nuevo.');
    }
    setSubmitting(false);
  };

  // ── RENDER STATES ──

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: GOLD, borderTopColor: 'transparent' }} />
          <p className="text-white/60 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (state === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: BG }}>
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-white text-xl font-bold">Link inválido o expirado</p>
          <p className="text-white/60 text-sm">Contacta a White Lions Academy para obtener el link correcto.</p>
        </div>
      </div>
    );
  }

  if (state === 'closed') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: BG }}>
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-white text-xl font-bold">Período cerrado</p>
          <p className="text-white/60 text-sm">El período de pedidos de uniformes ha cerrado. Contacta a White Lions Academy si tienes dudas.</p>
        </div>
      </div>
    );
  }

  if (state === 'success' && successData) {
    return (
      <div className="min-h-screen px-4 py-8" style={{ background: BG }}>
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center">
            <p className="text-3xl mb-2">✅</p>
            <h1 className="text-2xl font-bold text-white">¡Pedido registrado!</h1>
          </div>

          <div className="rounded-xl border p-4 space-y-2 text-sm" style={{ borderColor: GOLD + '40', background: '#111' }}>
            <Row label="Jugador" value={successData.player_name} />
            <Row label="Categoría" value={successData.category_name} />
            <Row label="Tipo" value={successData.uniform_type === 'manga_corta' ? 'Manga Corta' : 'Manga Larga'} />
            <Row label="Talla" value={successData.jersey_size} />
            <Row label="Nombre camiseta" value={successData.name_on_jersey} />
            <Row label="Número" value={`#${successData.assigned_number}`} />
          </div>

          <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: GOLD + '60', background: '#0D0D0D' }}>
            <p className="font-bold text-white flex items-center gap-2">💳 Realiza tu pago completo</p>
            <div className="rounded-lg p-3 text-sm space-y-1" style={{ background: '#1A1A1A' }}>
              <p className="text-white/60">⚠️ El pago debe ser el monto COMPLETO. Pagos parciales no son válidos.</p>
            </div>
            <p className="text-2xl font-black text-center" style={{ color: GOLD }}>
              ${successData.price} MXN
            </p>
            <div className="text-sm text-white/80 space-y-1">
              <p className="font-semibold text-white">Transfiere o deposita a:</p>
              <p>Nombre: Carlos Mario Cortez Gurrola</p>
              <p>Banco: Citibanamex</p>
              <p className="font-mono tracking-wider">Tarjeta: 5256 7840 0306 7195</p>
            </div>
            <p className="text-xs text-white/50">
              Guarda tu comprobante de pago. El equipo de White Lions Academy lo verificará y confirmará tu pedido.
            </p>
          </div>

          <p className="text-center text-white/60 text-sm">🦁 Gracias. Aquí inicia tu mejor versión.</p>
        </div>
      </div>
    );
  }

  // ── ACTIVE FORM ──
  return (
    <div className="min-h-screen px-4 py-6" style={{ background: BG }}>
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold text-white">🦁 White Lions Academy</h1>
          <p className="text-sm" style={{ color: GOLD }}>Pedido de Uniforme — {campaignName}</p>
          <p className="text-xs text-white/50">Completa todos los campos. El pago debe ser COMPLETO para que tu pedido sea válido.</p>
        </div>

        {/* Step 1: Player */}
        <Section title="1. Datos del jugador">
          <input
            className="w-full rounded-lg px-4 py-3 text-white text-sm outline-none"
            style={{ background: '#1A1A1A', border: '1px solid #333' }}
            placeholder="Nombre completo del jugador"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <select
            className="w-full rounded-lg px-4 py-3 text-white text-sm outline-none mt-3 appearance-none"
            style={{ background: '#1A1A1A', border: '1px solid #333' }}
            value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value); setRequestedNumber(null); }}
          >
            <option value="">Selecciona categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Section>

        {/* Step 2: Type */}
        <Section title="2. Tipo de uniforme">
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'manga_corta', label: 'MANGA CORTA', price: 500 },
              { key: 'manga_larga', label: 'MANGA LARGA', price: 600 },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setUniformType(t.key)}
                className={cn(
                  'rounded-xl p-4 text-center transition-all',
                  uniformType === t.key
                    ? 'ring-2 text-white'
                    : 'text-white/70 hover:text-white'
                )}
                style={{
                  background: '#1A1A1A',
                  border: `1px solid ${uniformType === t.key ? GOLD : '#333'}`,
                  boxShadow: uniformType === t.key ? `0 0 0 2px ${GOLD}` : undefined,
                }}
              >
                <p className="text-xs font-bold" style={{ color: GOLD }}>🟡 {t.label}</p>
                <p className="text-xs text-white/50 mt-1">Completo</p>
                <p className="text-xs text-white/50">Camisa + Shorts + Calcetas</p>
                <p className="text-lg font-black mt-2" style={{ color: GOLD }}>${t.price} MXN</p>
              </button>
            ))}
          </div>
        </Section>

        {/* Step 3: Name on jersey */}
        <Section title="3. Nombre en la camiseta">
          <div className="relative">
            <input
              className="w-full rounded-lg px-4 py-3 text-white text-sm outline-none uppercase"
              style={{ background: '#1A1A1A', border: '1px solid #333' }}
              placeholder="Ej: RODRÍGUEZ"
              maxLength={12}
              value={nameOnJersey}
              onChange={(e) => setNameOnJersey(e.target.value.toUpperCase())}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40">
              {nameOnJersey.length} / 12
            </span>
          </div>
        </Section>

        {/* Step 4: Size */}
        <Section title="4. Talla">
          {SIZE_GROUPS.map((group) => (
            <SizeGroup
              key={group.label}
              group={group}
              selected={jerseySize}
              onSelect={setJerseySize}
            />
          ))}
          {selectedSizeInfo && (
            <p className="text-xs text-center mt-2" style={{ color: GOLD }}>
              Alto: {selectedSizeInfo.alto} cm · Ancho: {selectedSizeInfo.ancho} cm
            </p>
          )}
        </Section>

        {/* Step 5: Number */}
        <Section title="5. Número de camiseta">
          {!categoryId ? (
            <p className="text-sm text-white/40 text-center py-4">
              Primero selecciona la categoría de tu hijo.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-white/50">Del 1 al 99. Sin repetidos en tu categoría.</p>
              <input
                type="number"
                min={1}
                max={99}
                className="w-full rounded-lg px-4 py-4 text-white text-center text-3xl font-black outline-none"
                style={{ background: '#1A1A1A', border: '1px solid #333' }}
                placeholder="#"
                value={requestedNumber ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setRequestedNumber(v === '' ? null : parseInt(v, 10));
                }}
              />

              {numberAvailable && (
                <p className="text-sm text-center font-medium" style={{ color: '#22c55e' }}>
                  ✓ ¡Número disponible!
                </p>
              )}
              {numberInvalid && (
                <p className="text-sm text-center font-medium text-red-400">
                  Este número no está disponible. Elige otro.
                </p>
              )}

              {/* Grid */}
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: 99 }, (_, i) => i + 1).map((n) => {
                  const isPermanent = PERMANENT_BLOCKS.includes(n);
                  const isOccupied = occupied.includes(n);
                  const isSelected = requestedNumber === n;
                  const isFree = !isPermanent && !isOccupied;

                  return (
                    <button
                      key={n}
                      disabled={!isFree}
                      onClick={() => setRequestedNumber(n)}
                      className={cn(
                        'aspect-square rounded text-xs font-bold flex items-center justify-center transition-all',
                        isPermanent && 'line-through opacity-40 cursor-not-allowed',
                        isOccupied && !isPermanent && 'opacity-30 cursor-not-allowed',
                        isSelected && 'ring-2',
                        isFree && !isSelected && 'hover:opacity-80 cursor-pointer'
                      )}
                      style={{
                        background: isSelected ? GOLD : isPermanent ? '#3a1010' : isOccupied ? '#222' : '#1A1A1A',
                        color: isSelected ? '#000' : isPermanent ? '#ff4444' : isOccupied ? '#555' : '#ccc',
                        border: `1px solid ${isSelected ? GOLD : '#333'}`,
                        boxShadow: isSelected ? `0 0 0 2px ${GOLD}` : undefined,
                      }}
                    >
                      {isPermanent ? '✕' : n}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-white/30 text-center">
                Los números en gris ya están asignados en tu categoría.
              </p>
            </div>
          )}
        </Section>

        {/* Summary */}
        {(playerName || categoryId || uniformType) && (
          <div className="rounded-xl p-4 space-y-1 text-sm" style={{ background: '#111', border: `1px solid ${GOLD}40` }}>
            <p className="font-bold text-white mb-2">Resumen</p>
            {playerName && <Row label="Jugador" value={playerName} />}
            {categoryName && <Row label="Categoría" value={categoryName} />}
            {uniformType && <Row label="Tipo" value={uniformType === 'manga_corta' ? 'Manga Corta' : 'Manga Larga'} />}
            {jerseySize && <Row label="Talla" value={jerseySize} />}
            {nameOnJersey && <Row label="Nombre" value={nameOnJersey} />}
            {requestedNumber && <Row label="Número" value={`#${requestedNumber}`} />}
            {price > 0 && (
              <p className="text-lg font-black pt-2 text-center" style={{ color: GOLD }}>
                Total: ${price} MXN
              </p>
            )}
          </div>
        )}

        {errorMsg && (
          <p className="text-sm text-red-400 text-center">{errorMsg}</p>
        )}

        {/* Submit */}
        <button
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="w-full py-4 rounded-xl font-black text-lg transition-all disabled:opacity-40"
          style={{
            background: canSubmit ? GOLD : '#333',
            color: canSubmit ? '#000' : '#666',
          }}
        >
          {submitting ? 'ENVIANDO...' : 'ENVIAR PEDIDO'}
        </button>
      </div>
    </div>
  );
}

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

function SizeGroup({
  group,
  selected,
  onSelect,
}: {
  group: (typeof SIZE_GROUPS)[number];
  selected: string;
  onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left text-xs font-bold py-2 px-3 rounded-lg flex justify-between items-center"
        style={{ background: '#1A1A1A', color: '#ccc' }}
      >
        {open ? '▼' : '▶'} {group.label}
      </button>
      {open && (
        <div className="flex flex-wrap gap-2 mt-2 pl-2">
          {group.sizes.map((s) => (
            <button
              key={s.value}
              onClick={() => onSelect(s.value)}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: selected === s.value ? GOLD : '#1A1A1A',
                color: selected === s.value ? '#000' : '#ccc',
                border: `1px solid ${selected === s.value ? GOLD : '#333'}`,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
