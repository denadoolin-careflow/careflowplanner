import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Users, ArrowRight, Plus, Check, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useRoutines } from "@/lib/routines";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const KIND_TINT: Record<string, string> = {
  child: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-100",
  elder: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100",
  partner: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-100",
  pet: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100",
  self: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-100",
};

export function FamilySnapshotCard({ date }: { date: Date }) {
  const { state, addTask } = useStore();
  const { routines: allRoutines } = useRoutines();
  const iso = format(date, "yyyy-MM-dd");
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const commitAdd = async (recipientId: string) => {
    const t = draft.trim();
    if (t) await addTask({ title: t, recipientId, dueDate: iso });
    setDraft("");
    setAddingFor(null);
  };

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
            <li key={r.id} className="group">
              <div className="flex items-center gap-2.5 rounded-lg px-1 py-1 -mx-1 hover:bg-muted/40 transition-colors">
                <Link to={`/caregiving?recipient=${r.id}`} className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold", KIND_TINT[r.kind] ?? KIND_TINT.self)}>
                    {r.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{r.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{r.status}</div>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => { setAddingFor(addingFor === r.id ? null : r.id); setDraft(""); }}
                  className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                  aria-label={`Add task for ${r.name}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              {addingFor === r.id && (
                <div className="mt-1 ml-11 flex items-center gap-1">
                  <Input
                    autoFocus
                    placeholder={`Add task for ${r.name}…`}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") void commitAdd(r.id);
                      if (e.key === "Escape") { setAddingFor(null); setDraft(""); }
                    }}
                    className="h-7 text-xs"
                  />
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => void commitAdd(r.id)}>
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setAddingFor(null); setDraft(""); }}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}