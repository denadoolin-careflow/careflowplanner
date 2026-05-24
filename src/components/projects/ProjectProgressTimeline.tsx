import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { CheckCircle2, PlusCircle, Clock } from "lucide-react";
import { formatRelativeDate } from "@/lib/date-format";
import { format, parseISO, isValid, differenceInCalendarDays } from "date-fns";

type TimelineEvent = {
  id: string;
  date: string; // ISO
  kind: "completed" | "added";
  title: string;
};

export function ProjectProgressTimeline({ projectId }: { projectId: string }) {
  const { state } = useStore();

  const { events, completedCount, addedCount } = useMemo(() => {
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const tasks = (state.tasks ?? []).filter(t => t.projectId === projectId);
    const evts: TimelineEvent[] = [];
    for (const t of tasks) {
      if (t.done && t.lastCompletedAt) {
        const d = new Date(t.lastCompletedAt);
        if (isValid(d) && d.getTime() >= cutoff) {
          evts.push({ id: `${t.id}-done`, date: d.toISOString(), kind: "completed", title: t.title });
        }
      }
      if (t.createdAt) {
        const d = new Date(t.createdAt);
        if (isValid(d) && d.getTime() >= cutoff) {
          evts.push({ id: `${t.id}-add`, date: d.toISOString(), kind: "added", title: t.title });
        }
      }
    }
    evts.sort((a, b) => b.date.localeCompare(a.date));
    return {
      events: evts.slice(0, 12),
      completedCount: evts.filter(e => e.kind === "completed").length,
      addedCount: evts.filter(e => e.kind === "added").length,
    };
  }, [state.tasks, projectId]);

  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Progress timeline</h3>
          <p className="text-xs text-muted-foreground">Last 14 days</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary" />{completedCount}</span>
          <span className="inline-flex items-center gap-1"><PlusCircle className="h-3 w-3" />{addedCount}</span>
        </div>
      </header>

      {events.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/50 px-3 py-4 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          No activity in the last two weeks.
        </div>
      ) : (
        <ol className="relative space-y-2.5 border-l border-border/50 pl-4">
          {events.map(e => {
            const d = parseISO(e.date);
            const days = differenceInCalendarDays(new Date(), d);
            const Icon = e.kind === "completed" ? CheckCircle2 : PlusCircle;
            const tint = e.kind === "completed" ? "text-primary" : "text-muted-foreground";
            return (
              <li key={e.id} className="relative">
                <span
                  className={`absolute -left-[22px] grid h-4 w-4 place-items-center rounded-full bg-background ring-1 ring-border ${tint}`}
                >
                  <Icon className="h-3 w-3" />
                </span>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm leading-snug break-words">
                      <span className="text-muted-foreground">{e.kind === "completed" ? "Completed" : "Added"}</span>{" "}
                      <span className="font-medium">{e.title}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-[11px] tabular-nums text-muted-foreground" title={format(d, "PPpp")}>
                    {days === 0 ? "Today" : days === 1 ? "Yesterday" : formatRelativeDate(format(d, "yyyy-MM-dd"))}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}