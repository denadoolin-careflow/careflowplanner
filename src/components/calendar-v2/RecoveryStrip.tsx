import { Leaf, Plus } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { suggestRecovery } from "@/lib/calendar-v2/recovery";
import type { Appointment } from "@/lib/types";

/** Suggests recovery buffers after demanding events. Adds them as gentle tasks. */
export function RecoveryStrip({ date, appointments }: { date: Date; appointments: Appointment[] }) {
  const { addTask } = useStore();
  const suggestions = suggestRecovery(appointments);
  const iso = format(date, "yyyy-MM-dd");
  if (suggestions.length === 0) return null;

  const insert = async (s: (typeof suggestions)[number]) => {
    await addTask({
      title: `🌿 ${s.label} — ${s.apptTitle}`,
      area: "Personal",
      priority: "medium",
      energy: "low",
      estMinutes: s.recoveryMinutes,
      done: false,
      dueDate: iso,
      startTime: s.afterTime,
      notes: "Auto-suggested recovery buffer. Water, breath, a quiet minute.",
    });
    toast.success(`Added ${s.recoveryMinutes}m buffer after ${s.apptTitle}`);
  };
  const insertAll = async () => { for (const s of suggestions) await insert(s); };

  return (
    <section className="reset-glass rounded-3xl p-4">
      <header className="mb-2 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Leaf className="h-4 w-4 text-primary" /> Recovery moments
        </div>
        <Button size="sm" variant="secondary" className="h-7 rounded-full text-xs" onClick={insertAll}>
          Add all
        </Button>
      </header>
      <ul className="space-y-1.5">
        {suggestions.map((s) => (
          <li key={s.apptId} className="flex items-start gap-2 rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-xs">
            <Leaf className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-foreground">{s.reason}</p>
              <p className="text-[10px] text-muted-foreground">At {s.afterTime} · {s.recoveryMinutes}m · {s.label}</p>
            </div>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => insert(s)} aria-label="Add">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}