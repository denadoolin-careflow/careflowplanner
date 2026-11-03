import { MoonPhase } from "astronomy-engine";
import { lunarRhythmAt } from "@/lib/cosmic/lunar-rhythm";
import type { RhythmPhase } from "@/lib/planner/rhythm-phase";

export interface DayMoon { label: string; rhythm: RhythmPhase; turning: boolean }

const TURNING = ["New Moon", "First Quarter", "Full Moon", "Last Quarter"];
const BETWEEN = ["Waxing Crescent", "Waxing Gibbous", "Waning Gibbous", "Waning Crescent"];

/**
 * One moon reading per day (local noon, astronomy-engine — same source as the
 * Plan/Grow/Care/Let go rhythm). The Moon moves ~12.2°/day, so a ±6.1° window
 * around each quarter marks exactly one turning-point day.
 */
export function dayMoon(d: Date): DayMoon {
  const noon = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  const angle = MoonPhase(noon);
  const nearest = Math.round(angle / 90) % 4;
  const off = Math.abs(angle - Math.round(angle / 90) * 90);
  const turning = off <= 6.1;
  return {
    label: turning ? TURNING[nearest] : BETWEEN[Math.floor(angle / 90) % 4],
    rhythm: lunarRhythmAt(noon),
    turning,
  };
}
