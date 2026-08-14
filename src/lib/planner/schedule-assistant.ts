import type { Task } from "@/lib/types";
import type { AutoSchedulePrefs } from "@/lib/auto-schedule-prefs";

export interface BusyRange { start: number; end: number; title?: string; kind?: string }

export interface Suggestion {
  taskId: string;
  title: string;
  /** Absolute minutes from midnight. */
  startAbsMin: number;
  durMin: number;
  reason: string;
  priority: string;
  energy?: string;
}

export interface DayNudge {
  id: string;
  tone: "warn" | "info";
  message: string;
}

const PRIO_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

const fmt12 = (abs: number) => {
  const h24 = Math.floor(abs / 60) % 24;
  const m = abs % 60;
  const s = h24 < 12 ? "a" : "p";
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h}${s}` : `${h}:${String(m).padStart(2, "0")}${s}`;
};

export function rangeLabel(startAbs: number, dur: number) {
  return `${fmt12(startAbs)}–${fmt12(startAbs + dur)}`;
}

/**
 * Deterministic placement suggestions: fits unscheduled tasks into the free
 * gaps of a day using the user's auto-schedule preferences.
 */
export function buildSuggestions(opts: {
  tasks: Task[];
  busy: BusyRange[];
  prefs: AutoSchedulePrefs;
  isToday: boolean;
  now?: Date;
  snapMin?: number;
}): Suggestion[] {
  const { tasks, prefs, isToday } = opts;
  const snap = opts.snapMin ?? 15;
  const now = opts.now ?? new Date();

  const dayStart = prefs.dayStartH * 60;
  const dayEnd = prefs.dayEndH * 60;
  const floor = prefs.skipPastTimes && isToday
    ? Math.max(dayStart, Math.ceil((now.getHours() * 60 + now.getMinutes()) / snap) * snap)
    : dayStart;

  const busy = opts.busy
    .filter(b => (prefs.respectAppointments ? true : b.kind === "task"))
    .map(b => ({ ...b }));

  const dur = (t: Task) => Math.max(snap, t.estMinutes ?? prefs.defaultDuration);
  const sorted = tasks.slice().sort((a, b) => prefs.order === "duration"
    ? dur(b) - dur(a) || (PRIO_RANK[a.priority] ?? 1) - (PRIO_RANK[b.priority] ?? 1)
    : (PRIO_RANK[a.priority] ?? 1) - (PRIO_RANK[b.priority] ?? 1) || dur(b) - dur(a));

  const fits = (s: number, d: number) =>
    s >= dayStart && s + d <= dayEnd &&
    !busy.some(b => s < b.end + prefs.bufferMin && s + d + prefs.bufferMin > b.start);

  const out: Suggestion[] = [];
  for (const t of sorted) {
    const d = dur(t);
    const preferredH = t.energy === "high" ? prefs.highEnergyH
      : t.energy === "low" ? prefs.lowEnergyH : prefs.mediumEnergyH;
    const first = Math.max(floor, preferredH * 60);

    let slot: number | null = null;
    let energyFit = true;
    for (let s = first; s + d <= dayEnd; s += snap) if (fits(s, d)) { slot = s; break; }
    if (slot === null) {
      energyFit = false;
      for (let s = Math.max(dayStart, floor); s + d <= dayEnd; s += snap) if (fits(s, d)) { slot = s; break; }
    }
    if (slot === null) continue;

    const blocker = busy
      .filter(b => b.end <= slot!)
      .sort((a, b) => b.end - a.end)[0];

    const reason = !energyFit
      ? "First slot that still fits today"
      : t.energy === "high"
        ? "High-energy work while you're fresh"
        : t.energy === "low"
          ? "Low-energy task in your slower stretch"
          : blocker?.title
            ? `First open slot after ${blocker.title}`
            : busy.length === 0
              ? "Your day is open here"
              : "First open slot";

    busy.push({ start: slot, end: slot + d, title: t.title, kind: "task" });
    out.push({ taskId: t.id, title: t.title, startAbsMin: slot, durMin: d, reason, priority: t.priority, energy: t.energy });
  }
  return out;
}

/** Find the next free start after `from` for a duration, ignoring one item. */
export function nextFreeStart(busy: BusyRange[], from: number, dur: number, prefs: AutoSchedulePrefs, snapMin = 15): number | null {
  const dayEnd = prefs.dayEndH * 60;
  for (let s = Math.max(prefs.dayStartH * 60, from); s + dur <= dayEnd; s += snapMin) {
    if (!busy.some(b => s < b.end && s + dur > b.start)) return s;
  }
  return null;
}

/** Gentle, day-level observations about how the plan looks. */
export function buildNudges(opts: {
  busy: BusyRange[];
  prefs: AutoSchedulePrefs;
  unscheduled: Task[];
}): DayNudge[] {
  const { busy, prefs, unscheduled } = opts;
  const nudges: DayNudge[] = [];
  const windowMin = Math.max(0, prefs.dayEndH * 60 - prefs.dayStartH * 60);
  const plannedMin = busy.reduce((sum, b) => sum + Math.max(0, b.end - b.start), 0);

  if (windowMin && plannedMin > windowMin * 0.85) {
    nudges.push({ id: "overbooked", tone: "warn", message: `Your day is ${Math.round((plannedMin / windowMin) * 100)}% booked — consider moving something.` });
  }

  const sorted = busy.slice().sort((a, b) => a.start - b.start);
  let runStart: number | null = null;
  let runEnd = -1;
  for (const b of sorted) {
    if (runStart === null || b.start > runEnd + 15) { runStart = b.start; runEnd = b.end; }
    else runEnd = Math.max(runEnd, b.end);
    if (runEnd - (runStart ?? 0) >= 180) {
      nudges.push({ id: `nobreak-${runStart}`, tone: "info", message: `${Math.round((runEnd - runStart!) / 60)}h straight from ${fmt12(runStart!)} — a break would help.` });
      runStart = null; runEnd = -1;
    }
  }

  const overlaps = sorted.filter((b, i) => i > 0 && b.start < sorted[i - 1].end).length;
  if (overlaps) nudges.push({ id: "conflicts", tone: "warn", message: `${overlaps} overlapping item${overlaps === 1 ? "" : "s"} on the grid.` });

  const noEstimate = unscheduled.filter(t => !t.estMinutes).length;
  if (noEstimate) nudges.push({ id: "no-estimate", tone: "info", message: `${noEstimate} task${noEstimate === 1 ? " has" : "s have"} no time estimate — using ${prefs.defaultDuration}m.` });

  return nudges;
}
