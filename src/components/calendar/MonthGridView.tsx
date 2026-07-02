import { useMemo, useState } from "react";
import { addDays, addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { expandAppointments } from "@/lib/recurrence";
import { apptOccursOn } from "@/lib/appointment-range";
import { AppointmentEditor } from "./AppointmentEditor";
import type { Appointment } from "@/lib/types";

const TASK_MIME = "application/x-careflow-task";
const APPT_MIME = "application/x-careflow-appt";

interface Props {
  cursor?: Date;
  onCursorChange?: (d: Date) => void;
}

export function MonthGridView({ cursor: extCursor, onCursorChange }: Props) {
  const { state, updateTask, updateAppointment } = useStore();
  const [internalCursor, setInternalCursor] = useState(new Date());
  const cursor = extCursor ?? internalCursor;
  const setCursor = (d: Date) => (onCursorChange ? onCursorChange(d) : setInternalCursor(d));
  const [hoverISO, setHoverISO] = useState<string | null>(null);
  const [editApptId, setEditApptId] = useState<string | null>(null);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const expandedAppts = useMemo(() => {
    return expandAppointments(state.appointments ?? [], days[0], days[days.length - 1]);
  }, [state.appointments, days]);

  const editingAppt = useMemo(
    () => state.appointments.find(a => a.id === editApptId) ?? null,
    [state.appointments, editApptId]
  );

  const eventsOn = (iso: string) => {
    const tasks = (state.tasks ?? []).filter((t: any) => !t.completed && t.dueDate === iso).slice(0, 3);
    const appts = expandedAppts.filter((a) => apptOccursOn(a, iso));
    return { tasks, appts };
  };

  const handleDrop = async (e: React.DragEvent, iso: string) => {
    e.preventDefault();
    const tid = e.dataTransfer.getData(TASK_MIME);
    const aid = e.dataTransfer.getData(APPT_MIME);
    if (tid) await updateTask(tid, { dueDate: iso } as any);
    if (aid) {
      // Strip synthetic occurrence suffix.
      const realId = aid.split(":occ:")[0];
      const src = state.appointments.find(a => a.id === realId);
      if (src) await updateAppointment(realId, { date: iso } as any);
    }
    setHoverISO(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCursor(subMonths(cursor, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[10ch] text-sm font-medium">{format(cursor, "MMMM yyyy")}</div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCursor(addMonths(cursor, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" className="h-7 rounded-full text-xs" onClick={() => setCursor(new Date())}>Today</Button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground sm:text-xs">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} className="px-1 py-1 text-center"><span className="sm:hidden">{d[0]}</span><span className="hidden sm:inline">{d}</span></div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const iso = format(d, "yyyy-MM-dd");
          const inMonth = isSameMonth(d, cursor);
          const isToday = isSameDay(d, new Date());
          const { tasks, appts } = eventsOn(iso);
          const extra = tasks.length + appts.length - 3;
          return (
            <div
              key={iso}
              onDragOver={(e) => {
                const types = Array.from(e.dataTransfer.types);
                if (!types.includes(TASK_MIME) && !types.includes(APPT_MIME)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setHoverISO(iso);
              }}
              onDragLeave={() => setHoverISO(p => p === iso ? null : p)}
              onDrop={(e) => handleDrop(e, iso)}
              className={cn(
                "group relative min-h-[92px] rounded-xl border border-border/50 bg-card/40 p-1.5 text-xs transition-colors sm:min-h-[112px]",
                !inMonth && "opacity-45",
                hoverISO === iso && "ring-2 ring-primary/60",
                isToday && "border-primary/60 bg-primary/5"
              )}
            >
              <div className={cn("mb-1 flex items-center justify-between px-0.5")}>
                <span className={cn("text-[11px] font-medium", isToday ? "text-primary" : "text-muted-foreground")}>{format(d, "d")}</span>
              </div>
              <div className="space-y-1">
                {appts.slice(0, 3).map((a: Appointment) => (
                  <button
                    key={a.id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData(APPT_MIME, a.id); e.dataTransfer.effectAllowed = "move"; }}
                    onClick={(e) => { e.stopPropagation(); setEditApptId(a.id.split(":occ:")[0]); }}
                    className="block w-full truncate rounded-md border border-border/40 bg-background/70 px-1.5 py-0.5 text-left text-[10px] leading-tight hover:bg-muted/50"
                    style={a.color ? { borderLeft: `3px solid ${a.color}` } : undefined}
                    title={a.title}
                  >
                    {a.time && <span className="mr-1 tabular-nums text-muted-foreground">{a.time.slice(0,5)}</span>}
                    <span className="font-medium">{a.title}</span>
                  </button>
                ))}
                {tasks.slice(0, Math.max(0, 3 - appts.length)).map((t: any) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData(TASK_MIME, t.id); e.dataTransfer.effectAllowed = "move"; }}
                    className="truncate rounded-md bg-muted/40 px-1.5 py-0.5 text-[10px] leading-tight text-foreground/80"
                    title={t.title}
                  >• {t.title}</div>
                ))}
                {extra > 0 && (
                  <div className="px-0.5 text-[10px] text-muted-foreground">+ {extra} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <AppointmentEditor appointment={editingAppt} open={!!editingAppt} onOpenChange={(v) => !v && setEditApptId(null)} />
    </div>
  );
}