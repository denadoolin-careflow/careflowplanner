import { MoonPhase, NextMoonQuarter, SearchMoonQuarter } from "astronomy-engine";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { bodyLongitude } from "./astro/bodies";
import { norm } from "./sky";
import type { RhythmPhase } from "@/lib/planner/rhythm-phase";

export const LUNAR_RHYTHM = {
  plan: { label: "Plan", glyph: "🌑", moon: "New moon", invitation: "Set intentions, map the week, decide what matters." },
  grow: { label: "Grow", glyph: "🌓", moon: "First quarter", invitation: "Build momentum with one manageable step on a project or habit." },
  care: { label: "Care", glyph: "🌕", moon: "Full moon", invitation: "Tend to people, home and yourself. Connection over output." },
  letgo: { label: "Let go", glyph: "🌗", moon: "Last quarter", invitation: "Clear the list, drop what's not yours, rest before the next round." },
} satisfies Record<RhythmPhase, { label: string; glyph: string; moon: string; invitation: string }>;
const QUARTER_PHASES: RhythmPhase[] = ["plan", "grow", "care", "letgo"];

/** Short planning guide for each phase, shown from the Today header. */
export const PHASE_GUIDE: Record<RhythmPhase, { focus: string; actions: string[]; avoid: string }> = {
  plan: {
    focus: "A fresh start. Get clear on what matters this cycle and set a few gentle intentions.",
    actions: ["Write one intention for the month", "Pick a life-area goal and its first step", "Sketch the week ahead"],
    avoid: "Overcommitting or starting everything at once.",
  },
  grow: {
    focus: "Energy is building. Take steady action and keep momentum on what you started.",
    actions: ["Schedule focused work blocks", "Make progress on one project", "Keep up a habit you're building"],
    avoid: "Second-guessing your plan before it has a chance.",
  },
  care: {
    focus: "Things come to light. Tend to people, home and yourself, and celebrate what's working.",
    actions: ["Check in with someone you care for", "Review progress and adjust", "Plan a restful or nourishing moment"],
    avoid: "Pushing for output when you need connection or rest.",
  },
  letgo: {
    focus: "Wind down. Clear what's finished, release what isn't yours, and rest before the next cycle.",
    actions: ["Clear or reschedule old tasks", "Declutter one small space", "Journal what you're letting go of"],
    avoid: "Taking on new big commitments.",
  },
};

export function lunarRhythmAt(date: Date): RhythmPhase {
  const quarter = Math.floor(MoonPhase(date) / 90) % 4;
  return QUARTER_PHASES[quarter] ?? "plan";
}

/** Exact principal phases, including a second new/full moon in a calendar month. */
export function monthRhythmMoments(month: Date) {
  if (!Number.isFinite(month.getTime())) return [];
  const end = endOfMonth(month);
  let quarter = SearchMoonQuarter(startOfMonth(month));
  const moments = [];
  while (quarter.time.date <= end) {
    const date = quarter.time.date;
    const phase = QUARTER_PHASES[quarter.quarter] ?? "plan";
    const lon = bodyLongitude("Moon", date);
    const node = bodyLongitude("NorthNode", date);
    const distance = Math.abs(norm(lon - node + 180) - 180);
    const eclipseSeason = (phase === "plan" || phase === "care") && Math.min(distance, 180 - distance) <= (phase === "plan" ? 18 : 12);
    moments.push({ id: `${phase}-${format(date, "yyyy-MM-dd")}`, date, phase, eclipseSeason, info: LUNAR_RHYTHM[phase] });
    quarter = NextMoonQuarter(quarter);
  }
  return moments;
}

export function cosmicDateLinks(date: Date) {
  const iso = format(date, "yyyy-MM-dd");
  return {
    tarot: `/cosmic-flow/tarot?date=${iso}`,
    sky: `/cosmic-flow/sky?date=${iso}`,
    moon: `/cosmic-flow/moon?date=${iso}`,
    lunations: `/cosmic-flow/sky?date=${iso}&tab=lunations`,
    planner: `/planner/${iso}?range=month`,
  };
}

export function cosmicDateFromParam(value: string | null): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T12:00:00`);
    if (Number.isFinite(date.getTime()) && format(date, "yyyy-MM-dd") === value) return date;
  }
  return new Date();
}