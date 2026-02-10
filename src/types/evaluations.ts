export const WLA_STATS = [
  { key: 'actitud_esfuerzo', label: 'Actitud y Esfuerzo', group: 'mentalidad' },
  { key: 'disciplina_constancia', label: 'Disciplina y Constancia', group: 'mentalidad' },
  { key: 'autonomia_liderazgo', label: 'Autonomía y Liderazgo', group: 'mentalidad' },
  { key: 'control_conduccion', label: 'Control y Conducción', group: 'tecnica' },
  { key: 'pase_recepcion', label: 'Pase y Recepción', group: 'tecnica' },
  { key: 'decision_juego', label: 'Decisión y Juego Colectivo', group: 'juego' },
] as const;

export type StatKey = typeof WLA_STATS[number]['key'];
export type StatGroup = 'mentalidad' | 'tecnica' | 'juego';

export interface Evaluation {
  id: string;
  organization_id: string;
  category_id: string;
  player_id: string;
  period: string;
  age_group: string;
  status: 'open' | 'closed';
  overall_score: number | null;
  previous_overall: number | null;
  recorded_by: string | null;
  closed_by: string | null;
  closed_at: string | null;
  created_at: string;
}

export interface EvaluationScore {
  id: string;
  evaluation_id: string;
  stat_key: StatKey;
  score: number;
  created_at: string;
}

export interface EvaluationAchievement {
  id: string;
  evaluation_id: string;
  achievement_key: string;
  xp_bonus: number;
  created_at: string;
}

export interface EvaluationComment {
  id: string;
  evaluation_id: string;
  comment: string;
  created_by: string | null;
  created_at: string;
}

export interface EvaluationWeights {
  id: string;
  organization_id: string;
  age_group: string;
  weights: {
    mentalidad: number;
    tecnica: number;
    juego: number;
  };
  created_at: string;
}

export interface EvaluationRubric {
  id: string;
  age_group: string;
  stat_key: StatKey;
  band_min: number;
  band_max: number;
  bullets: string[];
}

export interface PlayerEvaluationStatus {
  player_id: string;
  player_name: string;
  date_of_birth: string | null;
  age_group: string;
  evaluation_id: string | null;
  scores_count: number;
  status: 'pendiente' | 'completado';
  scores: Record<StatKey, number>;
}

export const DEFAULT_WEIGHTS: Record<string, { mentalidad: number; tecnica: number; juego: number }> = {
  '6-7': { mentalidad: 0.50, tecnica: 0.30, juego: 0.20 },
  '8-9': { mentalidad: 0.40, tecnica: 0.35, juego: 0.25 },
  '10-11': { mentalidad: 0.30, tecnica: 0.40, juego: 0.30 },
};
