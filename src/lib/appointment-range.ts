import type { Appointment } from "./types";

/** True when ISO date `k` (YYYY-MM-DD) falls within the appointment's
 *  inclusive [date, endDate] range. Falls back to single-day. */
export function apptOccursOn(a: Pick<Appointment, "date" | "endDate">, k: string): boolean {
  if (!a.date) return false;
  const end = a.endDate && a.endDate >= a.date ? a.endDate : a.date;
  return k >= a.date && k <= end;
}

/** Position metadata for rendering a multi-day appointment on a given day. */
export function apptRangeMeta(a: Pick<Appointment, "date" | "endDate">, k: string) {
  const end = a.endDate && a.endDate >= a.date ? a.endDate : a.date;
  const isMulti = end !== a.date;
  return {
    isMulti,
    isStart: k === a.date,
    isEnd: k === end,
    isMiddle: isMulti && k > a.date && k < end,
  };
}

export function isMultiDay(a: Pick<Appointment, "date" | "endDate">): boolean {
  return !!(a.endDate && a.endDate > a.date);
}