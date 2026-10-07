import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Eye, Download, Trash2, Check, X, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import {
  ACCEPT, DOC_LABELS, DOC_TYPES, REJECTION_REASONS, STATUS_LABELS, VIGENCIA_LABELS,
  adminUpload, curpMatchesBirth, isValidCurp, prepareFile, staffSignedUrl,
  type DocType, type DocsEstado,
} from '@/lib/documents';

const statusClass: Record<string, string> = {
  aprobado: 'bg-success text-success-foreground',
  en_revision: 'bg-warning text-warning-foreground',
  rechazado: 'bg-destructive text-destructive-foreground',
  pendiente: 'bg-muted text-muted-foreground',
};

export function PlayerDocumentsTab({ playerId }: { playerId: string }) {
  const { organization } = useAuth();
  const qc = useQueryClient();
  const { data: estado, refetch } = useQuery({
    queryKey: ['docs-estado', playerId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('docs_estado_jugador', { p_player_id: playerId });
      if (error) throw error;
      return data as unknown as DocsEstado;
    },
  });

  const [nombre, setNombre] = useState('');
  const [fecha, setFecha] = useState('');
  const [curp, setCurp] = useState('');
  const [temporada, setTemporada] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [motivo, setMotivo] = useState(REJECTION_REASONS[0]);
  const [nota, setNota] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileRefs = useRef<Partial<Record<DocType, HTMLInputElement | null>>>({});

  useEffect(() => {
    if (!estado) return;
    setNombre(estado.player.full_name ?? '');
    setFecha(estado.player.date_of_birth ?? '');
    setCurp(estado.player.curp ?? '');
    setTemporada(estado.temporada_actual ?? '');
  }, [estado]);

  const refresh = () => {
    refetch();
    qc.invalidateQueries({ queryKey: ['docs-completitud'] });
  };

  const run = async (key: string, fn: () => Promise<void>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? 'Algo salió mal');
    } finally {
      setBusy(null);
    }
  };

  const saveDatos = () => run('datos', async () => {
    if (curp && !isValidCurp(curp)) throw new Error('La CURP debe tener 18 caracteres con formato válido');
    const { error } = await supabase.rpc('docs_guardar_datos_base', {
      p_player_id: playerId, p_nombre: nombre, p_fecha_nac: fecha || null, p_curp: curp || null,
    });
    if (error) throw error;
  }, 'Datos guardados');

  const saveTemporada = () => run('temp', async () => {
    const { error } = await supabase.rpc('docs_set_temporada', { p_temporada: temporada.trim() });
    if (error) throw error;
  }, 'Temporada actualizada');

  const onFile = (t: DocType, f?: File) => {
    if (!f || !organization) return;
    run(t, async () => adminUpload(organization.id, playerId, t, await prepareFile(f, t)), 'Documento guardado');
  };

  const open = async (id: string, accion: 'vio' | 'descargo') => {
    try {
      const url = await staffSignedUrl(id, accion);
      window.open(url, '_blank', 'noopener');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (!estado) return <div className="p-6 text-center text-sm text-muted-foreground">Cargando…</div>;
  const curpWarn = curp && isValidCurp(curp) && !curpMatchesBirth(curp, fecha || null);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Documentos</h3>
        <Badge className={estado.completo ? statusClass.aprobado : statusClass.pendiente}>
          {estado.completo ? 'Completo' : `${estado.obligatorios_aprobados}/3 obligatorios`}
        </Badge>
      </div>

      <div className="p-4 rounded-lg bg-muted/30 space-y-3">
        <p className="text-sm font-medium">Datos del jugador</p>
        <div><Label>Nombre completo</Label><Input value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Fecha de nacimiento</Label><Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
          <div><Label>CURP</Label><Input value={curp} maxLength={18} onChange={(e) => setCurp(e.target.value.toUpperCase())} /></div>
        </div>
        {curp && !isValidCurp(curp) && <p className="text-xs text-destructive">La CURP debe tener 18 caracteres con formato válido.</p>}
        {curpWarn && <p className="text-xs text-warning flex items-center gap-1"><AlertTriangle className="w-3 h-3" />La CURP no coincide con la fecha de nacimiento. Revisa los datos.</p>}
        <Button size="sm" onClick={saveDatos} disabled={busy === 'datos'}>Guardar datos</Button>
      </div>

      <div className="grid gap-3">
        {DOC_TYPES.map((t) => {
          const d = estado.docs[t];
          const st = d?.status ?? 'pendiente';
          return (
            <div key={t} className="p-4 rounded-lg border border-border space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="font-medium text-sm">{DOC_LABELS[t]}</p>
                <div className="flex gap-1">
                  {t === 'constancia_estudios' && (
                    <Badge variant="outline">{VIGENCIA_LABELS[estado.constancia_vigencia]}{d?.season ? ` · ${d.season}` : ''}</Badge>
                  )}
                  <Badge className={statusClass[st]}>{STATUS_LABELS[st]}</Badge>
                </div>
              </div>
              {d && <p className="text-xs text-muted-foreground">Subido por {d.source === 'familia' ? 'la familia' : 'administración'} · versión {d.version}</p>}
              {d?.rejection_reason && <p className="text-xs text-destructive">Motivo: {d.rejection_reason}</p>}
              <input type="file" accept={t === 'foto' ? 'image/*,.heic,.heif' : ACCEPT} className="hidden"
                ref={(el) => (fileRefs.current[t] = el)} onChange={(e) => { onFile(t, e.target.files?.[0]); e.target.value = ''; }} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={busy === t} onClick={() => fileRefs.current[t]?.click()}>
                  <Upload className="w-4 h-4 mr-1" />{busy === t ? 'Subiendo…' : d ? 'Reemplazar' : 'Subir'}
                </Button>
                {d && <>
                  <Button size="sm" variant="ghost" onClick={() => open(d.id, 'vio')}><Eye className="w-4 h-4 mr-1" />Ver</Button>
                  <Button size="sm" variant="ghost" onClick={() => open(d.id, 'descargo')}><Download className="w-4 h-4 mr-1" />Descargar</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleting(d.id)}><Trash2 className="w-4 h-4 mr-1" />Eliminar</Button>
                </>}
                {d?.status === 'en_revision' && <>
                  <Button size="sm" onClick={() => run(d.id, async () => {
                    const { error } = await supabase.rpc('docs_revisar', { p_document_id: d.id, p_decision: 'aprobado' });
                    if (error) throw error;
                  }, 'Aprobado')}><Check className="w-4 h-4 mr-1" />Aprobar</Button>
                  <Button size="sm" variant="destructive" onClick={() => setRejecting(d.id)}><X className="w-4 h-4 mr-1" />Rechazar</Button>
                </>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 rounded-lg bg-muted/30 space-y-2">
        <Label>Temporada actual de la academia</Label>
        <p className="text-xs text-muted-foreground">Al cambiarla, las constancias de temporadas anteriores quedan como "Vencida" (no se borran).</p>
        <div className="flex gap-2">
          <Input value={temporada} placeholder="2026-2027" onChange={(e) => setTemporada(e.target.value)} />
          <Button size="sm" onClick={saveTemporada} disabled={busy === 'temp' || temporada === estado.temporada_actual}>Guardar</Button>
        </div>
      </div>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>¿Por qué lo rechazas?</DialogTitle></DialogHeader>
          <Select value={motivo} onValueChange={setMotivo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{REJECTION_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
          <Textarea placeholder="Nota para la familia (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => {
              const id = rejecting!;
              setRejecting(null);
              run(id, async () => {
                const { error } = await supabase.rpc('docs_revisar', { p_document_id: id, p_decision: 'rechazado', p_motivo: nota.trim() ? `${motivo}: ${nota.trim()}` : motivo });
                if (error) throw error;
                setNota('');
              }, 'Rechazado');
            }}>Rechazar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o: boolean) => !o && setDeleting(null)}
        title="¿Eliminar documento?"
        description="Dejará de estar vigente. Queda guardado en el historial."
        confirmText="Eliminar"
        onConfirm={() => {
          const id = deleting!;
          setDeleting(null);
          run(id, async () => {
            const { error } = await supabase.rpc('docs_eliminar', { p_document_id: id });
            if (error) throw error;
          }, 'Documento eliminado');
        }}
      />
    </div>
  );
}
