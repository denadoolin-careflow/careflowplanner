/**
 * Personalised movement suggestions built from your own history — the days you
 * actually moved, the activities you kept up with, and how your check-ins read
 * afterwards. Suggestions are gentle, editable, and never a prescription.
 */
import { useMemo } from "react";
import { activityLabel, summarizeWeek, useMovement, type MovementLog } from "./movement";

export interface MovementSuggestion {
  activity: string;
  activityLabel: string;
  minutes: number;
  daysPerWeek: number;
  /** Weekday indexes (0 = Sun) that historically worked best. */
  days: number[];
  reason: string;
}

const weekdayOf = (iso: string) => new Date(`${iso}T12:00:00`).getDay();

export function suggestMovement(logs: MovementLog[], currentTargetDays = 3): MovementSuggestion {
  const week = summarizeWeek(logs, currentTargetDays);

  const byActivity = new Map<string, { count: number; minutes: number }>();
  const byDay = new Map<number, number>();
  for (const l of logs) {
    const a = byActivity.get(l.activity) ?? { count: 0, minutes: 0 };
    a.count++; a.minutes += l.minutes;
    byActivity.set(l.activity, a);
    const d = weekdayOf(l.date);
    byDay.set(d, (byDay.get(d) ?? 0) + 1);
  }

  const top = Array.from(byActivity.entries()).sort((a, b) => b[1].count - a[1].count)[0];
  const activity = top?.[0] ?? "walk";
  const avgMinutes = top ? Math.round(top[1].minutes / top[1].count) : 20;

  // Nudge in small steps, never a jump.
  const recentDays = week.daysMoved;
  const daysPerWeek = logs.length === 0
    ? 2
    : Math.max(2, Math.min(6, recentDays >= currentTargetDays ? currentTargetDays + 1 : Math.max(recentDays, 2)));

  const days = Array.from(byDay.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, daysPerWeek)
    .map(([d]) => d)
    .sort();

  const minutes = Math.max(10, Math.min(60, logs.length ? avgMinutes : 15));

  const reason = logs.length === 0
    ? "You haven't logged movement yet, so this starts small and easy to keep."
    : recentDays >= currentTargetDays
      ? `You hit ${recentDays} of ${currentTargetDays} days this week — one more day is a gentle next step.`
      : `You averaged ${recentDays} day${recentDays === 1 ? "" : "s"} recently, so this keeps the bar within reach.`;

  return {
    activity,
    activityLabel: activityLabel(activity),
    minutes,
    daysPerWeek,
    days: days.length ? days : [1, 3, 6].slice(0, daysPerWeek),
    reason,
  };
}

export function useMovementSuggestion(currentTargetDays = 3) {
  const { logs, loading } = useMovement(90);
  const suggestion = useMemo(() => suggestMovement(logs, currentTargetDays), [logs, currentTargetDays]);
  return { suggestion, loading, logs };
}
