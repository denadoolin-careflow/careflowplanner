import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { CalendarDays, Flame, Heart, ListTodo, Target } from "lucide-react";
import { cn } from "@/lib/utils";

function Stat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string | number; tone?: string }) {
  return (
    <div className={cn("rounded-xl border border-border/60 bg-card/60 p-3", tone)}>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 font-display text-2xl font-semibold leading-none">{value}</p>
    </div>
  );
}

export function DailyBriefing({ onAsk }: { onAsk: (q: string) => void }) {
  const { state } = useStore();
  const today = new Date().toISOString().slice(0, 10);

  const data = useMemo(() => {
    const tasks: any[] = state?.tasks ?? [];
    const goals: any[] = state?.goals ?? [];
    const habits: any[] = state?.habits ?? [];
    const journals: any[] = state?.journals ?? state?.journalEntries ?? [];
    const todayTasks = tasks.filter(t => t.dueDate === today && t.status !== "done");
    const overdue = tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== "done");
    const activeGoals = goals.filter(g => (g.progress ?? 0) < 100);
    const habitStreak = habits.reduce((s, h) => Math.max(s, h.streak ?? 0), 0);
    const lastMood = journals[journals.length - 1]?.mood;
    return { todayTasks, overdue, activeGoals, habitStreak, lastMood };
  }, [state, today]);

  const chips = [
    "What's most important today?",
    "What am I forgetting?",
    "Help me protect my energy",
    "Reflect on this week",
  ];

  return (
    <section className="rounded-2xl border border-border/60 bg-gradient-to-br from-card/80 to-card/40 p-5">
      <header className="flex items-baseline justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Daily briefing</p>
          <h2 className="font-display text-2xl font-semibold">Here's where you stand today</h2>
        </div>
        <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
      </header>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat icon={ListTodo} label="Today" value={data.todayTasks.length} />
        <Stat icon={CalendarDays} label="Overdue" value={data.overdue.length} tone={data.overdue.length ? "border-amber-500/40" : ""} />
        <Stat icon={Target} label="Goals" value={data.activeGoals.length} />
        <Stat icon={Flame} label="Top streak" value={data.habitStreak} />
        <Stat icon={Heart} label="Last mood" value={data.lastMood ?? "—"} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {chips.map(c => (
          <button
            key={c}
            onClick={() => onAsk(c)}
            className="rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-xs text-foreground/80 transition-colors hover:bg-background"
          >
            {c}
          </button>
        ))}
      </div>
    </section>
  );
}