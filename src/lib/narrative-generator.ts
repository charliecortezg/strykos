// ─────────────────────────────────────────────────────────────
// WHITE LIONS ACADEMY — Narrative Generator
// Generates coach-voice narrative from structured report data.
// Template-based: no external API required. 
// Produces natural, specific, non-generic Spanish text.
// ─────────────────────────────────────────────────────────────

import type { MonthlyReportData } from './report-types';

// ── Text pools ────────────────────────────────────────────────

const OPENING_PERFECT_ATTENDANCE = [
  'Fue un mes para destacar.',
  'Este mes marcó una diferencia importante.',
  'El trabajo de este mes habla por sí solo.',
];

const OPENING_GOOD_ATTENDANCE = [
  'El mes de {month} fue un período de crecimiento.',
  'Durante {month}, {first} mostró compromiso con su desarrollo.',
  '{first} tuvo un mes activo dentro de la academia.',
];

const OPENING_LOW_ATTENDANCE = [
  'A pesar de las ausencias en {month}, {first} aprovechó los momentos en cancha.',
  'El mes de {month} presentó algunos retos de asistencia, pero hubo avances.',
];

// ── Helper ────────────────────────────────────────────────────

function pick(pool: string[], data: MonthlyReportData): string {
  const item = pool[Math.floor(data.player.id.charCodeAt(0) % pool.length)];
  return item
    .replace('{month}', data.period.month_name)
    .replace('{first}', data.player.first_name);
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── Sentence builders ─────────────────────────────────────────

function buildAttendanceSentence(data: MonthlyReportData): string {
  const { attendance, player, period } = data;
  const first = player.first_name;

  if (attendance.is_perfect && attendance.sessions_total > 0) {
    return `${first} asistió a los ${attendance.sessions_total} entrenamientos del mes, lo que refleja una disciplina ejemplar.`;
  }

  if (attendance.percentage >= 75) {
    return `${first} estuvo presente en ${attendance.sessions_attended} de los ${attendance.sessions_total} entrenamientos de ${period.month_name}, manteniendo una buena continuidad de trabajo.`;
  }

  if (attendance.sessions_total > 0) {
    return `La asistencia de ${first} en ${period.month_name} fue de ${attendance.sessions_attended} de ${attendance.sessions_total} sesiones. La constancia en los entrenamientos es un factor clave para el desarrollo.`;
  }

  return `${first} participó activamente en los entrenamientos del mes.`;
}

function buildMatchesSentence(data: MonthlyReportData): string {
  const { matches, stats, player } = data;
  const first = player.first_name;
  const played = matches.filter((m) => m.attended);

  if (played.length === 0) return '';

  const parts: string[] = [];

  if (played.length === 1) {
    const m = played[0];
    parts.push(`En el partido frente a ${m.rival_name}, ${first} tuvo participación directa`);
    if (m.goals > 0) parts[0] += `, anotando ${m.goals === 1 ? 'un gol' : `${m.goals} goles`}`;
    if (m.assists > 0) parts[0] += ` y repartiendo ${m.assists === 1 ? 'una asistencia' : `${m.assists} asistencias`}`;
    parts[0] += '.';
  } else {
    parts.push(`Participó en ${played.length} de los ${matches.length} partidos del mes.`);
    if (stats.total_goals > 0 || stats.total_assists > 0) {
      const contributions: string[] = [];
      if (stats.total_goals > 0)
        contributions.push(`${stats.total_goals} ${stats.total_goals === 1 ? 'gol' : 'goles'}`);
      if (stats.total_assists > 0)
        contributions.push(`${stats.total_assists} ${stats.total_assists === 1 ? 'asistencia' : 'asistencias'}`);
      parts.push(`Contribuyó con ${contributions.join(' y ')} en esos encuentros.`);
    }
  }

  if (stats.mvp_count > 0) {
    parts.push(`Fue reconocido como el jugador más valioso del partido ante ${stats.mvp_match_rival ?? 'su rival'}.`);
  }

  return parts.join(' ');
}

function buildCoachObservationSentence(data: MonthlyReportData): string {
  const notes = data.matches
    .filter((m) => m.note && m.note.trim().length > 10)
    .slice(0, 2); // max 2 for narrative, full notes go in their own section

  if (notes.length === 0) return '';

  // Extract key themes from notes
  const allNotes = notes.map((n) => n.note!.toLowerCase()).join(' ');
  const themes: string[] = [];

  if (allNotes.includes('disciplin') || allNotes.includes('orden') || allNotes.includes('concentra'))
    themes.push('disciplina y concentración');
  if (allNotes.includes('técnic') || allNotes.includes('habilidad') || allNotes.includes('tecnica'))
    themes.push('habilidad técnica');
  if (allNotes.includes('actitud') || allNotes.includes('esfuerzo') || allNotes.includes('intensidad'))
    themes.push('actitud y esfuerzo');
  if (allNotes.includes('compañero') || allNotes.includes('equipo') || allNotes.includes('trabajo en equipo'))
    themes.push('trabajo en equipo');
  if (allNotes.includes('mejora') || allNotes.includes('progres') || allNotes.includes('avance'))
    themes.push('progreso continuo');
  if (allNotes.includes('decisión') || allNotes.includes('decision') || allNotes.includes('lectura'))
    themes.push('toma de decisiones');

  if (themes.length === 0) return '';

  const first = data.player.first_name;
  if (themes.length === 1) {
    return `El cuerpo técnico destaca en ${first} aspectos de ${themes[0]}, elementos que seguiremos trabajando en los próximos ciclos.`;
  }

  return `El cuerpo técnico observa en ${first} cualidades importantes: ${themes.slice(0, 2).join(' y ')}. Son pilares del jugador que estamos formando.`;
}

function buildClosingSentence(data: MonthlyReportData): string {
  const first = data.player.first_name;
  const last = data.player.last_name;
  const apellido = last ? `familia ${last}` : 'familia';

  const closings = [
    `Agradecemos la confianza de la ${apellido} en White Lions Academy. Seguimos construyendo juntos el desarrollo de ${first}.`,
    `Desde White Lions Academy, reafirmamos el compromiso con el desarrollo integral de ${first}. Gracias por ser parte de este proyecto.`,
    `El desarrollo de cada jugador es nuestra misión. Seguimos trabajando día a día junto a ${first} y la ${apellido}.`,
  ];

  const idx = (data.player.id.charCodeAt(2) ?? 0) % closings.length;
  return closings[idx];
}

// ── Main generator ────────────────────────────────────────────

export function generateNarrative(data: MonthlyReportData): string {
  const { attendance } = data;

  // Choose opening based on attendance rate
  let openingPool: string[];
  if (attendance.is_perfect && attendance.sessions_total >= 4) {
    openingPool = OPENING_PERFECT_ATTENDANCE;
  } else if (attendance.percentage >= 65) {
    openingPool = OPENING_GOOD_ATTENDANCE;
  } else {
    openingPool = OPENING_LOW_ATTENDANCE;
  }

  const paragraphs: string[] = [
    pick(openingPool, data),
    buildAttendanceSentence(data),
    buildMatchesSentence(data),
    buildCoachObservationSentence(data),
    buildClosingSentence(data),
  ].filter((p) => p.trim().length > 0);

  return paragraphs.join(' ');
}
