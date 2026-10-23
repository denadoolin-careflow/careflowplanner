import { addDays, format, startOfDay } from "date-fns";
import { lunarRhythmAt } from "./lunar-rhythm";
import type { RhythmPhase } from "@/lib/planner/rhythm-phase";

/** One word per Moon sign for how to work with that day's energy. */
export const MOON_SIGN_ENERGY: Record<string, string> = {
  Aries: "Start", Taurus: "Savor", Gemini: "Connect", Cancer: "Nurture",
  Leo: "Shine", Virgo: "Tidy", Libra: "Balance", Scorpio: "Deepen",
  Sagittarius: "Explore", Capricorn: "Build", Aquarius: "Innovate", Pisces: "Rest",
};

export const moonEnergyWord = (sign: string | null | undefined) => (sign && MOON_SIGN_ENERGY[sign]) || "";

export type PhaseSegment = { phase: RhythmPhase; start: string; end: string; days: number };

/** Contiguous Plan/Grow/Care/Let go runs, sampled at local noon each day. ~29.5 days per cycle. */
export function phaseSegments(from: Date, cycles = 3): PhaseSegment[] {
  const total = Math.ceil(cycles * 29.53);
  const base = startOfDay(from);
  const segs: PhaseSegment[] = [];
  for (let i = 0; i < total; i++) {
    const d = addDays(base, i); d.setHours(12);
    const phase = lunarRhythmAt(d);
    const iso = format(d, "yyyy-MM-dd");
    const last = segs[segs.length - 1];
    if (last && last.phase === phase) { last.end = iso; last.days++; }
    else segs.push({ phase, start: iso, end: iso, days: 1 });
  }
  return segs;
}
