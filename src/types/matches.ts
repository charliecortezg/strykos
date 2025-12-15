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
  created_by_profile?: {
    full_name: string;
  } | null;
  last_edited_by_profile?: {
    full_name: string;
  } | null;
}

export interface MatchPlayer {
  id: string;
  match_id: string;
  player_id: string;
  organization_id: string;
  attended: boolean;
  goals: number;
  assists: number;
  points: number;
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
