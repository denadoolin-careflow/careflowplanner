/**
 * Burnout detector — combines workload, journal mood trend, and missed
 * self-care habits to suggest a recovery day.
 */

const DAY = 86400000;

export type BurnoutLevel = "ok" | "watch" | "elevated" | "high";

export interface BurnoutReading {
  level: BurnoutLevel;
  score: number; // 0..100
  signals: string[];
  suggestion?: string;
}

const SELF_CARE_HINTS = [
  "rest", "sleep", "meditate", "stretch", "breath", "walk", "journal",
  "water", "yoga", "read", "nap", "self care", "self-care",
];

function isSelfCareHabit(name: string): boolean {
  const n = (name || "").toLowerCase();
  return SELF_CARE_HINTS.some(w => n.includes(w));
}

const MOOD_SCORE: Record<string, number> = { low: 1, medium: 2, high: 3 };

export function computeBurnout(state: any): BurnoutReading {
  const today = Date.now();
  const cutoff21 = today - 21 * DAY;
  const cutoff7 = today - 7 * DAY;
  const tasks: any[] = state?.tasks ?? [];
  const habits: any[] = state?.habits ?? [];
  const journals: any[] = state?.journal ?? [];

  // 1. Workload trend — completed tasks in last 21 days, compare last 7 vs prior 14
  const completed = tasks.filter(t => (t.status === "done" || t.done) && t.lastCompletedAt);
  const last7 = completed.filter(t => Date.parse(t.lastCompletedAt) >= cutoff7).length;
  const prior14 = completed.filter(t => {
    const ts = Date.parse(t.lastCompletedAt);
    return ts >= cutoff21 && ts < cutoff7;
  }).length;
  const prior14PerWeek = prior14 / 2;
  const workloadJump = prior14PerWeek > 0 ? last7 / prior14PerWeek : last7 > 10 ? 1.5 : 1;

  // 2. Mood trend — last 5 journal moods
  const recentMoods = journals
    .slice(-10)
    .map(j => (j.mood ? MOOD_SCORE[j.mood] : undefined))
    .filter((n): n is number => typeof n === "number");
  const avgMood = recentMoods.length ? recentMoods.reduce((s, n) => s + n, 0) / recentMoods.length : 2.2;

  // 3. Self-care habits missed
  const selfCareHabits = habits.filter(h => isSelfCareHabit(h.name));
  let missedSelfCare = 0;
  for (const h of selfCareHabits) {
    const log = h.log ?? {};
    const lastDone = Object.keys(log).filter(k => log[k]).sort().pop();
    const days = lastDone ? Math.floor((today - Date.parse(lastDone)) / DAY) : 99;
    if (days >= 3) missedSelfCare += 1;
  }

  const signals: string[] = [];
  let score = 0;

  if (workloadJump >= 1.6) { score += 35; signals.push(`Workload spiked ${Math.round((workloadJump - 1) * 100)}% vs prior weeks.`); }
  else if (workloadJump >= 1.25) { score += 18; signals.push("Workload trending up."); }

  if (avgMood <= 1.4) { score += 35; signals.push("Recent mood entries have been low."); }
  else if (avgMood <= 1.8) { score += 18; signals.push("Mood drifting lower than usual."); }

  if (missedSelfCare >= 2) { score += 25; signals.push(`${missedSelfCare} self-care habits haven't happened in 3+ days.`); }
  else if (missedSelfCare === 1) { score += 12; signals.push("A self-care habit is slipping."); }

  const level: BurnoutLevel =
    score >= 70 ? "high" : score >= 45 ? "elevated" : score >= 20 ? "watch" : "ok";

  const suggestion =
    level === "high"
      ? "Consider a true recovery day this week — clear the calendar, protect rest."
      : level === "elevated"
      ? "Schedule one slower half-day. Move two non-essentials. Pick up one self-care habit."
      : level === "watch"
      ? "Keep an eye on this — one gentle restorative ritual today would help."
      : undefined;

  return { level, score, signals, suggestion };
}