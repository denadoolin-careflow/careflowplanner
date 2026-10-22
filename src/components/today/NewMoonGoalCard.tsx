import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Check, Plus, RefreshCw, Target, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { useMyChart } from "@/lib/cosmic/use-my-chart";
import { lifeAreaLabel } from "@/lib/goals/life-areas";
import { activeNewMoon, ideaFor, readSuggestionState, writeSuggestionState, type SuggestionState } from "@/lib/goals/new-moon-suggestion";

export function NewMoonGoalCard({ date = new Date() }: { date?: Date }) {
  const { state, addGoal, addTask } = useStore();
  const { chart } = useMyChart();
  const moon = useMemo(() => activeNewMoon(date, chart?.houses ?? null), [date.toDateString(), chart?.houses]);
  const [s, setS] = useState<SuggestionState>(() => moon ? readSuggestionState(moon.iso) : { index: 0 });
  const [busy, setBusy] = useState(false);
  if (!moon || s.dismissed) return null;
  const save = (next: SuggestionState) => { setS(next); writeSuggestionState(moon.iso, next); };
  const idea = ideaFor(moon.house, s.index);
  const existing = state.goals.find(g => g.lifeHouse === moon.house && g.status !== "done");
  const area = `${moon.house} · ${lifeAreaLabel(moon.house)}`;

  const add = async () => {
    setBusy(true);
    try {
      const goalId = existing?.id ?? await addGoal({ title: idea.goal, lifeHouse: moon.house } as any);
      if (!goalId) return;
      const taskId = await addTask({ title: idea.step, goalId, dueDate: format(new Date(), "yyyy-MM-dd") } as any);
      save({ ...s, addedGoalId: goalId, addedTaskId: taskId });
    } finally { setBusy(false); }
  };

  return (
    <section aria-label="New moon intention" className="rounded-2xl border border-border/50 bg-card/70 p-4 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">🌑 New moon intention · {moon.sign}</p>
          <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary"><Target className="h-3 w-3" /> {area}</p>
        </div>
        {!s.addedGoalId && <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label="Not this time" onClick={() => save({ ...s, dismissed: true })}><X className="h-4 w-4" /></Button>}
      </div>
      <p className="mt-1 font-display text-lg leading-snug">{existing ? existing.title : idea.goal}</p>
      <p className="mt-1 text-sm text-muted-foreground">First step: {idea.step}</p>
      {s.addedGoalId ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1 text-secondary"><Check className="h-4 w-4" /> Added</span>
          <Button asChild size="sm" variant="outline" className="h-11 rounded-full"><Link to="/goals">Open goal</Link></Button>
          <Button asChild size="sm" variant="outline" className="h-11 rounded-full"><Link to="/planner">Open task</Link></Button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" className="h-11 rounded-full" disabled={busy} onClick={() => void add()}>
            <Plus className="mr-1 h-4 w-4" /> {existing ? "Add first step" : "Add goal & first step"}
          </Button>
          <Button type="button" variant="outline" className="h-11 rounded-full" onClick={() => save({ ...s, index: s.index + 1 })}>
            <RefreshCw className="mr-1 h-4 w-4" /> Swap
          </Button>
        </div>
      )}
    </section>
  );
}
