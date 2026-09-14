/**
 * One scheduling behaviour shared by every planner surface.
 *
 * Board / List / Table drops and the bulk bar all route through here so they
 * honour the same snap step, conflict detection and resolution the Schedule
 * grid already uses.
 */
import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import {
  busyFrom, findConflict, findConflicts, getSnapStep, nextFreeSlot, snapMinutesTo,
  suggestForDayPart, toMinutes, toTime, busyLabel, type BusyBlock,
} from "./time-snap";

export type DayPartKey = "morning" | "afternoon" | "evening";

const PART_LABEL: Record<DayPartKey, "Morning" | "Afternoon" | "Evening"> = {
  morning: "Morning", afternoon: "Afternoon", evening: "Evening",
};

const PART_MEAL: Record<DayPartKey, "Breakfast" | "Lunch" | "Dinner"> = {
  morning: "Breakfast", afternoon: "Lunch", evening: "Dinner",
};

/** A day already holding this many minutes asks before accepting more. */
export const FULL_DAY_MINUTES = 450;

export interface ScheduleOpts {
  /** Explicit "HH:MM" start (Schedule grid hour cells). */
  time?: string;
  /** Meal slot override (defaults from the day part when given). */
  slot?: "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Drink";
  /** Keep the task's current time if it already falls in the target part. */
  keepTime?: boolean;
  /** Skip the very-full-day confirmation (used after the user confirms). */
  skipCapacity?: boolean;
}

export interface PendingCapacity {
  item: { type: string; id: string };
  dateISO: string;
  part?: DayPartKey;
  opts: ScheduleOpts;
  title: string;
  load: number;
}

export function partOfTime(time?: string | null): DayPartKey {
  const h = Number((time ?? "").split(":")[0]);
  if (!Number.isFinite(h) || h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

const dayPartLabel = (p: DayPartKey) => PART_LABEL[p];

function itemDate(state: any, item: { type: string; id: string }): string | undefined {
  if (item.type === "task") return (state.tasks ?? []).find((t: any) => t.id === item.id)?.dueDate;
  if (item.type === "appointment") return (state.appointments ?? []).find((a: any) => a.id === item.id)?.date;
  if (item.type === "meal") return (state.meals ?? []).find((m: any) => m.id === item.id)?.date;
  return undefined;
}

function itemTitle(state: any, item: { type: string; id: string }): string {
  if (item.type === "task") return (state.tasks ?? []).find((t: any) => t.id === item.id)?.title ?? "Task";
  if (item.type === "appointment") return (state.appointments ?? []).find((a: any) => a.id === item.id)?.title ?? "Appointment";
  if (item.type === "meal") { const m = (state.meals ?? []).find((m: any) => m.id === item.id); return m?.title ?? m?.slot ?? "Meal"; }
  return "Item";
}

export const PLANNER_ITEM_MIME = "application/x-planner-item";

/** Read a dragged planner item ("task:123" / "appointment:456") off a drag event. */
export function readDraggedItem(e: React.DragEvent): { type: string; id: string } | null {
  const raw = e.dataTransfer.getData(PLANNER_ITEM_MIME)
    || e.dataTransfer.getData("application/x-careflow-task")
    || e.dataTransfer.getData("text/plain");
  if (!raw) return null;
  if (raw.includes(":")) {
    const [type, ...rest] = raw.split(":");
    const id = rest.join(":");
    if (!id) return null;
    return { type, id };
  }
  // Plain task id (inbox rails use the bare task MIME).
  return { type: "task", id: raw };
}

export interface ConflictRow {
  id?: string;
  title: string;
  range: string;
  start: number;
  end: number;
  /** Only tasks can trade places — appointments stay put. */
  swappable: boolean;
}

export interface PendingConflict {
  taskId: string;
  title: string;
  dateISO: string;
  requested: string;
  duration: number;
  suggestion: string | null;
  clashes: ConflictRow[];
  /** Kept for older callers reading a single clash. */
  clashTitle: string;
  clashRange: string;
}

export type ConflictChoice =
  | { kind: "anyway" }
  | { kind: "suggested" }
  | { kind: "shift" }
  | { kind: "swap"; withId: string };

export function useScheduleDrop() {
  const { state, updateTask, updateAppointment, updateMeal } = useStore() as any;
  const [pending, setPending] = useState<PendingConflict | null>(null);
  const [capacityPending, setCapacityPending] = useState<PendingCapacity | null>(null);

  const busyForDay = useCallback((dateISO: string, excludeId?: string): BusyBlock[] => {
    const rows = [
      ...(state.tasks ?? []).filter((t: any) => t.dueDate === dateISO && !t.done),
      ...(state.appointments ?? []).filter((a: any) => a.date === dateISO),
    ];
    return busyFrom(rows, excludeId);
  }, [state.tasks, state.appointments]);

  const taskIds = useCallback(
    () => new Set((state.tasks ?? []).map((t: any) => t.id)),
    [state.tasks],
  );

  const buildPending = useCallback((
    task: any, dateISO: string, requested: string, duration: number, busy: BusyBlock[], clash: BusyBlock[],
  ): PendingConflict => {
    const ids = taskIds();
    const free = nextFreeSlot(toMinutes(requested)!, duration, busy, getSnapStep());
    return {
      taskId: task.id,
      title: task.title,
      dateISO,
      requested,
      duration,
      suggestion: free != null ? toTime(free) : null,
      clashes: clash.map(c => ({
        id: c.id,
        title: c.title,
        range: busyLabel(c),
        start: c.start,
        end: c.end,
        swappable: !!c.id && ids.has(c.id),
      })),
      clashTitle: clash[0]?.title ?? "",
      clashRange: clash[0] ? busyLabel(clash[0]) : "",
    };
  }, [taskIds]);

  /** Rough minutes a day is already holding (mirrors the month view's load heuristic). */
  const storeDayLoad = useCallback((dateISO: string, excludeId?: string) => {
    let sum = 0;
    for (const t of state.tasks ?? []) {
      if (t.dueDate !== dateISO || t.done || t.id === excludeId || t.parentTaskId) continue;
      sum += t.estMinutes ?? (t.startTime ? 45 : 20);
    }
    for (const a of state.appointments ?? []) {
      if (a.date !== dateISO || a.id === excludeId) continue;
      sum += a.durationMinutes ?? 45;
    }
    for (const m of state.meals ?? []) {
      if (m.date !== dateISO || m.id === excludeId) continue;
      sum += 30;
    }
    return sum;
  }, [state.tasks, state.appointments, state.meals]);

  const undoToast = useCallback((message: string, revert: () => void) => {
    toast.success(message, { action: { label: "Undo", onClick: () => { revert(); toast.message("Moved back"); } } });
  }, []);

  /** Apply a move immediately — no capacity check. */
  const commit = useCallback((
    item: { type: string; id: string },
    dateISO: string,
    part?: DayPartKey,
    opts: ScheduleOpts = {},
  ) => {
    const dayLabel = format(new Date(`${dateISO}T12:00:00`), "EEE, MMM d");
    if (item.type === "appointment") {
      const before = (state.appointments ?? []).find((a: any) => a.id === item.id);
      if (!before) return;
      const patch: any = { date: dateISO };
      if (opts.time) patch.time = opts.time;
      else if (part && (!before.time || partOfTime(before.time) !== part)) patch.time = suggestForDayPart(PART_LABEL[part], before.durationMinutes ?? 45, [], getSnapStep());
      updateAppointment(item.id, patch);
      undoToast(`Appointment moved to ${dayLabel}`, () => updateAppointment(item.id, { date: before.date, time: before.time }));
      return;
    }
    if (item.type === "meal") {
      const before = (state.meals ?? []).find((m: any) => m.id === item.id);
      if (!before) return;
      const slot = opts.slot ?? (part ? PART_MEAL[part] : before.slot);
      updateMeal(item.id, { date: dateISO, slot });
      undoToast(`${slot} moved to ${dayLabel}`, () => updateMeal(item.id, { date: before.date, slot: before.slot }));
      return;
    }
    if (item.type !== "task") {
      toast.message("That item can't be rescheduled from here");
      return;
    }
    const task = (state.tasks ?? []).find((t: any) => t.id === item.id);
    if (!task) return;
    const revert = () => updateTask(task.id, { dueDate: task.dueDate, startTime: task.startTime, dayPart: task.dayPart, inbox: task.inbox });

    const step = getSnapStep();
    const duration = Math.max(15, task.estMinutes ?? 30);
    const busy = busyForDay(dateISO, task.id);

    if (opts.time) {
      const requested = toTime(snapMinutesTo(toMinutes(opts.time) ?? 9 * 60, step));
      const clash = findConflicts(toMinutes(requested)!, duration, busy);
      if (clash.length) { setPending(buildPending(task, dateISO, requested, duration, busy, clash)); return; }
      updateTask(task.id, { dueDate: dateISO, startTime: requested, dayPart: dayPartLabel(partOfTime(requested)), inbox: false });
      undoToast(`${requested} on ${dayLabel}`, revert);
      return;
    }

    if (!part) {
      // Day-level drop keeps whatever time the task already had (snapped).
      const keep = task.startTime ? toTime(snapMinutesTo(toMinutes(task.startTime) ?? 0, step)) : undefined;
      updateTask(task.id, { dueDate: dateISO, inbox: false, ...(keep ? { startTime: keep } : {}) });
      undoToast(`Moved to ${dayLabel}`, revert);
      return;
    }

    if (opts.keepTime && task.startTime && partOfTime(task.startTime) === part) {
      updateTask(task.id, { dueDate: dateISO, dayPart: PART_LABEL[part], inbox: false });
      undoToast(`${PART_LABEL[part]} on ${dayLabel}`, revert);
      return;
    }

    const requested = suggestForDayPart(PART_LABEL[part], duration, [], step);
    const clash = findConflicts(toMinutes(requested)!, duration, busy);
    if (clash.length) {
      setPending(buildPending(task, dateISO, requested, duration, busy, clash));
      return;
    }
    updateTask(task.id, { dueDate: dateISO, startTime: requested, dayPart: PART_LABEL[part], inbox: false });
    undoToast(`${PART_LABEL[part]} · ${requested} on ${dayLabel}`, revert);
  }, [state.tasks, state.appointments, state.meals, updateTask, updateAppointment, updateMeal, busyForDay, buildPending, undoToast]);

  /**
   * Schedule a dragged item onto a day, optionally into a day part or at an
   * explicit time. Very full days ask for confirmation first.
   */
  const schedule = useCallback((
    item: { type: string; id: string },
    dateISO: string,
    part?: DayPartKey,
    opts: ScheduleOpts = {},
  ) => {
    const fromDate = itemDate(state, item);
    const load = storeDayLoad(dateISO, item.id);
    if (!opts.skipCapacity && fromDate !== dateISO && load >= FULL_DAY_MINUTES) {
      setCapacityPending({ item, dateISO, part, opts, title: itemTitle(state, item), load });
      return;
    }
    commit(item, dateISO, part, opts);
  }, [state, storeDayLoad, commit]);

  const confirmCapacity = useCallback(() => {
    if (!capacityPending) return;
    const { item, dateISO, part, opts } = capacityPending;
    setCapacityPending(null);
    commit(item, dateISO, part, opts);
  }, [capacityPending, commit]);

  /**
   * Bulk move: place several tasks on a day (optionally into a day part or an
   * explicit time window), packing them back-to-back around what's already busy.
   */
  const scheduleMany = useCallback((
    ids: string[],
    dateISO: string,
    opts: { part?: DayPartKey; startTime?: string; timed?: boolean } = {},
  ) => {
    const step = getSnapStep();
    const busy = busyForDay(dateISO).filter(b => !ids.includes(b.id ?? ""));
    const tasks = ids
      .map(id => (state.tasks ?? []).find((t: any) => t.id === id))
      .filter(Boolean);
    if (!tasks.length) return;

    const dayLabel = format(new Date(`${dateISO}T12:00:00`), "EEE, MMM d");
    if (!opts.part && !opts.startTime) {
      tasks.forEach((t: any) => updateTask(t.id, { dueDate: dateISO }));
      toast.success(`${tasks.length} moved to ${dayLabel}`);
      return;
    }

    const base = opts.startTime
      ? snapMinutesTo(toMinutes(opts.startTime) ?? 9 * 60, step)
      : toMinutes(suggestForDayPart(PART_LABEL[opts.part!], 30, [], step))!;
    let cursor = base;
    let placed = 0;
    for (const t of tasks as any[]) {
      const duration = Math.max(15, t.estMinutes ?? 30);
      const slot = nextFreeSlot(cursor, duration, busy, step);
      const start = slot ?? cursor;
      updateTask(t.id, { dueDate: dateISO, startTime: toTime(start) });
      busy.push({ start, end: start + duration, title: t.title, id: t.id });
      busy.sort((a, b) => a.start - b.start);
      cursor = start + duration;
      placed++;
    }
    toast.success(`${placed} scheduled on ${dayLabel}`);
  }, [state.tasks, updateTask, busyForDay]);

  const resolve = useCallback((choice: ConflictChoice | "anyway" | "suggested") => {
    if (!pending) return;
    const c: ConflictChoice = typeof choice === "string" ? { kind: choice } : choice;

    if (c.kind === "swap") {
      const other = (state.tasks ?? []).find((t: any) => t.id === c.withId);
      const row = pending.clashes.find(r => r.id === c.withId);
      if (other && row) {
        updateTask(other.id, { dueDate: pending.dateISO, startTime: other.startTime ? pending.requested : undefined });
        updateTask(pending.taskId, { dueDate: pending.dateISO, startTime: toTime(row.start) });
        toast.success(`Swapped with ${other.title}`);
      }
      setPending(null);
      return;
    }

    if (c.kind === "shift") {
      const busy = busyForDay(pending.dateISO, pending.taskId);
      const free = nextFreeSlot(toMinutes(pending.requested)!, pending.duration, busy, getSnapStep());
      const time = free != null ? toTime(free) : pending.requested;
      updateTask(pending.taskId, { dueDate: pending.dateISO, startTime: time });
      toast.success(`Shifted to ${time}`);
      setPending(null);
      return;
    }

    const time = c.kind === "suggested" && pending.suggestion ? pending.suggestion : pending.requested;
    updateTask(pending.taskId, { dueDate: pending.dateISO, startTime: time });
    toast.success(`Scheduled for ${time}`);
    setPending(null);
  }, [pending, updateTask, state.tasks, busyForDay]);

  const cancelCapacity = useCallback(() => setCapacityPending(null), []);

  return useMemo(
    () => ({ schedule, scheduleMany, pending, setPending, resolve, capacityPending, confirmCapacity, cancelCapacity }),
    [schedule, scheduleMany, pending, resolve, capacityPending, confirmCapacity, cancelCapacity],
  );
}

/** Re-exported so callers keep one import for conflict helpers. */
export { findConflict };
