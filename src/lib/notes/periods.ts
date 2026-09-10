/**
 * Period keys for daily / weekly / monthly notes and how they nest.
 * Weeks start on Monday to match the planner grid.
 */
import {
  addDays, endOfMonth, endOfWeek, format, getDaysInMonth, parseISO,
  startOfMonth, startOfWeek,
} from "date-fns";
import type { Note, PeriodKind } from "@/lib/notes";

export const WEEK_STARTS_ON = 1 as const;

export const toISO = (d: Date) => format(d, "yyyy-MM-dd");
export const fromISO = (iso: string) => parseISO(`${iso}T12:00:00`);

export const dayKeyFor = (d: Date) => toISO(d);
export const weekKeyFor = (d: Date) => toISO(startOfWeek(d, { weekStartsOn: WEEK_STARTS_ON }));
export const monthKeyFor = (d: Date) => toISO(startOfMonth(d));

export const keyFor = (kind: PeriodKind, d: Date) =>
  kind === "daily" ? dayKeyFor(d) : kind === "weekly" ? weekKeyFor(d) : monthKeyFor(d);

export interface PeriodSpan { kind: PeriodKind; key: string; from: Date; to: Date; days: number }

/** Inclusive date span covered by a period note. */
export function spanFor(kind: PeriodKind, keyISO: string): PeriodSpan {
  const d = fromISO(keyISO);
  if (kind === "daily") return { kind, key: keyISO, from: d, to: d, days: 1 };
  if (kind === "weekly") {
    const from = startOfWeek(d, { weekStartsOn: WEEK_STARTS_ON });
    return { kind, key: keyISO, from, to: endOfWeek(d, { weekStartsOn: WEEK_STARTS_ON }), days: 7 };
  }
  const from = startOfMonth(d);
  return { kind, key: keyISO, from, to: endOfMonth(d), days: getDaysInMonth(d) };
}

export const spanDates = (s: PeriodSpan): string[] =>
  Array.from({ length: s.days }, (_, i) => toISO(addDays(s.from, i)));

/** Human title for a period key. */
export function periodTitle(kind: PeriodKind, keyISO: string, opts?: { short?: boolean }): string {
  const d = fromISO(keyISO);
  if (kind === "daily") return format(d, opts?.short ? "EEE, MMM d" : "EEEE, MMMM d, yyyy");
  if (kind === "weekly") return opts?.short ? `Week of ${format(d, "MMM d")}` : `Week of ${format(d, "MMM d, yyyy")}`;
  return format(d, opts?.short ? "MMM yyyy" : "MMMM yyyy");
}

export const PERIOD_LABEL: Record<PeriodKind, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" };

/** Parent chain (nearest first) for a period key: day → week → month. */
export function parentsOf(kind: PeriodKind, keyISO: string): { kind: PeriodKind; key: string }[] {
  const d = fromISO(keyISO);
  if (kind === "daily") return [{ kind: "weekly", key: weekKeyFor(d) }, { kind: "monthly", key: monthKeyFor(d) }];
  if (kind === "weekly") return [{ kind: "monthly", key: monthKeyFor(d) }];
  return [];
}

/** Child period keys: week → 7 days, month → its weeks (Mondays) and days. */
export function childrenKeys(kind: PeriodKind, keyISO: string): { kind: PeriodKind; keys: string[] } | null {
  const s = spanFor(kind, keyISO);
  if (kind === "daily") return null;
  if (kind === "weekly") return { kind: "daily", keys: spanDates(s) };
  const weeks = new Set<string>();
  for (const iso of spanDates(s)) weeks.add(weekKeyFor(fromISO(iso)));
  return { kind: "weekly", keys: Array.from(weeks).sort() };
}

/** Display title for any note, honouring period kinds. */
export function noteDisplayTitle(n: Pick<Note, "kind" | "date" | "title">, short = false): string {
  if ((n.kind === "daily" || n.kind === "weekly" || n.kind === "monthly") && n.date) {
    return periodTitle(n.kind, n.date, { short });
  }
  return n.title || "Untitled";
}
