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
import { isComposted, PHASE_GUIDANCE } from "@/lib/goals/cycle";
import { getMoonPhase } from "@/lib/moon";
import { rhythmPhaseForMoon, RHYTHM_LABEL } from "@/lib/planner/rhythm-phase";
import { setFocusGoal } from "@/lib/goals/focus-goal";
import { LifeAreaRollup, ConnectionsPanel } from "@/components/connections/ConnectionsPanel";

/** Goals for one life area (house), with linked tasks/projects and quick add. */
export function LifeAreaGoalList({ house, compact }: { house: number; compact?: boolean }) {
  const { state, addGoal, updateGoal, addTask, updateTask } = useStore();
  const [title, setTitle] = useState("");
  const [taskDraft, setTaskDraft] = useState<Record<string, string>>({});
  const goals = state.goals.filter(g => g.lifeHouse === house && g.status !== "done" && !isComposted(g.details));
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
            <div className="flex flex-wrap items-center gap-2">
              {g.details?.season && <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-[11px] capitalize text-secondary-foreground">{g.details.season}</span>}
              <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => { void setFocusGoal(new Date(), g.id); toast.success("Set as today's focus goal"); }}>Nudge today</Button>
            </div>
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
                <ConnectionsPanel type="goal" id={g.id} />
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

/** 12 life area tiles (2-col phone) with a progress ring; tap a tile to open its goals. */
export function LifeAreasBoard() {
  const { state } = useStore();
  const [open, setOpen] = useState<number | null>(null);
  const phase = rhythmPhaseForMoon(getMoonPhase(new Date()));
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{RHYTHM_LABEL[phase]} phase:</span> {PHASE_GUIDANCE[phase]}</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {LIFE_HOUSES.map(h => {
          const goals = state.goals.filter(g => g.lifeHouse === h && g.status !== "done" && !isComposted(g.details));
          const pcts = goals.map(g => effectiveGoalProgress(g, state.tasks.filter(t => t.goalId === g.id)));
          const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
          const next = goals.flatMap(g => state.tasks.filter(t => t.goalId === g.id && !t.done))[0];
          const active = open === h;
          return (
            <button key={h} type="button" onClick={() => setOpen(active ? null : h)} aria-expanded={active}
              className={`cozy-card flex min-h-[9rem] flex-col gap-2 p-3 text-left transition motion-safe:animate-fade-in ${active ? "ring-2 ring-primary" : "hover:border-primary/40"}`}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">House {h}</span>
                <Ring pct={avg} />
              </div>
              <h3 className="font-display text-base leading-tight break-words">{LIFE_AREAS[h].label}</h3>
              <p className="text-[11px] text-muted-foreground">{goals.length} goal{goals.length === 1 ? "" : "s"}</p>
              <p className="mt-auto line-clamp-2 text-[11px] text-foreground/80">{next ? `Next: ${next.title}` : LIFE_AREAS[h].hint}</p>
            </button>
          );
        })}
      </div>
      {open && (
        <section className="cozy-card space-y-3 p-4 motion-safe:animate-fade-in">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">House {open}</p>
            <h3 className="font-display text-xl">{LIFE_AREAS[open].label}</h3>
            <p className="text-xs text-muted-foreground">{LIFE_AREAS[open].hint}</p>
          </div>
          <LifeAreaGoalList house={open} />
          <LifeAreaRollup house={open} />
        </section>
      )}
    </div>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 14, c = 2 * Math.PI * r;
  return <svg viewBox="0 0 36 36" className="h-10 w-10 shrink-0 -rotate-90" aria-label={`${pct}% progress`}>
    <circle cx="18" cy="18" r={r} fill="none" className="stroke-muted" strokeWidth="4" />
    <circle cx="18" cy="18" r={r} fill="none" className="stroke-primary" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} />
    <text x="18" y="18" className="fill-foreground text-[9px]" textAnchor="middle" dominantBaseline="central" transform="rotate(90 18 18)">{pct}</text>
  </svg>;
}
