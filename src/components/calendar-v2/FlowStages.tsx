import { Inbox, Sparkles, ListChecks, CalendarClock, Focus, BookHeart, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StageSignals {
  captureCount: number;      // items in inbox
  clarifiedCount: number;    // tasks with area + estMinutes set
  prioritizedCount: number;  // isTopThree
  scheduledCount: number;    // has startTime today
  focusActive: boolean;      // pomodoro running or focus task set
  reflectedToday: boolean;   // journal entry today
  recoveryPlanned: boolean;  // recovery buffer inserted
}

const STAGES = [
  { id: "capture", label: "Capture", icon: Inbox, key: "captureCount" as const, tip: "Empty your head into the inbox." },
  { id: "clarify", label: "Clarify", icon: Sparkles, key: "clarifiedCount" as const, tip: "Add area, energy, estimate." },
  { id: "prior", label: "Prioritize", icon: ListChecks, key: "prioritizedCount" as const, tip: "Pick your top three." },
  { id: "sched", label: "Schedule", icon: CalendarClock, key: "scheduledCount" as const, tip: "Drop tasks onto time." },
  { id: "focus", label: "Focus", icon: Focus, key: "focusActive" as const, tip: "One thing, one timer." },
  { id: "reflect", label: "Reflect", icon: BookHeart, key: "reflectedToday" as const, tip: "Journal a note." },
  { id: "recover", label: "Recover", icon: Leaf, key: "recoveryPlanned" as const, tip: "Buffer after demanding events." },
];

/** Horizontal ribbon showing the 7 stages with a soft progress fill. */
export function FlowStages({ signals }: { signals: StageSignals }) {
  const active = STAGES.map((s) => {
    const v = signals[s.key] as number | boolean;
    return typeof v === "boolean" ? v : v > 0;
  });
  const doneCount = active.filter(Boolean).length;
  const pct = Math.round((doneCount / STAGES.length) * 100);

  return (
    <section className="reset-glass rounded-3xl p-4">
      <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
        <span>Daily flow</span>
        <span>{doneCount} / {STAGES.length}</span>
      </div>
      <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-muted/60">
        <div className="h-full bg-primary transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
      </div>
      <ol className="flex items-stretch gap-1.5 overflow-x-auto sm:grid sm:grid-cols-7 sm:gap-2">
        {STAGES.map((s, i) => {
          const on = active[i];
          const Icon = s.icon;
          return (
            <li key={s.id} title={s.tip}
              className={cn(
                "group flex min-w-[80px] flex-col items-center gap-1 rounded-xl border px-2 py-2 text-center transition-all duration-300",
                on
                  ? "animate-fade-in border-primary/40 bg-primary/10 text-foreground shadow-sm"
                  : "border-border/40 bg-background/40 text-muted-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4 transition-transform", on && "scale-110 text-primary")} />
              <span className="text-[10px] font-medium">{s.label}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}