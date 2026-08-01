import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useTaskSelection } from "@/lib/task-selection";
import { Button } from "@/components/ui/button";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import { BlockEditor } from "@/components/notes/BlockEditor";
import { CalendarDays, Check, Settings2, Trash2, X, FolderKanban, Flag, Plus } from "lucide-react";
import { formatRelativeDate } from "@/lib/date-format";
import { cn } from "@/lib/utils";
import { ProjectQuickJump } from "@/components/tasks/ProjectQuickJump";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export function TaskDetailPane() {
  const { selected, count, clear, selectOnly } = useTaskSelection();
  const { state, updateTask, deleteTask, toggleTask, addTask } = useStore();
  const [openEditor, setOpenEditor] = useState(false);
  const [subDraft, setSubDraft] = useState("");

  const task = useMemo(() => {
    if (count !== 1) return null;
    const id = Array.from(selected)[0];
    return state.tasks.find(t => t.id === id) ?? null;
  }, [selected, count, state.tasks]);

  const project = task?.projectId ? state.projects?.find(p => p.id === task.projectId) : null;
  const subtasks = task ? state.tasks.filter(t => t.parentTaskId === task.id) : [];
  const cyclePriority = () => {
    if (!task) return;
    const order = ["low", "medium", "high"] as const;
    const next = order[(order.indexOf(task.priority as any) + 1) % order.length];
    void updateTask(task.id, { priority: next });
  };

  return (
    <aside className="sticky top-20 hidden h-[calc(100vh-7rem)] w-80 shrink-0 overflow-y-auto rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur-sm lg:block">
      {count === 0 && (
        <div className="space-y-4">
          <EmptyState title="No task selected" subtitle="Click a task to see details, or hold ⌘/Ctrl-click to multi-select." />
          <div className="border-t border-border/50 pt-4">
            <ProjectQuickJump />
          </div>
        </div>
      )}

      {count > 1 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{count} tasks selected</h3>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={clear} aria-label="Clear">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Use the bulk action bar at the bottom to complete, schedule, move, or delete.</p>
          <div className="space-y-1">
            {Array.from(selected).slice(0, 12).map(id => {
              const t = state.tasks.find(x => x.id === id);
              if (!t) return null;
              return (
                <button
                  key={id}
                  onClick={() => selectOnly(id)}
                  className="flex w-full items-center gap-2 truncate rounded-md px-2 py-1 text-left text-xs hover:bg-muted"
                >
                  <span className="truncate">{t.title}</span>
                </button>
              );
            })}
            {count > 12 && <p className="px-2 text-[11px] text-muted-foreground">+ {count - 12} more</p>}
          </div>
        </div>
      )}

      {task && (
        <div className="space-y-4">
          {/* Header controls — complete, due date, priority flag, close */}
          <div className="-mx-1 flex items-center gap-2 border-b border-border/50 px-1 pb-2 text-muted-foreground">
            <Checkbox
              checked={task.done}
              onCheckedChange={() => toggleTask(task.id)}
              className="rounded-full"
              aria-label={task.done ? "Reopen task" : "Complete task"}
            />
            <button
              type="button"
              onClick={() => setOpenEditor(true)}
              className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs hover:bg-muted hover:text-foreground"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              {task.dueDate ? formatRelativeDate(task.dueDate) : "Set date"}
            </button>
            {project && (
              <span className="inline-flex items-center gap-1 truncate text-xs">
                <FolderKanban className="h-3.5 w-3.5" />{project.name}
              </span>
            )}
            <span className="flex-1" />
            <button
              type="button"
              onClick={cyclePriority}
              aria-label={`Priority: ${task.priority}. Click to change.`}
              className="rounded-md p-1 hover:bg-muted"
            >
              <Flag className={cn(
                "h-3.5 w-3.5",
                task.priority === "high" && "text-priority-high",
                task.priority === "medium" && "text-priority-med",
              )} />
            </button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => selectOnly(null)} aria-label="Close">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Title as editable heading */}
          <input
            value={task.title}
            onChange={(e) => updateTask(task.id, { title: e.target.value })}
            className={cn(
              "w-full border-0 bg-transparent p-0 text-lg font-semibold leading-snug outline-none focus:ring-0",
              task.done && "text-muted-foreground line-through",
            )}
            aria-label="Task title"
          />

          <BlockEditor
            body={task.notes ?? ""}
            onChange={(markdown) => updateTask(task.id, { notes: markdown })}
            placeholder="Description…"
            showFooter={false}
          />

          {/* Subtasks */}
          <div className="space-y-1 border-t border-border/50 pt-3">
            {subtasks.map(s => (
              <label key={s.id} className="flex items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted/50">
                <Checkbox checked={s.done} onCheckedChange={() => toggleTask(s.id)} className="rounded-full" />
                <span className={cn("min-w-0 flex-1 truncate", s.done && "text-muted-foreground line-through")}>{s.title}</span>
              </label>
            ))}
            <div className="flex items-center gap-2 px-1">
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={subDraft}
                onChange={(e) => setSubDraft(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && subDraft.trim()) {
                    e.preventDefault();
                    await addTask({ title: subDraft.trim(), area: task.area, parentTaskId: task.id, projectId: task.projectId } as any);
                    setSubDraft("");
                  }
                }}
                placeholder="Add subtask"
                className="h-8 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setOpenEditor(true)}>
              <Settings2 className="h-3.5 w-3.5" />
              Edit all
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-destructive hover:text-destructive"
              onClick={async () => {
                await deleteTask(task.id);
                clear();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>

          <TaskEditor open={openEditor} onOpenChange={setOpenEditor} task={task} />
        </div>
      )}
    </aside>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-[14rem] text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}