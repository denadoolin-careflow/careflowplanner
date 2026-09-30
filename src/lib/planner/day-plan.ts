/**
 * One day's plan, grouped the way the planner groups it: all-day,
 * morning, afternoon, evening — plus meals, events and cosmic events.
 * Pure derivation from the store; nothing is persisted here.
 */
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import type { Meal, Task } from "@/lib/types";
import { buildCosmicCalendarIndex, type CosmicCalendarItem } from "@/lib/cosmic/calendar-feed";
import { fromISO } from "@/lib/notes/periods";

export type TimeBucket = "allDay" | "morning" | "afternoon" | "evening";

export const BUCKET_LABEL: Record<TimeBucket, string> = {
  allDay: "All day",
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

/** Default time a task gets when added straight into a group. */
export const BUCKET_DEFAULT_TIME: Record<TimeBucket, string | null> = {
  allDay: null,
  morning: "09:00",
  afternoon: "13:00",
  evening: "18:00",
};

/** Estimated capacity in minutes per bucket. Matches PlannerCapacityBar. */
export const BUCKET_BUDGET: Record<TimeBucket, number> = {
  allDay: 0,
  morning: 420,
  afternoon: 300,
  evening: 300,
};

export const hmToMin = (hm?: string | null): number | null => {
  if (!hm) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(hm);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};

export function taskTime(t: Task): string | null {
  return (t as any).startTime ?? (t as any).dueTime ?? null;
}

/** "13:05" → "1:05 pm", "09:00" → "9 am". Leaves unparseable values alone. */
export function fmt12(hm?: string | null): string {
  const min = hmToMin(hm);
  if (min == null) return hm ?? "";
  const h24 = Math.floor(min / 60), m = min % 60;
  const ap = h24 >= 12 ? "pm" : "am";
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return m ? `${h}:${String(m).padStart(2, "0")} ${ap}` : `${h} ${ap}`;
}

export function bucketFor(t: Task): TimeBucket {
  if ((t as any).allDay) return "allDay";
  const min = hmToMin(taskTime(t));
  if (min == null) return "allDay";
  if (min < 12 * 60) return "morning";
  if (min < 17 * 60) return "afternoon";
  return "evening";
}

export function bucketForMeal(m: Meal): TimeBucket {
  const slot = m.slot.toLowerCase();
  if (slot === "breakfast") return "morning";
  if (slot === "lunch") return "afternoon";
  if (slot === "dinner") return "evening";
  return "afternoon"; // Snacks/Drinks
}

export interface DayGroup {
  bucket: TimeBucket;
  tasks: Task[];
  meals: Meal[];
  timeLeft?: number;
}

export interface DayPlan {
  iso: string;
  groups: DayGroup[];
  tasks: Task[];
  meals: Meal[];
  events: any[];
  cosmic: CosmicCalendarItem[];
}

const ORDER: TimeBucket[] = ["allDay", "morning", "afternoon", "evening"];

/** Build day plans for a list of ISO dates in one pass. */
export function useDayPlans(dates: string[]): Map<string, DayPlan> {
  const { state } = useStore();
  const key = dates.join(",");
  return useMemo(() => {
    const set = new Set(dates);
    const out = new Map<string, DayPlan>();
    for (const iso of dates) {
      out.set(iso, { iso, groups: ORDER.map(b => ({ bucket: b, tasks: [], meals: [] })), tasks: [], meals: [], events: [], cosmic: [] });
    }
    for (const t of (state.tasks ?? []) as Task[]) {
      const iso = (t as any).dueDate?.slice(0, 10);
      if (!iso || !set.has(iso)) continue;
      const plan = out.get(iso)!;
      plan.tasks.push(t);
      plan.groups.find(g => g.bucket === bucketFor(t))!.tasks.push(t);
    }
    for (const m of (state.meals ?? []) as Meal[]) {
      const iso = m.date?.slice(0, 10);
      if (iso && set.has(iso)) {
        const plan = out.get(iso)!;
        plan.meals.push(m);
        plan.groups.find(g => g.bucket === bucketForMeal(m))!.meals.push(m);
      }
    }
    for (const plan of out.values()) {
      for (const g of plan.groups) {
        g.tasks.sort((a, b) => (hmToMin(taskTime(a)) ?? 0) - (hmToMin(taskTime(b)) ?? 0));
        
        // Calculate Time Left (simplified: budget - active tasks)
        const budget = BUCKET_BUDGET[g.bucket];
        if (budget > 0) {
          const used = g.tasks.reduce((acc, t) => acc + (!t.done ? (t.estMinutes ?? 30) : 0), 0);
          g.timeLeft = Math.max(0, budget - used);
        }
      }
    }
    for (const a of (state.appointments ?? []) as any[]) {
      const iso = a.date?.slice(0, 10);
      if (iso && set.has(iso)) out.get(iso)!.events.push(a);
    }
    if (dates.length) {
      const sorted = [...dates].sort();
      const from = fromISO(sorted[0]);
      const days = Math.max(1, Math.round((fromISO(sorted[sorted.length - 1]).getTime() - from.getTime()) / 86400000) + 1);
      const cosmic = buildCosmicCalendarIndex(from, days);
      for (const [iso, list] of cosmic) {
        if (out.has(iso)) out.get(iso)!.cosmic.push(...list);
      }
    }
    return out;
  }, [key, state.tasks, state.appointments, state.meals]);
}

/** Convenience for a single day. */
export function useDayPlan(iso: string): DayPlan {
  const map = useDayPlans(useMemo(() => [iso], [iso]));
  return map.get(iso)!;
}
