import { useMemo, useState } from "react";
import { useStore, todayISO } from "@/lib/store";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { openTaskEditor } from "@/lib/open-task-editor";

type Mode = "3" | "5" | "all";

export function TodaysFocusWidget() {
  const { state, toggleTask } = useStore();
  const [mode, setMode] = useState<Mode>("3");
  const T = todayISO();

  const focus = useMemo(() => {
    const todayList = state.tasks
      .filter((t) => !t.parentTaskId && (t.isTopThree || t.dueDate === T))
      .sort((a, b) => {
        const ap = a.isTopThree ? 0 : 1;
        const bp = b.isTopThree ? 0 : 1;
        if (ap !== bp) return ap - bp;
        const prio = (x: string) => (x === "high" ? 0 : x === "medium" ? 1 : 2);
        return prio(a.priority) - prio(b.priority);
      });
    return todayList;
  }, [state.tasks, T]);

  const limit = mode === "3" ? 3 : mode === "5" ? 5 : focus.length;
  const shown = focus.slice(0, limit);
  const total = focus.length;
  const done = focus.filter((t) => t.done).length;
  const pct = total ? (done / total) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-full bg-muted/60 p-1 text-[11px]">
          {(["3", "5", "all"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded-full px-2.5 py-0.5 capitalize transition-colors",
                mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              Focus {m}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{done}/{total}</span>
      </div>
      <Progress value={pct} className="h-1.5" />

      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">No focus set yet. Pick three small things.</p>
      ) : (
        <ul className="space-y-1">
          {shown.map((t) => (
            <li key={t.id} className="group flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-1.5">
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggleTask(t.id)}
                className="h-4 w-4 shrink-0 rounded accent-primary"
              />
              <button
                type="button"
                onClick={() => openTaskEditor(t.id)}
                className={cn(
                  "min-w-0 flex-1 truncate text-left text-sm",
                  t.done && "text-muted-foreground line-through",
                )}
                title={t.title}
              >
                {t.title}
              </button>
              {t.estMinutes ? (
                <span className="text-[10px] text-muted-foreground">{t.estMinutes}m</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {mode !== "all" && total > limit && (
        <button
          type="button"
          onClick={() => setMode("all")}
          className="text-xs text-primary hover:underline"
        >
          +{total - limit} more tasks
        </button>
      )}
    </div>
  );
}