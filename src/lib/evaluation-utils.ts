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
  if (age <= 11) return '10-11';
  return '12-13';
}

/**
 * Calculate weighted overall score (0-100) from N stats (0-20).
 * Dimension-agnostic: works with 4 WL dimensions or 6 legacy WLA stats.
 * If weights contain pillar keys matching the score keys, uses weighted average.
 * Otherwise falls back to simple average.
 */
export function calculateOverall(
  scores: Record<StatKey, number>,
  ageGroup: string,
  weights?: EvaluationWeights | null
): number {
  const w = weights?.weights || DEFAULT_WEIGHTS[ageGroup] || DEFAULT_WEIGHTS['8-9'];

  const scoreKeys = Object.keys(scores).filter(k => scores[k] !== undefined);
  if (scoreKeys.length === 0) return 0;

  // Check if weights map to the score keys directly (WL model)
  const hasDirectWeights = scoreKeys.some(k => w[k] !== undefined);

  if (hasDirectWeights) {
    let weightedSum = 0;
    let totalWeight = 0;
    for (const key of scoreKeys) {
      const score = scores[key] || 0;
      const weight = w[key] || 0;
      weightedSum += score * weight;
      totalWeight += weight;
    }
    if (totalWeight === 0) {
      // Fallback to simple average
      const avg = scoreKeys.reduce((sum, k) => sum + (scores[k] || 0), 0) / scoreKeys.length;
      return Math.round(avg * (100 / 20));
    }
    const overall = weightedSum / totalWeight;
    return Math.round(overall * (100 / 20));
  }

  // Legacy pillar-based calculation (mentalidad/tecnica/juego)
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

  const mW = w.mentalidad || w['mentalidad'] || 0.33;
  const tW = w.tecnica || w['tecnica'] || 0.34;
  const jW = w.juego || w['juego'] || 0.33;

  const overall = mentalidad * mW + tecnica * tW + juego * jW;
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
 * Detect achievements based on current vs previous scores.
 * Dimension-agnostic: iterates over whatever stats exist.
 */
export function detectAchievements(
  currentScores: Record<StatKey, number>,
  previousScores: Record<StatKey, number> | null
): { key: string; xp_bonus: number }[] {
  const achievements: { key: string; xp_bonus: number }[] = [];

  // Superación: any stat +3 vs previous month
  if (previousScores) {
    const allKeys = new Set([...Object.keys(currentScores), ...Object.keys(previousScores)]);
    const hasSuperacion = Array.from(allKeys).some(key => {
      const current = currentScores[key] || 0;
      const previous = previousScores[key] || 0;
      return current - previous >= 3;
    });
    if (hasSuperacion) {
      achievements.push({ key: 'superacion', xp_bonus: 25 });
    }
  }

  // Genio Creativo: any stat >= 16 (generalized from legacy decision_juego check)
  const hasHighScore = Object.values(currentScores).some(v => v >= 16);
  if (hasHighScore) {
    achievements.push({ key: 'genio_creativo', xp_bonus: 50 });
  }

  return achievements;
}