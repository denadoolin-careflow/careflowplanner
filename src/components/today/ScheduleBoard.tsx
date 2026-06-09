import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { CalendarClock, Clock } from "lucide-react";
import { useStore } from "@/lib/store";
import { DailySnapshotRow } from "@/components/today/rhythm/DailySnapshotRow";
import { WhatFitsNow } from "@/components/today/rhythm/WhatFitsNow";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";
import { QuickDayPartButton } from "@/components/tasks/QuickDayPartButton";

/** Appointment-first vertical schedule view. */
export function ScheduleBoard({ date, onTaskClick, onApptClick }: {
  date: Date;
  onTaskClick?: (id: string) => void;
  onApptClick?: (id: string) => void;
}) {
  const { state, toggleTask } = useStore();
  const iso = format(date, "yyyy-MM-dd");

  const items = useMemo(() => {
    const rows: { id: string; time?: string; label: string; kind: "appt" | "task"; done?: boolean; task?: Task }[] = [];
    for (const a of state.appointments ?? []) {
      if ((a.date ?? "") !== iso) continue;
      rows.push({ id: a.id, time: a.time ?? undefined, label: a.title, kind: "appt" });
    }
    for (const t of state.tasks) {
      if (t.dueDate !== iso || t.parentTaskId || t.status === "parked") continue;
      rows.push({ id: t.id, time: (t as any).dueTime ?? undefined, label: t.title, kind: "task", done: t.done, task: t });
    }
    rows.sort((a, b) => (a.time ?? "zz").localeCompare(b.time ?? "zz"));
    return rows;
  }, [state.appointments, state.tasks, iso]);

  return (
    <section className="space-y-4">
      <DailySnapshotRow date={date} />
      <WhatFitsNow date={date} onTaskClick={onTaskClick} />
      <div className="cozy-card p-4">
        <div className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5 text-primary" /> Schedule for {format(date, "MMM d")}
        </div>
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/50 px-2 py-6 text-center text-xs text-muted-foreground">
            Nothing scheduled.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {items.map(r => (
              <li
                key={`${r.kind}-${r.id}`}
                className={cn(
                  "group flex items-center gap-3 rounded-xl border border-border/40 bg-background/60 px-3 py-2",
                  r.done && "opacity-60",
                )}
              >
                <span className="w-14 shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {r.time ? r.time.slice(0, 5) : <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />Any</span>}
                </span>
                {r.kind === "task" ? (
                  <Checkbox checked={!!r.done} onCheckedChange={() => void toggleTask(r.id)} />
                ) : (
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-primary/15 text-[9px] font-semibold text-primary">·</span>
                )}
                <button
                  type="button"
                  onClick={() => r.kind === "task" ? onTaskClick?.(r.id) : onApptClick?.(r.id)}
                  className={cn(
                    "min-w-0 flex-1 truncate text-left text-sm",
                    r.done && "line-through text-muted-foreground",
                  )}
                >
                  {r.label}
                </button>
                {r.kind === "task" && r.task && (
                  <QuickDayPartButton task={r.task} />
                )}
                <span className="shrink-0 rounded-full bg-muted/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                  {r.kind}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}