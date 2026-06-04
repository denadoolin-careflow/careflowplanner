import { useMemo } from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Users, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { useRoutines } from "@/lib/routines";
import { cn } from "@/lib/utils";

const KIND_TINT: Record<string, string> = {
  child: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-100",
  elder: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100",
  partner: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-100",
  pet: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100",
  self: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-100",
};

export function FamilySnapshotCard({ date }: { date: Date }) {
  const { state } = useStore();
  const { routines: allRoutines } = useRoutines();
  const iso = format(date, "yyyy-MM-dd");

  const rows = useMemo(() => {
    return state.recipients.slice(0, 6).map(r => {
      const tasksLeft = state.tasks.filter(
        t => t.recipientId === r.id && t.dueDate === iso && !t.done && !t.parentTaskId,
      ).length;
      const recipientRoutines = allRoutines.filter(rt => rt.recipient_id === r.id || rt.person_name === r.name);
      let totalSteps = 0;
      let doneSteps = 0;
      recipientRoutines.forEach(rt => {
        totalSteps += rt.items.length;
        doneSteps += rt.items.filter(i => i.done).length;
      });
      const routineLeft = Math.max(0, totalSteps - doneSteps);
      let status = "All good today";
      if (tasksLeft > 0 && routineLeft > 0) status = `${tasksLeft} task${tasksLeft === 1 ? "" : "s"} · ${routineLeft} routine left`;
      else if (tasksLeft > 0) status = `${tasksLeft} task${tasksLeft === 1 ? "" : "s"} remaining`;
      else if (routineLeft > 0) status = `${routineLeft} routine step${routineLeft === 1 ? "" : "s"} left`;
      else if (totalSteps === 0 && tasksLeft === 0) status = "No reminders today";
      return { id: r.id, name: r.name, kind: r.kind, status };
    });
  }, [state.recipients, state.tasks, allRoutines, iso]);

  return (
    <section className="cozy-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-primary" />
          <h3 className="font-display text-sm font-semibold text-foreground">Family Snapshot</h3>
        </div>
        <Link to="/caregiving" className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground">
          View all <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/50 px-2 py-3 text-center text-xs text-muted-foreground">
          Add household members in Caregiving.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map(r => (
            <li key={r.id} className="flex items-center gap-2.5">
              <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold", KIND_TINT[r.kind] ?? KIND_TINT.self)}>
                {r.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">{r.name}</div>
                <div className="truncate text-[11px] text-muted-foreground">{r.status}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}