// STRYK Intake Module Utilities

/**
 * Normalizar teléfono a 10 dígitos (últimos 10)
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

/**
 * Normalizar nombre (lowercase, sin acentos, espacios normalizados)
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generar idempotency key (hash determinístico)
 * Nota: Este hash es para detección de duplicados en frontend.
 * El hash real se genera en PostgreSQL con sha256.
 */
export function generateIdempotencyKey(
  orgId: string,
  phoneNormalized: string,
  birthDate: Date,
  nameNormalized: string
): string {
  const dateStr = birthDate.toISOString().split('T')[0];
  const payload = `${orgId}|${phoneNormalized}|${dateStr}|${nameNormalized}`;
  
  // Simple hash compatible with frontend
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

/**
 * Calcular edad desde fecha de nacimiento
 */
export function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Formatear moneda MXN
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('es-MX')} MXN`;
}

/**
 * Formatear fecha para display
 */
export function formatDateDisplay(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Obtener label de status
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    processing: 'Procesando',
    completed: 'Completado',
    failed: 'Error',
    cancelled: 'Cancelado',
  };
  return labels[status] || status;
}

/**
 * Obtener label de método de pago
 */
export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    efectivo: 'Efectivo',
    transferencia: 'Transferencia',
  };
  return labels[method] || method;
}
