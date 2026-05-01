// ─────────────────────────────────────────────────────────────
// WHITE LIONS ACADEMY — Monthly Report Types
// ─────────────────────────────────────────────────────────────

export interface ReportPlayer {
  id: string;
  full_name: string;
  first_name: string;    // para el email personalizado
  last_name: string;     // para el saludo "Familia Cortez"
  age?: number;
  category_name: string;
  category_id: string;
  parent_email: string;
}

export interface ReportMatch {
  match_id: string;
  rival_name: string;
  match_date: string;           // ISO date string
  result: 'victoria' | 'derrota' | 'empate' | null;
  score_us?: number;
  score_rival?: number;
  attended: boolean;
  goals: number;
  assists: number;
  rating?: string;              // 'Excelente' | 'Destacado' | 'Regular' | etc.
  note?: string;                // coach note from match_players.note
  is_mvp: boolean;
}

export interface ReportAttendance {
  sessions_total: number;
  sessions_attended: number;
  percentage: number;
  is_perfect: boolean;
  matches_total: number;
  matches_attended: number;
  matches_percentage: number;
}

export interface ReportStats {
  total_goals: number;
  total_assists: number;
  matches_played: number;
  mvp_count: number;
  mvp_match_rival?: string;    // nombre del rival donde fue MVP
  best_rating?: string;        // el rating más alto del mes
}

export interface MonthlyReportData {
  player: ReportPlayer;
  period: {
    month: number;             // 1–12
    year: number;
    month_name: string;        // "Abril"
    month_name_upper: string;  // "ABRIL"
  };
  attendance: ReportAttendance;
  matches: ReportMatch[];
  stats: ReportStats;
  narrative?: string;          // Generated narrative text
}

export interface ReportRecord {
  id: string;
  organization_id: string;
  player_id: string;
  month: number;
  year: number;
  category_id: string;
  status: 'generated' | 'sent' | 'failed';
  pdf_url?: string;
  ai_summary?: string;
  report_data?: MonthlyReportData;
  sent_at?: string;
  created_at: string;
  created_by: string;
  // joined
  player?: { full_name: string };
  category?: { name: string };
}

export interface GenerationProgress {
  total: number;
  current: number;
  current_player_name: string;
  status: 'idle' | 'running' | 'done' | 'error';
  results: {
    ok: string[];
    failed: Array<{ name: string; reason: string }>;
  };
}
