/**
 * Human-friendly error messages for STRYK
 * Maps technical errors to user-friendly Spanish messages
 */

interface PostgresError {
  code?: string;
  message?: string;
  details?: string;
}

interface SupabaseError {
  code?: string;
  message?: string;
  status?: number;
}

type ErrorInput = Error | PostgresError | SupabaseError | string | unknown;

const ERROR_MAP: Record<string, string> = {
  // PostgreSQL error codes
  '23505': 'Este registro ya existe. Verifica que no esté duplicado.',
  '23503': 'No se puede eliminar porque hay datos relacionados.',
  '23502': 'Faltan campos obligatorios.',
  '42501': 'No tienes permiso para realizar esta acción.',
  '42P01': 'Error de configuración. Contacta al administrador.',
  'PGRST301': 'Sesión expirada. Vuelve a iniciar sesión.',
  
  // Network and timeout
  'NETWORK_ERROR': 'Sin conexión. Verifica tu internet.',
  'TIMEOUT': 'La operación tardó demasiado. Intenta de nuevo.',
  'FETCH_ERROR': 'Error de conexión. Verifica tu internet.',
  
  // Auth errors
  'invalid_credentials': 'Credenciales incorrectas.',
  'email_not_confirmed': 'Confirma tu email antes de iniciar sesión.',
  'user_already_exists': 'Ya existe una cuenta con este email.',
  
  // Generic HTTP status codes
  '400': 'Datos inválidos. Verifica la información.',
  '401': 'Sesión expirada. Vuelve a iniciar sesión.',
  '403': 'No tienes permiso para esta acción.',
  '404': 'No se encontró el recurso.',
  '409': 'Conflicto: el registro ya existe.',
  '422': 'Datos inválidos. Verifica la información.',
  '429': 'Demasiadas solicitudes. Espera un momento.',
  '500': 'Algo salió mal. Intenta de nuevo.',
  '502': 'Servicio temporalmente no disponible.',
  '503': 'Servicio en mantenimiento. Intenta más tarde.',
};

// Pattern-based error matching
const ERROR_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /network/i, message: 'Sin conexión. Verifica tu internet.' },
  { pattern: /timeout/i, message: 'La operación tardó demasiado. Intenta de nuevo.' },
  { pattern: /fetch/i, message: 'Error de conexión. Verifica tu internet.' },
  { pattern: /duplicate key/i, message: 'Este registro ya existe.' },
  { pattern: /violates foreign key/i, message: 'No se puede eliminar porque hay datos relacionados.' },
  { pattern: /violates not-null/i, message: 'Faltan campos obligatorios.' },
  { pattern: /permission denied/i, message: 'No tienes permiso para esta acción.' },
  { pattern: /row-level security/i, message: 'No tienes permiso para esta acción.' },
  { pattern: /jwt expired/i, message: 'Sesión expirada. Vuelve a iniciar sesión.' },
  { pattern: /invalid token/i, message: 'Sesión inválida. Vuelve a iniciar sesión.' },
  { pattern: /cross-organization/i, message: 'No tienes acceso a estos datos.' },
];

const FALLBACK_MESSAGE = 'Algo salió mal. Intenta de nuevo.';

/**
 * Extracts error code from various error formats
 */
function extractErrorCode(error: ErrorInput): string | null {
  if (!error) return null;
  
  if (typeof error === 'string') return null;
  
  if (typeof error === 'object') {
    const err = error as Record<string, unknown>;
    
    // Check for PostgreSQL error code
    if (err.code && typeof err.code === 'string') {
      return err.code;
    }
    
    // Check for HTTP status
    if (err.status && typeof err.status === 'number') {
      return String(err.status);
    }
    
    // Check nested error
    if (err.error && typeof err.error === 'object') {
      return extractErrorCode(err.error);
    }
  }
  
  return null;
}

/**
 * Extracts error message from various error formats
 */
function extractErrorMessage(error: ErrorInput): string {
  if (!error) return '';
  
  if (typeof error === 'string') return error;
  
  if (error instanceof Error) return error.message;
  
  if (typeof error === 'object') {
    const err = error as Record<string, unknown>;
    
    if (err.message && typeof err.message === 'string') {
      return err.message;
    }
    
    if (err.details && typeof err.details === 'string') {
      return err.details;
    }
    
    if (err.error_description && typeof err.error_description === 'string') {
      return err.error_description;
    }
  }
  
  return '';
}

/**
 * Converts technical errors to human-friendly messages in Spanish
 */
export function getHumanErrorMessage(error: ErrorInput): string {
  // Try to match by error code first
  const code = extractErrorCode(error);
  if (code && ERROR_MAP[code]) {
    return ERROR_MAP[code];
  }
  
  // Try to match by message patterns
  const message = extractErrorMessage(error);
  if (message) {
    for (const { pattern, message: humanMessage } of ERROR_PATTERNS) {
      if (pattern.test(message)) {
        return humanMessage;
      }
    }
  }
  
  // Return fallback
  return FALLBACK_MESSAGE;
}

/**
 * Checks if error is a network/connectivity error
 */
export function isNetworkError(error: ErrorInput): boolean {
  const message = extractErrorMessage(error);
  return /network|fetch|offline|connectivity/i.test(message);
}

/**
 * Checks if error is an authentication error
 */
export function isAuthError(error: ErrorInput): boolean {
  const code = extractErrorCode(error);
  const message = extractErrorMessage(error);
  
  return (
    code === '401' ||
    code === 'PGRST301' ||
    /jwt|token|session|auth|login/i.test(message)
  );
}

/**
 * Checks if error is a permission error
 */
export function isPermissionError(error: ErrorInput): boolean {
  const code = extractErrorCode(error);
  const message = extractErrorMessage(error);
  
  return (
    code === '403' ||
    code === '42501' ||
    /permission|denied|access|forbidden/i.test(message)
  );
}
