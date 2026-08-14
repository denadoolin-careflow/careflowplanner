import type { Task } from "@/lib/types";
import type { AutoSchedulePrefs, PersonRule } from "@/lib/auto-schedule-prefs";
import { DEFAULT_NUDGE_PREFS, type NudgePrefs, type NudgeType } from "@/lib/planner/nudge-prefs";

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
  /** Current clock time on the task, if any — drives the before → after diff. */
  fromAbsMin?: number | null;
  /** Person rule that shaped this placement. */
  person?: string;
  /** Which constraints were honoured for this slot. */
  constraints?: string[];
}

export interface DayNudge {
  id: string;
  tone: "warn" | "info";
  message: string;
  type?: NudgeType;
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

export const timeLabel = (abs: number) => fmt12(abs);

/** Person rule that applies to a task, matched on its tags. */
export function personRuleFor(task: Task, rules: PersonRule[]): PersonRule | undefined {
  const tags = (task.tags ?? []).map(t => t.toLowerCase().replace(/^@/, ""));
  if (!tags.length) return undefined;
  return rules.find(r => r.name && tags.includes(r.name.toLowerCase().replace(/^@/, "")));
}

const hmParse = (v?: string | null): number | null => {
  if (!v) return null;
  const [h, m] = v.split(":").map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : null;
};

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

  const windows = (prefs.noScheduleWindows ?? []).filter(w => w.endMin > w.startMin);
  const blockedByWindow = (s: number, d: number) =>
    windows.find(w => s < w.endMin && s + d > w.startMin);

  const personRules = prefs.personRules ?? [];
  /** Where each grouped person's work has landed so far. */
  const personAnchor = new Map<string, number>();

  const dur = (t: Task) => Math.max(snap, t.estMinutes ?? prefs.defaultDuration);
  const baseSorted = tasks.slice().sort((a, b) => prefs.order === "duration"
    ? dur(b) - dur(a) || (PRIO_RANK[a.priority] ?? 1) - (PRIO_RANK[b.priority] ?? 1)
    : (PRIO_RANK[a.priority] ?? 1) - (PRIO_RANK[b.priority] ?? 1) || dur(b) - dur(a));

  // Keep grouped people's tasks adjacent by pulling them together in the order.
  const grouped = new Map<string, Task[]>();
  const loose: Task[] = [];
  for (const t of baseSorted) {
    const rule = personRuleFor(t, personRules);
    if (rule?.group) {
      const list = grouped.get(rule.name) ?? [];
      list.push(t);
      grouped.set(rule.name, list);
    } else loose.push(t);
  }
  const sorted: Task[] = [];
  const seen = new Set<string>();
  for (const t of baseSorted) {
    if (seen.has(t.id)) continue;
    const rule = personRuleFor(t, personRules);
    if (rule?.group) {
      for (const g of grouped.get(rule.name) ?? []) { if (!seen.has(g.id)) { sorted.push(g); seen.add(g.id); } }
    } else { sorted.push(t); seen.add(t.id); }
  }
  void loose;

  const fits = (s: number, d: number) =>
    s >= dayStart && s + d <= dayEnd &&
    !blockedByWindow(s, d) &&
    !busy.some(b => s < b.end + prefs.bufferMin && s + d + prefs.bufferMin > b.start);

  const out: Suggestion[] = [];
  for (const t of sorted) {
    const d = dur(t);
    const rule = personRuleFor(t, personRules);
    const constraints: string[] = [];

    const bandStartH = t.energy === "high" ? prefs.highEnergyH
      : t.energy === "low" ? prefs.lowEnergyH : prefs.mediumEnergyH;
    const bandEndH = t.energy === "high" ? (prefs.highEnergyEndH ?? prefs.dayEndH)
      : t.energy === "low" ? (prefs.lowEnergyEndH ?? prefs.dayEndH)
        : (prefs.mediumEnergyEndH ?? prefs.dayEndH);
    const bandStart = Math.max(floor, bandStartH * 60);
    const bandEnd = Math.max(bandStart + d, bandEndH * 60);

    // Person window wins over the energy band when both are set.
    const personStart = rule?.startH != null ? Math.max(floor, rule.startH * 60) : null;
    const personEnd = rule?.endH != null ? rule.endH * 60 : null;
    const anchor = rule?.group ? personAnchor.get(rule.name) ?? null : null;

    let slot: number | null = null;
    let energyFit = true;
    let personFit = false;

    // 1. Right after this person's previous task, when grouping.
    if (anchor !== null) {
      for (let s = anchor; s + d <= dayEnd && s <= anchor + 120; s += snap) {
        if (fits(s, d)) { slot = s; personFit = true; break; }
      }
    }
    // 2. Inside the person's preferred window.
    if (slot === null && personStart !== null) {
      const end = personEnd ?? dayEnd;
      for (let s = personStart; s + d <= Math.min(end, dayEnd); s += snap) {
        if (fits(s, d)) { slot = s; personFit = true; break; }
      }
    }
    // 3. Inside the energy band.
    if (slot === null) {
      for (let s = bandStart; s + d <= Math.min(bandEnd, dayEnd); s += snap) if (fits(s, d)) { slot = s; break; }
    }
    // 4. Anywhere after the band start.
    if (slot === null) {
      for (let s = bandStart; s + d <= dayEnd; s += snap) if (fits(s, d)) { slot = s; break; }
    }
    if (slot === null) {
      energyFit = false;
      for (let s = Math.max(dayStart, floor); s + d <= dayEnd; s += snap) if (fits(s, d)) { slot = s; break; }
    }
    if (slot === null) continue;

    if (windows.length) constraints.push("Protected windows kept clear");
    if (energyFit) constraints.push(`${t.energy ?? "medium"}-energy window`);
    if (personFit && rule) constraints.push(`${rule.name} time`);
    if (prefs.bufferMin) constraints.push(`${prefs.bufferMin}m buffer`);

    const blocker = busy
      .filter(b => b.end <= slot!)
      .sort((a, b) => b.end - a.end)[0];

    const reason = personFit && rule
      ? `Grouped with your ${rule.name} care time`
      : !energyFit
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
    if (rule?.group) personAnchor.set(rule.name, slot + d + prefs.bufferMin);
    out.push({
      taskId: t.id, title: t.title, startAbsMin: slot, durMin: d, reason,
      priority: t.priority, energy: t.energy,
      fromAbsMin: hmParse(t.startTime),
      person: rule?.name,
      constraints,
    });
  }
  return out;
}

/** Find the next free start after `from` for a duration, ignoring one item. */
export function nextFreeStart(busy: BusyRange[], from: number, dur: number, prefs: AutoSchedulePrefs, snapMin = 15): number | null {
  const dayEnd = prefs.dayEndH * 60;
  const windows = (prefs.noScheduleWindows ?? []).filter(w => w.endMin > w.startMin);
  for (let s = Math.max(prefs.dayStartH * 60, from); s + dur <= dayEnd; s += snapMin) {
    if (windows.some(w => s < w.endMin && s + dur > w.startMin)) continue;
    if (!busy.some(b => s < b.end && s + dur > b.start)) return s;
  }
  return null;
}

/** Gentle, day-level observations about how the plan looks. */
export function buildNudges(opts: {
  busy: BusyRange[];
  prefs: AutoSchedulePrefs;
  unscheduled: Task[];
  nudgePrefs?: NudgePrefs;
}): DayNudge[] {
  const { busy, prefs, unscheduled } = opts;
  const np = opts.nudgePrefs ?? DEFAULT_NUDGE_PREFS;
  if (np.quiet) return [];
  const tone = np.tone;
  const on = (t: NudgeType) => np.enabled[t] !== false;
  const nudges: DayNudge[] = [];
  const windowMin = Math.max(0, prefs.dayEndH * 60 - prefs.dayStartH * 60);
  const plannedMin = busy.reduce((sum, b) => sum + Math.max(0, b.end - b.start), 0);

  if (on("overbooked") && windowMin && plannedMin > windowMin * 0.85) {
    const pct = Math.round((plannedMin / windowMin) * 100);
    nudges.push({
      id: "overbooked", tone: "warn", type: "overbooked",
      message: tone === "direct"
        ? `Day is ${pct}% booked. Move something.`
        : tone === "neutral"
          ? `Your day is ${pct}% booked — consider moving something.`
          : `Your day is ${pct}% full. It's okay to let one thing wait.`,
    });
  }

  const sorted = busy.slice().sort((a, b) => a.start - b.start);
  let runStart: number | null = null;
  let runEnd = -1;
  if (on("nobreak")) for (const b of sorted) {
    if (runStart === null || b.start > runEnd + 15) { runStart = b.start; runEnd = b.end; }
    else runEnd = Math.max(runEnd, b.end);
    if (runEnd - (runStart ?? 0) >= 180) {
      const hrs = Math.round((runEnd - runStart!) / 60);
      nudges.push({
        id: `nobreak-${runStart}`, tone: "info", type: "nobreak",
        message: tone === "direct"
          ? `${hrs}h with no break from ${fmt12(runStart!)}. Add one.`
          : tone === "neutral"
            ? `${hrs}h straight from ${fmt12(runStart!)} — a break would help.`
            : `That's ${hrs}h without a pause from ${fmt12(runStart!)} — a little breathing room would be kind.`,
      });
      runStart = null; runEnd = -1;
    }
  }

  const overlaps = sorted.filter((b, i) => i > 0 && b.start < sorted[i - 1].end).length;
  if (on("conflicts") && overlaps) {
    nudges.push({
      id: "conflicts", tone: "warn", type: "conflicts",
      message: tone === "gentle"
        ? `${overlaps} thing${overlaps === 1 ? "" : "s"} overlap on the grid — worth a quick look.`
        : `${overlaps} overlapping item${overlaps === 1 ? "" : "s"} on the grid.`,
    });
  }

  const noEstimate = unscheduled.filter(t => !t.estMinutes).length;
  if (on("estimates") && noEstimate) {
    nudges.push({
      id: "no-estimate", tone: "info", type: "estimates",
      message: `${noEstimate} task${noEstimate === 1 ? " has" : "s have"} no time estimate — using ${prefs.defaultDuration}m.`,
    });
  }

  if (on("energy")) {
    const lowStretch = prefs.lowEnergyH * 60;
    const heavyLate = unscheduled.filter(t => t.energy === "high" && (t.estMinutes ?? prefs.defaultDuration) >= 45).length;
    if (heavyLate && lowStretch <= prefs.dayEndH * 60) {
      nudges.push({
        id: "energy-mismatch", tone: "info", type: "energy",
        message: tone === "direct"
          ? `${heavyLate} demanding task${heavyLate === 1 ? "" : "s"} still unplaced — schedule them early.`
          : `${heavyLate} demanding task${heavyLate === 1 ? "" : "s"} still waiting — they'll land better before ${fmt12(lowStretch)}.`,
      });
    }
  }

  return nudges;
}
