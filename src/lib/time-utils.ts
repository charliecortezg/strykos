import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Parse a date-only string "YYYY-MM-DD" as a LOCAL date
 * avoiding timezone conversion issues (fixes the "previous day" bug)
 */
export function parseDateOnly(dateString: string | null | undefined): Date {
  if (!dateString) return new Date();
  
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day || 1);
}

/**
 * Format a "YYYY-MM-DD" string to month/year without timezone bug
 */
export function formatMonthYear(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  const date = parseDateOnly(dateString);
  return format(date, 'MMMM yyyy', { locale: es });
}

/**
 * Format a "YYYY-MM-DD" string to short month/year (e.g., "Ene 2026")
 */
export function formatMonthYearShort(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  const date = parseDateOnly(dateString);
  return format(date, 'MMM yyyy', { locale: es });
}

/**
 * Get the current month as YYYY-MM-01 format for payment_month default
 */
export function getCurrentMonthValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

/**
 * Convert 24h time string to 12h format with AM/PM
 * @param time24 - Time in HH:MM or HH:MM:SS format
 * @returns Time in h:MM AM/PM format
 */
export function formatTime12h(time24: string | null | undefined): string {
  if (!time24) return '—';
  
  const [hoursStr, minutesStr] = time24.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = minutesStr || '00';
  
  if (isNaN(hours)) return '—';
  
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12; // Convert 0 to 12 for midnight
  
  return `${hours}:${minutes.padStart(2, '0')} ${period}`;
}

/**
 * Format a time range in 12h format
 * @param start - Start time in 24h format
 * @param end - End time in 24h format
 * @returns Formatted time range
 */
export function formatTimeRange12h(
  start: string | null | undefined, 
  end: string | null | undefined
): string {
  if (!start || !end) return '—';
  return `${formatTime12h(start)} - ${formatTime12h(end)}`;
}

/**
 * Parse time input value (from HTML time input) to 24h format
 * HTML time inputs already return 24h format, this just validates
 */
export function parseTimeInput(value: string): string {
  return value; // HTML time input already returns HH:MM format
}
