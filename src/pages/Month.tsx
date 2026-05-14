import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import {
  startOfMonth, eachDayOfInterval, format, isSameMonth, isSameDay,
  startOfWeek, addDays, addMonths, subMonths,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { UnscheduledTasksRail } from "@/components/calendar/UnscheduledTasksRail";
import { gcalFetchEvents, type GCalEvent } from "@/lib/google-calendar";
import { DayPickerButton } from "@/components/calendar/DayPickerButton";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import type { Task } from "@/lib/types";
import { haptics } from "@/lib/haptics";

const TASK_DRAG_MIME = "application/x-careflow-task";

export default function Month() {
  const { state, updateTask } = useStore();
  const [cursor, setCursor] = useState(new Date());
  const [gEvents, setGEvents] = useState<GCalEvent[]>([]);
  const [hoverISO, setHoverISO] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  useEffect(() => { gcalFetchEvents().then(r => setGEvents(r.events ?? [])).catch(() => {}); }, []);

  const monthStart = startOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: addDays(gridStart, 41) });

  const colorOf = (k: "appt"|"bday"|"hol"|"gcal"|"task") =>
    k === "appt" ? "bg-primary-soft text-foreground"
    : k === "bday" ? "bg-accent-soft text-accent-foreground"
    : k === "hol" ? "bg-secondary-soft text-secondary-foreground"
    : k === "task" ? "bg-warm-soft text-warm-foreground border border-primary/30"
    : "bg-muted text-foreground";

  type EvItem = { kind: "appt"|"bday"|"hol"|"gcal"|"task"; label: string; taskId?: string };
  const eventsOn = (k: string): EvItem[] => [
    ...state.appointments.filter(a => a.date === k).map(a => ({ kind: "appt" as const, label: a.title })),
    ...state.birthdays.filter(b => b.date === k).map(b => ({ kind: "bday" as const, label: `🎂 ${b.name}` })),
    ...state.holidays.filter(h => h.date === k).map(h => ({ kind: "hol" as const, label: `✨ ${h.name}` })),
    ...gEvents.filter(g => g.date === k).map(g => ({ kind: "gcal" as const, label: g.title })),
    ...state.tasks.filter(t => t.dueDate === k && !t.done && !t.parentTaskId).map(t => ({
      kind: "task" as const, label: `○ ${t.title}`, taskId: t.id,
    })),
  ];

  const handleDayDrop = async (taskId: string, iso: string) => {
    const t = state.tasks.find(x => x.id === taskId);
    if (!t) return;
    if (t.dueDate === iso) return;
    await updateTask(taskId, { dueDate: iso, inbox: false });
    haptics.tap();
    toast(`Moved “${t.title}” to ${format(new Date(iso), "MMM d")}`);
  };

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-6">
        <div className="cozy-card gradient-warm flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Month of</p>
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">{format(cursor, "MMMM yyyy")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Drag tasks from the right onto any day.</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setCursor(subMonths(cursor, 1))} aria-label="Previous"><ChevronLeft className="h-4 w-4" /></Button>
            <DayPickerButton date={cursor} onChange={setCursor} label={format(cursor, "MMM yyyy")} />
            <Button variant="ghost" size="sm" className="h-8 px-3 text-xs" onClick={() => setCursor(new Date())}>Today</Button>
            <Button variant="ghost" size="icon" onClick={() => setCursor(addMonths(cursor, 1))} aria-label="Next"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>

        <SectionCard title="Calendar" accent="calm">
          <div className="grid grid-cols-7 gap-1 text-xs uppercase tracking-wider text-muted-foreground">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d} className="px-2 py-1 text-center">{d}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map(d => {
              const k = d.toISOString().slice(0,10);
              const inMonth = isSameMonth(d, cursor);
              const today = isSameDay(d, new Date());
              const ev = eventsOn(k);
              return (
                <div
                  key={k}
                  onDragOver={(e) => {
                    if (!Array.from(e.dataTransfer.types).includes(TASK_DRAG_MIME)) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setHoverISO(k);
                  }}
                  onDragLeave={() => setHoverISO(p => p === k ? null : p)}
                  onDrop={(e) => {
                    const id = e.dataTransfer.getData(TASK_DRAG_MIME);
                    if (!id) return;
                    e.preventDefault();
                    handleDayDrop(id, k);
                    setHoverISO(null);
                    setDraggingTaskId(null);
                  }}
                  className={cn(
                    "group/day relative min-h-24 rounded-lg border p-1.5 text-xs transition-all duration-200 ease-out",
                    inMonth ? "border-border/60 bg-card" : "border-transparent bg-transparent text-muted-foreground/50",
                    today && "ring-2 ring-primary",
                    hoverISO === k && "scale-[1.03] bg-primary/10 ring-2 ring-primary shadow-md",
                  )}
                >
                  <div className={cn("text-right text-[11px] font-medium", today && "text-primary")}>{format(d, "d")}</div>
                  <div className="mt-0.5 space-y-0.5">
                    {ev.slice(0,3).map((it, i) => {
                      const isTask = it.kind === "task" && !!it.taskId;
                      const isBeingDragged = isTask && draggingTaskId === it.taskId;
                      return (
                        <div
                          key={i}
                          draggable={isTask}
                          onDragStart={isTask ? (e) => {
                            e.stopPropagation();
                            e.dataTransfer.setData(TASK_DRAG_MIME, it.taskId!);
                            e.dataTransfer.setData("text/plain", it.label);
                            e.dataTransfer.effectAllowed = "move";
                            setDraggingTaskId(it.taskId!);
                            haptics.pickup();
                          } : undefined}
                          onDragEnd={isTask ? () => setDraggingTaskId(null) : undefined}
                          onClick={isTask ? (e) => {
                            e.stopPropagation();
                            const t = state.tasks.find(x => x.id === it.taskId);
                            if (t) setEditingTask(t);
                          } : undefined}
                          className={cn(
                            "truncate rounded px-1 py-0.5 text-[10px] transition-all duration-150",
                            colorOf(it.kind),
                            isTask && "cursor-grab hover:scale-[1.04] hover:shadow-sm hover:ring-1 hover:ring-primary/40 active:cursor-grabbing",
                            isBeingDragged && "opacity-40 scale-95",
                          )}
                          title={it.label}
                        >
                          {it.label}
                        </div>
                      );
                    })}
                    {ev.length > 3 && <div className="text-[10px] text-muted-foreground">+{ev.length - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
      <UnscheduledTasksRail />

      {editingTask && (
        <TaskEditor task={editingTask} open={!!editingTask} onOpenChange={(o) => !o && setEditingTask(null)} />
      )}
    </div>
  );
}
