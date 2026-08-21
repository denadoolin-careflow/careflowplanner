/**
 * Time snapping preferences + conflict detection shared by the Inbox
 * drop lanes and the schedule picker.
 *
 * The user's preferred step (5 / 10 / 15 / 30 / 60 min) is persisted in
 * localStorage so every suggested time lands on the same grid.
 */

export type SnapStep = 5 | 10 | 15 | 30 | 60;
export const SNAP_STEPS: SnapStep[] = [5, 10, 15, 30, 60];

const KEY = "careflow:planner:snap-step";
const DEFAULT_STEP: SnapStep = 15;

export function getSnapStep(): SnapStep {
  try {
    const raw = Number(localStorage.getItem(KEY));
    return (SNAP_STEPS as number[]).includes(raw) ? (raw as SnapStep) : DEFAULT_STEP;
  } catch {
    return DEFAULT_STEP;
  }
}

export function setSnapStep(step: SnapStep) {
  try { localStorage.setItem(KEY, String(step)); } catch { /* noop */ }
  try { window.dispatchEvent(new CustomEvent("careflow:snap-step", { detail: { step } })); } catch { /* noop */ }
}

/** "HH:mm" → minutes since midnight (null when unparseable). */
export function toMinutes(time?: string | null): number | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (Number.isNaN(h) || Number.isNaN(mi)) return null;
  return h * 60 + mi;
}

/** minutes since midnight → "HH:mm" (clamped to the day). */
export function toTime(min: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(min)));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

/** Round minutes to the nearest step. */
export function snapMinutesTo(min: number, step: SnapStep = getSnapStep()): number {
  return Math.round(min / step) * step;
}

/** Snap a "HH:mm" string to the preferred step. */
export function snapTime(time: string | undefined | null, step: SnapStep = getSnapStep()): string | undefined {
  const min = toMinutes(time);
  if (min == null) return undefined;
  return toTime(snapMinutesTo(min, step));
}

/** Default start (minutes) for a day part, snapped to the step. */
export const DAY_PART_START: Record<string, number> = {
  Morning: 9 * 60,
  Afternoon: 13 * 60,
  Evening: 18 * 60,
};

export const DAY_PART_RANGE: Record<string, [number, number]> = {
  Morning: [5 * 60, 12 * 60],
  Afternoon: [12 * 60, 17 * 60],
  Evening: [17 * 60, 22 * 60],
};

export interface BusyBlock { start: number; end: number; title: string; id?: string }

/** Build busy blocks (minutes) from anything with a start time + duration. */
export function busyFrom(
  rows: { id?: string; title?: string; startTime?: string | null; time?: string | null; endTime?: string | null; estMinutes?: number | null }[],
  excludeId?: string,
): BusyBlock[] {
  const out: BusyBlock[] = [];
  for (const r of rows) {
    if (excludeId && r.id === excludeId) continue;
    const start = toMinutes(r.startTime ?? r.time ?? null);
    if (start == null) continue;
    const end = toMinutes(r.endTime ?? null) ?? start + (r.estMinutes ?? 30);
    out.push({ start, end: Math.max(end, start + 5), title: r.title || "Scheduled item", id: r.id });
  }
  return out.sort((a, b) => a.start - b.start);
}

/** The first busy block overlapping [start, start+duration), if any. */
export function findConflict(startMin: number, duration: number, busy: BusyBlock[]): BusyBlock | null {
  const end = startMin + Math.max(5, duration);
  return busy.find((b) => startMin < b.end && end > b.start) ?? null;
}

/** Every busy block overlapping [start, start+duration), in time order. */
export function findConflicts(startMin: number, duration: number, busy: BusyBlock[]): BusyBlock[] {
  const end = startMin + Math.max(5, duration);
  return busy.filter((b) => startMin < b.end && end > b.start);
}

/**
 * Next free snapped start at or after `fromMin` that fits `duration`.
 * Returns null when nothing fits before the end of the day.
 */
export function nextFreeSlot(
  fromMin: number,
  duration: number,
  busy: BusyBlock[],
  step: SnapStep = getSnapStep(),
): number | null {
  let cursor = snapMinutesTo(Math.max(0, fromMin), step);
  const limit = 23 * 60;
  let guard = 0;
  while (cursor <= limit && guard++ < 400) {
    const clash = findConflict(cursor, duration, busy);
    if (!clash) return cursor;
    cursor = snapMinutesTo(clash.end + step - 1, step);
  }
  return null;
}

/** Suggested snapped start time for a day part, avoiding conflicts. */
export function suggestForDayPart(
  dayPart: string,
  duration: number,
  busy: BusyBlock[],
  step: SnapStep = getSnapStep(),
): string {
  const base = snapMinutesTo(DAY_PART_START[dayPart] ?? 9 * 60, step);
  const free = nextFreeSlot(base, duration, busy, step);
  return toTime(free ?? base);
}

/** Human label for a busy block, e.g. "9:00 – 9:30". */
export function busyLabel(b: BusyBlock): string {
  const fmt = (m: number) => {
    const h = Math.floor(m / 60);
    const mm = String(m % 60).padStart(2, "0");
    const ampm = h >= 12 ? "pm" : "am";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${mm}${ampm}`;
  };
  return `${fmt(b.start)} – ${fmt(b.end)}`;
}
