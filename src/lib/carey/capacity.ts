/**
 * Capacity engine — compares what the user *typically* completes per day
 * vs what they've scheduled, and returns a gentle signal.
 */

const DAY = 86400000;

export type CapacitySignal = "overloaded" | "balanced" | "light" | "unknown";

export interface CapacityReading {
  typicalCompletedPerDay: number;
  typicalMinutesPerDay: number;
  scheduledToday: number;
  scheduledMinutesToday: number;
  signal: CapacitySignal;
  message: string;
}

function isoDay(d: Date) { return d.toISOString().slice(0, 10); }

export function computeCapacity(state: any, lookbackDays = 14): CapacityReading {
  const today = isoDay(new Date());
  const tasks: any[] = state?.tasks ?? [];

  // Completed tasks per day, last N days
  const completedByDay = new Map<string, { count: number; minutes: number }>();
  for (let i = 1; i <= lookbackDays; i++) {
    completedByDay.set(isoDay(new Date(Date.now() - i * DAY)), { count: 0, minutes: 0 });
  }
  for (const t of tasks) {
    if (t.status !== "done" && !t.done) continue;
    const stamp = (t.lastCompletedAt ?? t.updatedAt ?? "").slice(0, 10);
    if (!stamp || !completedByDay.has(stamp)) continue;
    const row = completedByDay.get(stamp)!;
    row.count += 1;
    row.minutes += t.estMinutes ?? 20;
  }

  const daysWithActivity = [...completedByDay.values()].filter(r => r.count > 0);
  const typicalCompletedPerDay = daysWithActivity.length
    ? daysWithActivity.reduce((s, r) => s + r.count, 0) / daysWithActivity.length
    : 0;
  const typicalMinutesPerDay = daysWithActivity.length
    ? daysWithActivity.reduce((s, r) => s + r.minutes, 0) / daysWithActivity.length
    : 0;

  const scheduledTasks = tasks.filter(t => t.dueDate === today && t.status !== "done" && !t.done);
  const scheduledToday = scheduledTasks.length;
  const scheduledMinutesToday = scheduledTasks.reduce((s, t) => s + (t.estMinutes ?? 20), 0);

  let signal: CapacitySignal = "unknown";
  let message = "Not enough history yet — keep going and I'll learn your rhythm.";

  if (daysWithActivity.length >= 3) {
    const ratio = typicalCompletedPerDay > 0 ? scheduledToday / typicalCompletedPerDay : 0;
    if (scheduledToday === 0) {
      signal = "light";
      message = "Nothing scheduled — a soft day, if you want it.";
    } else if (ratio >= 1.6) {
      signal = "overloaded";
      message = `You scheduled ${scheduledToday} tasks (~${Math.round(scheduledMinutesToday / 60 * 10) / 10}h) but typically finish ${Math.round(typicalCompletedPerDay)}. Want to move a few to tomorrow?`;
    } else if (ratio <= 0.5) {
      signal = "light";
      message = `Light load today — ${scheduledToday} vs your usual ${Math.round(typicalCompletedPerDay)}. Good day for a goal step?`;
    } else {
      signal = "balanced";
      message = `Today fits your rhythm (${scheduledToday} planned, you usually finish ${Math.round(typicalCompletedPerDay)}).`;
    }
  }

  return {
    typicalCompletedPerDay: Math.round(typicalCompletedPerDay * 10) / 10,
    typicalMinutesPerDay: Math.round(typicalMinutesPerDay),
    scheduledToday,
    scheduledMinutesToday,
    signal,
    message,
  };
}