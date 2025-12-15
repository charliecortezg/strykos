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
