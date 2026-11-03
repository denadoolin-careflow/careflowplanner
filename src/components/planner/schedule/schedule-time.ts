import type { RhythmPhase } from "@/lib/planner/rhythm-phase";

export const PHASE_HOURS: Record<RhythmPhase, [number, number]> = { plan: [6, 12], grow: [12, 15], care: [15, 18], letgo: [18, 23] };
export interface TimedLike { time?: string; end?: string; kind: string }
export const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
/** Events default to 60 min and tasks to 30 min when no valid end time is set. */
export const durOf = (it: TimedLike) =>
  it.time && it.end && toMin(it.end) > toMin(it.time) ? toMin(it.end) - toMin(it.time) : it.kind === "appt" ? 60 : 30;
/** A time block is a timed event, or a timed task with an end time. */
export const isBlock = (it: TimedLike) => !!it.time && (it.kind === "appt" || !!it.end);

export function phaseBookedOpen(p: RhythmPhase, items: TimedLike[]) {
  const [s, e] = PHASE_HOURS[p];
  const booked = items.filter(isBlock).reduce((a, it) => a + durOf(it), 0);
  return { booked, open: Math.max((e - s) * 60 - booked, 0) };
}
