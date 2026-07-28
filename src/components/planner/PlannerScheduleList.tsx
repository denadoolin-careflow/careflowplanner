import { useMemo } from "react";
import { format } from "date-fns";
import { CalendarClock, Inbox } from "lucide-react";
import { useStore } from "@/lib/store";
import { useTimeBlocks } from "@/lib/time-blocks";
import { PlannerTaskRow } from "./PlannerTaskRow";

function hmToMin(hm?: string | null): number | null {
  if (!hm || !/^\d{2}:\d{2}/.test(hm)) return null;
  const [h, m] = hm.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}
function label12(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  const s = h < 12 ? "a" : "p";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${s}` : `${h12}:${String(m).padStart(2, "0")}${s}`;
}

/**
 * Agenda ("Schedule") view — every item for the day in one time-ordered list,
 * appointments included, with unscheduled tasks parked at the bottom.
 */
export function PlannerScheduleList({ date }: { date: Date }) {
  const { state } = useStore();
  const iso = format(date, "yyyy-MM-dd");
  const { blocks } = useTimeBlocks(iso, iso);

  const { timed, untimed } = useMemo(() => {
    const blockStart = new Map<string, string>();
    for (const b of blocks) if (b.taskId) blockStart.set(b.taskId, b.startTime);
    const dayTasks = state.tasks.filter(t => t.dueDate === iso && !t.parentTaskId);
    const timedRows = dayTasks
      .map(t => ({ t, m: hmToMin(blockStart.get(t.id) ?? t.startTime) }))
      .filter(x => x.m != null)
      .sort((a, b) => a.m! - b.m!);
    const appts = (state.appointments ?? [])
      .filter(a => a.date === iso && hmToMin(a.time) != null)
      .map(a => ({ a, m: hmToMin(a.time)! }));
    return {
      timed: [...timedRows.map(r => ({ kind: "task" as const, m: r.m!, task: r.t })),
              ...appts.map(r => ({ kind: "appt" as const, m: r.m, appt: r.a }))]
        .sort((x, y) => x.m - y.m),
      untimed: dayTasks.filter(t => hmToMin(blockStart.get(t.id) ?? t.startTime) == null),
    };
  }, [state.tasks, state.appointments, blocks, iso]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
        <CalendarClock className="h-4 w-4 opacity-70" />
        <div className="text-sm font-semibold">Schedule</div>
        <div className="text-[11px] text-muted-foreground">{timed.length} timed · {untimed.length} unscheduled</div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {timed.length === 0 && untimed.length === 0 && (
          <p className="grid h-full place-items-center text-sm text-muted-foreground">Nothing planned for this day yet.</p>
        )}
        {timed.length > 0 && (
          <div className="space-y-1.5">
            {timed.map(row => (
              <div key={row.kind === "task" ? row.task.id : row.appt.id} className="flex items-start gap-3">
                <span className="mt-1 shrink-0 rounded-md bg-muted/80 px-1.5 py-0.5 font-mono text-[10px] tabular-nums">
                  {label12(row.m)}
                </span>
                <div className="min-w-0 flex-1">
                  {row.kind === "task" ? (
                    <PlannerTaskRow task={row.task} />
                  ) : (
                    <div className="rounded-lg border border-violet-300/50 bg-violet-100/50 px-2.5 py-1.5 text-sm dark:bg-violet-900/25">
                      {row.appt.title}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {untimed.length > 0 && (
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <Inbox className="h-3 w-3" /> Unscheduled
            </div>
            <div className="space-y-1.5">
              {untimed.map(t => <PlannerTaskRow key={t.id} task={t} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}