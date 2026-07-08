import { useMemo, useState } from "react";
import { Play, Pause, SkipForward, Check, X, Timer, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { pomodoro, usePomodoro, formatPomoTime, pomoTotal } from "@/lib/pomodoro-store";
import { useResetFocus, resetFocus } from "@/lib/reset-focus";
import type { ResetChecklist, ResetItem } from "@/lib/reset-checklists";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

export function FocusTimerStrip({
  onComplete, onSkip, onStart, lists = [], onPickTask,
}: {
  onComplete: () => void;
  onSkip: () => void;
  onStart: () => void;
  lists?: ResetChecklist[];
  onPickTask?: (list: ResetChecklist, item: ResetItem) => void;
}) {
  const focus = useResetFocus();
  const pomo = usePomodoro();
  const total = pomoTotal(pomo.mode, pomo);
  const pct = total ? Math.round((1 - pomo.remaining / total) * 100) : 0;
  const active = !!focus.itemId || !!pomo.taskId;
  const title = focus.label || pomo.taskTitle || "Pick a task to focus on";
  const [open, setOpen] = useState(false);

  const nextUp = useMemo(() => {
    const rows: { list: ResetChecklist; item: ResetItem }[] = [];
    for (const list of lists) {
      for (const item of list.items) {
        if (item.parent_id) continue;
        if (item.done) continue;
        if (focus.itemId && item.id === focus.itemId) continue;
        rows.push({ list, item });
      }
    }
    // Prefer active zone first
    if (focus.listId) {
      rows.sort((a, b) => (a.list.id === focus.listId ? -1 : b.list.id === focus.listId ? 1 : 0));
    }
    return rows.slice(0, 5);
  }, [lists, focus.listId, focus.itemId]);

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
        <div className="flex items-center gap-1.5">
          <p className="line-clamp-1 font-display text-base font-semibold text-[hsl(var(--reset-charcoal))]">{title}</p>
          {onPickTask && nextUp.length > 0 && (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <button
                  aria-label="Pick next task"
                  className="grid h-6 w-6 place-items-center rounded-full text-[hsl(var(--reset-ink))]/60 hover:bg-[hsl(var(--reset-sage-soft))]"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 p-2">
                <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Next up</p>
                <ul className="space-y-0.5">
                  {nextUp.map(({ list, item }) => (
                    <li key={item.id}>
                      <button
                        onClick={() => { onPickTask(list, item); setOpen(false); }}
                        className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                      >
                        <span className="flex-1">
                          <span className="line-clamp-1">{item.title}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {list.name}{item.est_minutes ? ` · ${item.est_minutes}m` : ""}
                          </span>
                        </span>
                        <Play className="mt-0.5 h-3.5 w-3.5 text-[hsl(var(--reset-sage-deep))]" />
                      </button>
                    </li>
                  ))}
                </ul>
                {focus.itemId && (
                  <button
                    onClick={() => { resetFocus.clear(); setOpen(false); }}
                    className="mt-1 w-full rounded-md px-2 py-1 text-left text-[11px] text-muted-foreground hover:bg-muted"
                  >
                    Clear focus
                  </button>
                )}
              </PopoverContent>
            </Popover>
          )}
        </div>
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