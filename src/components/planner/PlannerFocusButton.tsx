import { Target, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pomodoro, usePomodoro, formatPomoTime } from "@/lib/pomodoro-store";
import { usePlannerFocusTaskId } from "@/lib/planner-prefs";
import { useStore } from "@/lib/store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function PlannerFocusButton({ date }: { date: Date }) {
  const session = usePomodoro();
  const { state } = useStore();
  const [focusTaskId, setFocusTaskId] = usePlannerFocusTaskId();
  const iso = format(date, "yyyy-MM-dd");

  const activeTask = session.taskId ? state.tasks.find(t => t.id === session.taskId) : null;

  // Active focus → chip
  if (activeTask) {
    return (
      <button
        onClick={() => pomodoro.toggle()}
        className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary hover:bg-primary/15"
        aria-label={session.running ? "Pause focus" : "Resume focus"}
      >
        {session.running ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        <span className="max-w-[160px] truncate font-medium">{activeTask.title}</span>
        <span className="font-mono tabular-nums text-[11px]">{formatPomoTime(session.remaining)}</span>
      </button>
    );
  }

  const candidates = state.tasks.filter(t => !t.done && (t.isTopThree || t.dueDate === iso)).slice(0, 8);
  const preferred = focusTaskId ? state.tasks.find(t => t.id === focusTaskId) : null;

  const startPreferred = () => {
    if (preferred) pomodoro.startForTask({ id: preferred.id, title: preferred.title });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 rounded-full text-xs">
          <Target className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Focus</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Focus on…</p>
        {preferred && (
          <button onClick={startPreferred}
            className="mb-1 flex w-full items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-2 py-1.5 text-left text-xs hover:bg-primary/10">
            <Target className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate">Continue: {preferred.title}</span>
          </button>
        )}
        {candidates.length === 0 ? (
          <p className="p-2 text-xs text-muted-foreground">Star a task to focus on it.</p>
        ) : (
          <div className="max-h-64 space-y-0.5 overflow-y-auto">
            {candidates.map(t => (
              <button key={t.id}
                onClick={() => { setFocusTaskId(t.id); pomodoro.startForTask({ id: t.id, title: t.title }); }}
                className={cn("flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted",
                  focusTaskId === t.id && "bg-primary/10")}
              >
                <Target className="mt-0.5 h-3 w-3 shrink-0 opacity-60" />
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}