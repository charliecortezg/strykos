export const WL_DEFAULT_STATS = [
  {
    key: 'tecnico',
    label: 'Técnico',
    shortLabel: 'TÉC',
    pillar: 'tecnico',
    description: 'Ejecución de fundamentos técnicos en situación de juego real',
  },
  {
    key: 'tactico',
    label: 'Táctico',
    shortLabel: 'TÁC',
    pillar: 'tactico',
    description: 'Aplicación del modelo de juego: momentos, zonas, triggers, posiciones',
  },
  {
    key: 'coordinativo',
    label: 'Coordinativo',
    shortLabel: 'COO',
    pillar: 'coordinativo',
    description: 'Ventanas sensibles: coordinación ojo-pie, orientación espacial, velocidad de reacción',
  },
  {
    key: 'psicologico',
    label: 'Psicológico',
    shortLabel: 'PSI',
    pillar: 'psicologico',
    description: 'Actitud, resiliencia, comunicación vocal, liderazgo, respuesta al error',
  },
] as const;

/** Backward-compatible alias */
export const WLA_STATS = WL_DEFAULT_STATS;

export type StatKey = string;
export type StatGroup = string;

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
  weights: Record<string, number>;
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

/** Default weights for WL 4-dimension model */
export const WL_DEFAULT_WEIGHTS: Record<string, Record<string, number>> = {
  'default': { tecnico: 0.30, tactico: 0.30, coordinativo: 0.20, psicologico: 0.20 },
};

/** Legacy weights kept for backward compatibility */
export const DEFAULT_WEIGHTS: Record<string, Record<string, number>> = {
  '6-7': { tecnico: 0.30, tactico: 0.20, coordinativo: 0.30, psicologico: 0.20 },
  '8-9': { tecnico: 0.30, tactico: 0.25, coordinativo: 0.25, psicologico: 0.20 },
  '10-11': { tecnico: 0.30, tactico: 0.30, coordinativo: 0.20, psicologico: 0.20 },
  '12-13': { tecnico: 0.30, tactico: 0.30, coordinativo: 0.20, psicologico: 0.20 },
};