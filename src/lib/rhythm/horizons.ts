/**
 * Five-horizon Plan · Grow · Care · Let go framework.
 * Day → time of day, Week → weekday, Month → Moon, Season → weeks into the
 * astronomical season, Year → the season itself.
 */
import { addDays, addMonths, addWeeks, addYears, differenceInCalendarDays, format, startOfMonth, startOfWeek } from "date-fns";
import type { RhythmPhase } from "@/lib/planner/rhythm-phase";
import { lunarRhythmAt } from "@/lib/cosmic/lunar-rhythm";

export type Horizon = "day" | "week" | "month" | "season" | "year";
export const HORIZONS: Horizon[] = ["day", "week", "month", "season", "year"];
export const HORIZON_LABEL: Record<Horizon, string> = { day: "Day", week: "Week", month: "Month", season: "Season", year: "Year" };
export const PHASES: RhythmPhase[] = ["plan", "grow", "care", "letgo"];
export const PHASE_LABEL: Record<RhythmPhase, string> = { plan: "Plan", grow: "Grow", care: "Care", letgo: "Let go" };
export const PHASE_CAPTION: Record<RhythmPhase, string> = {
  plan: "Prepare · organize · set intentions",
  grow: "Build · progress · nourish",
  care: "Support · nurture · be present",
  letgo: "Release · rest · make space",
};

interface PhaseDef { name: string; when: string; prompts: string[] }
export const HORIZON_PHASES: Record<Horizon, Record<RhythmPhase, PhaseDef>> = {
  day: {
    plan: { name: "Morning Set", when: "Until 11am", prompts: ["What matters most today?", "What are my top 3?"] },
    grow: { name: "Afternoon Flow", when: "11am – 3pm", prompts: ["What am I moving forward right now?", "What small step nudges my focus goal?"] },
    care: { name: "Evening Tend", when: "3pm – 7pm", prompts: ["How is my energy?", "Who or what needs tending?"] },
    letgo: { name: "Night Exhale", when: "After 7pm", prompts: ["What can I set down tonight?", "What am I grateful for?"] },
  },
  week: {
    plan: { name: "Monday Intention", when: "Monday", prompts: ["My intention for this week", "My top 3 for the week"] },
    grow: { name: "Momentum", when: "Tuesday – Thursday", prompts: ["Where am I making progress?", "What needs more of my attention?"] },
    care: { name: "Nurture", when: "Friday – Saturday", prompts: ["How have I cared for myself and others?", "What would feel restoring?"] },
    letgo: { name: "Rest & Review", when: "Sunday", prompts: ["What went well?", "What will I drop or move?"] },
  },
  month: {
    plan: { name: "New Moon Seed", when: "New → first quarter", prompts: ["What seed am I planting this month?", "What first step starts it?"] },
    grow: { name: "Waxing Action", when: "First quarter → full", prompts: ["What is growing?", "Where do I need to push gently?"] },
    care: { name: "Full Moon Peak", when: "Full → last quarter", prompts: ["What has come to light?", "What deserves celebration or care?"] },
    letgo: { name: "Waning Release", when: "Last quarter → new", prompts: ["What is complete?", "What am I releasing before the next new moon?"] },
  },
  season: {
    plan: { name: "Season Opening", when: "Weeks 1–3", prompts: ["My theme for this season", "Which life areas get my focus?"] },
    grow: { name: "Peak Execution", when: "Weeks 4–7", prompts: ["What's the big push this season?", "What habit am I building?"] },
    care: { name: "Harvest & Health", when: "Weeks 8–10", prompts: ["What am I harvesting?", "How is my body and home?"] },
    letgo: { name: "Seasonal Reset", when: "Final weeks", prompts: ["What do I compost from this season?", "What carries into the next?"] },
  },
  year: {
    plan: { name: "Winter Vision", when: "Winter", prompts: ["My word or vision for the year", "Dreams for each life area"] },
    grow: { name: "Spring Bloom", when: "Spring", prompts: ["What is ready to bloom?", "What new thing am I starting?"] },
    care: { name: "Summer Vitality", when: "Summer", prompts: ["How am I enjoying this year?", "What needs nourishing?"] },
    letgo: { name: "Autumn Harvest", when: "Autumn", prompts: ["What did this year give me?", "What am I ready to let go of?"] },
  },
};

/* ------------------------------ seasons ------------------------------ */
export type SeasonName = "spring" | "summer" | "autumn" | "winter";
export const SEASON_LABEL: Record<SeasonName, string> = { spring: "Spring", summer: "Summer", autumn: "Autumn", winter: "Winter" };
// Approximate equinox / solstice dates (month index, day).
const SEASON_STARTS: { s: SeasonName; m: number; d: number }[] = [
  { s: "spring", m: 2, d: 20 }, { s: "summer", m: 5, d: 21 }, { s: "autumn", m: 8, d: 22 }, { s: "winter", m: 11, d: 21 },
];
const noon = (y: number, m: number, d: number) => new Date(y, m, d, 12);

export interface SeasonSpan { season: SeasonName; start: Date; end: Date; key: string }
/** Astronomical (northern) season containing the date. Winter keyed by the year it starts. */
export function seasonFor(date: Date): SeasonSpan {
  const d = noon(date.getFullYear(), date.getMonth(), date.getDate());
  const y = d.getFullYear();
  const starts = [
    { s: "winter" as SeasonName, at: noon(y - 1, 11, 21) },
    ...SEASON_STARTS.map(x => ({ s: x.s, at: noon(y, x.m, x.d) })),
    { s: "spring" as SeasonName, at: noon(y + 1, 2, 20) },
  ];
  for (let i = starts.length - 2; i >= 0; i--) {
    if (d >= starts[i].at) {
      const start = starts[i].at;
      const end = addDays(starts[i + 1].at, -1);
      return { season: starts[i].s, start, end, key: `${start.getFullYear()}-${starts[i].s}` };
    }
  }
  /* istanbul ignore next */
  return { season: "winter", start: starts[0].at, end: addDays(starts[1].at, -1), key: `${y - 1}-winter` };
}

/* --------------------------- current phase --------------------------- */
export function phaseFor(horizon: Horizon, date: Date): RhythmPhase {
  if (horizon === "day") {
    const h = date.getHours();
    return h < 11 ? "plan" : h < 15 ? "grow" : h < 19 ? "care" : "letgo";
  }
  if (horizon === "week") {
    const wd = date.getDay(); // 0 Sun
    return wd === 1 ? "plan" : wd >= 2 && wd <= 4 ? "grow" : wd === 0 ? "letgo" : "care";
  }
  if (horizon === "month") return lunarRhythmAt(date);
  if (horizon === "season") {
    const s = seasonFor(date);
    const days = differenceInCalendarDays(date, s.start);
    return days < 21 ? "plan" : days < 49 ? "grow" : days < 70 ? "care" : "letgo";
  }
  const s = seasonFor(date).season;
  return s === "winter" ? "plan" : s === "spring" ? "grow" : s === "summer" ? "care" : "letgo";
}

/* ------------------------- keys & navigation ------------------------- */
export type HorizonNoteKind = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
export const HORIZON_NOTE_KIND: Record<Horizon, HorizonNoteKind> = { day: "daily", week: "weekly", month: "monthly", season: "quarterly", year: "yearly" };

export function horizonKey(horizon: Horizon, date: Date): string {
  if (horizon === "day") return format(date, "yyyy-MM-dd");
  if (horizon === "week") return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
  if (horizon === "month") return format(startOfMonth(date), "yyyy-MM-dd");
  if (horizon === "season") return format(seasonFor(date).start, "yyyy-MM-dd");
  return `${date.getFullYear()}-01-01`;
}

export function horizonTitle(horizon: Horizon, date: Date): string {
  if (horizon === "day") return format(date, "EEEE, MMMM d");
  if (horizon === "week") return `Week of ${format(startOfWeek(date, { weekStartsOn: 1 }), "MMM d")}`;
  if (horizon === "month") return format(date, "MMMM yyyy");
  if (horizon === "season") { const s = seasonFor(date); return `${SEASON_LABEL[s.season]} ${s.start.getFullYear()}`; }
  return String(date.getFullYear());
}

export function stepHorizon(horizon: Horizon, date: Date, dir: 1 | -1): Date {
  if (horizon === "day") return addDays(date, dir);
  if (horizon === "week") return addWeeks(date, dir);
  if (horizon === "month") return addMonths(date, dir);
  if (horizon === "year") return addYears(date, dir);
  const s = seasonFor(date);
  return dir === 1 ? addDays(s.end, 1) : addDays(s.start, -1);
}

/* ------------------------------ reminders ---------------------------- */
export const isWeeklyResetDay = (date: Date) => date.getDay() === 0;
/** Last two weeks of a season, or the first week of the next. */
export function isSeasonReviewWindow(date: Date): boolean {
  const s = seasonFor(date);
  return differenceInCalendarDays(s.end, date) < 14 || differenceInCalendarDays(date, s.start) < 7;
}

/* --------------------------- note sections --------------------------- */
export const sectionHeading = (horizon: Horizon, phase: RhythmPhase) =>
  `## ${PHASE_LABEL[phase]} · ${HORIZON_PHASES[horizon][phase].name}`;

/** Replace (or append) a "## heading" section in a markdown body. */
export function upsertSection(body: string, heading: string, text: string): string {
  const lines = (body || "").split("\n");
  const start = lines.findIndex(l => l.trim() === heading);
  const block = [heading, text.trim(), ""];
  if (start === -1) {
    const base = (body || "").trimEnd();
    return `${base ? base + "\n\n" : ""}${block.join("\n")}`;
  }
  let end = start + 1;
  while (end < lines.length && !/^##\s/.test(lines[end])) end++;
  return [...lines.slice(0, start), ...block, ...lines.slice(end)].join("\n").replace(/\n{3,}/g, "\n\n");
}

export function readSection(body: string, heading: string): string {
  const lines = (body || "").split("\n");
  const start = lines.findIndex(l => l.trim() === heading);
  if (start === -1) return "";
  let end = start + 1;
  while (end < lines.length && !/^##\s/.test(lines[end])) end++;
  return lines.slice(start + 1, end).join("\n").trim();
}
