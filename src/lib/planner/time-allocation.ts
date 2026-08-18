/**
 * Read-only aggregation of planned time over the shared planner feed.
 * Powers the end-of-day/week/month "time review" wheel and bar graph.
 */
import { useMemo } from "react";
import { addDays, format } from "date-fns";
import { usePlannerFeed } from "@/lib/planner/feed";
import { useStore } from "@/lib/store";
import { KIND_LABEL, type KindKey } from "@/lib/calendar-colors";
import { getIllumination, getMoonPhase, MOON_INFO } from "@/lib/moon";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo, PHASE_META, type CyclePhase } from "@/lib/cycle";
import { getEnergyForPart, type DayPart, type Energy } from "@/lib/energy-by-part";
import { getMoodForPart, type Mood } from "@/lib/mood-by-part";
import { resolveActivity, readZoneTag } from "@/lib/task-tracking";

export type GroupBy = "kind" | "area" | "activity" | "person" | "zone";

export const GROUP_LABEL: Record<GroupBy, string> = {
  kind: "Type",
  area: "Area",
  activity: "Activity",
  person: "Person",
  zone: "Zone",
};

export interface AllocationSlice {
  key: string;
  label: string;
  color: string;
  plannedMin: number;
  doneMin: number;
}

export interface Allocation {
  slices: AllocationSlice[];
  totalPlannedMin: number;
  totalDoneMin: number;
  allDayCount: number;
  /** Share of the window's waking hours (16h/day) that is planned. */
  plannedShare: number;
  /** Number of items that could not be grouped (no activity/person/zone). */
  untrackedCount: number;
}

const DEFAULT_MIN: Partial<Record<KindKey, number>> = { appt: 60, meal: 30, gcal: 60, care: 45 };
const SKIP: KindKey[] = ["bday", "hol", "cosmic"];

const toMin = (t?: string | null) => {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : null;
};

const UNTRACKED = "__untracked__";

export function useTimeAllocation(from: Date, days: number, groupBy: GroupBy): Allocation {
  const { items } = usePlannerFeed(from, days);
  const { state } = useStore() as any;

  const taskById = useMemo(() => {
    const m = new Map<string, any>();
    for (const t of state.tasks ?? []) m.set(t.id, t);
    return m;
  }, [state.tasks]);

  const recipientById = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of state.recipients ?? []) m.set(r.id, r.name);
    return m;
  }, [state.recipients]);

  return useMemo(() => {
    const byKey = new Map<string, AllocationSlice>();
    let allDayCount = 0;
    let untrackedCount = 0;

    for (const it of items) {
      if (SKIP.includes(it.kind)) continue;
      const task = it.sourceRef.type === "task" ? taskById.get(it.sourceRef.id) : null;

      const s = toMin(it.time);
      const e = toMin(it.endTime);
      let minutes = s !== null && e !== null && e > s ? e - s : 0;
      if (!minutes) minutes = task?.estMinutes ?? DEFAULT_MIN[it.kind] ?? 30;
      if (it.allDay && !task) { allDayCount += 1; if (it.kind !== "meal") continue; }

      let key: string;
      let label: string;
      let color = it.color;

      if (groupBy === "area") {
        key = task ? (task.area || "Unsorted") : KIND_LABEL[it.kind];
        label = key;
      } else if (groupBy === "activity") {
        const act = resolveActivity(task) ?? (it.kind === "meal" ? resolveActivity({ area: "Meals" }) : null);
        key = act?.id ?? UNTRACKED;
        label = act?.label ?? "Untracked";
        color = act?.color ?? "hsl(215 15% 55%)";
        if (!act) untrackedCount += 1;
      } else if (groupBy === "person") {
        const rid = task?.recipientId ?? (it.sourceRef.type === "appointment" ? undefined : undefined);
        const name = rid ? recipientById.get(rid) : undefined;
        key = name ?? UNTRACKED;
        label = name ?? "Just me";
        if (!name) untrackedCount += 1;
      } else if (groupBy === "zone") {
        const zone = readZoneTag(task?.tags);
        key = zone ?? UNTRACKED;
        label = zone ?? "No zone";
        if (!zone) untrackedCount += 1;
      } else {
        key = it.kind;
        label = KIND_LABEL[it.kind];
      }

      const slice = byKey.get(key) ?? { key, label, color, plannedMin: 0, doneMin: 0 };
      slice.plannedMin += minutes;
      if (it.done) slice.doneMin += minutes;
      byKey.set(key, slice);
    }

    const slices = [...byKey.values()].sort((a, b) => {
      // Keep the catch-all bucket last so real categories read first.
      if (a.key === UNTRACKED) return 1;
      if (b.key === UNTRACKED) return -1;
      return b.plannedMin - a.plannedMin;
    });
    const totalPlannedMin = slices.reduce((s, x) => s + x.plannedMin, 0);
    const totalDoneMin = slices.reduce((s, x) => s + x.doneMin, 0);
    const capacity = days * 16 * 60;
    return {
      slices,
      totalPlannedMin,
      totalDoneMin,
      allDayCount,
      untrackedCount,
      plannedShare: capacity ? Math.min(1, totalPlannedMin / capacity) : 0,
    };
  }, [items, taskById, recipientById, groupBy, days]);
}

export const fmtHours = (min: number) => `${Math.round(min / 6) / 10}h`;

/** This window versus the window immediately before it, same length. */
export function useAllocationComparison(from: Date, days: number, groupBy: GroupBy): {
  current: Allocation;
  previous: Allocation;
  deltaFor: (key: string) => number;
} {
  const current = useTimeAllocation(from, days, groupBy);
  const previous = useTimeAllocation(addDays(from, -days), days, groupBy);

  const prevByKey = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of previous.slices) m.set(s.key, s.plannedMin);
    return m;
  }, [previous.slices]);

  const deltaFor = (key: string) => {
    const now = current.slices.find(s => s.key === key)?.plannedMin ?? 0;
    return now - (prevByKey.get(key) ?? 0);
  };

  return { current, previous, deltaFor };
}

/* ------------------------------------------------------------------ */
/* Rhythm series: planned/completed time against moon, cycle and mood  */
/* ------------------------------------------------------------------ */

export interface RhythmDay {
  iso: string;
  date: Date;
  label: string;
  plannedH: number;
  doneH: number;
  illumination: number;
  moonLabel: string;
  moonGlyph: string;
  cyclePhase: CyclePhase | null;
  cycleLabel: string | null;
  cycleColor: string | null;
  /** 0-3 average of logged energy for the day, null when nothing logged. */
  energyScore: number | null;
  /** 0-3 average of logged mood for the day, null when nothing logged. */
  moodScore: number | null;
}

export interface RhythmSeries {
  days: RhythmDay[];
  insights: string[];
  hasCycle: boolean;
  hasLogs: boolean;
}

const ENERGY_SCORE: Record<Energy, number> = { low: 1, medium: 2, high: 3 };
const MOOD_SCORE: Record<Mood, number> = { rough: 0.5, okay: 1.5, good: 2.25, bright: 3 };
const PARTS: DayPart[] = ["morning", "afternoon", "evening"];

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Per-day planned/completed hours enriched with moon, cycle and self-reports. */
export function useRhythmSeries(from: Date, days: number): RhythmSeries {
  const { byDay } = usePlannerFeed(from, days);
  const { state } = useStore() as any;
  const { periods, settings } = useCycle();

  const taskById = useMemo(() => {
    const m = new Map<string, any>();
    for (const t of state.tasks ?? []) m.set(t.id, t);
    return m;
  }, [state.tasks]);

  return useMemo(() => {
    const out: RhythmDay[] = [];
    for (let i = 0; i < days; i++) {
      const date = addDays(from, i);
      const iso = format(date, "yyyy-MM-dd");
      const items = byDay.get(iso) ?? [];

      let planned = 0;
      let done = 0;
      for (const it of items) {
        if (SKIP.includes(it.kind)) continue;
        const task = it.sourceRef.type === "task" ? taskById.get(it.sourceRef.id) : null;
        const s = toMin(it.time);
        const e = toMin(it.endTime);
        let minutes = s !== null && e !== null && e > s ? e - s : 0;
        if (!minutes) minutes = task?.estMinutes ?? DEFAULT_MIN[it.kind] ?? 30;
        if (it.allDay && !task && it.kind !== "meal") continue;
        planned += minutes;
        if (it.done) done += minutes;
      }

      const moonPhase = getMoonPhase(date);
      let cycle: ReturnType<typeof getPhaseInfo> = null;
      if (settings.enabled) {
        try { cycle = getPhaseInfo(date, periods, settings); } catch { cycle = null; }
      }

      const energies = PARTS.map(p => getEnergyForPart(iso, p)).filter(Boolean) as Energy[];
      const moods = PARTS.map(p => getMoodForPart(iso, p)).filter(Boolean) as Mood[];

      out.push({
        iso,
        date,
        label: format(date, days > 31 ? "MMM d" : "EEE d"),
        plannedH: Math.round(planned / 6) / 10,
        doneH: Math.round(done / 6) / 10,
        illumination: getIllumination(date),
        moonLabel: MOON_INFO[moonPhase].label,
        moonGlyph: MOON_INFO[moonPhase].glyph,
        cyclePhase: cycle?.phase ?? null,
        cycleLabel: cycle ? `${PHASE_META[cycle.phase].label} · day ${cycle.cycleDay}` : null,
        cycleColor: cycle ? `hsl(var(${cycle.tokenVar}))` : null,
        energyScore: energies.length ? avg(energies.map(e => ENERGY_SCORE[e])) : null,
        moodScore: moods.length ? avg(moods.map(m => MOOD_SCORE[m])) : null,
      });
    }

    const insights: string[] = [];
    const planned = out.filter(d => d.plannedH > 0);

    const menstrual = out.filter(d => d.cyclePhase === "menstrual");
    const otherPhase = out.filter(d => d.cyclePhase && d.cyclePhase !== "menstrual");
    if (menstrual.length >= 2 && otherPhase.length >= 3) {
      const a = avg(menstrual.map(d => d.plannedH));
      const b = avg(otherPhase.map(d => d.plannedH));
      if (b > 0) {
        const delta = Math.round(((a - b) / b) * 100);
        if (Math.abs(delta) >= 15) {
          insights.push(delta < 0
            ? `You planned about ${Math.abs(delta)}% less on menstrual days — that looks like listening to your body.`
            : `You planned about ${delta}% more on menstrual days. Worth a gentle look.`);
        }
      }
    }

    const bright = planned.filter(d => d.illumination >= 80);
    const dark = planned.filter(d => d.illumination <= 20);
    const rate = (xs: RhythmDay[]) => {
      const p = xs.reduce((s, d) => s + d.plannedH, 0);
      return p > 0 ? xs.reduce((s, d) => s + d.doneH, 0) / p : 0;
    };
    if (bright.length >= 2 && dark.length >= 2) {
      const rb = rate(bright);
      const rd = rate(dark);
      if (Math.abs(rb - rd) >= 0.15) {
        insights.push(rb > rd
          ? `You finished more of what you planned around the full moon (${Math.round(rb * 100)}% vs ${Math.round(rd * 100)}%).`
          : `Completion ran higher near the new moon (${Math.round(rd * 100)}% vs ${Math.round(rb * 100)}%).`);
      }
    }

    const logged = out.filter(d => d.energyScore !== null);
    if (logged.length >= 3) {
      const high = logged.filter(d => (d.energyScore ?? 0) >= 2.5);
      if (high.length >= 2) {
        const parts = high.map(d => format(d.date, "EEE"));
        insights.push(`Highest energy showed up on ${[...new Set(parts)].slice(0, 3).join(", ")}.`);
      }
    }

    return {
      days: out,
      insights,
      hasCycle: out.some(d => d.cyclePhase),
      hasLogs: out.some(d => d.energyScore !== null || d.moodScore !== null),
    };
  }, [byDay, days, from, taskById, periods, settings]);
}
