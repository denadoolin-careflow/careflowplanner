import { format } from "date-fns";
import { useMemo } from "react";
import { Sparkles, AlertTriangle, Zap, Heart, Brain, Clock } from "lucide-react";
import type { Task, Appointment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { timeOfDayGreeting } from "@/lib/greeting";

interface Props {
  date: Date;
  tasks: Task[];
  appointments: Appointment[];
  topThree: Task[];
}

/**
 * Calendar 2.0 command bar — greeting, current focus, and a capacity meter
 * that blends appointment time + estimated task time against an 8h working
 * window (9am–5pm). Shows a gentle overload warning above 100%.
 */
export function CommandBar({ date, tasks, appointments, topThree }: Props) {
  const greeting = useMemo(() => timeOfDayGreeting(date), [date]);

  const { apptMin, taskMin, totalMin, cap, pct, overload } = useMemo(() => {
    const apptMin = appointments.reduce((sum, a) => {
      if (!a.time || !a.endTime) return sum + (a.time ? 30 : 0);
      const [sh, sm] = a.time.slice(0, 5).split(":").map(Number);
      const [eh, em] = a.endTime.slice(0, 5).split(":").map(Number);
      return sum + Math.max(0, eh * 60 + em - (sh * 60 + sm));
    }, 0);
    const taskMin = tasks
      .filter((t) => !t.done && t.status !== "parked")
      .reduce((s, t) => s + (t.estMinutes ?? 25), 0);
    const totalMin = apptMin + taskMin;
    const cap = 8 * 60;
    const pct = Math.min(180, Math.round((totalMin / cap) * 100));
    return { apptMin, taskMin, totalMin, cap, pct, overload: totalMin > cap };
  }, [tasks, appointments]);

  const focus = topThree[0]?.title ?? tasks.find((t) => !t.done)?.title ?? "Choose your one thing";

  return (
    <section className="reset-glass rounded-3xl p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.28em] text-primary/70">Calendar · v2 · Plan · Care · Grow</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-foreground">{greeting}</h1>
          <p className="text-sm text-muted-foreground">{format(date, "EEEE, MMMM d")}</p>
        </div>
        <div className="min-w-0 sm:max-w-sm sm:text-right">
          <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Today's focus</p>
          <p className="mt-1 line-clamp-2 font-display text-lg text-foreground">
            <Sparkles className="mr-1 inline h-4 w-4 text-primary" />{focus}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <CapacityBar icon={Clock} label="Time" value={pct} tone={overload ? "warn" : "ok"} sub={`${Math.round(totalMin / 60 * 10) / 10}h / 8h`} />
        <CapacityBar icon={Brain} label="Mental" value={Math.min(100, Math.round((taskMin / cap) * 130))} tone="ok" sub={`${tasks.filter((t) => !t.done).length} open`} />
        <CapacityBar icon={Zap} label="Energy" value={60} tone="ok" sub="steady" />
        <CapacityBar icon={Heart} label="Care" value={Math.min(100, appointments.length * 20)} tone="ok" sub={`${appointments.length} events`} />
      </div>

      {overload && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium">Today may be too demanding.</p>
            <p className="text-xs opacity-80">
              You've planned {Math.round(totalMin / 60 * 10) / 10}h of work against an 8h window.
              Try dragging a task back to the inbox, or click <span className="font-semibold">Reflow</span> to reshape the day.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function CapacityBar({
  icon: Icon, label, value, sub, tone,
}: { icon: typeof Clock; label: string; value: number; sub: string; tone: "ok" | "warn" }) {
  const pct = Math.min(100, value);
  return (
    <div className="rounded-2xl border border-border/50 bg-background/60 p-3">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Icon className="h-3 w-3" /> {label}</span>
        <span>{value}%</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            tone === "warn" || value > 100 ? "bg-amber-500" : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}