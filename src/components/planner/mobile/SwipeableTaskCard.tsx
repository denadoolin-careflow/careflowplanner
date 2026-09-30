import { useRef, useState, type ReactNode } from "react";
import { addDays, addWeeks, format } from "date-fns";
import { Check, CalendarDays, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { haptics } from "@/lib/haptics";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

const ACTIONS_W = 128;
const INTENT_PX = 12;

/** Mobile swipe: right = complete, left = reveal Reschedule / Delete. */
export function SwipeableTaskCard({ task, children }: { task: Task; children: ReactNode }) {
  const isMobile = useIsMobile();
  const { toggleTask, updateTask, deleteTask, addTask } = useStore();
  const [dx, setDx] = useState(0);
  const [open, setOpen] = useState(false); // actions revealed
  const [pickOpen, setPickOpen] = useState(false);
  const g = useRef({ x: 0, y: 0, base: 0, mode: "idle" as "idle" | "h" | "v", width: 1 });

  if (!isMobile) return <>{children}</>;

  const close = () => { setOpen(false); setDx(0); };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    g.current = { x: t.clientX, y: t.clientY, base: open ? -ACTIONS_W : 0, mode: "idle", width: (e.currentTarget as HTMLElement).offsetWidth || 1 };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    const mx = t.clientX - g.current.x, my = t.clientY - g.current.y;
    if (g.current.mode === "idle") {
      if (Math.abs(mx) > INTENT_PX && Math.abs(mx) > Math.abs(my) * 1.5) g.current.mode = "h";
      else if (Math.abs(my) > INTENT_PX) g.current.mode = "v";
    }
    if (g.current.mode === "h") setDx(Math.max(-ACTIONS_W - 40, Math.min(g.current.width * 0.6, g.current.base + mx)));
  };
  const onTouchEnd = () => {
    if (g.current.mode !== "h") return;
    const w = g.current.width;
    if (dx > Math.min(110, w * 0.35)) {
      haptics.success();
      void toggleTask(task.id);
      toast.success(task.done ? "Reopened" : "Completed", { description: task.title });
      close();
    } else if (dx < -ACTIONS_W / 2) {
      haptics.tap(); setOpen(true); setDx(-ACTIONS_W);
    } else close();
    g.current.mode = "idle";
  };

  const reschedule = async (d: Date) => {
    const iso = format(d, "yyyy-MM-dd");
    await updateTask(task.id, { dueDate: iso, inbox: false } as any);
    haptics.snap();
    toast.success(`Moved to ${format(d, "MMM d")}`);
    setPickOpen(false); close();
  };

  const remove = async () => {
    const { id, createdAt, ...rest } = task as any;
    await deleteTask(task.id);
    haptics.tap();
    close();
    toast("Task deleted", { description: task.title, action: { label: "Undo", onClick: () => void addTask(rest) } });
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      <div aria-hidden={!open && dx >= 0} className="absolute inset-0 flex items-stretch justify-between">
        <div className={cn("flex items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-opacity", dx > 8 ? "opacity-100" : "opacity-0")} style={{ width: Math.max(dx, 0) }}>
          <Check className="h-4 w-4 shrink-0" />{dx > 70 && (task.done ? "Reopen" : "Done")}
        </div>
        <div className={cn("ml-auto flex transition-opacity", dx < -8 ? "opacity-100" : "opacity-0 pointer-events-none")} style={{ width: ACTIONS_W }}>
          <Popover open={pickOpen} onOpenChange={setPickOpen}>
            <PopoverAnchor asChild>
              <button type="button" onClick={() => setPickOpen(true)} className="flex flex-1 flex-col items-center justify-center gap-0.5 bg-secondary text-[10.5px] text-secondary-foreground">
                <CalendarDays className="h-4 w-4" />Move
              </button>
            </PopoverAnchor>
            <PopoverContent className="w-auto p-2" align="end">
              <div className="flex gap-1 pb-1">
                <Button size="sm" variant="ghost" onClick={() => void reschedule(addDays(new Date(), 1))}>Tomorrow</Button>
                <Button size="sm" variant="ghost" onClick={() => void reschedule(addWeeks(new Date(), 1))}>Next week</Button>
              </div>
              <Calendar mode="single" onSelect={(d) => d && void reschedule(d)} className="p-2 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <button type="button" onClick={() => void remove()} className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-r-lg bg-destructive text-[10.5px] text-destructive-foreground">
            <Trash2 className="h-4 w-4" />Delete
          </button>
        </div>
      </div>
      <div
        className={cn("relative bg-background", g.current.mode !== "h" && "transition-transform duration-200")}
        style={{ transform: `translateX(${dx}px)`, touchAction: "pan-y" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClickCapture={(e) => { if (open) { e.stopPropagation(); e.preventDefault(); close(); } }}
      >
        {children}
      </div>
    </div>
  );
}
