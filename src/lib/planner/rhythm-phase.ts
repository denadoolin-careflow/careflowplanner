import type { MoonPhase } from "@/lib/moon";

export type RhythmPhase = "plan" | "grow" | "care" | "letgo";

/** CareFlow rhythm: Plan (new→waxing), Grow (waxing→full), Care (full→waning), Let go (waning→new). */
export function rhythmPhaseForMoon(m: MoonPhase): RhythmPhase {
  if (m === "new" || m === "waxing-crescent") return "plan";
  if (m === "first-quarter" || m === "waxing-gibbous") return "grow";
  if (m === "full" || m === "waning-gibbous") return "care";
  return "letgo";
}

export const RHYTHM_LABEL: Record<RhythmPhase, string> = { plan: "Plan", grow: "Grow", care: "Care", letgo: "Let go" };

const MOON_FAVORS: Record<RhythmPhase, string> = {
  plan: "Gentle start — good for planning and light care",
  grow: "Building energy — good for steady progress",
  care: "Full and bright — good for connection and tending others",
  letgo: "Winding down — good for clearing and rest",
};

/** One-line "Today favors…" guidance combining moon rhythm and (optional) cycle phase label. */
export function todayFavors(phase: RhythmPhase, cycleLabel?: string | null): string {
  const base = MOON_FAVORS[phase];
  if (!cycleLabel) return base;
  const c = cycleLabel.toLowerCase();
  if (c.includes("menstru")) return `${base}; keep your own load soft`;
  if (c.includes("ovulat")) return `${base}; a good day for people and calls`;
  if (c.includes("luteal")) return `${base}; finish things rather than start them`;
  if (c.includes("follic")) return `${base}; fresh ideas come easily`;
  return base;
}
