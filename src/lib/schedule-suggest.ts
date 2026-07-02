import { addMinutes, format, isBefore, parseISO, setHours, setMinutes, startOfDay } from "date-fns";
import type { Appointment, Task } from "./types";

export interface SuggestedSlot {
  date: string;   // yyyy-MM-dd
  time: string;   // HH:mm
  reason: string; // human-readable rationale
}

/**
 * Given a target date and existing appointments, find the first free 30-min
 * slot between 9am and 8pm that doesn't overlap another appointment.
 */
export function suggestSlotForDay(
  dateISO: string,
  duration: number,
  appointments: Appointment[]
): SuggestedSlot | null {
  const day = parseISO(dateISO);
  const busy: [Date, Date][] = appointments
    .filter(a => a.date === dateISO && a.time)
    .map(a => {
      const start = new Date(`${a.date}T${a.time!.slice(0,5)}:00`);
      const endTime = a.endTime ? a.endTime.slice(0,5) : format(addMinutes(start, 30), "HH:mm");
      const endD = a.endDate ?? a.date;
      const end = new Date(`${endD}T${endTime}:00`);
      return [start, end] as [Date, Date];
    })
    .sort((a, b) => a[0].getTime() - b[0].getTime());

  const dayStart = setHours(setMinutes(startOfDay(day), 0), 9);
  const dayEnd = setHours(setMinutes(startOfDay(day), 0), 20);
  let cursor = dayStart;
  while (isBefore(cursor, dayEnd)) {
    const end = addMinutes(cursor, duration);
    const clash = busy.find(([s, e]) => cursor < e && end > s);
    if (!clash) {
      return {
        date: dateISO,
        time: format(cursor, "HH:mm"),
        reason: busy.length === 0 ? "Your calendar is open" : "First open slot",
      };
    }
    cursor = clash[1]; // jump to end of clash
  }
  return null;
}

/** Suggest a slot for an unscheduled task using its estimated duration. */
export function suggestSlotForTask(task: Task, dateISO: string, appointments: Appointment[]): SuggestedSlot | null {
  const duration = task.estMinutes ?? 30;
  return suggestSlotForDay(dateISO, duration, appointments);
}