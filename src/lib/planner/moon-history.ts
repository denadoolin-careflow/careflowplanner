/**
 * Backwards-looking lunar timeline: one entry per day with the phase, zodiac
 * sign, element and day theme, so past rhythms can be revisited.
 */
import { addDays, format } from "date-fns";
import { getDayTheme, type DayTheme } from "@/lib/planner/day-theme";
import type { MoonPhase } from "@/lib/moon";

export interface MoonHistoryEntry {
  iso: string;
  date: Date;
  theme: DayTheme;
  /** True when this day starts a new phase compared to the previous day. */
  isPhaseStart: boolean;
  /** True for the four principal phases. */
  isPrincipal: boolean;
}

const PRINCIPAL: MoonPhase[] = ["new", "first-quarter", "full", "last-quarter"];

/** `days` entries ending on `end` (inclusive), newest first. */
export function buildMoonHistory(end: Date, days: number): MoonHistoryEntry[] {
  const out: MoonHistoryEntry[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(end, -i);
    const theme = getDayTheme(date);
    const prevPhase = getDayTheme(addDays(date, -1)).moonPhase;
    out.push({
      iso: format(date, "yyyy-MM-dd"),
      date,
      theme,
      isPhaseStart: prevPhase !== theme.moonPhase,
      isPrincipal: PRINCIPAL.includes(theme.moonPhase),
    });
  }
  return out;
}

export const HISTORY_RANGES = [30, 60, 90] as const;
export type HistoryRange = (typeof HISTORY_RANGES)[number];
