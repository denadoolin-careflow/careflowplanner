import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useTaskSelection } from "@/lib/task-selection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import { BlockEditor } from "@/components/notes/BlockEditor";
import { CalendarDays, Check, Settings2, Trash2, X, FolderKanban, Tag } from "lucide-react";
import { formatRelativeDate } from "@/lib/date-format";
import { cn } from "@/lib/utils";

export function TaskDetailPane() {
  const { selected, count, clear, selectOnly } = useTaskSelection();
  const { state, updateTask, deleteTask, toggleTask } = useStore();
  const [openEditor, setOpenEditor] = useState(false);

  const task = useMemo(() => {
    if (count !== 1) return null;
    const id = Array.from(selected)[0];
    return state.tasks.find(t => t.id === id) ?? null;
  }, [selected, count, state.tasks]);

  const project = task?.projectId ? state.projects?.find(p => p.id === task.projectId) : null;
  const areaColor = task ? (state.areas ?? []).find(a => a.name === task.area)?.color : undefined;

  return (
    <aside className="sticky top-20 hidden h-[calc(100vh-7rem)] w-80 shrink-0 overflow-y-auto rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur-sm lg:block">
      {count === 0 && (
        <EmptyState title="No task selected" subtitle="Click a task to see details here, or hold ⌘/Ctrl-click to multi-select." />
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
          <div className="flex items-start justify-between gap-2">
            <h3 className={cn("min-w-0 flex-1 text-base font-semibold leading-snug", task.done && "text-muted-foreground line-through")}>
              {task.title}
            </h3>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => selectOnly(null)} aria-label="Close">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {task.area && (
              <Badge
                variant="secondary"
                className="rounded-full text-[10px]"
                style={areaColor ? { backgroundColor: `${areaColor}22`, color: areaColor } : undefined}
              >
                <Tag className="mr-1 h-2.5 w-2.5" />{task.area}
              </Badge>
            )}
            {task.dueDate && (
              <Badge variant="outline" className="rounded-full text-[10px]">
                <CalendarDays className="mr-1 h-2.5 w-2.5" />{formatRelativeDate(task.dueDate)}
              </Badge>
            )}
            {project && (
              <Badge variant="outline" className="rounded-full text-[10px]">
                <FolderKanban className="mr-1 h-2.5 w-2.5" />{project.name}
              </Badge>
            )}
            {task.priority === "high" && (
              <Badge className="rounded-full bg-accent text-accent-foreground text-[10px]">priority</Badge>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Notes</label>
            <div className="rounded-xl border border-border/60 bg-background/40 p-2">
              <BlockEditor
                body={task.notes ?? ""}
                onChange={(markdown) => updateTask(task.id, { notes: markdown })}
                placeholder="Add notes… press / for blocks"
                showFooter={false}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => toggleTask(task.id)}>
              <Check className="h-3.5 w-3.5" />
              {task.done ? "Reopen" : "Complete"}
            </Button>
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