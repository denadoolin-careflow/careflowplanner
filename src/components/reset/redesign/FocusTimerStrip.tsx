import { Play, Pause, SkipForward, Check, X, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { pomodoro, usePomodoro, formatPomoTime, pomoTotal } from "@/lib/pomodoro-store";
import { useResetFocus } from "@/lib/reset-focus";

export function FocusTimerStrip({
  onComplete, onSkip, onStart,
}: {
  onComplete: () => void;
  onSkip: () => void;
  onStart: () => void;
}) {
  const focus = useResetFocus();
  const pomo = usePomodoro();
  const total = pomoTotal(pomo.mode, pomo);
  const pct = total ? Math.round((1 - pomo.remaining / total) * 100) : 0;
  const active = !!focus.itemId || !!pomo.taskId;
  const title = focus.label || pomo.taskTitle || "Pick a task to focus on";

  return (
    <div className="reset-glass sticky top-2 z-30 flex flex-wrap items-center gap-3 p-3 sm:p-4">
      <span className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
        active
          ? "bg-gradient-to-br from-[hsl(var(--reset-sage))] to-[hsl(var(--reset-sage-deep))] text-white"
          : "bg-[hsl(var(--reset-sage-soft))] text-[hsl(var(--reset-sage-deep))]",
      )}>
        <Timer className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--reset-ink))]/55">
          {pomo.mode === "break" ? "Break" : "Focus"} · {focus.cycle ? "Zone cycle" : "Reset"}
        </p>
        <p className="line-clamp-1 font-display text-base font-semibold text-[hsl(var(--reset-charcoal))]">{title}</p>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[hsl(var(--reset-sage-soft))]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--reset-sage))] to-[hsl(var(--reset-gold))] transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-14 text-right font-mono text-sm tabular-nums text-[hsl(var(--reset-charcoal))]">
          {formatPomoTime(pomo.remaining)}
        </span>
        {!pomo.taskId ? (
          <button
            onClick={onStart}
            className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--reset-sage))] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:-translate-y-0.5 transition-transform"
          >
            <Play className="h-3.5 w-3.5" /> Start
          </button>
        ) : (
          <>
            <button
              onClick={() => pomodoro.toggle()}
              aria-label={pomo.running ? "Pause" : "Resume"}
              className="grid h-8 w-8 place-items-center rounded-full bg-[hsl(var(--reset-sage))] text-white hover:-translate-y-0.5 transition-transform"
            >
              {pomo.running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={onSkip}
              aria-label="Skip"
              className="grid h-8 w-8 place-items-center rounded-full bg-[hsl(var(--reset-cream-deep))] text-[hsl(var(--reset-ink))]/70 hover:bg-[hsl(var(--reset-sage-soft))]"
            >
              <SkipForward className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onComplete}
              aria-label="Complete"
              className="grid h-8 w-8 place-items-center rounded-full bg-[hsl(var(--reset-gold))] text-white hover:-translate-y-0.5 transition-transform"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => pomodoro.stop()}
              aria-label="Stop"
              className="grid h-8 w-8 place-items-center rounded-full text-[hsl(var(--reset-ink))]/50 hover:bg-[hsl(var(--reset-cream-deep))]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}