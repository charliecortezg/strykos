// ─────────────────────────────────────────────────────────────
// WHITE LIONS ACADEMY — Coach Note Transformer
// Converts raw technical coach notes into warm, formative,
// age-appropriate messages for family reports.
// No external API required — runs entirely client-side.
// ─────────────────────────────────────────────────────────────

import type { ReportMatch } from './report-types';

// ── Age stage config ──────────────────────────────────────────

interface AgeStage {
  label: string;
  pronoun: string;       // "tu pequeño" | "tu hijo" | "tu jugador"
  growthFrame: string;   // how to frame growth areas
  closingStyle: string;  // tone of motivational close
}

function getAgeStage(age: number): AgeStage {
  if (age <= 6) return {
    label: 'iniciación',
    pronoun: 'tu pequeño',
    growthFrame: 'parte natural de aprender',
    closingStyle: 'alegre y de disfrute',
  };
  if (age <= 9) return {
    label: 'fundamentos',
    pronoun: 'tu hijo',
    growthFrame: 'un reto que estamos trabajando juntos',
    closingStyle: 'motivador y de confianza',
  };
  if (age <= 12) return {
    label: 'desarrollo',
    pronoun: 'tu jugador',
    growthFrame: 'una oportunidad de crecimiento técnico',
    closingStyle: 'formativo y orientado al progreso',
  };
  return {
    label: 'formación avanzada',
    pronoun: 'tu jugador',
    growthFrame: 'un área clave para su nivel',
    closingStyle: 'técnico y con visión de desarrollo',
  };
}

// ── Keyword extractors ────────────────────────────────────────

interface NoteThemes {
  positives: string[];
  improvements: string[];
  rawSentences: string[];
}

function extractThemes(rawNote: string): NoteThemes {
  const lower = rawNote.toLowerCase();
  const sentences = rawNote
    .split(/[.!;]/)
    .map(s => s.trim())
    .filter(s => s.length > 8);

  const POSITIVE_KEYWORDS = [
    'bien', 'bueno', 'buena', 'excelente', 'destacó', 'destacado',
    'intensidad', 'esfuerzo', 'rápido', 'ágil', 'seguro', 'seguridad',
    'duelos', 'recuperó', 'recuperacion', 'técnica', 'progresó',
    'mejoró', 'gol', 'asistencia', 'pases', 'recorrido', 'apoyo',
    'compañero', 'equipo', 'ganó', 'quitó', 'superó', 'fuerte',
    'concentrado', 'actitud', 'entusiasmo', 'divertido', 'disfrutó',
    'sube', 'subiendo', 'nivel', 'jugadas', 'peligro', 'presionó',
  ];

  const IMPROVEMENT_KEYWORDS = [
    'falta', 'mejorar', 'debe', 'necesita', 'puede más', 'trabajo',
    'decisión', 'decisiones', 'errores', 'bajo', 'le cuesta',
    'presencia', 'intensidad', 'concentración', 'miedo', 'timido',
    'tarda', 'lento', 'perdió', 'falló', 'frente a', 'portería',
    'malas', 'peligro para', 'rival', 'cometió',
  ];

  const positives: string[] = [];
  const improvements: string[] = [];

  for (const sentence of sentences) {
    const sLower = sentence.toLowerCase();
    const posScore = POSITIVE_KEYWORDS.filter(k => sLower.includes(k)).length;
    const impScore = IMPROVEMENT_KEYWORDS.filter(k => sLower.includes(k)).length;

    if (posScore > impScore && posScore > 0) positives.push(sentence);
    else if (impScore > posScore && impScore > 0) improvements.push(sentence);
    else if (posScore > 0) positives.push(sentence);
  }

  return { positives, improvements, rawSentences: sentences };
}

// ── Opening builders ──────────────────────────────────────────

function buildOpening(
  match: ReportMatch,
  playerFirstName: string,
  positives: string[],
  stage: AgeStage,
): string {
  const rival = match.rival_name;
  const resultPhrase =
    match.result === 'victoria' ? `la victoria ante ${rival}` :
    match.result === 'derrota'  ? `el partido ante ${rival}` :
    match.result === 'empate'   ? `el empate ante ${rival}` :
                                  `el partido ante ${rival}`;

  // MVP opening
  if (match.is_mvp) {
    return `En ${resultPhrase}, ${playerFirstName} fue nombrado el jugador más valioso del encuentro — un reconocimiento que habla del nivel que está alcanzando.`;
  }

  // Goal scorer opening
  if (match.goals >= 2) {
    return `${playerFirstName} tuvo una actuación muy completa en ${resultPhrase}, siendo protagonista con ${match.goals} goles que reflejan el trabajo que está haciendo en los entrenamientos.`;
  }
  if (match.goals === 1) {
    return `Un gol importante en ${resultPhrase} — esos momentos son el resultado directo del trabajo constante de ${playerFirstName} en cada entrenamiento.`;
  }

  // Positive note opening
  if (positives.length > 0) {
    // Clean the first positive sentence
    const pos = cleanSentence(positives[0]);
    return `En ${resultPhrase}, ${lowerFirst(pos)}.`;
  }

  // Generic match opening
  const resultWord =
    match.result === 'victoria' ? 'victoria' :
    match.result === 'derrota'  ? 'derrota que deja aprendizajes' :
    'empate';

  return `${playerFirstName} estuvo presente en una ${resultWord} ante ${rival}, sumando minutos y experiencia importantes para su desarrollo.`;
}

// ── Growth area builder ───────────────────────────────────────

function buildGrowthArea(
  playerFirstName: string,
  improvements: string[],
  stage: AgeStage,
  age: number,
): string {
  if (improvements.length === 0) {
    // No explicit improvements — use generic formative bridge
    const bridges = [
      `Como en todo proceso formativo, cada partido es una oportunidad de aprendizaje, y ${playerFirstName} está aprovechando cada una de ellas.`,
      `En el proceso formativo de ${stage.label}, la consistencia es la clave, y ${playerFirstName} la está construyendo partido a partido.`,
      `Seguimos trabajando en los detalles que marcan la diferencia, y ${playerFirstName} muestra la actitud correcta para asimilarlos.`,
    ];
    return bridges[playerFirstName.charCodeAt(0) % bridges.length];
  }

  const imp = cleanSentence(improvements[0]);

  // Age-appropriate framing of improvement
  if (age <= 6) {
    return `En esta etapa de iniciación, lo más importante es el disfrute y la exploración — y eso lo tiene. Vamos afinando detalles como ${extractGrowthCore(imp)} de manera natural, sin prisa.`;
  }
  if (age <= 9) {
    return `Como parte de su desarrollo en esta categoría, seguimos trabajando en ${extractGrowthCore(imp)} — es ${stage.growthFrame} que con práctica y paciencia irá consolidando.`;
  }
  if (age <= 12) {
    return `El cuerpo técnico identifica como ${stage.growthFrame} el trabajo en ${extractGrowthCore(imp)}. Con el nivel de compromiso que muestra ${playerFirstName}, la mejora es cuestión de repetición.`;
  }
  return `En este nivel de desarrollo, ${extractGrowthCore(imp)} es ${stage.growthFrame}. Es justamente el tipo de detalle que trabaja un jugador que quiere llegar más lejos.`;
}

// ── Closing builder ───────────────────────────────────────────

function buildClosing(
  playerFirstName: string,
  age: number,
  stats: { goals: number; assists: number; isMvp: boolean },
  stage: AgeStage,
): string {
  const closings = {
    withStats: [
      `${playerFirstName} está construyendo su camino con trabajo y presencia. Desde White Lions Academy, seguimos acompañando cada paso de ese proceso.`,
      `Cada partido suma en la formación de ${playerFirstName}. Estamos orgullosos del jugador y la persona que está siendo dentro y fuera del campo.`,
      `Gracias por confiar en White Lions Academy para el desarrollo de ${playerFirstName}. Lo que están viendo en el campo es el reflejo de un proceso serio y con propósito.`,
    ],
    general: [
      `${playerFirstName} está en el camino correcto. En White Lions Academy seguimos construyendo juntos — partido a partido, entrenamiento a entrenamiento.`,
      `El desarrollo de ${playerFirstName} es nuestro compromiso. Gracias por ser parte de este proyecto formativo.`,
      `Seguimos trabajando con ${playerFirstName} para sacar la mejor versión de él dentro y fuera del campo. Es un privilegio acompañar su crecimiento.`,
    ],
  };

  const hasStats = stats.goals > 0 || stats.assists > 0 || stats.isMvp;
  const pool = hasStats ? closings.withStats : closings.general;
  return pool[playerFirstName.charCodeAt(1) % pool.length];
}

// ── Utility functions ─────────────────────────────────────────

function cleanSentence(s: string): string {
  // Remove common awkward openers from raw notes
  return s
    .replace(/^(también|al igual que en otros partidos,?|sin embargo,?|pero\s)/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function lowerFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function extractGrowthCore(sentence: string): string {
  // Extract the core growth area from a raw improvement sentence
  // by removing player names and personalizations
  const cleaned = sentence
    .replace(/\b[A-ZÁÉÍÓÚ][a-záéíóúñ]+ [A-ZÁÉÍÓÚ][a-záéíóúñ]+\b/g, 'el jugador')
    .replace(/\bél\b/g, 'el jugador')
    .toLowerCase()
    .trim();

  // Map common technical phrases to formative language
  const PHRASE_MAP: Record<string, string> = {
    'toma en algunos momentos malas decisiones': 'la toma de decisiones bajo presión',
    'le falta intensidad': 'la intensidad en los momentos clave del partido',
    'le falta más familiaridad': 'la continuidad en los entrenamientos',
    'falló mucho en frente de la portería': 'la definición frente a portería',
    'le cuesta': 'esa habilidad que estamos desarrollando',
    'debe mejorar': 'ese aspecto que seguimos trabajando',
    'cometió varios errores': 'la consistencia y concentración',
    'bajo de rendimiento': 'mantener el nivel durante todo el partido',
    'le hace falta': 'ese detalle técnico que estamos construyendo',
  };

  for (const [key, value] of Object.entries(PHRASE_MAP)) {
    if (cleaned.includes(key)) return value;
  }

  // If no map match, return a shortened version
  return cleaned.slice(0, 60) + (cleaned.length > 60 ? '...' : '');
}

// ── Main transformer ──────────────────────────────────────────

export function transformCoachNote(
  rawNote: string,
  playerFirstName: string,
  playerAge: number,
  match: ReportMatch,
): string {
  if (!rawNote || rawNote.trim().length < 10) return rawNote;

  const stage = getAgeStage(playerAge);
  const { positives, improvements } = extractThemes(rawNote);

  const opening = buildOpening(match, playerFirstName, positives, stage);
  const growth = buildGrowthArea(playerFirstName, improvements, stage, playerAge);
  const closing = buildClosing(
    playerFirstName,
    playerAge,
    { goals: match.goals, assists: match.assists, isMvp: match.is_mvp },
    stage,
  );

  return `${opening} ${growth} ${closing}`;
}

// ── Batch transformer for full report ────────────────────────

import type { MonthlyReportData } from './report-types';

export function transformAllNotes(data: MonthlyReportData): MonthlyReportData {
  const playerAge = data.player.age ?? 10;
  const firstName = data.player.first_name;

  const enhancedMatches = data.matches.map((match) => {
    if (!match.note || match.note.trim().length < 10) return match;

    const transformed = transformCoachNote(
      match.note,
      firstName,
      playerAge,
      match,
    );

    return { ...match, note: transformed };
  });

  return { ...data, matches: enhancedMatches };
}
