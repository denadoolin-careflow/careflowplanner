import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Target, FolderOpen, ChevronDown, CheckCircle2, Circle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Link } from "react-router-dom";
import type { Goal, Area } from "@/lib/types";
import { cn } from "@/lib/utils";

const AREA_TO_CAT: Record<string, Goal["category"]> = {
  "Family": "Family",
  "Kids": "Family",
  "Caregiving": "Caregiving",
  "Home": "Home",
  "Meals": "Home",
  "Appointments": "Personal",
  "Holidays & Birthdays": "Family",
  "Personal": "Personal",
  "Creative Projects": "Creative",
  "Money": "Financial",
};

interface Props {
  area: Area | string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function AreaDetailDialog({ area, open, onOpenChange }: Props) {
  const { state, addGoal, updateGoal, deleteGoal, addTask, updateTask, toggleTask, deleteTask } = useStore();
  const cat = AREA_TO_CAT[area] ?? "Personal";
  const goals = useMemo(
    () => state.goals.filter(g => g.category === cat),
    [state.goals, cat],
  );
  const projects = useMemo(
    () => (state.projects ?? []).filter(p => p.areaName === area && p.status !== "done"),
    [state.projects, area],
  );
  const [newGoalTitle, setNewGoalTitle] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{area}</span>
            <span className="text-xs font-normal text-muted-foreground">· {cat} goals</span>
          </DialogTitle>
        </DialogHeader>

        {/* Goals */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Target className="h-3.5 w-3.5" /> Goals
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="New goal for this area…"
              value={newGoalTitle}
              onChange={e => setNewGoalTitle(e.target.value)}
              onKeyDown={async e => {
                if (e.key === "Enter" && newGoalTitle.trim()) {
                  await addGoal({ title: newGoalTitle.trim(), category: cat });
                  setNewGoalTitle("");
                }
              }}
            />
            <Button
              size="sm"
              onClick={async () => {
                if (!newGoalTitle.trim()) return;
                await addGoal({ title: newGoalTitle.trim(), category: cat });
                setNewGoalTitle("");
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {goals.length === 0 && (
            <p className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
              No goals yet for {cat}. Add one above to start linking subtasks.
            </p>
          )}
          {goals.map(g => (
            <GoalCard
              key={g.id}
              goal={g}
              projects={projects}
              tasks={state.tasks.filter(t => t.goalId === g.id && !t.parentTaskId)}
              onUpdate={updateGoal}
              onDelete={deleteGoal}
              onAddTask={addTask}
              onToggleTask={toggleTask}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
            />
          ))}
        </section>

        {/* Projects */}
        <section className="mt-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <FolderOpen className="h-3.5 w-3.5" /> Projects in {area}
          </div>
          {projects.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
              No active projects in this area.
            </p>
          ) : (
            <div className="grid gap-1.5 sm:grid-cols-2">
              {projects.map(p => (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}`}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-sm hover:border-primary/40 hover:bg-primary/5"
                >
                  <FolderOpen className="h-3.5 w-3.5 text-primary" />
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}

function GoalCard({
  goal, projects, tasks,
  onUpdate, onDelete, onAddTask, onToggleTask, onUpdateTask, onDeleteTask,
}: {
  goal: Goal;
  projects: { id: string; name: string }[];
  tasks: any[];
  onUpdate: (id: string, p: Partial<Goal>) => void;
  onDelete: (id: string) => void;
  onAddTask: (t: any) => Promise<any>;
  onToggleTask: (id: string) => void;
  onUpdateTask: (id: string, p: any) => void;
  onDeleteTask: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [newSub, setNewSub] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newProj, setNewProj] = useState<string>("");
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border border-border/60 bg-card/60">
      <div className="flex items-start gap-2 p-3">
        <CollapsibleTrigger asChild>
          <button className="mt-1 text-muted-foreground hover:text-foreground" aria-label="Toggle">
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <div className="min-w-0 flex-1 space-y-2">
          <Input
            value={goal.title}
            onChange={e => onUpdate(goal.id, { title: e.target.value })}
            className="h-8 border-0 bg-transparent px-0 text-sm font-semibold focus-visible:ring-0"
          />
          <Textarea
            rows={1}
            placeholder="Why does this matter?"
            value={goal.description ?? ""}
            onChange={e => onUpdate(goal.id, { description: e.target.value })}
            className="resize-none border-0 bg-transparent px-0 text-xs text-muted-foreground focus-visible:ring-0"
          />
          <div>
            <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
              <span>Progress</span><span>{goal.progress}%</span>
            </div>
            <Slider value={[goal.progress]} max={100} step={5} onValueChange={v => onUpdate(goal.id, { progress: v[0] })} />
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(goal.id)} aria-label="Delete goal">
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
        </Button>
      </div>
      <CollapsibleContent className="space-y-2 border-t border-border/40 px-3 py-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Subtasks</div>
        {tasks.length === 0 && (
          <p className="text-xs text-muted-foreground">No subtasks yet — add one below.</p>
        )}
        <ul className="space-y-1">
          {tasks.map(t => (
            <li key={t.id} className="group flex items-center gap-2 rounded-lg bg-muted/40 px-2 py-1.5 text-sm">
              <button onClick={() => onToggleTask(t.id)} aria-label="Toggle">
                {t.done ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
              </button>
              <input
                defaultValue={t.title}
                onBlur={e => { if (e.target.value !== t.title) onUpdateTask(t.id, { title: e.target.value }); }}
                onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                className={cn(
                  "min-w-0 flex-1 border-0 bg-transparent text-sm outline-none ring-0 focus:ring-0",
                  t.done && "line-through text-muted-foreground"
                )}
              />
              <Input
                type="date"
                value={t.dueDate ?? ""}
                onChange={e => onUpdateTask(t.id, { dueDate: e.target.value || undefined })}
                className="h-7 w-36 text-xs"
              />
              <button
                onClick={() => onDeleteTask(t.id)}
                className="opacity-0 transition group-hover:opacity-100"
                aria-label="Delete subtask"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-1.5">
          <Input
            placeholder="Add subtask…"
            value={newSub}
            onChange={e => setNewSub(e.target.value)}
            onKeyDown={async e => {
              if (e.key === "Enter" && newSub.trim()) {
                await onAddTask({ title: newSub.trim(), area: "Personal", goalId: goal.id, dueDate: newDate || undefined, projectId: newProj || undefined });
                setNewSub(""); setNewDate("");
              }
            }}
            className="h-8 min-w-[160px] flex-1 text-sm"
          />
          <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="h-8 w-36 text-xs" />
          {projects.length > 0 && (
            <select
              value={newProj}
              onChange={e => setNewProj(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="">No project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <Button
            size="sm"
            className="h-8"
            onClick={async () => {
              if (!newSub.trim()) return;
              await onAddTask({ title: newSub.trim(), area: "Personal", goalId: goal.id, dueDate: newDate || undefined, projectId: newProj || undefined });
              setNewSub(""); setNewDate("");
            }}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
