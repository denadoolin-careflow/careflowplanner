/** Builds a gentle markdown log of a day's completed tasks, habits/routines, and meals. */
export function buildDayRhythm(state: any, date: string): string {
  const tasks = (state.tasks ?? []).filter((t: any) => t.done && (t.dueDate === date || t.startDate === date || String(t.completedAt ?? "").startsWith(date)));
  const habits = (state.habits ?? []).filter((h: any) => h.log?.[date]);
  const routines = (state.routines ?? []).filter((r: any) => Array.isArray(r.items) && r.items.length && r.items.every((i: any) => i.done));
  const meals = (state.meals ?? []).filter((m: any) => m.date === date);
  const lines = ["", "## 🌿 Day's rhythm", ""];
  const section = (label: string, items: string[]) => {
    if (!items.length) return;
    lines.push(`**${label}**`, ...items.map(i => `- ${i}`), "");
  };
  section("Completed", tasks.map((t: any) => t.title));
  section("Rituals & habits", [...habits.map((h: any) => h.title), ...routines.map((r: any) => r.title ?? r.name)].filter(Boolean));
  section("Meals", meals.map((m: any) => `${m.slot}: ${m.name}`));
  if (lines.length === 3) lines.push("_A quiet day — nothing logged yet._", "");
  return lines.join("\n");
}

export function appendDayRhythm(body: string, state: any, date: string): string {
  return `${(body ?? "").replace(/\s+$/, "")}\n${buildDayRhythm(state, date)}`;
}
