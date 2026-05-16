// Simple moon phase calculator.
// Returns a key-phase emoji for the given date if it falls within ~0.5 days
// of a New, First Quarter, Full, or Last Quarter moon — otherwise null.

const SYNODIC = 29.530588853; // days
// Reference new moon: 2000-01-06 18:14 UTC (well-known epoch).
const REF = Date.UTC(2000, 0, 6, 18, 14) / 86400000; // in days since epoch

function phaseFraction(date: Date): number {
  // Use UTC noon to make the phase stable across the calendar day.
  const d = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12) / 86400000;
  let f = ((d - REF) % SYNODIC) / SYNODIC;
  if (f < 0) f += 1;
  return f; // 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter
}

export type MoonPhase = "new" | "first" | "full" | "last";

const KEY: { phase: MoonPhase; at: number; emoji: string; label: string }[] = [
  { phase: "new",   at: 0.00, emoji: "🌑", label: "New moon" },
  { phase: "first", at: 0.25, emoji: "🌓", label: "First quarter" },
  { phase: "full",  at: 0.50, emoji: "🌕", label: "Full moon" },
  { phase: "last",  at: 0.75, emoji: "🌗", label: "Last quarter" },
];

// Tolerance in synodic fractions ≈ 0.5 day on either side.
const TOL = 0.5 / SYNODIC;

export function moonPhaseFor(date: Date): { phase: MoonPhase; emoji: string; label: string } | null {
  const f = phaseFraction(date);
  // Also compare against the previous day; whichever is closer to a key phase wins,
  // ensuring each phase emits on exactly one calendar day per cycle.
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  const fy = phaseFraction(yesterday);

  for (const k of KEY) {
    const dToday = circDist(f, k.at);
    const dYest = circDist(fy, k.at);
    if (dToday <= TOL && dToday <= dYest) {
      return { phase: k.phase, emoji: k.emoji, label: k.label };
    }
  }
  return null;
}

function circDist(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, 1 - d);
}