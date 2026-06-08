import type { StoreState } from "@/lib/store";

/** Build a compact live snapshot to give Carey current awareness of the user's life. */
export function buildCareySnapshot(state: any): Record<string, unknown> {
  const today = new Date().toISOString().slice(0, 10);
  const tasks: any[] = state?.tasks ?? [];
  const goals: any[] = state?.goals ?? [];
  const habits: any[] = state?.habits ?? [];
  const projects: any[] = state?.projects ?? [];
  const journals: any[] = state?.journals ?? state?.journalEntries ?? [];

  const todayTasks = tasks
    .filter(t => t.dueDate === today && t.status !== "done")
    .slice(0, 15)
    .map(t => ({ title: t.title, priority: t.priority, area: t.area, est: t.estMinutes }));

  const overdue = tasks
    .filter(t => t.dueDate && t.dueDate < today && t.status !== "done")
    .slice(0, 10)
    .map(t => ({ title: t.title, due: t.dueDate, area: t.area }));

  const activeGoals = goals.slice(0, 10).map(g => ({ title: g.title, area: g.area, progress: g.progress }));
  const activeProjects = projects.filter(p => p.status !== "archived").slice(0, 10).map(p => ({ name: p.name, status: p.status }));
  const recentJournal = journals.slice(-5).map(j => ({ date: j.date, mood: j.mood, snippet: String(j.body ?? j.text ?? "").slice(0, 160) }));
  const habitSnapshot = habits.slice(0, 10).map(h => ({ name: h.name, streak: h.streak }));

  return {
    today,
    counts: {
      tasksToday: todayTasks.length,
      overdue: overdue.length,
      activeGoals: activeGoals.length,
      activeProjects: activeProjects.length,
    },
    todayTasks,
    overdue,
    activeGoals,
    activeProjects,
    recentJournal,
    habits: habitSnapshot,
    lowEnergyMode: !!state?.settings?.lowEnergyMode,
  };
}