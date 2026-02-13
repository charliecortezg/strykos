export type MatchImportance = 'regular' | 'importante' | 'eliminacion' | 'final';

export function getXpMultiplier(matchType: string, importance: MatchImportance): number {
  if (importance === 'final') return 2.5;
  if (importance === 'eliminacion') return 2.0;
  if (importance === 'importante') return 2.0;
  if (matchType === 'liga' || matchType === 'torneo') return 1.5;
  return 1.0;
}

export const importanceLabels: Record<MatchImportance, string> = {
  regular: 'Regular',
  importante: 'Importante',
  eliminacion: 'Eliminación',
  final: 'Final',
};

export const importanceIcons: Record<MatchImportance, string> = {
  regular: '',
  importante: '⭐',
  eliminacion: '🔥',
  final: '👑',
};

export interface Match {
  id: string;
  organization_id: string;
  category_id: string;
  trainer_id: string | null;
  venue_id: string | null;
  match_date: string;
  rival_name: string;
  match_type: 'liga' | 'torneo' | 'amistoso';
  status: 'programado' | 'terminado' | 'cancelado';
  goals_for: number;
  goals_against: number;
  notes: string | null;
  technical_notes: string | null;
  importance: MatchImportance;
  xp_multiplier: number;
  mvp_player_id: string | null;
  created_by: string | null;
  last_edited_by: string | null;
  last_edited_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  category?: {
    id: string;
    name: string;
    sport_id: string | null;
    sports?: {
      name: string;
    } | null;
  };
  trainer?: {
    id: string;
    full_name: string;
  } | null;
  venue?: {
    id: string;
    name: string;
  } | null;
  mvp_player?: {
    id: string;
    full_name: string;
  } | null;
  created_by_profile?: {
    full_name: string;
  } | null;
  last_edited_by_profile?: {
    full_name: string;
  } | null;
}

export type MatchPerformance = 'outstanding' | 'excellent' | 'focus';

export interface MatchPlayer {
  id: string;
  match_id: string;
  player_id: string;
  organization_id: string;
  attended: boolean;
  goals: number;
  assists: number;
  points: number;
  performance: MatchPerformance | null;
  created_at: string;
  updated_at: string;
  player?: {
    id: string;
    full_name: string;
    position: string | null;
  };
}

export interface MatchFilters {
  dateFrom: string;
  dateTo: string;
  rival: string;
  sportId: string;
  categoryId: string;
  trainerId: string;
  venueId: string;
  matchType: string;
  result: string;
}

export type MatchResult = 'victoria' | 'empate' | 'derrota';

export function getMatchResult(goalsFor: number, goalsAgainst: number): MatchResult {
  if (goalsFor > goalsAgainst) return 'victoria';
  if (goalsFor < goalsAgainst) return 'derrota';
  return 'empate';
}
