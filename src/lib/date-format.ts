import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";

/**
 * Convert an ISO date (YYYY-MM-DD) into a relative human label:
 *  - Yesterday / Today / Tomorrow
 *  - Weekday name within the next/previous 6 days
 *  - "in N days" / "N days ago" within ~2 weeks
 *  - Otherwise a short month-day (and year if not current)
 */
export function formatRelativeDate(iso?: string | null, opts: { includeWeekday?: boolean } = {}): string {
  if (!iso) return "";
  const d = parseISO(iso);
  if (!isValid(d)) return iso;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = differenceInCalendarDays(d, today);

  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff <= 6) return format(d, "EEEE"); // Wednesday
  if (diff < -1 && diff >= -6) return `Last ${format(d, "EEEE")}`;
  if (diff > 6 && diff <= 13) return `Next ${format(d, "EEEE")}`;

  const sameYear = d.getFullYear() === today.getFullYear();
  const base = sameYear ? format(d, "MMM d") : format(d, "MMM d, yyyy");
  return opts.includeWeekday ? `${format(d, "EEE")}, ${base}` : base;
}
