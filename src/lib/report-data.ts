// ─────────────────────────────────────────────────────────────
// WHITE LIONS ACADEMY — Report Data Fetcher
// Reads from Supabase. Adjust table/column names if schema differs.
// ─────────────────────────────────────────────────────────────

import { supabase } from '@/integrations/supabase/client';
import type { MonthlyReportData, ReportMatch, ReportPlayer } from './report-types';

// ── Constants ────────────────────────────────────────────────

export const MONTH_NAMES: Record<number, string> = {
  1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
  5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
  9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre',
};

// ── Helpers ──────────────────────────────────────────────────

function monthDateRange(month: number, year: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

function calculateAge(birthDate: string): number | undefined {
  if (!birthDate) return undefined;
  const today = new Date();
  const dob = new Date(birthDate);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function parseFullName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(' ');
  const first = parts[0] ?? '';
  const last = parts.slice(1).join(' ') ?? '';
  return { first, last };
}

function stripMigrationPrefix(note: string): string {
  return note
    .replace(/^\[Migrado de notas del partido\]\s*/i, '')
    .replace(/^\[.*?\]\s*/, '') // strip any other bracket prefix
    .trim();
}

// ── Main fetcher ─────────────────────────────────────────────

export async function fetchPlayerMonthData(
  playerId: string,
  month: number,
  year: number,
  organizationId: string,
): Promise<MonthlyReportData | null> {
  const { start, end } = monthDateRange(month, year);

  // ── 1. Player info ───────────────────────────────────────
  const { data: player, error: playerErr } = await supabase
    .from('players')
    .select(`
      id,
      full_name,
      birth_date,
      category_id,
      categories ( id, name )
    `)
    .eq('id', playerId)
    .single();

  if (playerErr || !player) {
    console.error('[Report] Player fetch failed:', playerErr);
    return null;
  }

  // ── 2. Parent email ──────────────────────────────────────
  // Adjust: email may be on player, parent, or user profile table
  // Try player.parent_email first, then family_members, then users
  let parentEmail = (player as any).parent_email ?? '';

  if (!parentEmail) {
    const { data: family } = await supabase
      .from('family_members')          // adjust table name if different
      .select('email')
      .eq('player_id', playerId)
      .limit(1)
      .maybeSingle();
    parentEmail = family?.email ?? '';
  }

  // ── 3. Matches of the month ──────────────────────────────
  const { data: matches } = await supabase
    .from('matches')
    .select('id, rival_name, match_date, result, score_home, score_away, mvp_player_id, category_id')
    .eq('organization_id', organizationId)
    .gte('match_date', start)
    .lte('match_date', end)
    .order('match_date', { ascending: true });

  // ── 4. match_players for this player ────────────────────
  const matchIds = (matches ?? []).map((m) => m.id);
  let matchPlayerRecords: any[] = [];

  if (matchIds.length > 0) {
    const { data: mp } = await supabase
      .from('match_players')
      .select('match_id, attended, goals, assists, rating, note')
      .eq('player_id', playerId)
      .in('match_id', matchIds);
    matchPlayerRecords = mp ?? [];
  }

  // ── 5. Training sessions & attendance ───────────────────
  // IMPORTANT: adjust table name to your actual sessions table
  // Common names: training_sessions, sessions, trainings
  const { data: sessions } = await supabase
    .from('training_sessions')
    .select('id')
    .eq('organization_id', organizationId)
    .gte('session_date', start)
    .lte('session_date', end);

  const sessionIds = (sessions ?? []).map((s) => s.id);
  let attendanceRecords: any[] = [];

  if (sessionIds.length > 0) {
    // Common names: attendance, session_attendance, training_attendance
    const { data: att } = await supabase
      .from('attendance')
      .select('session_id, attended')
      .eq('player_id', playerId)
      .in('session_id', sessionIds);
    attendanceRecords = att ?? [];
  }

  // ── 6. Build match objects ───────────────────────────────
  const builtMatches: ReportMatch[] = (matches ?? []).map((m) => {
    const mp = matchPlayerRecords.find((r) => r.match_id === m.id);
    const rawNote = mp?.note ?? '';
    const cleanNote = rawNote ? stripMigrationPrefix(rawNote) : undefined;

    return {
      match_id: m.id,
      rival_name: m.rival_name ?? 'Rival',
      match_date: m.match_date,
      result: m.result ?? null,
      score_us: m.score_home,
      score_rival: m.score_away,
      attended: mp?.attended ?? false,
      goals: mp?.goals ?? 0,
      assists: mp?.assists ?? 0,
      rating: mp?.rating ?? undefined,
      note: cleanNote && cleanNote.length > 2 ? cleanNote : undefined,
      is_mvp: m.mvp_player_id === playerId,
    };
  });

  // ── 7. Calculate stats ───────────────────────────────────
  const attended = builtMatches.filter((m) => m.attended);
  const sessionsTotal = (sessions ?? []).length;
  const sessionsAttended = attendanceRecords.filter((a) => a.attended).length;

  const totalGoals = attended.reduce((s, m) => s + m.goals, 0);
  const totalAssists = attended.reduce((s, m) => s + m.assists, 0);
  const mvpMatches = builtMatches.filter((m) => m.is_mvp);

  // ── 8. Assemble ──────────────────────────────────────────
  const { first, last } = parseFullName(player.full_name);
  const categoryData = (player as any).categories as { id: string; name: string } | null;

  const reportPlayer: ReportPlayer = {
    id: player.id,
    full_name: player.full_name,
    first_name: first,
    last_name: last,
    age: calculateAge((player as any).birth_date),
    category_name: categoryData?.name ?? '',
    category_id: (player as any).category_id ?? '',
    parent_email: parentEmail,
  };

  return {
    player: reportPlayer,
    period: {
      month,
      year,
      month_name: MONTH_NAMES[month],
      month_name_upper: MONTH_NAMES[month].toUpperCase(),
    },
    attendance: {
      sessions_total: sessionsTotal,
      sessions_attended: sessionsAttended,
      percentage: sessionsTotal > 0 ? Math.round((sessionsAttended / sessionsTotal) * 100) : 0,
      is_perfect: sessionsTotal > 0 && sessionsAttended >= sessionsTotal,
      matches_total: builtMatches.length,
      matches_attended: attended.length,
      matches_percentage:
        builtMatches.length > 0
          ? Math.round((attended.length / builtMatches.length) * 100)
          : 0,
    },
    matches: builtMatches,
    stats: {
      total_goals: totalGoals,
      total_assists: totalAssists,
      matches_played: attended.length,
      mvp_count: mvpMatches.length,
      mvp_match_rival: mvpMatches[0]?.rival_name,
      best_rating: attended.find((m) => m.rating === 'Excelente')
        ? 'Excelente'
        : attended.find((m) => m.rating === 'Destacado')
        ? 'Destacado'
        : undefined,
    },
  };
}

// ── Batch fetcher for a category ─────────────────────────────

export async function fetchCategoryPlayers(
  categoryId: string,
  organizationId: string,
): Promise<Array<{ id: string; full_name: string }>> {
  const { data, error } = await supabase
    .from('players')
    .select('id, full_name')
    .eq('organization_id', organizationId)
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .order('full_name');

  if (error) {
    console.error('[Report] Category players fetch failed:', error);
    return [];
  }

  return data ?? [];
}
