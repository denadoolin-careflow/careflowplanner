import { useMemo } from "react";
import { format } from "date-fns";
import { Pause, Play, RotateCcw, Square, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { pomodoro, usePomodoro, formatPomoTime } from "@/lib/pomodoro-store";
import { usePlannerFocusTaskId } from "@/lib/planner-prefs";

const LENGTHS = [15, 25, 45, 60];

/**
 * Compact focus timer that lives beside the planner schedule so the countdown
 * and the day's plan are visible at the same time.
 */
export function PlannerFocusPanel({ date, className }: { date: Date; className?: string }) {
  const session = usePomodoro();
  const { state } = useStore();
  const [, setFocusTaskId] = usePlannerFocusTaskId();
  const iso = format(date, "yyyy-MM-dd");

  const activeTask = session.taskId ? state.tasks.find(t => t.id === session.taskId) : null;
  const label = activeTask?.title ?? session.taskTitle;

  const candidates = useMemo(
    () => state.tasks.filter(t => !t.done && (t.isTopThree || t.dueDate === iso)).slice(0, 6),
    [state.tasks, iso],
  );

  const total = session.mode === "focus" ? session.focusSeconds : session.breakSeconds;
  const pct = total ? Math.max(0, Math.min(100, ((total - session.remaining) / total) * 100)) : 0;

  return (
    <section
      aria-label="Focus timer"
      className={cn("flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/70 p-3", className)}
    >
      <div className="flex items-center gap-1.5">
        <Target className="h-3.5 w-3.5 text-primary" aria-hidden />
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Focus · {session.mode === "focus" ? "Session" : "Break"}
        </h2>
      </div>

      <div className="text-center">
        <p className="font-mono text-3xl font-semibold tabular-nums" aria-live="polite">
          {formatPomoTime(session.remaining)}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground [overflow-wrap:anywhere]">
          {label || "Nothing in focus yet"}
        </p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5">
        <Button
          size="sm"
          className="h-8 flex-1 gap-1.5 rounded-full text-xs"
          onClick={() => (session.taskId ? pomodoro.toggle() : candidates[0] && pomodoro.startForTask(candidates[0]))}
          disabled={!session.taskId && candidates.length === 0}
          aria-label={session.running ? "Pause focus session" : "Start focus session"}
        >
          {session.running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {session.running ? "Pause" : "Start"}
        </Button>
        <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" aria-label="Reset timer"
          onClick={() => pomodoro.reset()}>
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" aria-label="End focus session"
          onClick={() => pomodoro.stop()} disabled={!session.taskId}>
          <Square className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex flex-wrap justify-center gap-1">
        {LENGTHS.map(m => (
          <button
            key={m}
            type="button"
            onClick={() => pomodoro.setDurations({ focusSeconds: m * 60 })}
            aria-pressed={session.focusSeconds === m * 60}
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
              session.focusSeconds === m * 60
                ? "border-primary bg-primary/15 text-primary"
                : "border-border/60 text-muted-foreground hover:bg-muted",
            )}
          >
            {m}m
          </button>
        ))}
      </div>

      <div className="min-h-0 space-y-1 overflow-y-auto">
        <p className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Focus on…</p>
        {candidates.length === 0 ? (
          <p className="px-0.5 text-[11.5px] text-muted-foreground">Star a task or plan one for today.</p>
        ) : candidates.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setFocusTaskId(t.id); pomodoro.startForTask({ id: t.id, title: t.title }); }}
            className={cn(
              "flex w-full items-start gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[12px] transition-colors",
              session.taskId === t.id ? "border-primary/40 bg-primary/10" : "border-border/50 hover:bg-muted",
            )}
          >
            <Target className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{t.title}</span>
          </button>
        ))}
      </div>
    </section>
  );
}