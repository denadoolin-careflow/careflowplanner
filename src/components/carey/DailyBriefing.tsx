import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { Link } from "react-router-dom";
import { CalendarDays, Compass, Flame, Heart, ListTodo, Sparkles, Sunrise, Target, Wind } from "lucide-react";
import { cn } from "@/lib/utils";

function Stat({ icon: Icon, label, value, tone, to }: {
  icon: any; label: string; value: string | number; tone?: string; to?: string;
}) {
  const body = (
    <>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 font-display text-2xl font-semibold leading-none">{value}</p>
    </>
  );
  const cls = cn(
    "block rounded-xl border border-border/60 bg-card/60 p-3 text-left transition-colors",
    to && "hover:border-primary/40 hover:bg-card",
    tone,
  );
  if (to) return <Link to={to} className={cls} aria-label={`Open ${label}`}>{body}</Link>;
  return <div className={cls}>{body}</div>;
}

export function DailyBriefing({ onAsk }: { onAsk: (q: string) => void }) {
  const { state } = useStore();
  const today = new Date().toISOString().slice(0, 10);

  const data = useMemo(() => {
    const tasks: any[] = state?.tasks ?? [];
    const goals: any[] = state?.goals ?? [];
    const habits: any[] = state?.habits ?? [];
    const journals: any[] = (state as any)?.journal ?? [];
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

  const actions = [
    {
      label: "Plan my day",
      icon: Sunrise,
      prompt:
        "Plan my day. Look at my today's tasks and overdue items, and propose a realistic schedule with morning, midday, and evening blocks. Honor my capacity — don't overload me. End with the single most important thing.",
    },
    {
      label: "What to skip today",
      icon: Wind,
      prompt:
        "Look at my today's tasks. Be honest: which 2-3 can I skip, defer, or drop without harm? Briefly explain each. Then tell me what's actually worth doing.",
    },
    {
      label: "One next action",
      icon: Compass,
      prompt:
        "Give me ONE concrete next action I can do in the next 15 minutes that will move something meaningful forward. Pick from my goals, today's tasks, or anything I'm avoiding. Explain why in one sentence.",
    },
    {
      label: "Reflect on this week",
      icon: Sparkles,
      prompt:
        "Reflect on my week so far. Note 1-2 wins, 1 pattern you notice, and 1 gentle suggestion for the next few days. Warm tone.",
    },
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
        <Stat icon={ListTodo} label="Today" value={data.todayTasks.length} to="/today" />
        <Stat icon={CalendarDays} label="Overdue" value={data.overdue.length} tone={data.overdue.length ? "border-amber-500/40" : ""} to="/upcoming" />
        <Stat icon={Target} label="Goals" value={data.activeGoals.length} to="/goals" />
        <Stat icon={Flame} label="Top streak" value={data.habitStreak} to="/habits" />
        <Stat icon={Heart} label="Last mood" value={data.lastMood ?? "—"} to="/mental-load" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {actions.map(a => (
          <button
            key={a.label}
            onClick={() => onAsk(a.prompt)}
            className="group flex items-start gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-background"
          >
            <a.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm font-medium leading-tight">{a.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
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