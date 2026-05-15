import { useMemo } from "react";
import { addDays, format } from "date-fns";
import { useStore, todayISO } from "@/lib/store";
import { TaskRow } from "@/components/cards/TaskRow";
import { LucideIcon } from "lucide-react";
import type { Task } from "@/lib/types";
import { InlineTaskComposer } from "@/components/tasks/InlineTaskComposer";
import { UnscheduledTasksRail } from "@/components/calendar/UnscheduledTasksRail";
import { TaskListControls, useTaskListPrefs } from "@/components/tasks/TaskListControls";
import { applyFilters, sortTasks, groupTasks } from "@/lib/task-grouping";

type Variant = "upcoming" | "anytime" | "someday" | "logbook";

const META: Record<Variant, { title: string; subtitle: string }> = {
  upcoming: { title: "Upcoming", subtitle: "Scheduled for the days ahead." },
  anytime: { title: "Anytime", subtitle: "Things you can do whenever." },
  someday: { title: "Someday", subtitle: "Ideas to revisit later — no pressure." },
  logbook: { title: "Logbook", subtitle: "Everything you've completed." },
};

function filterTasks(all: Task[], variant: Variant): Task[] {
  const today = todayISO();
  const root = all.filter(t => !t.parentTaskId);
  switch (variant) {
    case "upcoming":
      return root.filter(t => !t.done && t.dueDate && t.dueDate > today)
                 .sort((a,b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
    case "anytime":
      return root.filter(t => !t.done && !t.dueDate && t.status !== "someday" && !t.inbox);
    case "someday":
      return root.filter(t => !t.done && t.status === "someday");
    case "logbook":
      return root.filter(t => t.done)
                 .sort((a,b) => (b.lastCompletedAt ?? "").localeCompare(a.lastCompletedAt ?? ""));
  }
}

export function TaskListPage({ variant, icon: Icon }: { variant: Variant; icon: LucideIcon }) {
  const { state } = useStore();
  const [prefs, setPrefs] = useTaskListPrefs(`tlp:${variant}`);
  const groups = useMemo(() => {
    const filtered = applyFilters(filterTasks(state.tasks, variant), prefs.filter);
    const sorted = sortTasks(filtered, prefs.sort);
    return groupTasks(sorted, prefs.group, state.projects ?? []);
  }, [state.tasks, state.projects, variant, prefs]);
  const total = groups.reduce((s, g) => s + g.tasks.length, 0);
  const meta = META[variant];

  const composerDefaults =
    variant === "upcoming" ? { dueDate: format(addDays(new Date(), 1), "yyyy-MM-dd") }
    : variant === "someday" ? { status: "someday" as const }
    : {};

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 mx-auto w-full max-w-3xl space-y-4 p-4 md:p-6">
      <header className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{meta.title}</h1>
          <p className="text-sm text-muted-foreground">{meta.subtitle} {total} {total === 1 ? "item" : "items"}.</p>
        </div>
        <TaskListControls prefs={prefs} onChange={setPrefs} />
      </header>

      {variant !== "logbook" && (
        <InlineTaskComposer defaults={composerDefaults} placeholder={`Add to ${meta.title.toLowerCase()}…`} />
      )}

      <div className="rounded-2xl border border-border/60 bg-card/60 p-2">
        {total === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nothing here yet ✨</div>
        ) : (
          <div className="space-y-3">
            {groups.map(g => (
              <div key={g.key} className="space-y-1">
                {prefs.group !== "none" && (
                  <div className="px-2 pt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {g.label} <span className="opacity-60">· {g.tasks.length}</span>
                  </div>
                )}
                {g.tasks.map(t => <TaskRow key={t.id} task={t} />)}
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
      <UnscheduledTasksRail />
    </div>
  );
}