// STRYK Way Types

export type PackStatus = 'draft' | 'published' | 'archived';
export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type SourceType = 'attendance' | 'match' | 'manual' | 'challenge';

export interface StrykPack {
  id: string;
  organization_id: string;
  name: string;
  version: number;
  status: PackStatus;
  created_by: string | null;
  created_at: string;
  published_at: string | null;
  published_by: string | null;
}

export interface StrykRuleset {
  id: string;
  organization_id: string;
  pack_id: string;
  economy: RulesetEconomy;
  caps: RulesetCaps;
  multipliers: RulesetMultipliers;
  ovr_weights: OvrWeights;
  created_by: string | null;
  created_at: string;
}

export interface RulesetEconomy {
  xp_per_attendance: number;
  xp_per_goal: number;
  xp_per_assist: number;
  xp_per_match_present: number;
  xp_per_level: number;
}

export interface RulesetCaps {
  daily_xp_cap: number;
  weekly_xp_cap: number;
  daily_attendance_cap: number;
}

export interface RulesetMultipliers {
  amistoso: number;
  liga: number;
  eliminacion: number;
  campeonato: number;
}

export interface OvrWeights {
  tecnica: number;
  tactica: number;
  fisica: number;
  mental: number;
  social: number;
  disciplina: number;
}

export interface BadgeCriteria {
  type: 'attendance_count' | 'goals_total' | 'streak' | 'matches_played' | 'level_reached';
  threshold: number;
}

export interface StrykBadge {
  id: string;
  organization_id: string;
  pack_id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string;
  rarity: BadgeRarity;
  criteria: BadgeCriteria;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface ChallengeCriteria {
  type: 'weekly_attendance' | 'monthly_attendance' | 'goals_total' | 'matches_played';
  threshold: number;
}

export interface StrykChallenge {
  id: string;
  organization_id: string;
  pack_id: string;
  key: string;
  name: string;
  description: string | null;
  xp_reward: number;
  criteria: ChallengeCriteria;
  start_at: string | null;
  end_at: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface StrykEvent {
  id: string;
  organization_id: string;
  player_id: string;
  source_type: SourceType;
  source_id: string;
  xp_delta: number;
  attributes_delta: Record<string, number>;
  created_by: string | null;
  created_at: string;
}

export interface PlayerProgress {
  organization_id: string;
  player_id: string;
  xp_total: number;
  level: number;
  streak: number;
  ovr: number;
  radar: RadarAttributes;
  last_event_at: string | null;
  updated_at: string;
}

export interface RadarAttributes {
  tecnica: number;
  tactica: number;
  fisica: number;
  mental: number;
  social: number;
  disciplina: number;
}

export interface PlayerBadge {
  id: string;
  organization_id: string;
  player_id: string;
  badge_id: string;
  earned_at: string;
  badge?: StrykBadge;
}

export interface StrykAuditLog {
  id: string;
  organization_id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

// Feature flags from organizations table
export interface StrykFeatureFlags {
  feature_stryk_way_enabled: boolean;
  feature_portal_familiar_enabled: boolean;
  feature_studio_pro_enabled: boolean;
  feature_analytics_enabled: boolean;
  feature_evaluations_enabled: boolean;
}

// Form types
export interface BadgeFormData {
  key: string;
  name: string;
  description: string;
  icon: string;
  rarity: BadgeRarity;
  criteria_type: BadgeCriteria['type'];
  criteria_threshold: number;
  is_active: boolean;
}

export interface ChallengeFormData {
  key: string;
  name: string;
  description: string;
  xp_reward: number;
  criteria_type: ChallengeCriteria['type'];
  criteria_threshold: number;
  start_at: string;
  end_at: string;
  is_active: boolean;
}

// Badge icons available
export const BADGE_ICONS = [
  'trophy',
  'medal',
  'star',
  'flame',
  'target',
  'award',
  'crown',
  'zap',
  'heart',
  'shield',
] as const;

export const RARITY_COLORS: Record<BadgeRarity, string> = {
  common: 'bg-slate-100 text-slate-700 border-slate-300',
  rare: 'bg-blue-100 text-blue-700 border-blue-300',
  epic: 'bg-purple-100 text-purple-700 border-purple-300',
  legendary: 'bg-amber-100 text-amber-700 border-amber-300',
};

export const RARITY_LABELS: Record<BadgeRarity, string> = {
  common: 'Común',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Legendario',
};

export const CRITERIA_TYPE_LABELS: Record<BadgeCriteria['type'], string> = {
  attendance_count: 'Asistencias totales',
  goals_total: 'Goles anotados',
  streak: 'Días consecutivos',
  matches_played: 'Partidos jugados',
  level_reached: 'Nivel alcanzado',
};

export const CHALLENGE_CRITERIA_LABELS: Record<ChallengeCriteria['type'], string> = {
  weekly_attendance: 'Asistencias esta semana',
  monthly_attendance: 'Asistencias este mes',
  goals_total: 'Goles anotados',
  matches_played: 'Partidos jugados',
};
