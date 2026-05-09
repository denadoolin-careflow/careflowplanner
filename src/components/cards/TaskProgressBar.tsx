import { Progress } from "@/components/ui/progress";
import { useStore, todayISO } from "@/lib/store";
import { Sparkles } from "lucide-react";

export function TaskProgressBar({ scope = "today" }: { scope?: "today" | "all" }) {
  const { state } = useStore();
  const T = todayISO();
  const tasks = scope === "today"
    ? state.tasks.filter(t => t.dueDate === T || t.isTopThree)
    : state.tasks;
  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="cozy-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{scope === "today" ? "Today's progress" : "All tasks"}</p>
          <p className="font-display text-base">
            {total === 0 ? "Breathing room." : `${done} of ${total} done`}
          </p>
        </div>
        <div className="flex items-center gap-1 text-sm tabular-nums text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> {pct}%
        </div>
      </div>
      <Progress value={pct} className="h-2 transition-all duration-500" />
      <p className="mt-2 text-[11px] italic text-muted-foreground">
        {pct === 0 ? "Pick one small thing — that's enough to start." :
         pct < 50 ? "Soft and steady. You're moving." :
         pct < 100 ? "More than halfway. Be proud of that." :
         "Everything done. Rest is allowed."}
      </p>
    </div>
  );
}