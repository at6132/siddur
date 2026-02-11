/**
 * Local date utilities – use local timezone for all user-facing "calendar day" logic
 * (streaks, "today", date keys in storage). Avoids UTC causing off-by-one days.
 */

/**
 * Format a date as YYYY-MM-DD in the device's local timezone.
 * Use this everywhere we need a calendar-day key (storage, streaks, "today" checks).
 */
export function toLocalDateString(date: Date = new Date()): string {
  const d = date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
