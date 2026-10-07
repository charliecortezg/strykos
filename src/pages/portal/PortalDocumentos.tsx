import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Check, Lock, AlertTriangle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import { toast } from 'sonner';
import {
  ACCEPT, DOC_LABELS, DOC_TYPES, STATUS_LABELS, VIGENCIA_LABELS, PORTAL_DOCS_TOKEN_KEY,
  curpMatchesBirth, familyStatus, isValidCurp, portalCall, portalUpload, prepareFile,
  type DocType, type DocsEstado,
} from '@/lib/documents';

type Child = { id: string; full_name: string; estado: DocsEstado };
const FAM_LABEL = { completo: 'Completo', en_revision: 'En revisión', faltan: 'Faltan documentos' };
const FAM_CLASS = { completo: 'bg-success text-success-foreground', en_revision: 'bg-warning text-warning-foreground', faltan: 'bg-muted text-muted-foreground' };
const ST_CLASS: Record<string, string> = {
  aprobado: 'bg-success text-success-foreground', en_revision: 'bg-warning text-warning-foreground',
  rechazado: 'bg-destructive text-destructive-foreground', pendiente: 'bg-muted text-muted-foreground',
};

export default function PortalDocumentos() {
  const navigate = useNavigate();
  const { logout } = usePortalAuth();
  const [children, setChildren] = useState<Child[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!localStorage.getItem(PORTAL_DOCS_TOKEN_KEY)) {
      logout();
      navigate('/portal/login?redirect=/portal/documentos', { replace: true });
      return;
    }
    try {
      const r = await portalCall<{ children: Child[] }>('portal-children');
      setChildren(r.children);
      if (r.children.length === 1) setSelected(r.children[0].id);
    } catch (e: any) {
      if (/Sesión vencida/.test(e.message)) {
        logout();
        navigate('/portal/login?redirect=/portal/documentos', { replace: true });
      } else toast.error(e.message);
    }
  }, [logout, navigate]);

  useEffect(() => { load(); }, [load]);

  if (!children) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  const child = children.find((c) => c.id === selected);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center gap-2 px-4">
          <Button variant="ghost" size="icon" onClick={() => (child && children.length > 1 ? setSelected(null) : navigate('/portal'))}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="font-semibold">Documentos</span>
        </div>
      </header>
      <main className="container px-4 py-5 max-w-lg">
        {children.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-3">
            {children.map((c) => (
              <Button key={c.id} size="sm" variant={c.id === selected ? 'default' : 'outline'} onClick={() => setSelected(c.id)}>
                {c.full_name.split(' ')[0]}
              </Button>
            ))}
          </div>
        )}
        {!child ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Elige a tu hijo para ver o subir sus documentos.</p>
            {children.length === 0 && <p className="text-sm">No tienes jugadores vinculados.</p>}
            {children.map((c) => {
              const f = familyStatus(c.estado);
              return (
                <Card key={c.id} className="cursor-pointer" onClick={() => setSelected(c.id)}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <span className="font-medium">{c.full_name}</span>
                    <Badge className={FAM_CLASS[f]}>{FAM_LABEL[f]}</Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <ChildDocs key={child.id} playerId={child.id} initial={child.estado} onChange={load} />
        )}
      </main>
    </div>
  );
}

function ChildDocs({ playerId, initial, onChange }: { playerId: string; initial: DocsEstado; onChange: () => void }) {
  const [estado, setEstado] = useState(initial);
  const p = estado.player;
  const datosCompletos = !!(p.full_name && p.date_of_birth && p.curp);
  const [step, setStep] = useState<1 | 2>(datosCompletos ? 2 : 1);
  const [nombre, setNombre] = useState(p.full_name ?? '');
  const [fecha, setFecha] = useState(p.date_of_birth ?? '');
  const [curp, setCurp] = useState(p.curp ?? '');
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    const e = await portalCall<DocsEstado>('portal-estado', { player_id: playerId });
    setEstado(e);
    onChange();
  };

  const saveDatos = async () => {
    if (!nombre.trim() || !fecha || !curp) return toast.error('Completa todos los datos');
    if (!isValidCurp(curp)) return toast.error('La CURP debe tener 18 caracteres con formato válido');
    setSaving(true);
    try {
      await portalCall('portal-datos', { player_id: playerId, nombre, fecha_nac: fecha, curp });
      await refresh();
      setStep(2);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const f = familyStatus(estado);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{p.full_name}</h1>
        <Badge className={FAM_CLASS[f]}>{FAM_LABEL[f]}</Badge>
      </div>
      <div className="flex gap-2 text-sm">
        <button className={step === 1 ? 'font-semibold text-primary' : 'text-muted-foreground'} onClick={() => setStep(1)}>1. Datos del jugador</button>
        <span className="text-muted-foreground">·</span>
        <button className={step === 2 ? 'font-semibold text-primary' : 'text-muted-foreground'} onClick={() => datosCompletos && setStep(2)}>2. Documentos</button>
      </div>

      {step === 1 ? (
        <Card><CardContent className="p-4 space-y-3">
          <LockedField label="Nombre completo" locked={!!p.full_name} value={nombre} onChange={setNombre} />
          <LockedField label="Fecha de nacimiento" type="date" locked={!!p.date_of_birth} value={fecha} onChange={setFecha} />
          <LockedField label="CURP" locked={!!p.curp} value={curp} onChange={(v) => setCurp(v.toUpperCase())} maxLength={18} />
          {curp && !isValidCurp(curp) && <p className="text-xs text-destructive">La CURP tiene 18 caracteres (letras y números).</p>}
          {curp && isValidCurp(curp) && !curpMatchesBirth(curp, fecha || null) && (
            <p className="text-xs text-warning flex gap-1"><AlertTriangle className="w-3 h-3 mt-0.5" />La CURP no coincide con la fecha de nacimiento. Revísala, por favor.</p>
          )}
          {datosCompletos
            ? <Button className="w-full" onClick={() => setStep(2)}>Continuar</Button>
            : <Button className="w-full" onClick={saveDatos} disabled={saving}>{saving ? 'Guardando…' : 'Guardar y continuar'}</Button>}
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {DOC_TYPES.map((t) => <FamilyDocCard key={t} type={t} estado={estado} playerId={playerId} onDone={refresh} />)}
        </div>
      )}
    </div>
  );
}

function LockedField({ label, locked, value, onChange, type = 'text', maxLength }: {
  label: string; locked: boolean; value: string; onChange: (v: string) => void; type?: string; maxLength?: number;
}) {
  return (
    <div>
      <Label className="flex items-center gap-1">{label}{locked && <Lock className="w-3 h-3 text-muted-foreground" />}</Label>
      <Input type={type} value={value} disabled={locked} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />
      {locked && <p className="text-[11px] text-muted-foreground mt-1">Si hay un error, escríbenos por mensaje.</p>}
    </div>
  );
}

function FamilyDocCard({ type, estado, playerId, onDone }: { type: DocType; estado: DocsEstado; playerId: string; onDone: () => Promise<void> }) {
  const d = estado.docs[type];
  const isConst = type === 'constancia_estudios';
  // A constancia from another season doesn't count as current for this season.
  const current = isConst && d && d.season !== estado.temporada_actual ? undefined : d;
  const st = current?.status ?? 'pendiente';
  const canUpload = !current || current.status === 'rechazado';
  const inputRef = useRef<HTMLInputElement>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const pick = async (file?: File) => {
    if (!file) return;
    try {
      const b = await prepareFile(file, type);
      setBlob(b);
      setPreview(b.type === 'application/pdf' ? null : URL.createObjectURL(b));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const send = async () => {
    if (!blob) return;
    setSending(true);
    try {
      await portalUpload(playerId, type, blob);
      toast.success('¡Listo! Lo revisaremos pronto.');
      setBlob(null);
      setPreview(null);
      await onDone();
    } catch (e: any) {
      toast.error(`No se pudo enviar. ${e?.message ?? 'Revisa tu señal e intenta otra vez.'}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card><CardContent className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-sm">{DOC_LABELS[type]}</p>
        <Badge className={ST_CLASS[st]}>{STATUS_LABELS[st]}</Badge>
      </div>
      {isConst && (
        <p className="text-xs text-muted-foreground">
          Temporada {estado.temporada_actual} ·{' '}
          {estado.constancia_vigencia === 'vencida' ? 'Vencida: sube la de esta temporada' : VIGENCIA_LABELS[estado.constancia_vigencia]}
        </p>
      )}
      {type === 'foto' && canUpload && <p className="text-xs text-muted-foreground">Rostro de frente, con buena luz y fondo liso. La recortamos en cuadro.</p>}
      {current?.status === 'rechazado' && <p className="text-xs text-destructive">Motivo: {current.rejection_reason}. Súbelo de nuevo, por favor.</p>}
      {canUpload && (
        <>
          <input ref={inputRef} type="file" className="hidden" accept={type === 'foto' ? 'image/*,.heic,.heif' : ACCEPT}
            capture={type === 'foto' ? 'user' : undefined} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
          {blob && (preview
            ? <img src={preview} alt="Vista previa" className={type === 'foto' ? 'w-32 h-32 rounded-full object-cover mx-auto' : 'max-h-48 mx-auto rounded'} />
            : <p className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" />PDF listo para enviar</p>)}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => inputRef.current?.click()} disabled={sending}>
              <Camera className="w-4 h-4 mr-2" />{blob ? 'Cambiar' : 'Tomar foto o elegir archivo'}
            </Button>
            {blob && <Button onClick={send} disabled={sending}>{sending ? 'Enviando…' : <><Check className="w-4 h-4 mr-1" />Enviar</>}</Button>}
          </div>
        </>
      )}
    </CardContent></Card>
  );
}
