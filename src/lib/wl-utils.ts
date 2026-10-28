import type { WLCategoryKey, WLMonthKey } from '@/types/wl';

/** Map calendar month (0-11) to WL month key. Jul (6) maps to 'ago' (pretemporada). */
export function wlCurrentMonthKey(date = new Date()): WLMonthKey {
  const m = date.getMonth();
  const map: Record<number, WLMonthKey> = {
    7: 'ago', 8: 'sep', 9: 'oct', 10: 'nov', 11: 'dic',
    0: 'ene', 1: 'feb', 2: 'mar', 3: 'abr', 4: 'may', 5: 'jun',
    6: 'ago',
  };
  return map[m];
}

/** Season string: Aug-Dec belongs to `${year}-${year+1}`, Jan-Jul to `${year-1}-${year}`. */
export function wlCurrentSeason(date = new Date()): string {
  const y = date.getFullYear();
  return date.getMonth() >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

/** Infer WL category key from a Stryk category's age_group string. */
export function wlCategoryKeyFromAgeGroup(ageGroup: string | undefined | null): WLCategoryKey | null {
  if (!ageGroup) return null;
  const s = ageGroup.toLowerCase().trim();
  if (['sub-5', 'sub-7', 'sub-9', 'sub-11', 'sub-13'].includes(s)) return s as WLCategoryKey;
  if (s === 'sub-6') return 'sub-7';
  if (s === 'sub-8') return 'sub-9';
  if (s === 'sub-10') return 'sub-11';
  if (s === 'sub-12') return 'sub-13';
  const m = s.match(/^(\d+)\s*-\s*(\d+)$/);
  if (m) {
    const hi = parseInt(m[2], 10);
    if (hi <= 5) return 'sub-5';
    if (hi <= 7) return 'sub-7';
    if (hi <= 9) return 'sub-9';
    if (hi <= 11) return 'sub-11';
    return 'sub-13';
  }
  return null;
}

export const WL_GOLD = '#C9A227';

export const WL_LEVEL_CONFIG = [
  { nivel: 1 as const, label: 'En Proceso', color: 'border-red-400 bg-red-500/5', selectedColor: 'border-red-500 bg-red-500/15 ring-2 ring-red-400/40', dot: 'bg-red-400' },
  { nivel: 2 as const, label: 'En Desarrollo', color: 'border-yellow-400 bg-yellow-500/5', selectedColor: 'border-yellow-500 bg-yellow-500/15 ring-2 ring-yellow-400/40', dot: 'bg-yellow-400' },
  { nivel: 3 as const, label: 'Consolidado', color: 'border-green-400 bg-green-500/5', selectedColor: 'border-green-500 bg-green-500/15 ring-2 ring-green-400/40', dot: 'bg-green-400' },
];

// ---------- Pruebas físicas (Sub-11 / Sub-13) ----------
export type WLPhysicalColor = 'rojo' | 'amarillo' | 'verde' | null;
export interface WLPhysicalTest {
  id: string; test_key: string; name: string; unit: string;
  kind: 'reps' | 'beep'; yellow_min: number; green_min: number; sort_order: number;
}
export type WLBeepValue = { nivel: number; recorrido: number };
export type WLPhysicalResults = Record<string, number | WLBeepValue | null>;

export const WL_PHYSICAL_MAX_REPS = 150;
export const WL_PHYSICAL_CONFIRM_REPS = 80;

/** Numeric score used for color: reps as-is, beep uses the level reached. */
export function physicalScore(test: Pick<WLPhysicalTest, 'kind'>, v: WLPhysicalResults[string] | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (test.kind === 'beep') return typeof v === 'object' ? v.nivel : null;
  return typeof v === 'number' ? v : null;
}

export function getPhysicalColor(test: Pick<WLPhysicalTest, 'kind' | 'yellow_min' | 'green_min'>, v: WLPhysicalResults[string] | undefined): WLPhysicalColor {
  const s = physicalScore(test, v);
  if (s === null) return null;
  if (s >= test.green_min) return 'verde';
  if (s >= test.yellow_min) return 'amarillo';
  return 'rojo';
}

export function formatPhysical(test: Pick<WLPhysicalTest, 'kind'>, v: WLPhysicalResults[string] | undefined): string {
  if (v === null || v === undefined) return 'Sin dato';
  if (test.kind === 'beep' && typeof v === 'object') return `${v.nivel}.${v.recorrido}`;
  return String(v);
}

export const WL_PHYSICAL_COLOR_STYLE: Record<'rojo' | 'amarillo' | 'verde', { label: string; cls: string }> = {
  rojo: { label: 'Rojo', cls: 'bg-red-100 text-red-700 border-red-300' },
  amarillo: { label: 'Amarillo', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
  verde: { label: 'Verde', cls: 'bg-green-100 text-green-700 border-green-300' },
};
