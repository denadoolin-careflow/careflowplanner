import type { Priority, Task } from "@/lib/types";

const RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export function pickTopThree(tasks: Task[], dateISO: string): Task[] {
  const pool = tasks.filter(
    (t) => t.dueDate === dateISO && !t.parentTaskId && t.status !== "parked",
  );
  return [...pool]
    .sort((a, b) => {
      if (!!b.isTopThree !== !!a.isTopThree) return b.isTopThree ? 1 : -1;
      if (a.done !== b.done) return a.done ? 1 : -1;
      const r = RANK[a.priority ?? "medium"] - RANK[b.priority ?? "medium"];
      if (r !== 0) return r;
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    })
    .slice(0, 3);
}