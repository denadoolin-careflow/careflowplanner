import { useMemo } from "react";
import { addDays, startOfWeek, format, isSameDay } from "date-fns";
import { Home as HomeIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { CV2_TASK_MIME } from "./UniversalInbox";
import { toast } from "sonner";

export function WeekView({ date }: { date: Date }) {
  const { state, updateTask } = useStore();
  const start = useMemo(() => startOfWeek(date, { weekStartsOn: 0 }), [date]);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  const onDrop = async (e: React.DragEvent, day: Date) => {
    e.preventDefault();
    const id = e.dataTransfer.getData(CV2_TASK_MIME);
    if (!id) return;
    await updateTask(id, { dueDate: format(day, "yyyy-MM-dd"), inbox: false });
    toast.success(`Moved to ${format(day, "EEE, MMM d")}`);
  };

  return (
    <section className="reset-glass rounded-3xl p-4">
      <header className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Week of {format(start, "MMM d")}</span>
      </header>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-7">
        {days.map((d) => {
          const iso = format(d, "yyyy-MM-dd");
          const today = isSameDay(d, new Date());
          const items = [
            ...(state.appointments ?? []).filter((a) => a.date === iso).map((a) => ({ id: a.id, title: a.title, time: a.time, kind: "appt" as const })),
            ...state.tasks.filter((t) => t.dueDate === iso && !t.parentTaskId && t.status !== "parked")
              .map((t) => ({ id: t.id, title: t.title, time: t.startTime, kind: "task" as const, reset: !!t.resetItemId })),
          ].sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
          return (
            <div key={iso}
              onDragOver={(e) => e.dataTransfer.types.includes(CV2_TASK_MIME) && e.preventDefault()}
              onDrop={(e) => onDrop(e, d)}
              className={cn(
                "min-h-[140px] rounded-2xl border p-2 transition-colors",
                today ? "border-primary/60 bg-primary/10" : "border-border/50 bg-background/60 hover:border-primary/30"
              )}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{format(d, "EEE")}</p>
                <p className={cn("text-sm font-semibold", today ? "text-primary" : "text-foreground")}>{format(d, "d")}</p>
              </div>
              <ul className="space-y-1">
                {items.slice(0, 6).map((it) => (
                  <li key={it.id} className={cn(
                    "flex items-start gap-1 rounded-md px-1.5 py-0.5 text-[10px]",
                    it.kind === "appt" ? "bg-primary/15 text-foreground" : "bg-card/70 text-foreground"
                  )}>
                    {it.time && <span className="font-mono text-muted-foreground">{it.time.slice(0, 5)}</span>}
                    <span className="min-w-0 flex-1 line-clamp-2 [overflow-wrap:anywhere]">{it.title}</span>
                    {"reset" in it && it.reset && <HomeIcon className="mt-0.5 h-2.5 w-2.5 text-primary" />}
                  </li>
                ))}
                {items.length > 6 && <li className="text-[10px] text-muted-foreground">+{items.length - 6} more</li>}
                {items.length === 0 && <li className="text-[10px] text-muted-foreground/60">—</li>}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}