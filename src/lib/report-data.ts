// ─────────────────────────────────────────────────────────────
// WHITE LIONS ACADEMY — Report Data Fetcher
// Adaptado al schema real de STRYK.
// ─────────────────────────────────────────────────────────────

import { supabase } from '@/integrations/supabase/client';
import type { MonthlyReportData, ReportMatch, ReportPlayer } from './report-types';

export const MONTH_NAMES: Record<number, string> = {
  1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
  5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
  9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre',
};

function monthDateRange(month: number, year: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

function calculateAge(birthDate: string | null): number | undefined {
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
    .replace(/^\[.*?\]\s*/, '')
    .trim();
}

function deriveResult(goalsFor: number, goalsAgainst: number): 'victoria' | 'derrota' | 'empate' {
  if (goalsFor > goalsAgainst) return 'victoria';
  if (goalsFor < goalsAgainst) return 'derrota';
  return 'empate';
}

function ratingFromPerformance(perf?: string | null): string | undefined {
  switch (perf) {
    case 'outstanding': return 'Excelente';
    case 'excellent':   return 'Destacado';
    case 'focus':       return 'En desarrollo';
    default: return undefined;
  }
}

export async function fetchPlayerMonthData(
  playerId: string,
  month: number,
  year: number,
  organizationId: string,
): Promise<MonthlyReportData | null> {
  const { start, end } = monthDateRange(month, year);

  // 1. Player info
  const { data: player, error: playerErr } = await supabase
    .from('players')
    .select('id, full_name, date_of_birth, category_id, parent_email, email, categories(id, name)')
    .eq('id', playerId)
    .maybeSingle();

  if (playerErr || !player) {
    console.error('[Report] Player fetch failed:', playerErr);
    return null;
  }

  // 2. Parent email — try players.parent_email, then players.email, then guardian
  let parentEmail: string = (player.parent_email ?? '') as string;
  if (!parentEmail) parentEmail = (player.email ?? '') as string;

  if (!parentEmail) {
    const { data: pg } = await supabase
      .from('player_guardians')
      .select('guardian_id, is_primary, guardians(email)')
      .eq('player_id', playerId)
      .order('is_primary', { ascending: false });

    const firstWithEmail = (pg ?? []).find((row: any) => row?.guardians?.email);
    parentEmail = (firstWithEmail as any)?.guardians?.email ?? '';
  }

  // 3. Matches of the month (only finished, for this player's category)
  const { data: matches } = await supabase
    .from('matches')
    .select('id, rival_name, match_date, goals_for, goals_against, mvp_player_id, category_id, status')
    .eq('organization_id', organizationId)
    .eq('category_id', player.category_id as string)
    .eq('status', 'terminado')
    .gte('match_date', `${start}T00:00:00`)
    .lte('match_date', `${end}T23:59:59`)
    .order('match_date', { ascending: true });

  // 4. match_players for this player
  const matchIds = (matches ?? []).map((m: any) => m.id);
  let matchPlayerRecords: any[] = [];
  if (matchIds.length > 0) {
    const { data: mp } = await supabase
      .from('match_players')
      .select('match_id, attended, goals, assists, performance, note')
      .eq('player_id', playerId)
      .in('match_id', matchIds);
    matchPlayerRecords = mp ?? [];
  }

  // 5. Attendance (training): total sesiones distintas del mes para la categoría y % presente del jugador
  const { data: catAttendance } = await supabase
    .from('attendance')
    .select('date, status, player_id')
    .eq('organization_id', organizationId)
    .eq('category_id', player.category_id as string)
    .gte('date', start)
    .lte('date', end);

  const allRows = catAttendance ?? [];
  const sessionDates = new Set<string>(allRows.map((a: any) => a.date));
  const sessionsTotal = sessionDates.size;
  const sessionsAttended = allRows.filter(
    (a: any) => a.player_id === playerId && a.status === 'presente'
  ).length;

  // 6. Build match objects
  const builtMatches: ReportMatch[] = (matches ?? []).map((m: any) => {
    const mp = matchPlayerRecords.find((r) => r.match_id === m.id);
    const rawNote = (mp?.note ?? '') as string;
    const cleanNote = rawNote ? stripMigrationPrefix(rawNote) : '';

    return {
      match_id: m.id,
      rival_name: m.rival_name ?? 'Rival',
      match_date: m.match_date,
      result: deriveResult(m.goals_for ?? 0, m.goals_against ?? 0),
      score_us: m.goals_for ?? 0,
      score_rival: m.goals_against ?? 0,
      attended: mp?.attended ?? false,
      goals: mp?.goals ?? 0,
      assists: mp?.assists ?? 0,
      rating: ratingFromPerformance(mp?.performance),
      note: cleanNote && cleanNote.length > 2 ? cleanNote : undefined,
      is_mvp: m.mvp_player_id === playerId,
    };
  });

  // 7. Stats
  const attended = builtMatches.filter((m) => m.attended);
  const totalGoals = attended.reduce((s, m) => s + (m.goals ?? 0), 0);
  const totalAssists = attended.reduce((s, m) => s + (m.assists ?? 0), 0);
  const mvpMatches = builtMatches.filter((m) => m.is_mvp);

  // 8. Assemble
  const { first, last } = parseFullName(player.full_name);
  const categoryData = (player as any).categories as { id: string; name: string } | null;

  const reportPlayer: ReportPlayer = {
    id: player.id as string,
    full_name: player.full_name as string,
    first_name: first,
    last_name: last,
    age: calculateAge((player as any).date_of_birth),
    category_name: categoryData?.name ?? '',
    category_id: (player.category_id ?? '') as string,
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
  return (data as any) ?? [];
}
