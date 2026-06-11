import { moonPhaseFor } from "@/lib/moon-phase";
import { getActiveAspects } from "@/lib/cosmic/active-aspects";

/** Build a compact live snapshot to give Carey current awareness of the user's life. */
export function buildCareySnapshot(state: any): Record<string, unknown> {
  const today = new Date().toISOString().slice(0, 10);
  const in3days = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const in7days = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const tasks: any[] = state?.tasks ?? [];
  const goals: any[] = state?.goals ?? [];
  const habits: any[] = state?.habits ?? [];
  const projects: any[] = state?.projects ?? [];
  const journals: any[] = (state as any)?.journal ?? [];

  const todayTasks = tasks
    .filter(t => t.dueDate === today && t.status !== "done")
    .slice(0, 15)
    .map(t => ({ title: t.title, priority: t.priority, area: t.area, est: t.estMinutes, energy: t.energy }));

  const overdue = tasks
    .filter(t => t.dueDate && t.dueDate < today && t.status !== "done")
    .slice(0, 10)
    .map(t => ({ title: t.title, due: t.dueDate, area: t.area, priority: t.priority, energy: t.energy, daysLate: Math.floor((Date.parse(today) - Date.parse(t.dueDate)) / 86400000) }));

  const soon = tasks
    .filter(t => t.dueDate && t.dueDate > today && t.dueDate <= in3days && t.status !== "done")
    .slice(0, 10)
    .map(t => ({ title: t.title, due: t.dueDate, area: t.area, priority: t.priority, energy: t.energy }));

  // "What can wait" — low-priority items due more than a week out, or undated low-priority.
  const canWait = tasks
    .filter(t => t.status !== "done" && (t.priority === "low" || !t.priority) && (!t.dueDate || t.dueDate > in7days))
    .slice(0, 10)
    .map(t => ({ title: t.title, due: t.dueDate ?? null, area: t.area }));

  const energyMix = todayTasks.reduce(
    (acc: any, t: any) => { acc[t.energy ?? "unset"] = (acc[t.energy ?? "unset"] ?? 0) + 1; return acc; },
    {} as Record<string, number>,
  );

  const activeGoals = goals.slice(0, 10).map(g => ({ title: g.title, area: g.area, progress: g.progress }));
  const activeProjects = projects.filter(p => p.status !== "archived").slice(0, 10).map(p => ({ name: p.name, status: p.status }));
  const recentJournal = journals.slice(-5).map(j => ({ date: j.date, mood: j.mood, snippet: String(j.body ?? j.text ?? "").slice(0, 160) }));
  const habitSnapshot = habits.slice(0, 15).map(h => {
    const log = h.log ?? {};
    const lastDone = Object.keys(log).filter(k => log[k]).sort().pop();
    const daysSince = lastDone ? Math.floor((Date.parse(today) - Date.parse(lastDone)) / 86400000) : null;
    return { name: h.name, streak: h.streak ?? 0, lastDone: lastDone ?? null, daysSince, atRisk: daysSince !== null && daysSince >= 2 && (h.streak ?? 0) >= 3 };
  });
  const habitsAtRisk = habitSnapshot.filter(h => h.atRisk).slice(0, 5);

  const currentEnergy: string | undefined = state?.settings?.currentEnergy ?? state?.energy?.current;

  // Cosmic context — pure date-derived signals so Carey can speak to moon/transit climate.
  let cosmic: Record<string, unknown> | null = null;
  try {
    const now = new Date();
    const moon = moonPhaseFor(now);
    const aspects = getActiveAspects(now, 3).map(a => ({
      title: a.title,
      meaning: a.meaning,
      affects: a.affects,
      intensity: a.intensity,
      motion: a.motion,
      exact: a.exactDate,
      retro: a.retroNote ?? null,
    }));
    cosmic = {
      moonPhase: moon ? { phase: moon.phase, label: moon.label } : null,
      topAspects: aspects,
    };
  } catch { /* best-effort; never block snapshot */ }

  return {
    today,
    counts: {
      tasksToday: todayTasks.length,
      overdue: overdue.length,
      soon: soon.length,
      canWait: canWait.length,
      activeGoals: activeGoals.length,
      activeProjects: activeProjects.length,
      habitsAtRisk: habitsAtRisk.length,
    },
    currentEnergy: currentEnergy ?? null,
    energyMixToday: energyMix,
    todayTasks,
    overdue,
    soon,
    canWait,
    activeGoals,
    activeProjects,
    recentJournal,
    habits: habitSnapshot,
    habitsAtRisk,
    lowEnergyMode: !!state?.settings?.lowEnergyMode,
    cosmic,
  };
}