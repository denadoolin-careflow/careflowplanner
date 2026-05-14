import { useMemo } from "react";
import { format, parseISO, isSameDay } from "date-fns";
import { useStore } from "@/lib/store";
import { useTimeBlocks, colorClasses, fmt12 } from "@/lib/time-blocks";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { TASK_DRAG_MIME } from "./UnscheduledTasksRail";

type ApptLike = { label: string; time?: string | null };

interface Props {
  days: Date[];
  appointmentsOn: (iso: string) => ApptLike[];
  onTaskDropAt?: (taskId: string, date: string, startHour: number) => void;
}

export function AgendaView({ days, appointmentsOn, onTaskDropAt }: Props) {
  const fromISO = days[0].toISOString().slice(0, 10);
  const toISO = days[days.length - 1].toISOString().slice(0, 10);
  const { blocks } = useTimeBlocks(fromISO, toISO);

  const items = useMemo(() => {
    const rows: { iso: string; time?: string; label: string; color?: string; kind: "block" | "appt" }[] = [];
    for (const d of days) {
      const iso = d.toISOString().slice(0, 10);
      for (const b of blocks.filter(x => x.date === iso)) {
        rows.push({ iso, time: b.allDay ? undefined : b.startTime, label: b.title, color: b.color, kind: "block" });
      }
      for (const a of appointmentsOn(iso)) {
        rows.push({ iso, time: a.time ?? undefined, label: a.label, kind: "appt" });
      }
    }
    rows.sort((a, b) => (a.iso + (a.time ?? "z")).localeCompare(b.iso + (b.time ?? "z")));
    return rows;
  }, [blocks, days, appointmentsOn]);

  const grouped = useMemo(() => {
    const m = new Map<string, typeof items>();
    for (const r of items) {
      const arr = m.get(r.iso) ?? [];
      arr.push(r);
      m.set(r.iso, arr);
    }
    return Array.from(m.entries());
  }, [items]);

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
            <ul className="space-y-1">
              {rows.map((r, i) => (
                <li key={i} className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm", r.kind === "block" && r.color ? colorClasses(r.color as any) : "bg-muted/40")}>
                  <span className="w-16 shrink-0 font-mono text-[11px] opacity-70">{r.time ? fmt12(r.time) : "All day"}</span>
                  <span className="min-w-0 flex-1 truncate">{r.label}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}