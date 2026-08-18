/**
 * Date references for the note/journal editor's `@` picker.
 * Typing `@today`, `@tomorrow`, `@friday`, `@aug 20` or `@2026-08-20`
 * offers a chip that links straight to that planner day.
 */
import {
  addDays, format, isValid, parse, startOfDay, isBefore,
} from "date-fns";

export interface DateRef {
  /** Stable id used by the suggestion list. */
  id: string;
  /** yyyy-MM-dd */
  iso: string;
  /** Chip text, e.g. "today" or "Aug 20". */
  label: string;
  /** Secondary line, e.g. "Tue, Aug 18". */
  detail: string;
}

export const plannerHref = (iso: string) => `/planner/${iso}`;

const mk = (date: Date, label: string): DateRef => {
  const iso = format(date, "yyyy-MM-dd");
  return { id: `date:${iso}:${label}`, iso, label, detail: format(date, "EEE, MMM d, yyyy") };
};

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const FORMATS = [
  "yyyy-MM-dd", "MM/dd/yyyy", "M/d/yyyy", "M/d", "MMM d", "MMMM d",
  "MMM d yyyy", "MMMM d yyyy", "d MMM", "d MMMM",
];

/** Parse a free-typed date fragment; returns null when nothing sensible matches. */
export function parseDateQuery(query: string, today = new Date()): Date | null {
  const q = query.trim().toLowerCase().replace(/,/g, "");
  if (!q) return null;

  if (q === "today") return today;
  if (q === "tomorrow") return addDays(today, 1);
  if (q === "yesterday") return addDays(today, -1);

  const rel = q.match(/^in (\d{1,3}) days?$/);
  if (rel) return addDays(today, Number(rel[1]));

  const wd = WEEKDAYS.findIndex(d => d === q || (q.length >= 3 && d.startsWith(q)));
  if (wd >= 0) {
    const diff = (wd - today.getDay() + 7) % 7 || 7;
    return addDays(today, diff);
  }

  const cleaned = q.replace(/(\d+)(st|nd|rd|th)\b/g, "$1");
  for (const f of FORMATS) {
    const d = parse(cleaned, f, today);
    if (isValid(d)) {
      // Bare month/day inputs land in the past for late-year queries — roll forward.
      if (!/\d{4}/.test(cleaned) && isBefore(d, startOfDay(addDays(today, -180)))) {
        return new Date(d.getFullYear() + 1, d.getMonth(), d.getDate());
      }
      return d;
    }
  }
  return null;
}

/**
 * Suggestions for the `@` menu. With no query this offers today, tomorrow
 * and the coming week; with a query it parses it and offers the match first.
 */
export function dateRefSuggestions(query: string, today = new Date()): DateRef[] {
  const q = query.trim().toLowerCase();
  const out: DateRef[] = [];
  const seen = new Set<string>();
  const push = (r: DateRef) => {
    if (seen.has(r.iso)) return;
    seen.add(r.iso);
    out.push(r);
  };

  const parsed = parseDateQuery(q, today);
  if (parsed) push(mk(parsed, format(parsed, "MMM d")));

  const base: DateRef[] = [
    mk(today, "today"),
    mk(addDays(today, 1), "tomorrow"),
    mk(addDays(today, -1), "yesterday"),
  ];
  for (let i = 2; i <= 8; i++) base.push(mk(addDays(today, i), format(addDays(today, i), "EEE MMM d")));

  for (const r of base) {
    if (!q || r.label.toLowerCase().includes(q) || r.detail.toLowerCase().includes(q) || r.iso.includes(q)) {
      push(r);
    }
  }
  return out.slice(0, 10);
}

const HREF_RE = /\/planner\/(\d{4}-\d{2}-\d{2})/g;
const ISO_RE = /\b(\d{4}-\d{2}-\d{2})\b/g;

/** Every planner day a note/journal body points at. */
export function extractPlannerDates(body?: string | null): string[] {
  const src = body ?? "";
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = HREF_RE.exec(src))) found.add(m[1]);
  while ((m = ISO_RE.exec(src))) found.add(m[1]);
  return [...found];
}

export const referencesDate = (body: string | null | undefined, iso: string) =>
  extractPlannerDates(body).includes(iso);
