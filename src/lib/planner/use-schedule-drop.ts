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

const PART_LABEL: Record<DayPartKey, string> = {
  morning: "Morning", afternoon: "Afternoon", evening: "Evening",
};

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
  const { state, updateTask, updateAppointment } = useStore() as any;
  const [pending, setPending] = useState<PendingConflict | null>(null);

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

  /** Schedule a dragged item onto a day, optionally into a day part. */
  const schedule = useCallback((
    item: { type: string; id: string },
    dateISO: string,
    part?: DayPartKey,
  ) => {
    if (item.type === "appointment") {
      updateAppointment(item.id, { date: dateISO });
      toast.success("Appointment moved");
      return;
    }
    if (item.type !== "task") {
      toast.message("That item can't be rescheduled from here");
      return;
    }
    const task = (state.tasks ?? []).find((t: any) => t.id === item.id);
    if (!task) return;

    const step = getSnapStep();
    const duration = Math.max(15, task.estMinutes ?? 30);
    const busy = busyForDay(dateISO, task.id);
    const dayLabel = format(new Date(`${dateISO}T12:00:00`), "EEE, MMM d");

    if (!part) {
      // Day-level drop keeps whatever time the task already had (snapped).
      const keep = task.startTime ? toTime(snapMinutesTo(toMinutes(task.startTime) ?? 0, step)) : undefined;
      updateTask(task.id, { dueDate: dateISO, ...(keep ? { startTime: keep } : {}) });
      toast.success(`Moved to ${dayLabel}`);
      return;
    }

    const requested = suggestForDayPart(PART_LABEL[part], duration, [], step);
    const clash = findConflicts(toMinutes(requested)!, duration, busy);
    if (clash.length) {
      setPending(buildPending(task, dateISO, requested, duration, busy, clash));
      return;
    }
    updateTask(task.id, { dueDate: dateISO, startTime: requested });
    toast.success(`${PART_LABEL[part]} · ${requested} on ${dayLabel}`);
  }, [state.tasks, updateTask, updateAppointment, busyForDay, buildPending]);

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

  return useMemo(
    () => ({ schedule, scheduleMany, pending, setPending, resolve }),
    [schedule, scheduleMany, pending, resolve],
  );
}

/** Re-exported so callers keep one import for conflict helpers. */
export { findConflict };
