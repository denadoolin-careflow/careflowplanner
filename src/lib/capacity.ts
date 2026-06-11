/**
 * Capacity score — fuses self-reported energy, cycle phase, moon phase,
 * transit intensity, and scheduled load into a single 0–100 number with a
 * band and human-readable reasons.
 *
 * Pure function. Safe to call on every render — caller can memoize by
 * ISO day.
 */
import { format } from "date-fns";
import { getMoonPhase } from "@/lib/moon";
import { getActiveAspects } from "@/lib/cosmic/active-aspects";
import { getPhaseInfo, type CyclePhase } from "@/lib/cycle";
import type { PeriodLog, CycleSettings } from "@/lib/cycle";
import { getEnergyFor, type Energy } from "@/lib/energy-store";
import { computeCapacity } from "@/lib/carey/capacity";

export type CapacityBand = "rest" | "soft" | "steady" | "high";

export interface CapacityReason {
  label: string;
  delta: number;
  note?: string;
}

export interface CapacityScore {
  score: number;        // 0-100
  band: CapacityBand;
  bandLabel: string;
  suggestion: string;
  reasons: CapacityReason[];
}

function isoOf(d: Date) { return format(d, "yyyy-MM-dd"); }

function energyDelta(e: Energy | null): number {
  if (!e) return 0;
  return e === "high" ? 18 : e === "medium" ? 4 : -14;
}

const PHASE_DELTA: Record<CyclePhase, number> = {
  menstrual: -14,
  follicular: 8,
  ovulatory: 14,
  luteal: -6,
};

function moonDelta(phase: ReturnType<typeof getMoonPhase>): { delta: number; note: string } {
  switch (phase) {
    case "new":              return { delta: -4, note: "New moon — inward day" };
    case "waxing-crescent":  return { delta: 4,  note: "Waxing crescent — gentle build" };
    case "first-quarter":    return { delta: 5,  note: "First quarter — push through" };
    case "waxing-gibbous":   return { delta: 3,  note: "Waxing gibbous — refine" };
    case "full":             return { delta: -4, note: "Full moon — bright, scattered" };
    case "waning-gibbous":   return { delta: 1,  note: "Waning gibbous — integrate" };
    case "last-quarter":     return { delta: -2, note: "Last quarter — release" };
    case "waning-crescent":  return { delta: -3, note: "Waning crescent — rest" };
    default:                 return { delta: 0,  note: "" };
  }
}

function aspectDelta(date: Date): { delta: number; note: string } {
  const aspects = getActiveAspects(date, 5);
  if (aspects.length === 0) return { delta: 0, note: "Quiet sky" };
  let delta = 0;
  let hard = 0, soft = 0;
  for (const a of aspects) {
    if (a.aspect === "square" || a.aspect === "opposition") { delta -= 3; hard += 1; }
    else if (a.aspect === "trine" || a.aspect === "sextile") { delta += 2; soft += 1; }
  }
  delta = Math.max(-15, Math.min(15, delta));
  const note = hard > soft ? `${hard} hard aspect${hard === 1 ? "" : "s"} active`
    : soft > 0 ? `${soft} flowing aspect${soft === 1 ? "" : "s"}`
    : "Mixed sky";
  return { delta, note };
}

function loadDelta(state: any): { delta: number; note: string } {
  try {
    const reading = computeCapacity(state);
    if (reading.signal === "overloaded") return { delta: -10, note: `${reading.scheduledToday} tasks scheduled` };
    if (reading.signal === "light")      return { delta: 5,  note: `${reading.scheduledToday} tasks scheduled` };
    if (reading.signal === "balanced")   return { delta: 0,  note: `${reading.scheduledToday} tasks scheduled` };
    return { delta: 0, note: "Learning your rhythm" };
  } catch {
    return { delta: 0, note: "" };
  }
}

function bandFor(score: number): { band: CapacityBand; label: string; suggestion: string } {
  if (score < 30) return { band: "rest", label: "Rest day", suggestion: "Cancel one thing. Move your body gently." };
  if (score < 56) return { band: "soft", label: "Soft day", suggestion: "Protect one Top 3 — let the rest wait." };
  if (score <= 80) return { band: "steady", label: "Steady day", suggestion: "Steady rhythm — pick the next right thing." };
  return { band: "high", label: "High capacity", suggestion: "Take on the harder thing while the window is open." };
}

export interface CapacityInput {
  date?: Date;
  state: any;
  periods: PeriodLog[];
  cycleSettings: CycleSettings;
}

export function computeCapacityScore({ date = new Date(), state, periods, cycleSettings }: CapacityInput): CapacityScore {
  const iso = isoOf(date);
  const reasons: CapacityReason[] = [];
  let score = 50;

  const energy = getEnergyFor(iso);
  const eDelta = energyDelta(energy);
  if (energy) {
    score += eDelta;
    reasons.push({ label: `Energy: ${energy}`, delta: eDelta });
  } else {
    reasons.push({ label: "Energy: not logged", delta: 0, note: "Log to refine score" });
  }

  if (cycleSettings?.enabled) {
    const phaseInfo = getPhaseInfo(date, periods, cycleSettings);
    if (phaseInfo) {
      const d = PHASE_DELTA[phaseInfo.phase];
      score += d;
      reasons.push({
        label: `${phaseInfo.label} · day ${phaseInfo.cycleDay}`,
        delta: d,
        note: phaseInfo.invitation,
      });
    }
  }

  const moon = moonDelta(getMoonPhase(date));
  score += moon.delta;
  reasons.push({ label: moon.note, delta: moon.delta });

  const aspects = aspectDelta(date);
  score += aspects.delta;
  reasons.push({ label: aspects.note, delta: aspects.delta });

  const load = loadDelta(state);
  if (load.delta !== 0 || load.note) {
    score += load.delta;
    reasons.push({ label: load.note, delta: load.delta });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const { band, label, suggestion } = bandFor(score);

  return { score, band, bandLabel: label, suggestion, reasons };
}

export const CAPACITY_BAND_COLOR: Record<CapacityBand, string> = {
  rest:   "hsl(346 70% 60%)",
  soft:   "hsl(35 85% 60%)",
  steady: "hsl(150 55% 50%)",
  high:   "hsl(200 80% 55%)",
};