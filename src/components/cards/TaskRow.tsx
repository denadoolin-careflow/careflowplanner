import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Task } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TaskRow({ task, dense = false, showArea = true }: { task: Task; dense?: boolean; showArea?: boolean }) {
  const { toggleTask, deleteTask } = useStore();
  return (
    <div className={cn(
      "group flex items-start gap-3 rounded-xl border border-transparent px-3 transition-colors hover:border-border/60 hover:bg-muted/40",
      dense ? "py-1.5" : "py-2.5"
    )}>
      <Checkbox checked={task.done} onCheckedChange={() => toggleTask(task.id)} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className={cn("text-sm", task.done && "text-muted-foreground line-through")}>{task.title}</div>
        {(showArea || task.dayPart || task.priority === "high") && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {showArea && <Badge variant="secondary" className="rounded-full bg-muted text-[10px] font-normal">{task.area}</Badge>}
            {task.dayPart && <Badge variant="outline" className="rounded-full text-[10px] font-normal">{task.dayPart}</Badge>}
            {task.priority === "high" && <Badge className="rounded-full bg-accent text-accent-foreground text-[10px] font-normal hover:bg-accent">priority</Badge>}
            {task.energy && <Badge variant="outline" className="rounded-full text-[10px] font-normal capitalize">{task.energy} energy</Badge>}
          </div>
        )}
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100" onClick={() => deleteTask(task.id)} aria-label="Delete">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
