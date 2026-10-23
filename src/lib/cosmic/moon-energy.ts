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

const SIGN_PHRASE: Record<string, string> = {
  Aries: "act boldly and keep it short", Taurus: "go slow and make it comfortable",
  Gemini: "talk it through and stay curious", Cancer: "stay close to home and feelings",
  Leo: "lead with warmth and a little play", Virgo: "tidy the details and simplify",
  Libra: "seek balance and share the load", Scorpio: "go deep and be honest",
  Sagittarius: "widen your view and try something new", Capricorn: "commit to one steady structure",
  Aquarius: "rethink the routine and invite friends in", Pisces: "rest, dream and leave room for gentleness",
};
const PHASE_LEAD: Record<RhythmPhase, string> = {
  plan: "set one clear intention", grow: "take one steady step forward",
  care: "tend to people, home and yourself", letgo: "clear what's finished and rest",
};
const PHASE_NAME: Record<RhythmPhase, string> = { plan: "Plan", grow: "Grow", care: "Care", letgo: "Let go" };

/** One sentence blending the rhythm phase with the Moon's sign. */
export function phaseSignAdvice(phase: RhythmPhase, sign: string): string {
  const word = moonEnergyWord(sign);
  const how = SIGN_PHRASE[sign] ?? "move gently";
  return `${PHASE_NAME[phase]} in ${sign}${word ? ` (${word})` : ""}: ${PHASE_LEAD[phase]}, and ${how}.`;
}
