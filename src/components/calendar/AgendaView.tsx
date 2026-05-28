import { useMemo } from "react";
import { format, parseISO, isSameDay } from "date-fns";
import { useStore } from "@/lib/store";
import { useTimeBlocks, colorClasses } from "@/lib/time-blocks";
import { CalendarClock, Check, Sunrise, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TASK_DRAG_MIME } from "./UnscheduledTasksRail";
import { resolveTaskIcon } from "@/lib/task-icons";
import { formatTime12 } from "@/lib/routines";
import { DayContextStrip } from "./DayContextStrip";
import { hmToHours } from "@/lib/time-blocks";

type ApptLike = { label: string; time?: string | null; id?: string; kind?: "appt" | "gcal" | "task" | "bday" | "hol"; done?: boolean };

interface Props {
  days: Date[];
  appointmentsOn: (iso: string) => ApptLike[];
  onTaskDropAt?: (taskId: string, date: string, startHour: number) => void;
  onApptClick?: (apptId: string) => void;
  onLunarOpen?: (date: Date) => void;
}

type PartKey = "allday" | "morning" | "afternoon" | "evening";

const PART_INFO: Record<PartKey, { label: string; icon: typeof Sunrise }> = {
  allday: { label: "All day", icon: CalendarClock },
  morning: { label: "Morning", icon: Sunrise },
  afternoon: { label: "Afternoon", icon: Sun },
  evening: { label: "Evening", icon: Moon },
};

function partOf(time?: string): PartKey {
  if (!time || !/^\d{2}:\d{2}/.test(time)) return "allday";
  const h = hmToHours(time.slice(0, 5));
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

export function AgendaView({ days, appointmentsOn, onTaskDropAt, onApptClick, onLunarOpen }: Props) {
  const fromISO = days[0].toISOString().slice(0, 10);
  const toISO = days[days.length - 1].toISOString().slice(0, 10);
  const { blocks } = useTimeBlocks(fromISO, toISO);
  const { toggleTask, state } = useStore();

  const items = useMemo(() => {
    const rows: { iso: string; time?: string; label: string; color?: string; kind: "block" | "appt"; apptId?: string; apptKind?: string; done?: boolean }[] = [];
    for (const d of days) {
      const iso = d.toISOString().slice(0, 10);
      for (const b of blocks.filter(x => x.date === iso)) {
        rows.push({ iso, time: b.allDay ? undefined : b.startTime, label: b.title, color: b.color, kind: "block" });
      }
      for (const a of appointmentsOn(iso)) {
        rows.push({ iso, time: a.time ?? undefined, label: a.label, kind: "appt", apptId: a.id, apptKind: a.kind, done: a.done });
      }
    }
    rows.sort((a, b) => (a.iso + (a.time ?? "z")).localeCompare(b.iso + (b.time ?? "z")));
    return rows;
  }, [blocks, days, appointmentsOn]);

  const grouped = useMemo(() => {
    const m = new Map<string, Record<PartKey, typeof items>>();
    for (const d of days) {
      const iso = d.toISOString().slice(0, 10);
      m.set(iso, { allday: [], morning: [], afternoon: [], evening: [] });
    }
    for (const r of items) {
      const bucket = m.get(r.iso);
      if (!bucket) continue;
      bucket[partOf(r.time)].push(r);
    }
    return Array.from(m.entries());
  }, [items, days]);

  const onDrop = (e: React.DragEvent, iso: string) => {
    const id = e.dataTransfer.getData(TASK_DRAG_MIME);
    if (!id || !onTaskDropAt) return;
    e.preventDefault();
    onTaskDropAt(id, iso, 9);
  };

  return (
    <div className="space-y-4">
      {grouped.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          Nothing scheduled. Drop a task from the right to add it.
        </div>
      )}
      {grouped.map(([iso, rows]) => {
        const d = parseISO(iso);
        const today = isSameDay(d, new Date());
        const total = rows.allday.length + rows.morning.length + rows.afternoon.length + rows.evening.length;
        return (
          <div
            key={iso}
            onDragOver={e => { if (Array.from(e.dataTransfer.types).includes(TASK_DRAG_MIME)) e.preventDefault(); }}
            onDrop={e => onDrop(e, iso)}
            className="rounded-xl border border-border/60 bg-card/60 p-3"
          >
            <div className={cn("mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider", today ? "text-primary" : "text-muted-foreground")}>
              <CalendarClock className="h-3.5 w-3.5" />
              {format(d, "EEEE, MMM d")} {today && <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] normal-case tracking-normal">Today</span>}
            </div>
            <DayContextStrip date={d} onLunar={onLunarOpen} className="mb-2" />
            {total === 0 && (
              <div className="rounded-lg border border-dashed border-border/50 px-3 py-2 text-[11px] text-muted-foreground">Nothing scheduled.</div>
            )}
            <div className="space-y-2">
              {(["allday", "morning", "afternoon", "evening"] as PartKey[]).map(pk => {
                const partRows = rows[pk];
                if (partRows.length === 0) return null;
                const Info = PART_INFO[pk];
                return (
                  <div key={pk} className="space-y-1">
                    <div className="flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <Info.icon className="h-3 w-3" />
                      {Info.label}
                      <span className="opacity-60">· {partRows.length}</span>
                    </div>
                    <ul className="space-y-1">
                      {partRows.map((r, i) => {
                        const cls = r.kind === "block" && r.color ? colorClasses(r.color) : null;
                        const isTask = r.apptKind === "task" && !!r.apptId;
                        const clickable = r.apptKind === "appt" && r.apptId && onApptClick;
                        return (
                          <li key={i}
                            onClick={clickable ? () => onApptClick!(r.apptId!) : undefined}
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                              cls ? `${cls.bg} ${cls.text}` : "bg-muted/40",
                              clickable && "cursor-pointer hover:bg-primary/10",
                              isTask && r.done && "opacity-60"
                            )}>
                            {isTask && (
                              <button
                                onClick={(e) => { e.stopPropagation(); void toggleTask(r.apptId!); }}
                                aria-label={r.done ? "Mark task not done" : "Mark task done"}
                                className={cn(
                                  "group/cb grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors",
                                  r.done
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-primary/50 bg-background text-primary hover:bg-primary hover:text-primary-foreground"
                                )}
                              >
                                <Check className={cn("h-3 w-3 transition-opacity", r.done ? "opacity-100" : "opacity-0 group-hover/cb:opacity-100")} />
                              </button>
                            )}
                            <span className="w-16 shrink-0 font-mono text-[11px] opacity-70">{r.time ? formatTime12(r.time.slice(0,5)) : "All day"}</span>
                            {isTask && (() => {
                              const t = state.tasks.find(x => x.id === r.apptId);
                              if (!t) return null;
                              const ic = resolveTaskIcon(t);
                              return ic.kind === "lucide"
                                ? <ic.Icon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                                : <span className="shrink-0 text-sm leading-none" aria-hidden>{ic.char}</span>;
                            })()}
                            <span className={cn("min-w-0 flex-1 whitespace-normal break-words", isTask && r.done && "line-through text-muted-foreground")}>{r.label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}