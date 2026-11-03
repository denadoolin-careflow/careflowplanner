/** Snap a minutes-since-midnight value to the nearest 15 minutes (0..1425). */
export function snapTo15(min: number): number {
  const s = Math.round(min / 15) * 15;
  return Math.max(0, Math.min(23 * 60 + 45, s));
}

export function minToHHMM(min: number): string {
  const m = snapTo15(min);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Quick time choices for click-to-schedule, one per phase window plus common slots. */
export const QUICK_TIMES = ["08:00", "09:00", "10:30", "12:00", "13:30", "15:00", "16:30", "18:00", "19:30", "21:00"];

export function fmt12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ap = h >= 12 ? "pm" : "am";
  const hh = h % 12 || 12;
  return m ? `${hh}:${String(m).padStart(2, "0")}${ap}` : `${hh}${ap}`;
}

export type AgeGroup = "today" | "week" | "older";
/** Inbox "Grouped by age": created today, within the last 7 days, or older. */
export function ageGroupOf(createdAt: string | undefined, now = new Date()): AgeGroup {
  if (!createdAt) return "older";
  const c = new Date(createdAt);
  if (isNaN(c.getTime())) return "older";
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (c.getTime() >= startToday) return "today";
  if (c.getTime() >= startToday - 6 * 86_400_000) return "week";
  return "older";
}
