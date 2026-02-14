import type { StatKey } from './evaluations';

export type IDPStatus = 'active' | 'overdue' | 'completed';
export type IDPStage = '0_30' | '31_60' | '61_90';
export type FocusType = 'strengthen' | 'improve';

export interface IDPCycle {
  id: string;
  organization_id: string;
  player_id: string;
  status: IDPStatus;
  starts_at: string;
  ends_at: string;
  stage: IDPStage;
  initial_evaluation_id: string | null;
  latest_evaluation_id: string | null;
  accepted_at: string | null;
  accepted_by: string | null;
  plan_json: IDPPlanJSON | null;
  plan_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface IDPFocusArea {
  id: string;
  organization_id: string;
  idp_cycle_id: string;
  stat_key: StatKey;
  focus_type: FocusType;
  initial_score: number;
  target_score: number;
  created_at: string;
}

export interface IDPSession {
  id: string;
  organization_id: string;
  idp_cycle_id: string;
  player_id: string;
  session_number: number;
  completed_at: string;
  xp_awarded: number;
  created_at: string;
}

export interface MentalidadAction {
  stat_key: string;
  stat_label: string;
  score: number;
  actions: string[];
  duration_days: number;
}

export interface IDPPlanFocusArea {
  stat_key: string;
  stat_label: string;
  type: FocusType;
  initial: number;
  target: number;
}

export interface IDPPlanJSON {
  focus_areas: IDPPlanFocusArea[];
  mentalidad_actions: MentalidadAction[];
  weekly_plan: {
    description: string;
    sessions_per_week: number;
    focus_rotation: string[];
  };
  ai_comment?: string;
  ai_recommendations?: string[];
}

export const IDP_SESSION_XP = 10;
export const MENTALIDAD_THRESHOLD = 12;

export const STAT_LABELS: Record<string, string> = {
  actitud_esfuerzo: 'Actitud y Esfuerzo',
  disciplina_constancia: 'Disciplina y Constancia',
  autonomia_liderazgo: 'Autonomía y Liderazgo',
  control_conduccion: 'Control y Conducción',
  pase_recepcion: 'Pase y Recepción',
  decision_juego: 'Decisión y Juego Colectivo',
};

export const PILAR_TECNICO_KEYS = ['control_conduccion', 'pase_recepcion', 'decision_juego'] as const;
export const PILAR_MENTALIDAD_KEYS = ['actitud_esfuerzo', 'disciplina_constancia', 'autonomia_liderazgo'] as const;

export interface WeeklyPlanDay {
  day: string;
  title: string;
  exercises: string[];
}

export function getLevelLabel(bandMin: number, bandMax: number): { label: string; color: string } {
  if (bandMax <= 5) return { label: 'Quiere ser', color: 'bg-orange-100 text-orange-700 border-orange-200' };
  if (bandMax <= 10) return { label: 'Quiere ser', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
  if (bandMax <= 15) return { label: 'Sabe ser', color: 'bg-blue-100 text-blue-700 border-blue-200' };
  return { label: 'Puede ser', color: 'bg-green-100 text-green-700 border-green-200' };
}

export function parseWeeklyPlan(description: string): WeeklyPlanDay[] {
  // Try to parse "Día 1:", "Día 2:", "Día 3:" patterns
  const dayRegex = /(?:D[ií]a\s*\d|Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo)[^:]*:/gi;
  const parts = description.split(dayRegex).filter(Boolean);
  const headers = description.match(dayRegex);

  if (headers && headers.length >= 2 && parts.length >= 2) {
    return headers.map((h, i) => ({
      day: h.replace(':', '').trim(),
      title: '',
      exercises: parts[i]
        ? parts[i].split(/[.;]/).map(s => s.trim()).filter(s => s.length >= 3 && !/^[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ]+$/.test(s))
        : [],
    }));
  }

  // Fallback: split by periods into 3 cards
  const sentences = description.split(/\.\s+/).filter(Boolean);
  if (sentences.length >= 3) {
    return [
      { day: 'Día 1', title: '', exercises: [sentences[0]] },
      { day: 'Día 2', title: '', exercises: [sentences[1]] },
      { day: 'Día 3', title: '', exercises: sentences.slice(2) },
    ];
  }

  return [{ day: 'Plan Semanal', title: '', exercises: [description] }];
}
