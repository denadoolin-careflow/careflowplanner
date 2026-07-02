import { addDays, addMonths, addWeeks, addYears, format, isAfter, isBefore, parseISO } from "date-fns";
import type { Appointment, RecurrenceRule } from "./types";

function iso(d: Date) { return format(d, "yyyy-MM-dd"); }

/**
 * Expand a recurrence rule into concrete ISO date strings between two
 * inclusive bounds. Safe to call in render — caps at 366 occurrences.
 */
export function expandRecurrence(startISO: string, rule: RecurrenceRule, rangeStart: Date, rangeEnd: Date): string[] {
  const out: string[] = [];
  if (!startISO || !rule?.freq) return out;
  const interval = Math.max(1, rule.interval ?? 1);
  const untilDate = rule.until ? parseISO(rule.until) : null;
  const maxCount = Math.min(rule.count ?? 366, 366);
  let cursor = parseISO(startISO);
  let steps = 0;
  while (out.length < maxCount && steps < 800) {
    if (untilDate && isAfter(cursor, untilDate)) break;
    if (isAfter(cursor, rangeEnd)) break;
    if (!isBefore(cursor, rangeStart)) {
      if (rule.freq === "weekly" && rule.byWeekday?.length) {
        // pick actual weekday matches inside this week
        for (const wd of rule.byWeekday) {
          const delta = (wd - cursor.getDay() + 7) % 7;
          const d = addDays(cursor, delta);
          if (!isBefore(d, rangeStart) && !isAfter(d, rangeEnd) &&
              (!untilDate || !isAfter(d, untilDate))) {
            out.push(iso(d));
          }
        }
      } else {
        out.push(iso(cursor));
      }
    }
    steps++;
    switch (rule.freq) {
      case "daily":   cursor = addDays(cursor, interval); break;
      case "weekly":  cursor = addWeeks(cursor, interval); break;
      case "monthly": cursor = addMonths(cursor, interval); break;
      case "yearly":  cursor = addYears(cursor, interval); break;
    }
  }
  return Array.from(new Set(out));
}

/** Return synthetic appointment occurrences (id suffix :occ:<date>) for a date range. */
export function expandAppointments(appts: Appointment[], rangeStart: Date, rangeEnd: Date): Appointment[] {
  const out: Appointment[] = [];
  for (const a of appts) {
    if (!a.recurrenceRule) { out.push(a); continue; }
    const dates = expandRecurrence(a.date, a.recurrenceRule, rangeStart, rangeEnd);
    // Always include base occurrence first
    for (const d of dates) {
      if (d === a.date) { out.push(a); continue; }
      out.push({ ...a, id: `${a.id}:occ:${d}`, date: d });
    }
    // Include the base if it fell outside expansion but inside range
    const base = parseISO(a.date);
    if (!dates.includes(a.date) && !isBefore(base, rangeStart) && !isAfter(base, rangeEnd)) {
      out.push(a);
    }
  }
  return out;
}

export function describeRule(rule?: RecurrenceRule): string {
  if (!rule) return "Does not repeat";
  const n = rule.interval ?? 1;
  const base = { daily: "day", weekly: "week", monthly: "month", yearly: "year" }[rule.freq];
  const stem = n === 1 ? `Every ${base}` : `Every ${n} ${base}s`;
  const until = rule.until ? ` until ${format(parseISO(rule.until), "MMM d, yyyy")}` : "";
  const cnt = rule.count ? ` (${rule.count}×)` : "";
  return `${stem}${until}${cnt}`;
}