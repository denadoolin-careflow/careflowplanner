import { useMemo } from "react";
import { Sparkles, AlertTriangle, ArrowRight } from "lucide-react";
import type { Task, Appointment } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  date: Date;
  tasks: Task[];           // scheduled today (has dueDate)
  unscheduled: Task[];
  appointments: Appointment[];
}

const PRI_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/**
 * Carey's calendar suggestions — client-side heuristic that recommends
 * top priorities, best time blocks, and overload warnings.
 */
export function CareySuggestions({ date, tasks, unscheduled, appointments }: Props) {
  const { updateTask } = useStore();
  const iso = format(date, "yyyy-MM-dd");

  const suggestions = useMemo(() => {
    const pool = [...unscheduled, ...tasks.filter((t) => !t.startTime)];
    const ranked = [...pool].sort((a, b) => {
      const p = (PRI_RANK[a.priority] ?? 1) - (PRI_RANK[b.priority] ?? 1);
      if (p !== 0) return p;
      const eA = a.energy === "high" ? 0 : a.energy === "medium" ? 1 : 2;
      const eB = b.energy === "high" ? 0 : b.energy === "medium" ? 1 : 2;
      return eA - eB;
    });
    const top = ranked.slice(0, 3);

    // pick a time slot for each: high energy -> 9am, medium -> 11am, low -> 14:00
    const slots: Record<string, string> = { high: "09:00", medium: "11:00", low: "14:00" };
    const picks = top.map((t, i) => {
      const energy = t.energy ?? (i === 0 ? "high" : "medium");
      return { task: t, suggestedTime: slots[energy] ?? "10:00", reason: reasonFor(t, energy) };
    });

    const plannedMin =
      tasks.reduce((s, t) => s + (t.estMinutes ?? 25), 0) +
      appointments.reduce((s, a) => {
        if (!a.time || !a.endTime) return s + 30;
        const [sh, sm] = a.time.slice(0, 5).split(":").map(Number);
        const [eh, em] = a.endTime.slice(0, 5).split(":").map(Number);
        return s + Math.max(0, eh * 60 + em - (sh * 60 + sm));
      }, 0);
    const overloaded = plannedMin > 8 * 60;

    return { picks, plannedMin, overloaded };
  }, [tasks, unscheduled, appointments]);

  const applyOne = async (taskId: string, time: string) => {
    await updateTask(taskId, { dueDate: iso, startTime: time, isTopThree: true, inbox: false });
    toast.success(`Scheduled at ${time}`);
  };
  const applyAll = async () => {
    for (const p of suggestions.picks) await applyOne(p.task.id, p.suggestedTime);
  };

  return (
    <section className="reset-glass rounded-3xl p-4">
      <header className="mb-2 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" /> Carey suggests
        </div>
        {suggestions.picks.length > 0 && (
          <Button size="sm" variant="secondary" className="h-7 rounded-full text-xs" onClick={applyAll}>
            Apply all <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        )}
      </header>

      {suggestions.overloaded && (
        <div className="mb-3 flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Your day is running hot — {Math.round(suggestions.plannedMin / 60 * 10) / 10}h planned. Consider parking one item.</span>
        </div>
      )}

      {suggestions.picks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/40 px-3 py-6 text-center text-xs text-muted-foreground">
          Nothing to prioritize — inbox is clear.
        </p>
      ) : (
        <ol className="space-y-2">
          {suggestions.picks.map((p, i) => (
            <li key={p.task.id} className="flex items-start gap-3 rounded-xl border border-border/40 bg-background/60 px-3 py-2">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm text-foreground">{p.task.title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{p.reason} · {p.suggestedTime}</p>
              </div>
              <Button size="sm" variant="ghost" className="h-7 rounded-full text-xs"
                onClick={() => applyOne(p.task.id, p.suggestedTime)}>
                Schedule
              </Button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function reasonFor(t: Task, energy: string): string {
  if (t.priority === "high") return "High priority — protect this block";
  if (energy === "high") return "Best while energy is fresh";
  if (energy === "low") return "Save for lower-energy afternoon";
  return "Fits a steady mid-morning window";
}