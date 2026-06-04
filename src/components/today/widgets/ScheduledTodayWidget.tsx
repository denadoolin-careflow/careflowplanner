import { useMemo } from "react";
import { format } from "date-fns";
import { Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import { openTaskEditor } from "@/lib/open-task-editor";
import { cn } from "@/lib/utils";

/** Today's tasks that have an explicit start time, sorted chronologically. */
export function ScheduledTodayWidget({ date = new Date() }: { date?: Date }) {
  const { state } = useStore();
  const iso = format(date, "yyyy-MM-dd");

  const scheduled = useMemo(
    () => state.tasks
      .filter(t => t.dueDate === iso && !!t.startTime && !t.done && t.status !== "parked")
      .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? "")),
    [state.tasks, iso],
  );

  const fmtTime = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return format(d, "h:mma").toLowerCase();
  };

  return (
    <section className="cozy-card overflow-hidden p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-primary" />
          <h3 className="font-display text-sm font-semibold text-foreground">Scheduled today</h3>
        </div>
        <Link
          to="/calendar"
          className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          Calendar <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>

      {scheduled.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/50 px-2 py-3 text-center text-xs text-muted-foreground">
          Nothing scheduled · drag a task to a time.
        </p>
      ) : (
        <ul className="space-y-1">
          {scheduled.map(t => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => openTaskEditor(t.id)}
                className={cn(
                  "group flex w-full items-start gap-2 rounded-lg border border-border/40 bg-background/60 px-2 py-1.5 text-left transition-colors hover:bg-muted/50",
                )}
              >
                <span className="mt-0.5 inline-flex shrink-0 items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-primary">
                  {fmtTime(t.startTime!)}
                  {t.endTime ? `–${fmtTime(t.endTime)}` : ""}
                </span>
                <span className="min-w-0 flex-1 break-words text-xs leading-snug text-foreground">
                  {t.title}
                </span>
                {t.areaName && (
                  <span className="mt-1 hidden truncate text-[10px] text-muted-foreground sm:inline">
                    {t.areaName}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}