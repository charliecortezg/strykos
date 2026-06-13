import { parseDateOnly, getLocalToday } from './time-utils';

/**
 * Status que la UI debe mostrar para una sesión.
 *
 * Regla (solo presentación, no muta DB):
 *   Si status === 'activa' y la fecha de la sesión es más de 7 días
 *   en el pasado → 'expirada'. En otro caso, status original.
 *
 * Ejemplo: sesión 2026-04-09 vista el 2026-06-12
 *   diff = (hoy - sesión) en días = ~64 → 'expirada'.
 *   diff es positivo cuando la sesión es del pasado.
 */
export type DisplaySessionStatus =
  | 'borrador'
  | 'activa'
  | 'completada'
  | 'expirada'
  | (string & {});

const MS_PER_DAY = 86_400_000;
const EXPIRATION_DAYS = 7;

export function getDisplaySessionStatus(s: {
  status: string | null | undefined;
  session_date: string | null | undefined;
}): DisplaySessionStatus {
  if (s.status !== 'activa' || !s.session_date) {
    return (s.status ?? 'borrador') as DisplaySessionStatus;
  }
  const today = parseDateOnly(getLocalToday());
  const sessionDate = parseDateOnly(s.session_date);
  // diff positivo = sesión pasada. Ej: 2026-06-12 - 2026-04-09 ≈ 64 → 'expirada'.
  const diff = Math.floor((today.getTime() - sessionDate.getTime()) / MS_PER_DAY);
  return diff > EXPIRATION_DAYS ? 'expirada' : 'activa';
}

export function getDisplaySessionStatusLabel(status: DisplaySessionStatus): string {
  switch (status) {
    case 'activa': return 'Activa';
    case 'completada': return 'Completada';
    case 'borrador': return 'Borrador';
    case 'expirada': return 'Expirada';
    default: return String(status);
  }
}
