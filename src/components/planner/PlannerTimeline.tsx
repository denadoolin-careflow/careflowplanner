import { useEffect, useMemo, useRef, useState } from "react";
import { format, isSameDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { TASK_DRAG_MIME } from "@/components/calendar/UnscheduledTasksRail";
import { openTaskEditor } from "@/lib/open-task-editor";
import { resolveTaskIcon } from "@/lib/task-icons";
import type { Task, Appointment } from "@/lib/types";
import { toast } from "sonner";

const START_H = 5;
const END_H = 22;
const HOUR_PX = 60; // 60px per hour → 15px per 15-min
const SNAP_MIN = 15;

interface ScheduledItem {
  id: string;
  kind: "task" | "appt";
  title: string;
  startMin: number; // minutes from START_H
  durMin: number;
  area?: string;
  done?: boolean;
  color?: string;
  task?: Task;
}

const AREA_BG: Record<string, string> = {
  Family: "bg-amber-100/70 dark:bg-amber-900/30 border-amber-300/60",
  Kids: "bg-amber-100/70 dark:bg-amber-900/30 border-amber-300/60",
  Home: "bg-emerald-100/70 dark:bg-emerald-900/30 border-emerald-300/60",
  Meals: "bg-yellow-100/70 dark:bg-yellow-900/30 border-yellow-300/60",
  Caregiving: "bg-violet-100/70 dark:bg-violet-900/30 border-violet-300/60",
  Appointments: "bg-violet-100/70 dark:bg-violet-900/30 border-violet-300/60",
  Personal: "bg-sky-100/70 dark:bg-sky-900/30 border-sky-300/60",
  "Creative Projects": "bg-fuchsia-100/70 dark:bg-fuchsia-900/30 border-fuchsia-300/60",
  Money: "bg-lime-100/70 dark:bg-lime-900/30 border-lime-300/60",
  "Holidays & Birthdays": "bg-rose-100/70 dark:bg-rose-900/30 border-rose-300/60",
};

function hmToMin(hm?: string): number | null {
  if (!hm || !/^\d{2}:\d{2}/.test(hm)) return null;
  const [h, m] = hm.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}
function minToHM(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}

// Assign side-by-side lanes for overlapping items.
function assignLanes(items: ScheduledItem[]): (ScheduledItem & { lane: number; lanes: number })[] {
  const sorted = items.slice().sort((a, b) => a.startMin - b.startMin);
  const clusters: (ScheduledItem & { lane: number; lanes: number })[][] = [];
  let current: (ScheduledItem & { lane: number; lanes: number })[] = [];
  let clusterEnd = -1;
  const flush = () => { if (current.length) { const lanes = Math.max(...current.map(i => i.lane)) + 1; current.forEach(i => i.lanes = lanes); clusters.push(current); current = []; clusterEnd = -1; } };
  for (const it of sorted) {
    if (it.startMin >= clusterEnd) flush();
    const taken = new Set(current.filter(c => c.startMin + c.durMin > it.startMin).map(c => c.lane));
    let lane = 0; while (taken.has(lane)) lane++;
    current.push({ ...it, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, it.startMin + it.durMin);
  }
  flush();
  return clusters.flat();
}

export function PlannerTimeline({ date }: { date: Date }) {
  const { state, updateTask } = useStore();
  const iso = format(date, "yyyy-MM-dd");
  const gridRef = useRef<HTMLDivElement>(null);
  const [nowMin, setNowMin] = useState<number | null>(null);
  const [resizing, setResizing] = useState<{ id: string; startY: number; startDur: number } | null>(null);

  useEffect(() => {
    const tick = () => {
      const n = new Date();
      if (isSameDay(n, date)) setNowMin(n.getHours() * 60 + n.getMinutes() - START_H * 60);
      else setNowMin(null);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [date]);

  const items = useMemo<ScheduledItem[]>(() => {
    const out: ScheduledItem[] = [];
    for (const t of state.tasks) {
      if (!t.dueDate || t.dueDate !== iso) continue;
      const s = hmToMin(t.startTime); if (s === null) continue;
      const startRel = s - START_H * 60;
      if (startRel < 0 || startRel > (END_H - START_H) * 60) continue;
      out.push({ id: t.id, kind: "task", title: t.title, startMin: startRel, durMin: t.estMinutes ?? 30, area: t.area, done: t.done, task: t });
    }
    for (const a of state.appointments) {
      if (a.date !== iso) continue;
      const s = hmToMin(a.time ?? undefined); if (s === null) continue;
      const e = hmToMin(a.endTime ?? undefined) ?? s + 30;
      out.push({ id: a.id, kind: "appt", title: a.title, startMin: s - START_H * 60, durMin: Math.max(15, e - s), area: "Appointments" });
    }
    return assignLanes(out);
  }, [state.tasks, state.appointments, iso]);

  const yToMin = (y: number): number => {
    const rel = Math.max(0, y);
    const raw = (rel / HOUR_PX) * 60;
    return Math.round(raw / SNAP_MIN) * SNAP_MIN;
  };

  const onDrop = async (e: React.DragEvent) => {
    const id = e.dataTransfer.getData(TASK_DRAG_MIME);
    if (!id) return;
    e.preventDefault();
    const rect = gridRef.current!.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const rel = yToMin(y);
    const abs = rel + START_H * 60;
    const task = state.tasks.find(t => t.id === id);
    await updateTask(id, { dueDate: iso, startTime: minToHM(abs), inbox: false, estMinutes: task?.estMinutes ?? 30 });
    toast.success("Scheduled");
  };

  // Resize handler
  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: PointerEvent) => {
      const dy = e.clientY - resizing.startY;
      const deltaMin = Math.round((dy / HOUR_PX) * 60 / SNAP_MIN) * SNAP_MIN;
      const el = document.getElementById(`plnr-block-${resizing.id}`);
      if (el) el.style.height = `${Math.max(SNAP_MIN, resizing.startDur + deltaMin) * (HOUR_PX / 60)}px`;
    };
    const onUp = async (e: PointerEvent) => {
      const dy = e.clientY - resizing.startY;
      const deltaMin = Math.round((dy / HOUR_PX) * 60 / SNAP_MIN) * SNAP_MIN;
      const newDur = Math.max(SNAP_MIN, resizing.startDur + deltaMin);
      await updateTask(resizing.id, { estMinutes: newDur });
      setResizing(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [resizing, updateTask]);

  const totalMin = (END_H - START_H) * 60;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40">
      <div className="border-b border-border/60 px-4 py-2 text-xs text-muted-foreground">
        {format(date, "EEEE, MMMM d")}
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="relative flex">
          {/* Hour rail */}
          <div className="w-14 shrink-0 border-r border-border/50 text-[10px] text-muted-foreground">
            {Array.from({ length: END_H - START_H }, (_, i) => {
              const h = START_H + i;
              const label = format(new Date(2000, 0, 1, h), "h a");
              return <div key={h} style={{ height: HOUR_PX }} className="relative pr-1 text-right">
                <span className="absolute -top-2 right-1">{label}</span>
              </div>;
            })}
          </div>
          {/* Grid */}
          <div
            ref={gridRef}
            className="relative flex-1"
            style={{ height: totalMin * (HOUR_PX / 60) }}
            onDragOver={(e) => { if (Array.from(e.dataTransfer.types).includes(TASK_DRAG_MIME)) e.preventDefault(); }}
            onDrop={onDrop}
          >
            {/* Hour lines */}
            {Array.from({ length: END_H - START_H + 1 }, (_, i) => (
              <div key={i} className="absolute left-0 right-0 border-t border-border/40" style={{ top: i * HOUR_PX }} />
            ))}
            {/* Quarter lines */}
            {Array.from({ length: (END_H - START_H) * 4 }, (_, i) => (
              <div key={i} className="absolute left-0 right-0 border-t border-border/10" style={{ top: (i + 1) * (HOUR_PX / 4) }} />
            ))}

            {/* Current time */}
            {nowMin !== null && nowMin >= 0 && nowMin <= totalMin && (
              <div className="pointer-events-none absolute left-0 right-0 z-20 flex items-center" style={{ top: nowMin * (HOUR_PX / 60) }}>
                <span className="h-2 w-2 -translate-x-1 rounded-full bg-primary shadow" />
                <span className="h-px flex-1 bg-primary" />
              </div>
            )}

            {/* Blocks */}
            {items.map((it) => {
              const ic = it.task ? resolveTaskIcon(it.task) : null;
              const widthPct = 100 / it.lanes;
              const leftPct = it.lane * widthPct;
              return (
                <div
                  key={it.id}
                  id={`plnr-block-${it.id}`}
                  onClick={() => it.kind === "task" && openTaskEditor(it.id)}
                  className={cn(
                    "group absolute cursor-pointer overflow-hidden rounded-lg border p-1.5 text-[11px] shadow-sm transition-shadow hover:shadow-md",
                    AREA_BG[it.area ?? ""] ?? "bg-muted/60 border-border/60",
                    it.done && "opacity-60",
                  )}
                  style={{
                    top: it.startMin * (HOUR_PX / 60),
                    height: Math.max(SNAP_MIN, it.durMin) * (HOUR_PX / 60) - 2,
                    left: `calc(${leftPct}% + 4px)`,
                    width: `calc(${widthPct}% - 8px)`,
                  }}
                >
                  <div className="flex items-center gap-1 font-mono text-[9px] opacity-70">
                    {minToHM(it.startMin + START_H * 60)}–{minToHM(it.startMin + it.durMin + START_H * 60)}
                  </div>
                  <div className="flex items-start gap-1 font-medium leading-tight">
                    {ic && ic.kind === "lucide" ? <ic.Icon className="mt-0.5 h-3 w-3 shrink-0" /> : ic && <span className="shrink-0 text-xs leading-none">{ic.char}</span>}
                    <span className="line-clamp-3 [overflow-wrap:anywhere]">{it.title}</span>
                  </div>
                  {it.kind === "task" && (
                    <div
                      onPointerDown={(e) => { e.stopPropagation(); setResizing({ id: it.id, startY: e.clientY, startDur: it.durMin }); }}
                      className="absolute bottom-0 left-0 right-0 h-1.5 cursor-ns-resize opacity-0 transition-opacity hover:bg-primary/30 group-hover:opacity-100"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}