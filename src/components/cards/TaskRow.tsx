import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Task } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import { useDraggable } from "@dnd-kit/core";

export function TaskRow({ task, dense = false, showArea = true, draggable = false }: { task: Task; dense?: boolean; showArea?: boolean; draggable?: boolean }) {
  const { toggleTask, deleteTask } = useStore();
  const [open, setOpen] = useState(false);
  return (
    <>
    <RowShell task={task} dense={dense} draggable={draggable}>
      <Checkbox checked={task.done} onCheckedChange={() => toggleTask(task.id)} className="mt-0.5" />
      <button type="button" onClick={() => setOpen(true)} className="min-w-0 flex-1 cursor-pointer text-left">
        <div className={cn("text-sm", task.done && "text-muted-foreground line-through")}>{task.title}</div>
        {(showArea || task.dayPart || task.priority === "high") && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {showArea && <Badge variant="secondary" className="rounded-full bg-muted text-[10px] font-normal">{task.area}</Badge>}
            {task.dayPart && <Badge variant="outline" className="rounded-full text-[10px] font-normal">{task.dayPart}</Badge>}
            {task.priority === "high" && <Badge className="rounded-full bg-accent text-accent-foreground text-[10px] font-normal hover:bg-accent">priority</Badge>}
            {task.energy && <Badge variant="outline" className="rounded-full text-[10px] font-normal capitalize">{task.energy} energy</Badge>}
          </div>
        )}
      </button>
      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100" onClick={() => deleteTask(task.id)} aria-label="Delete">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </RowShell>
    <TaskEditor open={open} onOpenChange={setOpen} task={task} />
    </>
  );
}

function RowShell({ task, dense, draggable, children }: { task: Task; dense: boolean; draggable: boolean; children: React.ReactNode }) {
  const cls = cn(
    "group flex items-start gap-2 rounded-xl border border-transparent px-2 transition-colors hover:border-border/60 hover:bg-muted/40",
    dense ? "py-1.5" : "py-2.5"
  );
  if (!draggable) return <div className={cls}>{children}</div>;
  return <DraggableShell task={task} className={cls}>{children}</DraggableShell>;
}

function DraggableShell({ task, className, children }: { task: Task; className: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  return (
    <div ref={setNodeRef} className={cn(className, isDragging && "opacity-40")}>
      <button {...listeners} {...attributes} aria-label="Drag" className="mt-0.5 -ml-1 cursor-grab touch-none rounded p-0.5 text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing">
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      {children}
    </div>
  );
}
