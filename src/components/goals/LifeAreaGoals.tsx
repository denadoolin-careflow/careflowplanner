import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { LIFE_AREAS, LIFE_HOUSES, effectiveGoalProgress } from "@/lib/goals/life-areas";
import { toast } from "sonner";

/** Goals for one life area (house), with linked tasks/projects and quick add. */
export function LifeAreaGoalList({ house, compact }: { house: number; compact?: boolean }) {
  const { state, addGoal, updateGoal, addTask, updateTask } = useStore();
  const [title, setTitle] = useState("");
  const [taskDraft, setTaskDraft] = useState<Record<string, string>>({});
  const goals = state.goals.filter(g => g.lifeHouse === house && g.status !== "done");
  const projects = (state as any).projects ?? [];

  const add = async () => {
    const t = title.trim(); if (!t) return;
    await addGoal({ title: t, lifeHouse: house, timeline: "Year" } as any);
    setTitle(""); toast.success(`Goal added to ${LIFE_AREAS[house].label}`);
  };

  return (
    <div className="space-y-2">
      {goals.map(g => {
        const tasks = state.tasks.filter(t => t.goalId === g.id);
        const linkedProjects = projects.filter((p: any) => (p.linkedGoalIds ?? []).includes(g.id));
        const habits = state.habits.filter(h => (h.linkedGoalIds ?? []).includes(g.id));
        const pct = effectiveGoalProgress(g, tasks);
        return (
          <div key={g.id} className="rounded-lg border border-border bg-card/80 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Link to="/goals" className="min-w-0 truncate font-medium hover:underline">{g.title}</Link>
              <span className="shrink-0 text-xs text-muted-foreground">{pct}%</span>
            </div>
            <Progress value={pct} className="h-1.5" />
            <p className="text-xs text-muted-foreground">{tasks.length} task{tasks.length === 1 ? "" : "s"} · {linkedProjects.length} project{linkedProjects.length === 1 ? "" : "s"} · {habits.length} habit{habits.length === 1 ? "" : "s"}</p>
            {!compact && (
              <>
                {tasks.slice(0, 5).map(t => (
                  <button key={t.id} onClick={() => updateTask(t.id, { done: !t.done })} className="flex min-h-11 w-full items-center gap-2 text-left text-sm">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary ${t.done ? "bg-primary text-primary-foreground" : ""}`}>{t.done && <Check className="h-3 w-3" />}</span>
                    <span className={t.done ? "line-through text-muted-foreground" : ""}>{t.title}</span>
                  </button>
                ))}
                {linkedProjects.map((p: any) => <Link key={p.id} to={`/projects/${p.id}`} className="block text-xs text-primary underline-offset-2 hover:underline">Project · {p.name}</Link>)}
                <div className="flex gap-2">
                  <Input value={taskDraft[g.id] ?? ""} placeholder="Add a task for this goal" className="h-11"
                    onChange={e => setTaskDraft(d => ({ ...d, [g.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === "Enter" && taskDraft[g.id]?.trim()) { addTask({ title: taskDraft[g.id].trim(), goalId: g.id, area: "Personal", priority: "medium" } as any); setTaskDraft(d => ({ ...d, [g.id]: "" })); } }} />
                </div>
                <label className="flex min-h-11 items-center justify-between gap-2 text-xs text-muted-foreground">
                  Update progress from finished tasks
                  <Switch checked={!!g.autoProgress} onCheckedChange={v => updateGoal(g.id, { autoProgress: v })} />
                </label>
              </>
            )}
          </div>
        );
      })}
      <div className="flex gap-2">
        <Input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder={`New ${LIFE_AREAS[house].label} goal`} className="h-11" />
        <Button onClick={add} size="icon" className="h-11 w-11 shrink-0" aria-label="Add goal"><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

/** 12 life area cards for the Goals page. */
export function LifeAreasBoard() {
  const { state } = useStore();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {LIFE_HOUSES.map(h => {
        const count = state.goals.filter(g => g.lifeHouse === h && g.status !== "done").length;
        return (
          <section key={h} className="cozy-card space-y-3 p-4 motion-safe:animate-fade-in">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-accent-foreground/70">House {h} · {count} goal{count === 1 ? "" : "s"}</p>
              <h3 className="font-display text-lg">{LIFE_AREAS[h].label}</h3>
              <p className="text-xs text-muted-foreground">{LIFE_AREAS[h].hint}</p>
            </div>
            <LifeAreaGoalList house={h} />
          </section>
        );
      })}
    </div>
  );
}
