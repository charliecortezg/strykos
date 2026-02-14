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
