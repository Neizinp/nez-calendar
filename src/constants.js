/**
 * Constants - Shared application constants
 * Single source of truth for types, patterns, and display values
 */

/**
 * Event type definitions with labels and colors
 */
export const EVENT_TYPES = {
  personal: { label: 'Personal', color: '#8b5cf6' },
  work: { label: 'Work', color: '#3b82f6' },
  birthday: { label: 'Birthday', color: '#ec4899' },
  holiday: { label: '🇸🇪 Holidays', color: '#22c55e' },
  other: { label: 'Other', color: '#6b7280' }
};

/**
 * Recurrence pattern options
 */
export const RECURRENCE_PATTERNS = {
  none: 'None',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly'
};

/**
 * Available event colors for picker
 */
export const EVENT_COLORS = [
  '#8b5cf6', // purple
  '#3b82f6', // blue
  '#22c55e', // green
  '#eab308', // yellow
  '#ef4444', // red
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

/**
 * Day abbreviations (Monday first)
 */
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Full day names (Monday first)
 */
export const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * Month names
 */
export const MONTHS = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'
];

/**
 * Month abbreviations
 */
export const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];
