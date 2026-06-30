import { format } from "date-fns";
import type { Task, Appointment } from "@/lib/types";
import { getMoonPhase, MOON_INFO, getIllumination } from "@/lib/moon";
import { getMoonSign } from "@/lib/zodiac";
import { getPhaseInfo, PHASE_META, type CyclePhase } from "@/lib/cycle";
import { getDailyEnergyGuidance } from "@/lib/daily-energy-guidance";

export interface CapacitySnapshot {
  plannedMinutes: number;
  ceilingMinutes: number;
  ratio: number;             // plannedMinutes / ceilingMinutes
  label: "gentle" | "steady" | "stretched" | "overflowing";
  cyclePhase: CyclePhase | null;
}

/** Base soft daily ceiling, in minutes of focused/estimated work. */
const BASE_CEILING_MIN = 4 * 60;

/** Cycle phase multipliers — lower during menstrual/luteal, higher in
 * follicular/ovulatory. Multiplied against the base ceiling. */
const PHASE_CEILING_MULTIPLIER: Record<CyclePhase, number> = {
  menstrual:  0.6,
  follicular: 1.15,
  ovulatory:  1.25,
  luteal:     0.85,
};

export function computeCapacitySnapshot(
  tasks: Task[],
  appointments: Appointment[],
  date: Date,
  cyclePhase: CyclePhase | null,
): CapacitySnapshot {
  const iso = format(date, "yyyy-MM-dd");
  const taskMin = tasks
    .filter(t => t.dueDate === iso && !t.parentTaskId && t.status !== "parked")
    .reduce((sum, t) => sum + (t.estMinutes ?? 25), 0);
  const apptMin = appointments
    .filter(a => a.date === iso)
    .reduce((sum, a) => {
      if (!a.time || !a.endTime) return sum + 30;
      const [sh, sm] = a.time.split(":").map(Number);
      const [eh, em] = a.endTime.split(":").map(Number);
      return sum + Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
    }, 0);
  const plannedMinutes = taskMin + apptMin;
  const mult = cyclePhase ? PHASE_CEILING_MULTIPLIER[cyclePhase] : 1;
  const ceilingMinutes = Math.round(BASE_CEILING_MIN * mult);
  const ratio = ceilingMinutes > 0 ? plannedMinutes / ceilingMinutes : 0;
  let label: CapacitySnapshot["label"] = "gentle";
  if (ratio >= 1.25) label = "overflowing";
  else if (ratio >= 0.9) label = "stretched";
  else if (ratio >= 0.4) label = "steady";
  return { plannedMinutes, ceilingMinutes, ratio, label, cyclePhase };
}

export interface RhythmAlignment {
  honors: { id: string; title: string; reason: string }[];
  reshape: { id: string; title: string; reason: string }[];
}

/** Quick heuristic energy classifier from task title keywords. */
function classify(title: string): "active" | "social" | "deep" | "admin" | "rest" {
  const t = title.toLowerCase();
  if (/(walk|run|gym|workout|stretch|yoga|hike|clean|laundry|cook|prep)/.test(t)) return "active";
  if (/(call|meet|coffee|visit|message|text|email|reply|connect)/.test(t)) return "social";
  if (/(write|design|plan|research|read|study|build|code|draft|outline)/.test(t)) return "deep";
  if (/(pay|file|schedule|book|order|return|errand|admin|paperwork)/.test(t)) return "admin";
  if (/(rest|nap|journal|reflect|breathe|meditate|sleep|bath)/.test(t)) return "rest";
  return "admin";
}

const PHASE_FAVORS: Record<CyclePhase, ReturnType<typeof classify>[]> = {
  menstrual:  ["rest", "admin"],
  follicular: ["deep", "active", "social"],
  ovulatory:  ["social", "active", "deep"],
  luteal:     ["admin", "deep", "rest"],
};

export function computeRhythmAlignment(
  tasks: Task[],
  date: Date,
  cyclePhase: CyclePhase | null,
): RhythmAlignment {
  const iso = format(date, "yyyy-MM-dd");
  const today = tasks.filter(
    t => t.dueDate === iso && !t.parentTaskId && t.status !== "parked" && !t.done,
  );
  const favors = cyclePhase ? PHASE_FAVORS[cyclePhase] : ["deep", "social", "active"];
  const honors: RhythmAlignment["honors"] = [];
  const reshape: RhythmAlignment["reshape"] = [];
  for (const t of today) {
    const kind = classify(t.title);
    if (favors.includes(kind)) {
      honors.push({
        id: t.id, title: t.title,
        reason: cyclePhase
          ? `Fits your ${PHASE_META[cyclePhase].label.toLowerCase()} rhythm.`
          : `A ${kind} task — well-suited for today.`,
      });
    } else if (kind === "social" && cyclePhase === "menstrual") {
      reshape.push({ id: t.id, title: t.title, reason: "Social load during rest week — consider shortening or moving." });
    } else if (kind === "deep" && cyclePhase === "luteal") {
      reshape.push({ id: t.id, title: t.title, reason: "Deep work late-cycle — try a focused 25-min block instead of an open chunk." });
    } else if (kind === "active" && cyclePhase === "menstrual") {
      reshape.push({ id: t.id, title: t.title, reason: "High effort during menstrual phase — soften the intensity." });
    }
  }
  return { honors: honors.slice(0, 3), reshape: reshape.slice(0, 3) };
}

export interface DebriefContext {
  date: string;
  moon: { phase: string; sign: string; element: string; illumination: number };
  cycle: { phase: CyclePhase; day: number } | null;
  capacity: { plannedMinutes: number; ceilingMinutes: number; label: string };
  tasks: { title: string; time?: string; estMinutes?: number }[];
  appointments: { title: string; time?: string }[];
}

export function buildDebriefContext(
  date: Date,
  tasks: Task[],
  appointments: Appointment[],
  cycle: ReturnType<typeof getPhaseInfo> | null,
  capacity: CapacitySnapshot,
): DebriefContext {
  const iso = format(date, "yyyy-MM-dd");
  const sign = getMoonSign(date);
  const phase = getMoonPhase(date);
  return {
    date: iso,
    moon: {
      phase: MOON_INFO[phase].label,
      sign: sign.name,
      element: sign.element,
      illumination: getIllumination(date),
    },
    cycle: cycle ? { phase: cycle.phase, day: cycle.cycleDay } : null,
    capacity: {
      plannedMinutes: capacity.plannedMinutes,
      ceilingMinutes: capacity.ceilingMinutes,
      label: capacity.label,
    },
    tasks: tasks
      .filter(t => t.dueDate === iso && !t.parentTaskId && t.status !== "parked")
      .slice(0, 12)
      .map(t => ({ title: t.title, time: t.startTime ?? undefined, estMinutes: t.estMinutes ?? undefined })),
    appointments: appointments
      .filter(a => a.date === iso)
      .slice(0, 8)
      .map(a => ({ title: a.title, time: a.time ?? undefined })),
  };
}

export interface DebriefPayload {
  summary: string;
  honors: string[];
  reshape: string[];
  rhythmNote: string;
}

/** Local fallback when AI is unavailable. */
export function localDebriefFallback(
  date: Date,
  capacity: CapacitySnapshot,
  alignment: RhythmAlignment,
  cycle: ReturnType<typeof getPhaseInfo> | null,
): DebriefPayload {
  const g = getDailyEnergyGuidance(date, [], cycle ? { startDate: format(date, "yyyy-MM-dd") } as any : undefined as any);
  const capLine =
    capacity.label === "gentle" ? "Your plan is gentle — leave room to enjoy it."
    : capacity.label === "steady" ? "Today's plan feels steady and within range."
    : capacity.label === "stretched" ? "You're stretched — consider trimming one thing."
    : "Today is overflowing — let one item soften or shift.";
  const rhythmNote = cycle
    ? `${PHASE_META[cycle.phase].label} phase invites ${PHASE_META[cycle.phase].planningHints[0]}.`
    : g.headline;
  return {
    summary: capLine,
    honors: alignment.honors.map(h => `${h.title} — ${h.reason}`),
    reshape: alignment.reshape.map(r => `${r.title} — ${r.reason}`),
    rhythmNote,
  };
}

const CACHE_PREFIX = "daily-debrief:";
export function cacheKey(date: Date) { return `${CACHE_PREFIX}${format(date, "yyyy-MM-dd")}`; }
export function readCache(date: Date): DebriefPayload | null {
  try { const raw = localStorage.getItem(cacheKey(date)); return raw ? JSON.parse(raw) as DebriefPayload : null; }
  catch { return null; }
}
export function writeCache(date: Date, p: DebriefPayload) {
  try { localStorage.setItem(cacheKey(date), JSON.stringify(p)); } catch { /* ignore */ }
}