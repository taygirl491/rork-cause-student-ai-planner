/**
 * Format a Date to a YYYY-MM-DD string using LOCAL timezone components.
 *
 * Never use date.toISOString().split('T')[0] — toISOString() converts to UTC
 * first, which shifts the date by ±1 day for users not on UTC.
 */
export const formatLocalDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Format a Date to a local datetime string "YYYY-MM-DDTHH:mm" (no Z suffix).
 *
 * Use this instead of toISOString() when storing a user-selected datetime
 * that must be interpreted in local time (e.g. custom reminder dates).
 * toISOString() converts to UTC first, which shifts the time for non-UTC users.
 */
export const formatLocalDateTime = (date: Date): string => {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${d}T${h}:${mi}`;
};

/**
 * Parse a YYYY-MM-DD string into a local-timezone Date (midnight local).
 *
 * Never use new Date(dateString) with an ISO date string — JavaScript
 * interprets YYYY-MM-DD as UTC midnight, which lands on the previous day
 * for users west of UTC.
 */
export const parseLocalDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
};

/**
 * Formats a Date object into a 12-hour time string with AM/PM.
 * Example: Date(14:30) -> "2:30 PM"
 */
export const formatTime12H = (date: Date): string => {
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12; // Convert 0 to 12
  return `${hours}:${minutes} ${ampm}`;
};

/**
 * Formats a 24-hour time string (HH:mm) into a 12-hour time string with AM/PM.
 * Example: "14:30" -> "2:30 PM"
 */
export const formatStringTime12H = (timeStr?: string): string => {
  if (!timeStr) return '';
  
  // Try to parse HH:mm format
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr; // Return as is if format unknown
  
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].padStart(2, '0');
  
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12; // Convert 0 to 12
  
  return `${hours}:${minutes} ${ampm}`;
};

/**
 * Parses a 12-hour time string (h:mm AM/PM) into a Date object.
 * Used when editing existing entries.
 */
export const parseTime12H = (timeStr?: string): Date => {
  if (!timeStr) return new Date();
  
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return new Date();
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
};
