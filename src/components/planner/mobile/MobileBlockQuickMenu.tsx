import { addDays, format, parseISO } from "date-fns";
import { Check, ChevronDown, ChevronUp, CalendarDays, Pencil, Timer } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useStore } from "@/lib/store";
import { openTaskEditor } from "@/lib/open-task-editor";
import { pomodoro } from "@/lib/pomodoro-store";
import { haptics } from "@/lib/haptics";
import { SNAP_MIN } from "@/lib/planner-metrics";
import { toast } from "sonner";
import type { Task } from "@/lib/types";

/** Long-press menu on a planner block: fast one-tap actions, no full editor. */
export function MobileBlockQuickMenu({ task, open, onOpenChange, onOpenSheet }: {
  task: Task | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onOpenSheet: () => void;
}) {
  const { updateTask, toggleTask } = useStore();
  if (!task) return null;
  const dur = task.estMinutes && task.estMinutes > 0 ? task.estMinutes : 30;

  const run = async (fn: () => Promise<void> | void, msg?: string) => {
    haptics.tap?.();
    await fn();
    if (msg) toast.success(msg);
    onOpenChange(false);
  };

  const setDur = (next: number) => updateTask(task.id, { estMinutes: Math.max(SNAP_MIN, Math.min(next, 12 * 60)) } as any);

  const actions = [
    { icon: Check, label: task.done ? "Reopen" : "Complete", run: () => run(() => toggleTask(task.id)) },
    { icon: ChevronUp, label: `+15m (${dur + SNAP_MIN}m)`, run: () => run(() => setDur(dur + SNAP_MIN), "Duration updated") },
    { icon: ChevronDown, label: `−15m (${Math.max(SNAP_MIN, dur - SNAP_MIN)}m)`, run: () => run(() => setDur(dur - SNAP_MIN), "Duration updated") },
    {
      icon: CalendarDays,
      label: "Move to tomorrow",
      run: () => run(
        () => updateTask(task.id, { dueDate: format(addDays(task.dueDate ? parseISO(task.dueDate) : new Date(), 1), "yyyy-MM-dd"), inbox: false } as any),
        "Moved to tomorrow",
      ),
    },
    {
      icon: Timer,
      label: `Start timer (${dur}m)`,
      run: () => run(() => { pomodoro.startForTask({ id: task.id, title: task.title }, { focusSeconds: dur * 60 }); }),
    },
    { icon: Pencil, label: "Open full editor", run: () => { onOpenChange(false); openTaskEditor(task.id); } },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <SheetHeader className="pb-1 text-left">
          <SheetTitle className="truncate text-[15px]">{task.title}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col">
          {actions.map(a => (
            <button
              key={a.label}
              type="button"
              onClick={() => void a.run()}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-[14px] active:bg-muted/60"
            >
              <a.icon className="h-4 w-4 text-muted-foreground" /> {a.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => { onOpenChange(false); onOpenSheet(); }}
            className="mt-1 rounded-xl px-3 py-3 text-left text-[14px] text-primary active:bg-muted/60"
          >
            Edit time, date & details
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
