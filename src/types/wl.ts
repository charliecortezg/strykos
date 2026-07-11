export type WLCategoryKey = 'sub-5' | 'sub-7' | 'sub-9' | 'sub-11' | 'sub-13';
export type WLMonthKey = 'ago' | 'sep' | 'oct' | 'nov' | 'dic' | 'ene' | 'feb' | 'mar' | 'abr' | 'may' | 'jun';

export interface WLMethodologyCategory {
  id: string;
  org_id: string;
  category_key: WLCategoryKey;
  display_name: string;
  age_range: string;
  consolidation_threshold: number;
}

export interface WLMonthlyIndicator {
  id: string;
  org_id: string;
  category_key: WLCategoryKey;
  month_key: WLMonthKey;
  month_order: number;
  eval_type: string;
  context_note: string | null;
  ind1_dim: string | null;
  ind1_name: string | null;
  ind1_source: string | null;
  ind1_nivel1: string | null;
  ind1_nivel2: string | null;
  ind1_nivel3: string | null;
  ind1_frase1: string | null;
  ind1_frase2: string | null;
  ind1_frase3: string | null;
  ind1_is_proposed: boolean;
  ind2_dim: string | null;
  ind2_name: string | null;
  ind2_source: string | null;
  ind2_nivel1: string | null;
  ind2_nivel2: string | null;
  ind2_nivel3: string | null;
  ind2_frase1: string | null;
  ind2_frase2: string | null;
  ind2_frase3: string | null;
  ind2_is_proposed: boolean;
}

export interface WLBatteryItem {
  id: string;
  category_key: WLCategoryKey;
  item_number: number;
  dimension: 'coordinativo' | 'conductual';
  observable: string;
  criterion: string;
  window_source: string | null;
}

export interface WLMonthlyEvaluation {
  id: string;
  org_id: string;
  category_id: string;
  player_id: string;
  category_key: WLCategoryKey;
  month_key: WLMonthKey;
  season: string;
  nivel_ind1: 1 | 2 | 3 | null;
  nivel_ind2: 1 | 2 | 3 | null;
  battery_results: Record<string, boolean>;
  coach_note: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
}

export const WL_MONTHS: { key: WLMonthKey; label: string }[] = [
  { key: 'ago', label: 'Agosto' },
  { key: 'sep', label: 'Septiembre' },
  { key: 'oct', label: 'Octubre' },
  { key: 'nov', label: 'Noviembre' },
  { key: 'dic', label: 'Diciembre' },
  { key: 'ene', label: 'Enero' },
  { key: 'feb', label: 'Febrero' },
  { key: 'mar', label: 'Marzo' },
  { key: 'abr', label: 'Abril' },
  { key: 'may', label: 'Mayo' },
  { key: 'jun', label: 'Junio' },
];
