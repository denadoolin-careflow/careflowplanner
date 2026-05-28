/** Cyclical living engine — pure functions, no DB calls. */
import { differenceInCalendarDays, addDays, format, parseISO } from "date-fns";
import type { MoonPhase } from "./moon";

export type CyclePhase = "menstrual" | "follicular" | "ovulatory" | "luteal";
export type FlowLevel = "spotting" | "light" | "medium" | "heavy";
export type EnergyLevel = "low" | "medium" | "high";
export type Archetype = "maiden" | "mother" | "maga" | "crone";
export type MoonAlignment = "white-moon" | "red-moon" | "pink-moon" | "purple-moon";

export interface CycleSettings {
  enabled: boolean;
  avgCycleLength: number;
  avgPeriodLength: number;
  lutealLength: number;
  showFertility: boolean;
  pairWithMoon: boolean;
  moonArchetype: "auto" | "white" | "red";
  autoLowEnergy: boolean;
}

export const DEFAULT_CYCLE_SETTINGS: CycleSettings = {
  enabled: false,
  avgCycleLength: 28,
  avgPeriodLength: 5,
  lutealLength: 14,
  showFertility: true,
  pairWithMoon: true,
  moonArchetype: "auto",
  autoLowEnergy: true,
};

export interface PeriodLog {
  id: string;
  periodStart: string;
  periodEnd: string | null;
  notes?: string;
}

export interface DayLog {
  id: string;
  date: string;
  flow?: FlowLevel | null;
  symptoms: string[];
  mood?: string | null;
  energyLevel?: EnergyLevel | null;
  bbt?: number | null;
  cervicalMucus?: string | null;
  isIntimate: boolean;
  notes?: string | null;
}

export interface PhaseInfo {
  phase: CyclePhase;
  cycleDay: number;
  cycleLength: number;
  daysUntilNextPeriod: number;
  inFertileWindow: boolean;
  archetype: Archetype;
  label: string;
  glyph: string;
  invitation: string;
  affirmation: string;
  tokenVar: string;
  planningHints: string[];
  energyFloor: EnergyLevel;
}

type PhaseStatic = Omit<PhaseInfo, "cycleDay" | "cycleLength" | "daysUntilNextPeriod" | "inFertileWindow" | "phase">;

export const PHASE_META: Record<CyclePhase, PhaseStatic> = {
  menstrual: {
    archetype: "crone",
    label: "Menstrual",
    glyph: "🥀",
    invitation: "Rest is the work. Cancel one thing without guilt.",
    affirmation: "Slowing down is sacred.",
    tokenVar: "--phase-menstrual",
    planningHints: ["gentle solo work", "journaling", "reflection", "no big meetings"],
    energyFloor: "low",
  },
  follicular: {
    archetype: "maiden",
    label: "Follicular",
    glyph: "🌷",
    invitation: "Begin. Sketch something rough — it doesn't have to be perfect.",
    affirmation: "Curiosity is a kind of energy.",
    tokenVar: "--phase-follicular",
    planningHints: ["creative work", "planning", "learning", "brainstorming"],
    energyFloor: "medium",
  },
  ovulatory: {
    archetype: "mother",
    label: "Ovulatory",
    glyph: "🌻",
    invitation: "Connect, ship, speak. You're radiant — use it kindly.",
    affirmation: "I trust my voice today.",
    tokenVar: "--phase-ovulatory",
    planningHints: ["meetings", "presentations", "hard conversations", "social plans"],
    energyFloor: "high",
  },
  luteal: {
    archetype: "maga",
    label: "Luteal",
    glyph: "🍂",
    invitation: "Wrap, organize, prepare. Say no to the new.",
    affirmation: "Finishing is its own magic.",
    tokenVar: "--phase-luteal",
    planningHints: ["admin", "cleaning", "prep", "wrapping up loose ends"],
    energyFloor: "medium",
  },
};

export function predictCycleLength(history: PeriodLog[], settings: CycleSettings): number {
  const sorted = [...history].sort((a, b) => a.periodStart.localeCompare(b.periodStart));
  if (sorted.length < 2) return settings.avgCycleLength;
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(differenceInCalendarDays(parseISO(sorted[i].periodStart), parseISO(sorted[i - 1].periodStart)));
  }
  gaps.sort((a, b) => a - b);
  const mid = Math.floor(gaps.length / 2);
  const median = gaps.length % 2 ? gaps[mid] : Math.round((gaps[mid - 1] + gaps[mid]) / 2);
  return Math.max(21, Math.min(45, median));
}

export function mostRecentPeriodStart(history: PeriodLog[], date: Date): PeriodLog | null {
  const iso = format(date, "yyyy-MM-dd");
  const past = history.filter(p => p.periodStart <= iso).sort((a, b) => b.periodStart.localeCompare(a.periodStart));
  return past[0] ?? null;
}

export function getPhaseInfo(date: Date, history: PeriodLog[], settings: CycleSettings): PhaseInfo | null {
  const last = mostRecentPeriodStart(history, date);
  if (!last) return null;
  const cycleLength = predictCycleLength(history, settings);
  const dayOfCycle = differenceInCalendarDays(date, parseISO(last.periodStart)) + 1;
  const period = settings.avgPeriodLength;
  const luteal = settings.lutealLength;
  const ovulationDay = cycleLength - luteal;
  const fertileStart = ovulationDay - 4;
  const fertileEnd = ovulationDay + 1;

  let phase: CyclePhase;
  if (dayOfCycle <= period) phase = "menstrual";
  else if (dayOfCycle < fertileStart) phase = "follicular";
  else if (dayOfCycle <= fertileEnd) phase = "ovulatory";
  else phase = "luteal";

  const daysUntilNextPeriod = Math.max(0, cycleLength - dayOfCycle + 1);
  const inFertileWindow = dayOfCycle >= fertileStart && dayOfCycle <= fertileEnd;

  return {
    phase,
    cycleDay: dayOfCycle,
    cycleLength,
    daysUntilNextPeriod,
    inFertileWindow,
    ...PHASE_META[phase],
  };
}

export function phaseForDate(date: Date, history: PeriodLog[], settings: CycleSettings): CyclePhase | null {
  return getPhaseInfo(date, history, settings)?.phase ?? null;
}

export function predictNextPeriod(history: PeriodLog[], settings: CycleSettings, from: Date = new Date()): Date | null {
  const last = mostRecentPeriodStart(history, from);
  if (!last) return null;
  const cycleLength = predictCycleLength(history, settings);
  return addDays(parseISO(last.periodStart), cycleLength);
}

export function currentFertileWindow(history: PeriodLog[], settings: CycleSettings, date: Date = new Date()): { start: Date; peak: Date; end: Date } | null {
  const last = mostRecentPeriodStart(history, date);
  if (!last) return null;
  const cycleLength = predictCycleLength(history, settings);
  const start = parseISO(last.periodStart);
  const ovulationDay = cycleLength - settings.lutealLength;
  return {
    start: addDays(start, ovulationDay - 5),
    peak: addDays(start, ovulationDay - 1),
    end: addDays(start, ovulationDay),
  };
}

export function getMoonAlignment(periodStartMoon: MoonPhase, settings: CycleSettings): MoonAlignment {
  if (settings.moonArchetype === "white") return "white-moon";
  if (settings.moonArchetype === "red") return "red-moon";
  switch (periodStartMoon) {
    case "new":
    case "waxing-crescent":
      return "white-moon";
    case "full":
    case "waning-gibbous":
      return "red-moon";
    case "first-quarter":
    case "waxing-gibbous":
      return "pink-moon";
    default:
      return "purple-moon";
  }
}

export const MOON_ALIGNMENT_LABEL: Record<MoonAlignment, string> = {
  "white-moon": "White Moon · in sync with the lunar rhythm",
  "red-moon": "Red Moon · bleeding with the full moon",
  "pink-moon": "Pink Moon · creative-mother medicine",
  "purple-moon": "Purple Moon · transitional, deep wisdom",
};

export const SYMPTOM_CHIPS = [
  "cramps", "bloating", "headache", "back pain", "tender breasts",
  "fatigue", "low mood", "anxious", "irritable", "focused",
  "creative", "sociable", "horny", "nauseous", "acne",
] as const;

export const MOOD_OPTIONS = ["radiant", "calm", "tired", "tender", "moody", "anxious", "joyful"] as const;
