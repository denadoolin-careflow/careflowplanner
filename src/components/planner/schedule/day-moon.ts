import { MOON_INFO, getMoonPhase } from "@/lib/moon";
import { lunarRhythmAt } from "@/lib/cosmic/lunar-rhythm";
import type { RhythmPhase } from "@/lib/planner/rhythm-phase";

export interface DayMoon { label: string; rhythm: RhythmPhase; turning: boolean }

/** One moon reading per day (taken at local noon) shared by every planner schedule style. */
export function dayMoon(d: Date): DayMoon {
  const noon = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  const phase = getMoonPhase(noon);
  return {
    label: MOON_INFO[phase].label,
    rhythm: lunarRhythmAt(noon),
    turning: phase === "new" || phase === "first-quarter" || phase === "full" || phase === "last-quarter",
  };
}
