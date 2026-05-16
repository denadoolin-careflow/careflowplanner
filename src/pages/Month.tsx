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
import { AgendaView } from "@/components/calendar/AgendaView";
import { CalendarTasksPanel } from "@/components/calendar/CalendarTasksPanel";
import { CalendarViewToggle, type CalView } from "@/components/calendar/CalendarViewToggle";
import { QuickAddCalendarPopover } from "@/components/calendar/QuickAddCalendarPopover";
import { AppointmentEditor } from "@/components/calendar/AppointmentEditor";
import { useCycle } from "@/lib/cycle-store";
import { phaseForDate, PHASE_META } from "@/lib/cycle";

const TASK_DRAG_MIME = "application/x-careflow-task";
const APPT_DRAG_MIME = "application/x-careflow-appt";

export default function Month() {
  const { state, updateTask, updateAppointment } = useStore();
  const { settings: cycleSettings, periods: cyclePeriods } = useCycle();
  const [cursor, setCursor] = useState(new Date());
  const [gEvents, setGEvents] = useState<GCalEvent[]>([]);
  const [hoverISO, setHoverISO] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editApptId, setEditApptId] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [view, setView] = useState<CalView>("schedule");
  useEffect(() => { gcalFetchEvents().then(r => setGEvents(r.events ?? [])).catch(() => {}); }, []);

  const monthStart = startOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: addDays(gridStart, 41) });
  const monthDays = days.filter(d => isSameMonth(d, cursor));

  const colorOf = (k: "appt"|"bday"|"hol"|"gcal"|"task") =>
    k === "appt" ? "bg-primary-soft text-foreground"
    : k === "bday" ? "bg-accent-soft text-accent-foreground"
    : k === "hol" ? "bg-secondary-soft text-secondary-foreground"
    : k === "task" ? "bg-warm-soft text-warm-foreground border border-primary/30"
    : "bg-muted text-foreground";

  type EvItem = { kind: "appt"|"bday"|"hol"|"gcal"|"task"; label: string; taskId?: string; apptId?: string; time?: string | null };
  const eventsOn = (k: string): EvItem[] => [
    ...state.appointments.filter(a => a.date === k).map(a => ({ kind: "appt" as const, label: a.title, apptId: a.id, time: a.time })),
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

  const handleApptDayDrop = async (apptId: string, iso: string) => {
    const a = state.appointments.find(x => x.id === apptId);
    if (!a || a.date === iso) return;
    await updateAppointment(apptId, { date: iso });
    haptics.tap();
    toast(`Moved “${a.title}” to ${format(new Date(iso), "MMM d")}`);
  };

  const editingAppt = editApptId ? state.appointments.find(a => a.id === editApptId) ?? null : null;

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

        <SectionCard title="Calendar" accent="calm" action={
          <div className="flex items-center gap-2">
            <QuickAddCalendarPopover days={[cursor]} />
            <CalendarViewToggle value={view} onChange={setView} />
          </div>
        }>
          {view === "agenda" ? (
            <AgendaView
              days={monthDays}
              appointmentsOn={(k) => eventsOn(k).map(e => ({ label: e.label, time: e.time, id: e.apptId, kind: e.kind === "task" ? undefined : (e.kind as any) }))}
              onTaskDropAt={(id, iso) => handleDayDrop(id, iso)}
              onApptClick={setEditApptId}
            />
          ) : (
          <>
          <div className="grid grid-cols-7 gap-1 text-xs uppercase tracking-wider text-muted-foreground">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d} className="px-2 py-1 text-center">{d}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map(d => {
              const k = d.toISOString().slice(0,10);
              const inMonth = isSameMonth(d, cursor);
              const today = isSameDay(d, new Date());
              const ev = eventsOn(k);
              const phase = cycleSettings.enabled ? phaseForDate(d, cyclePeriods, cycleSettings) : null;
              const phaseVar = phase ? PHASE_META[phase].tokenVar : null;
              return (
                <div
                  key={k}
                  onDragOver={(e) => {
                    const types = Array.from(e.dataTransfer.types);
                    if (!types.includes(TASK_DRAG_MIME) && !types.includes(APPT_DRAG_MIME)) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setHoverISO(k);
                  }}
                  onDragLeave={() => setHoverISO(p => p === k ? null : p)}
                  onDrop={(e) => {
                    const taskId = e.dataTransfer.getData(TASK_DRAG_MIME);
                    const apptId = e.dataTransfer.getData(APPT_DRAG_MIME);
                    if (!taskId && !apptId) return;
                    e.preventDefault();
                    if (taskId) handleDayDrop(taskId, k);
                    if (apptId) handleApptDayDrop(apptId, k);
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
                  <div className="flex items-center justify-between">
                    {phaseVar ? (
                      <span
                        title={`${PHASE_META[phase!].label} phase`}
                        aria-label={`${PHASE_META[phase!].label} phase`}
                        className="h-2 w-2 rounded-full"
                        style={{ background: `hsl(var(${phaseVar}))`, boxShadow: `0 0 0 2px hsl(var(${phaseVar}) / 0.18)` }}
                      />
                    ) : <span />}
                    <div className={cn("text-right text-[11px] font-medium", today && "text-primary")}>{format(d, "d")}</div>
                  </div>
                  <div className="mt-0.5 space-y-0.5">
                    {ev.slice(0,3).map((it, i) => {
                      const isTask = it.kind === "task" && !!it.taskId;
                      const isAppt = it.kind === "appt" && !!it.apptId;
                      const isBeingDragged = isTask && draggingTaskId === it.taskId;
                      return (
                        <div
                          key={i}
                          draggable={isTask || isAppt}
                          onDragStart={(isTask || isAppt) ? (e) => {
                            e.stopPropagation();
                            if (isTask) {
                              e.dataTransfer.setData(TASK_DRAG_MIME, it.taskId!);
                              setDraggingTaskId(it.taskId!);
                            } else if (isAppt) {
                              e.dataTransfer.setData(APPT_DRAG_MIME, it.apptId!);
                            }
                            e.dataTransfer.setData("text/plain", it.label);
                            e.dataTransfer.effectAllowed = "move";
                            haptics.pickup();
                          } : undefined}
                          onDragEnd={isTask ? () => setDraggingTaskId(null) : undefined}
                          onClick={(isTask || isAppt) ? (e) => {
                            e.stopPropagation();
                            if (isTask) {
                              const t = state.tasks.find(x => x.id === it.taskId);
                              if (t) setEditingTask(t);
                            } else if (isAppt) {
                              setEditApptId(it.apptId!);
                            }
                          } : undefined}
                          className={cn(
                            "truncate rounded px-1 py-0.5 text-[10px] transition-all duration-150",
                            colorOf(it.kind),
                            (isTask || isAppt) && "cursor-grab hover:scale-[1.04] hover:shadow-sm hover:ring-1 hover:ring-primary/40 active:cursor-grabbing",
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
          </>
          )}
        </SectionCard>

        <CalendarTasksPanel days={monthDays} title={`Tasks · ${format(cursor, "MMMM yyyy")}`} />
      </div>
      <UnscheduledTasksRail />

      {editingTask && (
        <TaskEditor task={editingTask} open={!!editingTask} onOpenChange={(o) => !o && setEditingTask(null)} />
      )}
      <AppointmentEditor appointment={editingAppt} open={!!editingAppt} onOpenChange={(o) => !o && setEditApptId(null)} />
    </div>
  );
}
