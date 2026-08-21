/**
 * One scheduling behaviour shared by every planner surface.
 *
 * Board / List / Table drops all route through here so they honour the same
 * snap step, conflict detection and "pick another time" resolution the
 * Schedule grid already uses.
 */
import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import {
  busyFrom, findConflict, getSnapStep, nextFreeSlot, snapMinutesTo,
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

export interface PendingConflict {
  taskId: string;
  title: string;
  dateISO: string;
  requested: string;
  suggestion: string | null;
  clashTitle: string;
  clashRange: string;
}

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
    const clash = findConflict(toMinutes(requested)!, duration, busy);
    if (clash) {
      const free = nextFreeSlot(toMinutes(requested)!, duration, busy, step);
      setPending({
        taskId: task.id,
        title: task.title,
        dateISO,
        requested,
        suggestion: free != null ? toTime(free) : null,
        clashTitle: clash.title,
        clashRange: busyLabel(clash),
      });
      return;
    }
    updateTask(task.id, { dueDate: dateISO, startTime: requested });
    toast.success(`${PART_LABEL[part]} · ${requested} on ${dayLabel}`);
  }, [state.tasks, updateTask, updateAppointment, busyForDay]);

  const resolve = useCallback((choice: "anyway" | "suggested") => {
    if (!pending) return;
    const time = choice === "suggested" && pending.suggestion ? pending.suggestion : pending.requested;
    updateTask(pending.taskId, { dueDate: pending.dateISO, startTime: time });
    toast.success(`Scheduled for ${time}`);
    setPending(null);
  }, [pending, updateTask]);

  return useMemo(() => ({ schedule, pending, setPending, resolve }), [schedule, pending, resolve]);
}
