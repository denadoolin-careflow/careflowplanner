import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Target, Plus, Check, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useFocusGoal } from "@/lib/goals/focus-goal";
import { LifeAreaGoalPicker } from "./LifeAreaGoalPicker";
import { lifeAreaLabel, effectiveGoalProgress } from "@/lib/goals/life-areas";
import { getMoonPhase } from "@/lib/moon";
import { rhythmPhaseForMoon, RHYTHM_LABEL } from "@/lib/planner/rhythm-phase";
import { PHASE_GUIDANCE } from "@/lib/goals/cycle";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/** "Today's focus goal": pick one goal to nudge forward on this date. */
export function FocusGoalCard({ date }: { date: Date }) {
  const { state, addTask, updateTask } = useStore();
  const [goalId, setGoal] = useFocusGoal(date);
  const [draft, setDraft] = useState("");
  const goal = state.goals.find(g => g.id === goalId);
  const phase = rhythmPhaseForMoon(getMoonPhase(date));
  const tasks = goal ? state.tasks.filter(t => t.goalId === goal.id) : [];
  const open = tasks.filter(t => !t.done).slice(0, 3);
  const pct = goal ? effectiveGoalProgress(goal, tasks) : 0;

  const addStep = async () => {
    const title = draft.trim(); if (!title || !goal) return;
    setDraft("");
    await addTask({ title, goalId: goal.id, dueDate: format(date, "yyyy-MM-dd"), area: "Personal", priority: "medium" } as any);
  };

  return (
    <section aria-label="Focus goal" className="rounded-2xl border border-primary/25 bg-card p-3 shadow-sm">
      <header className="mb-2 flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary"><Target className="h-3.5 w-3.5" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base leading-tight">Focus goal</h3>
          <p className="text-[11px] text-muted-foreground">One goal to nudge forward · {RHYTHM_LABEL[phase]} phase</p>
        </div>
        {goal && <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Clear focus goal" onClick={() => setGoal(null)}><X className="h-4 w-4" /></Button>}
      </header>
      {!goal ? (
        <LifeAreaGoalPicker value={undefined} allowNone={false} label="Choose focus goal" onChange={id => id && setGoal(id)} />
      ) : (
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Link to="/goals" className="min-w-0 break-words font-medium hover:underline">{goal.title}</Link>
            <span className="shrink-0 text-xs text-muted-foreground">{pct}%</span>
          </div>
          {lifeAreaLabel(goal.lifeHouse) && <p className="text-xs text-muted-foreground">{lifeAreaLabel(goal.lifeHouse)}</p>}
          <Progress value={pct} className="h-1.5" />
          <p className="text-xs text-muted-foreground">{PHASE_GUIDANCE[phase]}</p>
          {open.map(t => (
            <button key={t.id} onClick={() => updateTask(t.id, { done: true })} className="flex min-h-11 w-full items-center gap-2 text-left text-sm">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-primary"><Check className="h-3 w-3 opacity-0" /></span>
              <span className="min-w-0 break-words">{t.title}</span>
            </button>
          ))}
          <div className="flex gap-2">
            <Input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && addStep()} placeholder="One step today…" className="h-11" />
            <Button size="icon" className="h-11 w-11 shrink-0" aria-label="Add step" onClick={addStep}><Plus className="h-4 w-4" /></Button>
          </div>
          <details className="text-xs text-muted-foreground"><summary className="min-h-9 cursor-pointer py-2">Switch goal</summary>
            <LifeAreaGoalPicker value={goal.id} allowNone={false} label="Switch focus goal" onChange={id => id && setGoal(id)} />
          </details>
        </div>
      )}
    </section>
  );
}

/** Small header chip showing the day's focus goal. */
export function FocusGoalChip({ date }: { date: Date }) {
  const { state } = useStore();
  const [goalId] = useFocusGoal(date);
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal) return null;
  return <div className="mb-3 flex"><span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs text-primary">
    <Target className="h-3.5 w-3.5 shrink-0" /><span className="min-w-0 break-words">Focus: {goal.title}</span>
  </span></div>;
}
