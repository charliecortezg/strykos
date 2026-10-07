import { supabase } from '@/integrations/supabase/client';

export type DocType = 'curp' | 'acta' | 'foto' | 'constancia_estudios';
export type DocStatus = 'en_revision' | 'aprobado' | 'rechazado';
export type Vigencia = 'vigente' | 'vencida' | 'sin_constancia';

export const DOC_TYPES: DocType[] = ['curp', 'acta', 'foto', 'constancia_estudios'];
export const REQUIRED_DOCS: DocType[] = ['curp', 'acta', 'foto'];
export const DOC_LABELS: Record<DocType, string> = {
  curp: 'CURP',
  acta: 'Acta de nacimiento',
  foto: 'Foto de rostro',
  constancia_estudios: 'Constancia de estudios (opcional)',
};
export const STATUS_LABELS: Record<DocStatus | 'pendiente', string> = {
  pendiente: 'Pendiente',
  en_revision: 'En revisión',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};
export const VIGENCIA_LABELS: Record<Vigencia, string> = {
  vigente: 'Vigente',
  vencida: 'Vencida',
  sin_constancia: 'Sin constancia',
};
export const REJECTION_REASONS = ['Ilegible', 'Incompleto', 'No corresponde al jugador', 'La foto no cumple'];

export interface DocInfo {
  id: string;
  status: DocStatus;
  source: 'familia' | 'admin';
  season: string | null;
  version: number;
  uploaded_at: string;
  rejection_reason: string | null;
  mime_type: string | null;
}
export interface DocsEstado {
  player: { id: string; full_name: string | null; date_of_birth: string | null; curp: string | null };
  temporada_actual: string | null;
  docs: Partial<Record<DocType, DocInfo>>;
  constancia_vigencia: Vigencia;
  obligatorios_aprobados: number;
  completo: boolean;
}

export const MAX_BYTES = 10 * 1024 * 1024;
export const ACCEPT = 'image/jpeg,image/png,image/heic,image/heif,.heic,.heif,application/pdf';

const CURP_RE = /^[A-Z][AEIOUX][A-Z]{2}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
export function isValidCurp(c: string) {
  return CURP_RE.test(c.trim().toUpperCase());
}
/** Returns true when the CURP's date segment matches the given YYYY-MM-DD birth date. */
export function curpMatchesBirth(curp: string, dob: string | null) {
  if (!dob || !isValidCurp(curp)) return true;
  const seg = curp.toUpperCase().slice(4, 10);
  const [y, m, d] = dob.split('-');
  return seg === `${y.slice(2)}${m}${d}`;
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = URL.createObjectURL(blob);
  });
}

/** Normalizes a picked file: HEIC→JPG, compresses images, square-crops the face photo. */
export async function prepareFile(file: File, docType: DocType): Promise<Blob> {
  const isHeic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
  const isPdf = file.type === 'application/pdf';
  if (docType === 'foto' && isPdf) throw new Error('La foto de rostro debe ser una imagen.');
  if (isPdf) {
    if (file.size > MAX_BYTES) throw new Error('El archivo pesa más de 10 MB.');
    return file;
  }
  let blob: Blob = file;
  if (isHeic) {
    const heic2any = (await import('heic2any')).default;
    const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
    blob = Array.isArray(out) ? out[0] : out;
  } else if (!/image\/(jpeg|png)/.test(file.type)) {
    throw new Error('Formato no permitido. Usa JPG, PNG, HEIC o PDF.');
  }
  const img = await loadImage(blob);
  const maxSide = docType === 'foto' ? 800 : 2000;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (docType === 'foto') {
    const side = Math.min(img.width, img.height);
    sx = (img.width - side) / 2;
    sy = (img.height - side) / 2;
    sw = sh = side;
  }
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  canvas.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  const out: Blob = await new Promise((r) => canvas.toBlob((b) => r(b!), 'image/jpeg', 0.82));
  if (out.size > MAX_BYTES) throw new Error('El archivo pesa más de 10 MB.');
  return out;
}

export async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw last;
}

// ---------- Staff API ----------
export async function adminUpload(orgId: string, playerId: string, docType: DocType, blob: Blob) {
  const ext = blob.type === 'application/pdf' ? 'pdf' : 'jpg';
  const path = `${orgId}/${playerId}/${docType}/${crypto.randomUUID()}.${ext}`;
  await withRetry(async () => {
    const { error } = await supabase.storage.from('player-documents').upload(path, blob, { contentType: blob.type || 'image/jpeg' });
    if (error && !/exists/i.test(error.message)) throw error;
  });
  const { error } = await supabase.rpc('docs_subir', {
    p_player_id: playerId, p_doc_type: docType, p_storage_path: path, p_source: 'admin', p_mime_type: blob.type || 'image/jpeg',
  });
  if (error) throw error;
}

export async function staffSignedUrl(documentId: string, accion: 'vio' | 'descargo') {
  const { data, error } = await supabase.functions.invoke('player-documents', {
    body: { action: 'sign', document_id: documentId, accion },
  });
  if (error || !data?.url) throw new Error('No se pudo abrir el documento');
  return data.url as string;
}

// ---------- Portal API ----------
export const PORTAL_DOCS_TOKEN_KEY = 'stryk_portal_docs_token';

export async function portalCall<T = any>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const token = localStorage.getItem(PORTAL_DOCS_TOKEN_KEY) ?? '';
  const { data, error } = await supabase.functions.invoke('player-documents', {
    body: { action, ...body },
    headers: { 'x-portal-token': token },
  });
  if (error) {
    let msg = 'Algo salió mal';
    try {
      const j = await (error as any).context?.json?.();
      if (j?.error) msg = j.error;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  return data as T;
}

export async function portalUpload(playerId: string, docType: DocType, blob: Blob) {
  const mime = blob.type === 'application/pdf' ? 'application/pdf' : 'image/jpeg';
  await withRetry(async () => {
    const { path, token } = await portalCall<{ path: string; token: string }>('portal-upload-url', {
      player_id: playerId, doc_type: docType, mime_type: mime,
    });
    const { error } = await supabase.storage.from('player-documents').uploadToSignedUrl(path, token, blob, { contentType: mime });
    if (error) throw error;
    await portalCall('portal-submit', { player_id: playerId, doc_type: docType, path, mime_type: mime });
  });
}

export function familyStatus(e: DocsEstado): 'completo' | 'en_revision' | 'faltan' {
  if (e.completo) return 'completo';
  const allSent = REQUIRED_DOCS.every((t) => e.docs[t] && e.docs[t]!.status !== 'rechazado');
  return allSent && e.player.full_name && e.player.date_of_birth && e.player.curp ? 'en_revision' : 'faltan';
}

export function portalDocsLink() {
  return 'https://strykos.lovable.app/portal/documentos';
}
