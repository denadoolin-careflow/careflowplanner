import { Task } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import { TagChip } from "@/components/tags/TagChip";

const DOTS: Record<Task["priority"], number> = { low: 0, medium: 1, high: 2 };

function dueLabel(d?: string) {
  if (!d) return null;
  try {
    const dt = parseISO(d);
    if (isToday(dt)) return "Today";
    if (isTomorrow(dt)) return "Tomorrow";
    return format(dt, "MMM d");
  } catch { return null; }
}

/** Simplified mobile task card — checkbox, title, meta. Tap → /tasks/:id */
export function MobileTaskCard({ task }: { task: Task }) {
  const { toggleTask, state } = useStore();
  const navigate = useNavigate();
  const proj = task.projectId ? state.projects?.find(p => p.id === task.projectId) : undefined;
  const dl = dueLabel(task.dueDate);
  const dueClass = (() => {
    if (!task.dueDate) return "text-muted-foreground";
    try {
      const dt = parseISO(task.dueDate);
      if (dt.getTime() < Date.now() - 1000*60*60*24 && !isToday(dt)) return "text-rose-500";
      return "text-amber-600";
    } catch { return "text-muted-foreground"; }
  })();

  return (
    <button
      type="button"
      onClick={() => navigate(`/tasks/${task.id}`)}
      className="cf-card w-full text-left p-4 active:scale-[0.995] transition-transform"
    >
      <div className="flex items-start gap-3">
        <div onClick={(e) => { e.stopPropagation(); void toggleTask(task.id); }} className="pt-0.5">
          <Checkbox checked={task.done} className="h-5 w-5 rounded-full" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("text-[15px] leading-snug", task.done && "line-through text-muted-foreground")}>
            {task.title}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
            {proj ? (
              <span className="text-muted-foreground">{proj.name}</span>
            ) : (
              <span className="text-muted-foreground">{task.area}</span>
            )}
            {dl && <><span className="text-muted-foreground/50">·</span><span className={cn("font-medium", dueClass)}>{dl}</span></>}
            {DOTS[task.priority] > 0 && (
              <span className="flex items-center gap-0.5">
                {Array.from({ length: DOTS[task.priority] }).map((_, i) => (
                  <span key={i} className={cn("h-1.5 w-1.5 rounded-full", task.priority === "high" ? "bg-rose-500" : "bg-amber-500")} />
                ))}
              </span>
            )}
            {(task.tags ?? []).slice(0, 2).map(t => (
              <TagChip key={t} name={t} subtle size="sm" />
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}