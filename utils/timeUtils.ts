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
