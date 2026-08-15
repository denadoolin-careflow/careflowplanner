/**
 * Pairs a day's moon theme with the user's cycle phase so week/month/day
 * surfaces can show both without each one re-deriving cycle math.
 */
import { useMemo } from "react";
import { format } from "date-fns";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo, PHASE_META, type CyclePhase } from "@/lib/cycle";
import { getDayTheme, type DayTheme } from "@/lib/planner/day-theme";

export interface CycleDot {
  phase: CyclePhase;
  label: string;
  glyph: string;
  cycleDay: number;
  /** CSS color built from the shared --phase-* tokens. */
  color: string;
  /** Same hue at low alpha, for chip/band backgrounds. */
  soft: string;
  /** "Luteal, day 19" */
  text: string;
}

function toDot(info: ReturnType<typeof getPhaseInfo>): CycleDot | null {
  if (!info) return null;
  const meta = PHASE_META[info.phase];
  const label = meta?.label ?? info.label;
  return {
    phase: info.phase,
    label,
    glyph: meta?.glyph ?? info.glyph,
    cycleDay: info.cycleDay,
    color: `hsl(var(${info.tokenVar}))`,
    soft: `hsl(var(${info.tokenVar}) / 0.15)`,
    text: `${label}, day ${info.cycleDay}`,
  };
}

/** Cycle phase for one date, or null when tracking is off / no data. */
export function useCycleDot(date: Date): CycleDot | null {
  const { periods, settings } = useCycle();
  return useMemo(() => {
    if (!settings.enabled) return null;
    try { return toDot(getPhaseInfo(date, periods, settings)); } catch { return null; }
  }, [date, periods, settings]);
}

/** Cycle phases for many dates, keyed by yyyy-MM-dd. */
export function useCycleDots(dates: Date[]): Map<string, CycleDot> {
  const { periods, settings } = useCycle();
  const keys = dates.map(d => format(d, "yyyy-MM-dd")).join(",");
  return useMemo(() => {
    const map = new Map<string, CycleDot>();
    if (!settings.enabled) return map;
    for (const d of dates) {
      try {
        const dot = toDot(getPhaseInfo(d, periods, settings));
        if (dot) map.set(format(d, "yyyy-MM-dd"), dot);
      } catch { /* skip */ }
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys, periods, settings]);
}

/** Moon theme + cycle phase for a single day. */
export function useDayRhythm(date: Date): { theme: DayTheme; cycle: CycleDot | null } {
  const theme = useMemo(() => getDayTheme(date), [date]);
  const cycle = useCycleDot(date);
  return { theme, cycle };
}
