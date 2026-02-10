import { WLA_STATS, type StatKey, type EvaluationWeights } from '@/types/evaluations';
import { DEFAULT_WEIGHTS } from '@/types/evaluations';

/**
 * Calculate age group from date of birth
 */
export function calculateAgeGroup(dateOfBirth: string | null): string {
  if (!dateOfBirth) return '8-9'; // default fallback
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

  if (age <= 7) return '6-7';
  if (age <= 9) return '8-9';
  return '10-11';
}

/**
 * Calculate weighted overall score (0-100) from 6 stats (0-20)
 */
export function calculateOverall(
  scores: Record<StatKey, number>,
  ageGroup: string,
  weights?: EvaluationWeights | null
): number {
  const w = weights?.weights || DEFAULT_WEIGHTS[ageGroup] || DEFAULT_WEIGHTS['8-9'];

  const mentalidad = (
    (scores.actitud_esfuerzo || 0) +
    (scores.disciplina_constancia || 0) +
    (scores.autonomia_liderazgo || 0)
  ) / 3;

  const tecnica = (
    (scores.control_conduccion || 0) +
    (scores.pase_recepcion || 0)
  ) / 2;

  const juego = scores.decision_juego || 0;

  const overall = mentalidad * w.mentalidad + tecnica * w.tecnica + juego * w.juego;
  return Math.round(overall * (100 / 20));
}

/**
 * Get current period string (YYYY-MM)
 */
export function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get previous period string
 */
export function getPreviousPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number);
  if (month === 1) return `${year - 1}-12`;
  return `${year}-${String(month - 1).padStart(2, '0')}`;
}

/**
 * Format period for display
 */
export function formatPeriod(period: string): string {
  const [year, month] = period.split('-');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

/**
 * Detect achievements based on current vs previous scores
 */
export function detectAchievements(
  currentScores: Record<StatKey, number>,
  previousScores: Record<StatKey, number> | null
): { key: string; xp_bonus: number }[] {
  const achievements: { key: string; xp_bonus: number }[] = [];

  // Superación: any stat +3 vs previous month
  if (previousScores) {
    const hasSuperacion = WLA_STATS.some(stat => {
      const current = currentScores[stat.key] || 0;
      const previous = previousScores[stat.key] || 0;
      return current - previous >= 3;
    });
    if (hasSuperacion) {
      achievements.push({ key: 'superacion', xp_bonus: 25 });
    }
  }

  // Genio Creativo: stat6 (decision_juego) >= 16
  if ((currentScores.decision_juego || 0) >= 16) {
    achievements.push({ key: 'genio_creativo', xp_bonus: 50 });
  }

  return achievements;
}
