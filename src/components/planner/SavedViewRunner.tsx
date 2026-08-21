/**
 * Runs a saved view (or an ad-hoc filter) against the live task store and
 * renders the matching tasks. Used by the planner and by `/query` blocks
 * embedded in notes — the results stay current because they read the store,
 * never a snapshot.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Check, ListFilter } from "lucide-react";
import { useStore } from "@/lib/store";
import { matchesTaskFilter, EMPTY_WEEK_FILTERS, type WeekFilterState } from "@/lib/planner/week-filters";
import { cn } from "@/lib/utils";

export type RunnerLayout = "list" | "table";

export function SavedViewRunner({ filters, layout = "list", limit = 25, emptyLabel = "Nothing matches this view." }: {
  filters: Partial<WeekFilterState>;
  layout?: RunnerLayout;
  limit?: number;
  emptyLabel?: string;
}) {
  const { state, updateTask } = useStore() as any;
  const f: WeekFilterState = useMemo(() => ({ ...EMPTY_WEEK_FILTERS, ...filters }), [filters]);

  const rows = useMemo(() => {
    const list = (state.tasks ?? []).filter((t: any) => !t.deletedAt && matchesTaskFilter(t, f));
    return list
      .slice()
      .sort((a: any, b: any) =>
        (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
        (a.startTime ?? "zz").localeCompare(b.startTime ?? "zz"))
      .slice(0, limit);
  }, [state.tasks, f, limit]);

  if (rows.length === 0) {
    return <p className="px-3 py-4 text-[12px] text-muted-foreground">{emptyLabel}</p>;
  }

  if (layout === "table") {
    return (
      <table className="w-full text-[12.5px]">
        <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-1.5 text-left">Task</th>
            <th scope="col" className="w-24 px-3 py-1.5 text-left">Due</th>
            <th scope="col" className="w-24 px-3 py-1.5 text-left">Area</th>
            <th scope="col" className="w-20 px-3 py-1.5 text-left">Priority</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {rows.map((t: any) => (
            <tr key={t.id} className={cn(t.done && "opacity-55")}>
              <td className="px-3 py-1.5">
                <TaskToggle task={t} onToggle={() => updateTask(t.id, { done: !t.done })} />
              </td>
              <td className="px-3 py-1.5 text-muted-foreground">
                {t.dueDate ? format(new Date(`${t.dueDate}T12:00:00`), "MMM d") : "—"}
              </td>
              <td className="px-3 py-1.5 text-muted-foreground">{t.area ?? "—"}</td>
              <td className="px-3 py-1.5 capitalize text-muted-foreground">{t.priority ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <ul className="divide-y divide-border/30">
      {rows.map((t: any) => (
        <li key={t.id} className={cn("flex items-center gap-2 px-3 py-1.5 text-[13px]", t.done && "opacity-55")}>
          <TaskToggle task={t} onToggle={() => updateTask(t.id, { done: !t.done })} />
          <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
            {t.dueDate ? format(new Date(`${t.dueDate}T12:00:00`), "MMM d") : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

function TaskToggle({ task, onToggle }: { task: any; onToggle: () => void }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <button
        type="button"
        role="checkbox"
        aria-checked={!!task.done}
        aria-label={task.done ? `Mark ${task.title} not done` : `Complete ${task.title}`}
        onClick={onToggle}
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border",
          task.done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40 hover:border-muted-foreground/70",
        )}
      >
        {task.done && <Check className="h-3 w-3" />}
      </button>
      <Link
        to={`/anytime?task=${task.id}`}
        className={cn("min-w-0 truncate hover:underline", task.done && "line-through")}
      >
        {task.title}
      </Link>
    </span>
  );
}

/** Small header describing what a runner is showing. */
export function RunnerHeader({ name, count, right }: { name: string; count?: number; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b border-border/60 px-3 py-1.5">
      <ListFilter className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      <span className="text-[12px] font-semibold">{name}</span>
      {count !== undefined && <span className="text-[11px] text-muted-foreground">{count}</span>}
      <span className="ml-auto flex items-center gap-1">{right}</span>
    </div>
  );
}
