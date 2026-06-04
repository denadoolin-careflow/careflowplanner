import type { BucketSeason } from "./types";

export const SEASON_META: Record<Exclude<BucketSeason, "all">, {
  label: string; emoji: string; gradient: string; accent: string;
  startMonth: number; startDay: number;
  endMonth: number; endDay: number;
  focus: string[];
  quote: string;
}> = {
  spring: {
    label: "Spring", emoji: "🌱",
    gradient: "from-emerald-300/40 via-lime-200/30 to-amber-100/20",
    accent: "text-emerald-600",
    startMonth: 2, startDay: 20, endMonth: 5, endDay: 20,
    focus: ["Renewal", "Planting", "Cleaning", "Fresh starts"],
    quote: "Soft beginnings, slow blooms.",
  },
  summer: {
    label: "Summer", emoji: "☀️",
    gradient: "from-amber-200/50 via-yellow-100/40 to-sky-100/30",
    accent: "text-amber-600",
    startMonth: 5, startDay: 21, endMonth: 8, endDay: 22,
    focus: ["Family adventures", "Outdoor activities", "Memory making", "Travel"],
    quote: "Long days, warm nights, endless light.",
  },
  autumn: {
    label: "Autumn", emoji: "🍂",
    gradient: "from-orange-300/40 via-amber-300/30 to-rose-200/20",
    accent: "text-orange-600",
    startMonth: 8, startDay: 23, endMonth: 11, endDay: 20,
    focus: ["Gratitude", "Routines", "Harvest", "Cozy living"],
    quote: "Pause and gather what you've grown.",
  },
  winter: {
    label: "Winter", emoji: "❄️",
    gradient: "from-sky-200/40 via-indigo-200/30 to-violet-200/20",
    accent: "text-sky-700",
    startMonth: 11, startDay: 21, endMonth: 2, endDay: 19,
    focus: ["Rest", "Reflection", "Hibernation", "Hearth & home"],
    quote: "Soft stillness, slow magic.",
  },
};

/** Determine the current meteorological-ish season for a given date. */
export function seasonFor(date: Date = new Date()): Exclude<BucketSeason, "all"> {
  const m = date.getMonth(); const d = date.getDate();
  if (m === 2 && d >= 20 || m === 3 || m === 4 || (m === 5 && d <= 20)) return "spring";
  if (m === 5 && d >= 21 || m === 6 || m === 7 || (m === 8 && d <= 22)) return "summer";
  if (m === 8 && d >= 23 || m === 9 || m === 10 || (m === 11 && d <= 20)) return "autumn";
  return "winter";
}

/** Days remaining until the next season transition. */
export function daysLeftInSeason(date: Date = new Date()): { days: number; nextSeason: Exclude<BucketSeason, "all">; nextDate: Date } {
  const s = seasonFor(date);
  const order: Exclude<BucketSeason, "all">[] = ["winter","spring","summer","autumn"];
  const idx = order.indexOf(s);
  const next = order[(idx + 1) % order.length];
  const meta = SEASON_META[next];
  const year = date.getFullYear();
  let nextDate = new Date(year, meta.startMonth, meta.startDay);
  if (nextDate <= date) nextDate = new Date(year + 1, meta.startMonth, meta.startDay);
  const days = Math.ceil((nextDate.getTime() - date.getTime()) / 86400000);
  return { days, nextSeason: next, nextDate };
}

/** Compute a person's age on a given target date given a birth date string. */
export function ageOn(birthIso: string, target: Date = new Date()): number {
  const b = new Date(birthIso + "T00:00:00");
  let age = target.getFullYear() - b.getFullYear();
  const m = target.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && target.getDate() < b.getDate())) age -= 1;
  return age;
}

/** Days from today until the next occurrence of an MM-DD anniversary. */
export function daysUntilAnnual(monthDay: string, today: Date = new Date()): number {
  const [m, d] = monthDay.split("-").map(Number);
  const y = today.getFullYear();
  let next = new Date(y, m - 1, d);
  if (next < new Date(y, today.getMonth(), today.getDate())) next = new Date(y + 1, m - 1, d);
  return Math.ceil((next.getTime() - today.getTime()) / 86400000);
}

export function daysUntilDate(iso: string, today: Date = new Date()): number {
  const target = new Date(iso + "T00:00:00");
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.ceil((target.getTime() - t0.getTime()) / 86400000);
}

/** Seeded prep timeline (used for new holiday plans). */
export const DEFAULT_HOLIDAY_TIMELINE: Array<{ daysBefore: number; title: string }> = [
  { daysBefore: 90, title: "Set budget" },
  { daysBefore: 60, title: "Gift planning" },
  { daysBefore: 30, title: "Purchase gifts" },
  { daysBefore: 14, title: "Wrap presents" },
  { daysBefore: 7,  title: "Meal planning" },
  { daysBefore: 1,  title: "Final preparation" },
];