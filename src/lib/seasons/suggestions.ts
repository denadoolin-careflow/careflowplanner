import { format } from "date-fns";
import {
  CAPACITY_META, seasonsInMonth, type FocusArea, type MomCapacity, type ZodiacSeason,
} from "./zodiac-seasons";
import { holidayRunway } from "./holiday-runway";

export interface MonthSuggestion {
  id: string;
  title: string;
  focus: FocusArea;
  tier: "essential" | "helpful" | "optional";
  reason: string;
  /** optional target date (YYYY-MM-DD) for holiday prep items */
  date?: string;
}

const rank = { essential: 0, helpful: 1, optional: 2 } as const;

/**
 * Capacity- and focus-aware suggestions for a month.
 * Always capped, never nagging: survival mode only ever shows essentials.
 */
export function suggestionsForMonth(opts: {
  cursor: Date;
  capacity: MomCapacity;
  focusAreas: FocusArea[];
  added: string[];
  dismissed: string[];
}): MonthSuggestion[] {
  const { cursor, capacity, focusAreas, added, dismissed } = opts;
  const seasons: ZodiacSeason[] = seasonsInMonth(cursor).map(s => s.season);
  const pool: MonthSuggestion[] = [];

  for (const s of seasons) {
    for (const idea of s.ideas) {
      pool.push({
        id: `${s.key}:${idea.title}`,
        title: idea.title,
        focus: idea.focus,
        tier: idea.tier,
        reason: `${s.sign} season — ${s.theme.toLowerCase()}`,
      });
    }
  }

  // Holiday runway items that should start during this month
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  for (const h of holidayRunway(monthStart, 150)) {
    const startDate = new Date(`${h.date}T00:00:00`);
    startDate.setDate(startDate.getDate() - (h.daysUntil - h.startsIn));
    if (startDate > monthEnd) continue;
    pool.push({
      id: `holiday:${h.date}`,
      title: `Start preparing for ${h.name}`,
      focus: "holidays",
      tier: h.size === "big" ? "essential" : "helpful",
      reason: `${h.name} is ${h.daysUntil} day${h.daysUntil === 1 ? "" : "s"} away`,
      date: format(monthStart, "yyyy-MM-dd"),
    });
  }

  const seen = new Set<string>();
  const filtered = pool
    .filter(s => !added.includes(s.id) && !dismissed.includes(s.id))
    .filter(s => (seen.has(s.title) ? false : (seen.add(s.title), true)))
    .filter(s => (capacity === "survival" ? s.tier === "essential" : true))
    .filter(s => (capacity === "full" ? s.tier !== "optional" : true))
    .sort((a, b) => {
      const fa = focusAreas.includes(a.focus) ? 0 : 1;
      const fb = focusAreas.includes(b.focus) ? 0 : 1;
      if (fa !== fb) return fa - fb;
      return rank[a.tier] - rank[b.tier];
    });

  return filtered.slice(0, CAPACITY_META[capacity].maxSuggestions);
}
