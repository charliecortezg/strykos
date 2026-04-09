// White Lions Academy — Macrociclo 2025-2026 Mexicali

export type MacroPeriod =
  | 'preparatorio'
  | 'mesociclo_1'
  | 'mesociclo_2'
  | 'mesociclo_3'
  | 'transicion'
  | 'vacaciones';

export type EvaluationType =
  | 'diagnostica'
  | 'formativa'
  | 'cierre_m1'
  | 'retorno'
  | 'final';

export interface MacroCycleMonth {
  month: string;
  label: string;
  period: MacroPeriod;
  periodColor: string;
  evaluationType: EvaluationType;
  fundamentoTecnico: {
    key: string;
    label: string;
    nivel: 'intro' | 'desar' | 'cons';
  };
  focoTactico: string;
  indicadoresActivos: {
    tecnico: string;
    tactico: string;
    coordinativo: string;
    psicologico: string;
  };
}

export const WL_MACROCICLO: MacroCycleMonth[] = [
  {
    month: 'agosto_2025',
    label: 'Agosto 2025',
    period: 'preparatorio',
    periodColor: '#22C55E',
    evaluationType: 'diagnostica',
    fundamentoTecnico: {
      key: 'conduccion',
      label: 'Conducción',
      nivel: 'intro',
    },
    focoTactico:
      'Sin carga táctica. Cultura de equipo, vocabulario WL y formaciones base.',
    indicadoresActivos: {
      tecnico: 'Conduce el balón con el pie dominante sin perderlo',
      tactico: 'Identifica la portería propia y la rival',
      coordinativo: 'Coordinación ojo-pie básica en juego libre',
      psicologico:
        'Actitud activa: busca el balón, no abandona ante el error',
    },
  },
  {
    month: 'septiembre_2025',
    label: 'Septiembre 2025',
    period: 'mesociclo_1',
    periodColor: '#3B82F6',
    evaluationType: 'formativa',
    fundamentoTecnico: {
      key: 'conduccion',
      label: 'Conducción',
      nivel: 'desar',
    },
    focoTactico:
      'Los 2 momentos: disponemos y recuperamos. Zonas ZA-ZD. Trigger principal.',
    indicadoresActivos: {
      tecnico:
        'Conduce con cabeza levantada e identifica un compañero libre',
      tactico: 'Aplica los 2 momentos con vocabulario WL',
      coordinativo: 'Equilibrio dinámico en cambios de dirección',
      psicologico: 'Usa vocabulario WL en cancha con recordatorio',
    },
  },
  {
    month: 'octubre_2025',
    label: 'Octubre 2025',
    period: 'mesociclo_1',
    periodColor: '#3B82F6',
    evaluationType: 'formativa',
    fundamentoTecnico: {
      key: 'orientacion_balon',
      label: 'Orientación de Balón',
      nivel: 'desar',
    },
    focoTactico:
      'Formación base por categoría. Tres líneas. Amplitud con balón.',
    indicadoresActivos: {
      tecnico: 'Gira la cabeza al menos 1 vez antes de recibir',
      tactico: 'Ocupa las 3 líneas con amplitud al tener el balón',
      coordinativo: 'Orientación espacial en campo completo',
      psicologico: 'Acepta la corrección con actitud abierta',
    },
  },
  {
    month: 'noviembre_2025',
    label: 'Noviembre 2025',
    period: 'mesociclo_1',
    periodColor: '#3B82F6',
    evaluationType: 'formativa',
    fundamentoTecnico: {
      key: 'conduccion',
      label: 'Conducción 2 perfiles',
      nivel: 'cons',
    },
    focoTactico:
      'Posicionamiento banda/balón. Compactar sin balón. Pase largo intro.',
    indicadoresActivos: {
      tecnico:
        'Conduce con ambos perfiles y cambia de ritmo ante defensor',
      tactico:
        'Se posiciona según si el balón está en banda propia o contraria',
      coordinativo: 'Velocidad de reacción al cambio de posesión',
      psicologico: 'Compromiso constante independiente del resultado',
    },
  },
  {
    month: 'diciembre_2025',
    label: 'Diciembre 2025',
    period: 'mesociclo_1',
    periodColor: '#3B82F6',
    evaluationType: 'cierre_m1',
    fundamentoTecnico: {
      key: 'pase_corto',
      label: 'Pase Corto',
      nivel: 'cons',
    },
    focoTactico:
      'Cierre M1. Evaluación de todos los indicadores trabajados. Sin carga nueva.',
    indicadoresActivos: {
      tecnico: 'Pase al pie lejano del rival con borde interno',
      tactico: 'Aplica los 2 momentos y trigger de forma autónoma',
      coordinativo: 'Todos los indicadores coordinativos del M1',
      psicologico: 'Retroalimentación positiva y cierre emocional',
    },
  },
  {
    month: 'enero_2026',
    label: 'Enero 2026',
    period: 'mesociclo_2',
    periodColor: '#F97316',
    evaluationType: 'retorno',
    fundamentoTecnico: {
      key: 'pase_largo',
      label: 'Pase en Profundidad',
      nivel: 'desar',
    },
    focoTactico:
      'Superioridades numéricas 1v1, 2v1, 3v2. Posicionamiento exacto del balón.',
    indicadoresActivos: {
      tecnico: 'Pase en profundidad entre líneas con anticipación',
      tactico: 'Superioridad 2v1 con criterio y timing',
      coordinativo: 'Retención de coordinación post-vacaciones',
      psicologico:
        'Retoma el compromiso y motivación tras el descanso',
    },
  },
  {
    month: 'febrero_2026',
    label: 'Febrero 2026',
    period: 'mesociclo_2',
    periodColor: '#F97316',
    evaluationType: 'formativa',
    fundamentoTecnico: {
      key: 'regate',
      label: 'Regate con Finta',
      nivel: 'desar',
    },
    focoTactico:
      'Transición ofensiva: los primeros 3 segundos. Transición defensiva: los primeros 2.',
    indicadoresActivos: {
      tecnico: 'Regate con finta que engaña al defensor activo',
      tactico:
        'Reacciona a la transición ofensiva en menos de 3 segundos',
      coordinativo: 'Anticipación en pressing coordinado',
      psicologico: 'Comunicación vocal espontánea con compañeros',
    },
  },
  {
    month: 'marzo_2026',
    label: 'Marzo 2026',
    period: 'mesociclo_2',
    periodColor: '#F97316',
    evaluationType: 'formativa',
    fundamentoTecnico: {
      key: 'pressing_coordinado',
      label: 'Pressing Coordinado',
      nivel: 'cons',
    },
    focoTactico:
      'Las 3 funciones de recuperación: presionar poseedor, tapar canales, líneas intermedias.',
    indicadoresActivos: {
      tecnico:
        'Pressing coordinado 2v1 activa en menos de 2 segundos',
      tactico:
        'Aplica las 3 funciones de recuperación en partido',
      coordinativo:
        'Coordina movimiento con compañero sin instrucción',
      psicologico:
        'Liderazgo emergente: organiza a compañeros en pressing',
    },
  },
  {
    month: 'abril_2026',
    label: 'Abril 2026',
    period: 'mesociclo_3',
    periodColor: '#EF4444',
    evaluationType: 'formativa',
    fundamentoTecnico: {
      key: 'todos_consolidacion',
      label: 'Consolidación — Todos los Fundamentos',
      nivel: 'cons',
    },
    focoTactico:
      'Autonomía táctica completa. El equipo se organiza solo en los primeros 30 segundos.',
    indicadoresActivos: {
      tecnico:
        'Todos los fundamentos del año en partido real con automatismo',
      tactico:
        'Aplica el modelo posicional completo sin instrucción',
      coordinativo:
        'Coordinación multi-tarea automática en partido',
      psicologico:
        'Autonomía y liderazgo vocal sin intervención del entrenador',
    },
  },
  {
    month: 'mayo_2026',
    label: 'Mayo 2026',
    period: 'mesociclo_3',
    periodColor: '#EF4444',
    evaluationType: 'formativa',
    fundamentoTecnico: {
      key: 'silencio_metodologico',
      label: 'Silencio Metodológico',
      nivel: 'cons',
    },
    focoTactico:
      'Comunicación vocal activa. Sub-12/13: liderazgo verbal en cancha. El entrenador no interviene.',
    indicadoresActivos: {
      tecnico:
        'Automatismo técnico completo sin corrección del entrenador',
      tactico: 'Organización táctica 100% autónoma del grupo',
      coordinativo:
        'Anticipación que permite lecturas preventivas',
      psicologico:
        'Puede explicar el modelo WL a un jugador nuevo',
    },
  },
  {
    month: 'junio_2026',
    label: 'Junio 2026',
    period: 'transicion',
    periodColor: '#A855F7',
    evaluationType: 'final',
    fundamentoTecnico: {
      key: 'evaluacion_final',
      label: 'Evaluación Final del Año',
      nivel: 'cons',
    },
    focoTactico:
      'Evaluación comparativa inicio vs. fin. Retroalimentación individual. Cierre emocional.',
    indicadoresActivos: {
      tecnico:
        'Comparativa agosto vs junio en todos los fundamentos',
      tactico: 'Estándar de salida de la etapa (Doc 01)',
      coordinativo: 'Progresión coordinativa anual completa',
      psicologico:
        'Cierre emocional: fortalezas del año + objetivo para la siguiente temporada',
    },
  },
];

function getMonthName(monthIndex: number): string {
  const names = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  return names[monthIndex];
}

export function getCurrentMacroMonth(): MacroCycleMonth | null {
  const now = new Date();
  const key = `${getMonthName(now.getMonth())}_${now.getFullYear()}`;
  return WL_MACROCICLO.find((m) => m.month === key) || null;
}

export function getMacroMonthByKey(key: string): MacroCycleMonth | null {
  return WL_MACROCICLO.find((m) => m.month === key) || null;
}
