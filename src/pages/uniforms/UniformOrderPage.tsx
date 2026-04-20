import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

const PERMANENT_BLOCKS = [67, 69];

const PRICES: Record<string, number> = {
  manga_corta: 500,
  manga_larga: 600,
  solo_camisa: 350,
};

const TYPE_LABELS: Record<string, string> = {
  manga_corta: 'Manga Corta',
  manga_larga: 'Manga Larga',
  solo_camisa: 'Solo Camisa',
};

const SIZE_OPTIONS = [
  { group: 'INFANTIL CORTE RECTO', value: '4', label: 'Talla 4', alto: 41, ancho: 34 },
  { group: 'INFANTIL CORTE RECTO', value: '6', label: 'Talla 6', alto: 44, ancho: 36 },
  { group: 'INFANTIL CORTE RECTO', value: '8', label: 'Talla 8', alto: 52.5, ancho: 49 },
  { group: 'INFANTIL CORTE RECTO', value: '10', label: 'Talla 10', alto: 55.5, ancho: 41.5 },
  { group: 'INFANTIL CORTE RECTO', value: '12', label: 'Talla 12', alto: 57, ancho: 44.5 },
  { group: 'INFANTIL CORTE RECTO', value: '14', label: 'Talla 14', alto: 61, ancho: 47.5 },
  { group: 'INFANTIL CORTE RECTO', value: '16', label: 'Talla 16', alto: 64, ancho: 50.5 },
  { group: 'MASCULINO', value: 'S', label: 'S', alto: 67, ancho: 54 },
  { group: 'MASCULINO', value: 'M', label: 'M', alto: 69, ancho: 57 },
  { group: 'MASCULINO', value: 'L', label: 'L', alto: 71, ancho: 60 },
  { group: 'MASCULINO', value: 'XL', label: 'XL', alto: 73, ancho: 63 },
  { group: 'MASCULINO', value: 'XXL', label: 'XXL', alto: 75, ancho: 66 },
  { group: 'FEMENINO', value: 'S-F', label: 'S', alto: 61, ancho: 48 },
  { group: 'FEMENINO', value: 'M-F', label: 'M', alto: 63, ancho: 51 },
  { group: 'FEMENINO', value: 'L-F', label: 'L', alto: 65, ancho: 54 },
  { group: 'FEMENINO', value: 'XL-F', label: 'XL', alto: 68, ancho: 57 },
];

// STRYK colors
const GOLD = '#d4a030';
const BG = '#0d1a33';
const CARD = '#1a2a4a';
const BORDER = '#2a3a5a';

type CampaignState = 'loading' | 'active' | 'closed' | 'invalid' | 'success';

interface Category { id: string; name: string }

export default function UniformOrderPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<CampaignState>('loading');
  const [campaignName, setCampaignName] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [occupied, setOccupied] = useState<number[]>([]);

  const [playerName, setPlayerName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [uniformType, setUniformType] = useState<string>('');
  const [jerseySize, setJerseySize] = useState('');
  const [nameOnJersey, setNameOnJersey] = useState('');
  const [requestedNumber, setRequestedNumber] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState<any>(null);

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uniform-campaign`;

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
        setCategories((data.categories || []).filter((c: Category) => c.name.toLowerCase() !== 'pruebas'));
        setState('active');
      })
      .catch(() => setState('invalid'));
  }, [token]);

  useEffect(() => {
    if (!categoryId || !token) return;
    fetch(`${baseUrl}?token=${token}&action=available-numbers&category_id=${categoryId}`)
      .then((r) => r.json())
      .then((d) => setOccupied(d.occupied || []))
      .catch(() => {});
  }, [categoryId, token]);

  const selectedSizeInfo = useMemo(() => SIZE_OPTIONS.find((s) => s.value === jerseySize) || null, [jerseySize]);

  const numberAvailable = requestedNumber !== null && requestedNumber >= 1 && requestedNumber <= 99 && !occupied.includes(requestedNumber);
  const numberInvalid = requestedNumber !== null && (requestedNumber < 1 || requestedNumber > 99 || occupied.includes(requestedNumber));

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
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        setErrorMsg(data.message || data.error || 'Error al enviar pedido');
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

          <div className="rounded-xl p-4 space-y-2 text-sm" style={{ borderColor: BORDER, background: CARD, border: `1px solid ${BORDER}` }}>
            <Row label="Jugador" value={successData.player_name} />
            <Row label="Categoría" value={successData.category_name} />
            <Row label="Tipo" value={TYPE_LABELS[successData.uniform_type] || successData.uniform_type} />
            <Row label="Talla" value={successData.jersey_size} />
            <Row label="Nombre camiseta" value={successData.name_on_jersey} />
            <Row label="Número" value={`#${successData.assigned_number}`} />
          </div>

          <PaymentInfoCard price={successData.price} />

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
          <p className="text-sm font-semibold" style={{ color: GOLD }}>Pedido de Uniforme — {campaignName}</p>
          <p className="text-xs text-white/50">Completa todos los campos. El pago debe ser COMPLETO para que tu pedido sea válido.</p>
        </div>

        {/* Step 1: Player */}
        <Section title="1. Datos del jugador">
          <input
            className="w-full rounded-lg px-4 py-3 text-white text-sm outline-none placeholder:text-white/30"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}
            placeholder="Nombre completo del jugador"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <select
            className="w-full rounded-lg px-4 py-3 text-white text-sm outline-none mt-3 appearance-none"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}
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
            {([
              { key: 'manga_corta', label: 'MANGA CORTA', price: 500 },
              { key: 'manga_larga', label: 'MANGA LARGA', price: 600 },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setUniformType(t.key)}
                className="rounded-xl p-4 text-center transition-all"
                style={{
                  background: CARD,
                  border: `2px solid ${uniformType === t.key ? GOLD : BORDER}`,
                  boxShadow: uniformType === t.key ? `0 0 12px ${GOLD}40` : undefined,
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
              className="w-full rounded-lg px-4 py-3 text-white text-sm outline-none uppercase placeholder:text-white/30"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}
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

        {/* Step 4: Size — native select with measurements */}
        <Section title="4. Talla">
          <select
            className="w-full rounded-lg px-4 py-3 text-white text-sm outline-none appearance-none"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}
            value={jerseySize}
            onChange={(e) => setJerseySize(e.target.value)}
          >
            <option value="">Selecciona talla</option>
            {(['INFANTIL CORTE RECTO', 'MASCULINO', 'FEMENINO'] as const).map((group) => (
              <optgroup key={group} label={group}>
                {SIZE_OPTIONS.filter((s) => s.group === group).map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label} — Alto {s.alto} cm · Ancho {s.ancho} cm
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {selectedSizeInfo && (
            <p className="text-xs text-center mt-2" style={{ color: GOLD }}>
              {selectedSizeInfo.group} — {selectedSizeInfo.label}: Alto {selectedSizeInfo.alto} cm · Ancho {selectedSizeInfo.ancho} cm
            </p>
          )}
        </Section>

        {/* Step 5: Number */}
        <Section title="5. Número de camiseta">
          {!categoryId ? (
            <p className="text-sm text-white/40 text-center py-4">Primero selecciona la categoría de tu hijo.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-white/50">Del 1 al 99. Sin repetidos en tu categoría.</p>
              <input
                type="number"
                min={1}
                max={99}
                className="w-full rounded-lg px-4 py-4 text-white text-center text-3xl font-black outline-none"
                style={{ background: CARD, border: `1px solid ${BORDER}` }}
                placeholder="#"
                value={requestedNumber ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setRequestedNumber(v === '' ? null : parseInt(v, 10));
                }}
              />

              {numberAvailable && (
                <p className="text-sm text-center font-medium" style={{ color: '#22c55e' }}>✓ ¡Número disponible!</p>
              )}
              {numberInvalid && (
                <p className="text-sm text-center font-medium text-red-400">Este número no está disponible. Elige otro.</p>
              )}

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
                        background: isSelected ? GOLD : isPermanent ? '#3a1018' : isOccupied ? CARD : '#0f2040',
                        color: isSelected ? '#000' : isPermanent ? '#ff4444' : isOccupied ? '#556' : '#ccc',
                        border: `1px solid ${isSelected ? GOLD : BORDER}`,
                        boxShadow: isSelected ? `0 0 0 2px ${GOLD}` : undefined,
                      }}
                    >
                      {isPermanent ? '✕' : n}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-white/30 text-center">Los números en gris ya están asignados en tu categoría.</p>
            </div>
          )}
        </Section>

        {/* Summary */}
        {(playerName || categoryId || uniformType) && (
          <div className="rounded-xl p-4 space-y-1 text-sm" style={{ background: CARD, border: `1px solid ${GOLD}40` }}>
            <p className="font-bold text-white mb-2">Resumen</p>
            {playerName && <Row label="Jugador" value={playerName} />}
            {categoryName && <Row label="Categoría" value={categoryName} />}
            {uniformType && <Row label="Tipo" value={uniformType === 'manga_corta' ? 'Manga Corta' : 'Manga Larga'} />}
            {jerseySize && <Row label="Talla" value={selectedSizeInfo ? `${selectedSizeInfo.group} ${selectedSizeInfo.label}` : jerseySize} />}
            {nameOnJersey && <Row label="Nombre" value={nameOnJersey} />}
            {requestedNumber && <Row label="Número" value={`#${requestedNumber}`} />}
            {price > 0 && (
              <p className="text-lg font-black pt-2 text-center" style={{ color: GOLD }}>Total: ${price} MXN</p>
            )}
          </div>
        )}

        {/* Payment info before submit */}
        <PaymentInfoCard price={price} />

        {errorMsg && <p className="text-sm text-red-400 text-center">{errorMsg}</p>}

        <button
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="w-full py-4 rounded-xl font-black text-lg transition-all disabled:opacity-40"
          style={{
            background: canSubmit ? GOLD : BORDER,
            color: canSubmit ? '#000' : '#556',
          }}
        >
          {submitting ? 'ENVIANDO...' : 'ENVIAR PEDIDO'}
        </button>
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
    <div className="rounded-xl p-4 space-y-3" style={{ background: '#0f1e38', border: `1px solid ${GOLD}60` }}>
      <p className="font-bold text-white flex items-center gap-2">💳 Información de pago</p>
      <div className="rounded-lg p-3 text-sm space-y-1" style={{ background: CARD }}>
        <p className="text-white/60">⚠️ El pago debe ser el monto COMPLETO. Pagos parciales no son válidos.</p>
      </div>
      {price > 0 && (
        <p className="text-2xl font-black text-center" style={{ color: GOLD }}>${price} MXN</p>
      )}
      <div className="text-sm text-white/80 space-y-1">
        <p className="font-semibold text-white">Transfiere o deposita a:</p>
        <p>Nombre: Carlos Mario Cortez Gurrola</p>
        <p>Banco: Citibanamex</p>
        <p className="font-mono tracking-wider">Tarjeta: 5256 7840 0306 7195</p>
      </div>
      <p className="text-xs text-white/50">Guarda tu comprobante de pago. El equipo de White Lions Academy lo verificará y confirmará tu pedido.</p>
    </div>
  );
}
