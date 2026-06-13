/**
 * Owner Panel language dictionary.
 * Translates internal/SaaS jargon to dueño-de-academia mexicano natural copy.
 * Used ONLY in the Panel del Dueño (basic profile). White Lions (full) keeps
 * its original copy untouched.
 */
export const OWNER_COPY = {
  // Sections
  inicio: 'Inicio',
  jugadores: 'Jugadores',
  dinero: 'Dinero',
  asistencia: 'Asistencia',
  equipo: 'Equipo',

  // Estado de la academia (replaces "Lifecycle & Cobranza")
  estado_academia: 'Estado de la academia',
  nuevos_ingresos: 'Nuevos ingresos',
  bajas: 'Bajas',
  activos: 'Activos',
  inactivos: 'Inactivos',
  deben_1: 'Deben 1 mes',
  deben_2_plus: 'Deben 2+ meses',

  // Jugadores por recuperar (replaces "Jugadores en Riesgo")
  jugadores_por_recuperar: 'Jugadores por recuperar',
  recordar_pago_whatsapp: 'Recordar por WhatsApp',
  sin_jugadores_por_recuperar: 'Todos los pagos están al día. ¡Excelente!',

  // Dinero
  ingresos_mes: 'Ingresos del mes',
  gastos_mes: 'Gastos del mes',
  ingresos_menos_gastos: 'Ingresos − Gastos registrados',
  ingresos_menos_gastos_nota: 'Solo considera los gastos que registraste en STRYK.',
  cobranza: 'Cobranza',
  pagos: 'Pagos',
  gastos: 'Gastos',
  configuracion_cobranza: 'Configuración de cobranza',

  // KPIs Inicio
  pendiente_cobrar: 'Pendiente por cobrar',
  pct_cobranza: '% Cobranza',
  pct_asistencia: '% Asistencia',
  alumnos_activos: 'Alumnos activos',
  entrenamientos_semana: 'Entrenamientos esta semana',

  // Equipo
  configuracion_academia: 'Configuración de la academia',
  crear_entrenador: 'Crear entrenador',
} as const;

/**
 * Build the WhatsApp reminder message for an overdue player.
 * Tono humano, no cobranza fría.
 */
export function buildWhatsAppReminder(params: {
  tutorName: string | null;
  playerName: string;
  amount?: number | null;
}): string {
  const tutor = (params.tutorName || '').trim() || 'qué tal';
  const amountStr =
    typeof params.amount === 'number' && params.amount > 0
      ? new Intl.NumberFormat('es-MX', {
          style: 'currency',
          currency: 'MXN',
          minimumFractionDigits: 0,
        }).format(params.amount)
      : 'la mensualidad';
  return `Hola ${tutor}, ¿cómo está? Le recuerdo que ${params.playerName} tiene pendiente la mensualidad de ${amountStr}. Cualquier cosa me dice para apoyarle. ¡Gracias!`;
}

/** Normalize phone to digits-only for wa.me */
export function waLink(phone: string | null | undefined, message: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  // Add MX country code if 10 digits
  const full = digits.length === 10 ? `52${digits}` : digits;
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
}
