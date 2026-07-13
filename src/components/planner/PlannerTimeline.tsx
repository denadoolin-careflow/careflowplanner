import { useEffect, useMemo, useRef, useState } from "react";
import { format, isSameDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { TASK_DRAG_MIME } from "@/components/calendar/UnscheduledTasksRail";
import { openTaskEditor } from "@/lib/open-task-editor";
import { resolveTaskIcon } from "@/lib/task-icons";
import type { Task, Appointment } from "@/lib/types";
import { toast } from "sonner";
import { usePomodoro } from "@/lib/pomodoro-store";
import { usePlannerFocusTaskId } from "@/lib/planner-prefs";
import { haptics } from "@/lib/haptics";
import { BlockQuickActions } from "./BlockQuickActions";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { usePlannerDropListener } from "@/lib/planner-touch-drag";
import { useTimeBlocks, hmToHours } from "@/lib/time-blocks";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { parseTaskInput } from "@/lib/nlp-task";

export const RHYTHM_BANDS = [
  { id: "morning", label: "Morning",   startH: 5,  endH: 12, className: "bg-amber-50/50 dark:bg-amber-950/20" },
  { id: "afternoon", label: "Afternoon", startH: 12, endH: 17, className: "bg-sky-50/40 dark:bg-sky-950/20" },
  { id: "evening", label: "Evening",   startH: 17, endH: 22, className: "bg-violet-50/40 dark:bg-violet-950/20" },
];

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
// 12-hour compact label: "8:30a", "12p", "1:15p"
function minTo12(min: number): string {
  const h24 = Math.floor(min / 60) % 24;
  const m = min % 60;
  const suffix = h24 < 12 ? "a" : "p";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, "0")}${suffix}`;
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

export function PlannerTimeline({ date, compact, bare }: { date: Date; compact?: boolean; bare?: boolean }) {
  const { state, updateTask, addTask } = useStore();
  const pomo = usePomodoro();
  const [focusTaskId] = usePlannerFocusTaskId();
  const iso = format(date, "yyyy-MM-dd");
  const gridRef = useRef<HTMLDivElement>(null);
  const [nowMin, setNowMin] = useState<number | null>(null);
  const [resizing, setResizing] = useState<{ id: string; startY: number; startDur: number } | null>(null);
  const [quickAdd, setQuickAdd] = useState<{ x: number; y: number; startAbsMin: number; text: string } | null>(null);
  const suppressClickRef = useRef(false);
  const { blocks, update: updateBlock } = useTimeBlocks(iso, iso);

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

  const items = useMemo(() => {
    const out: ScheduledItem[] = [];
    const taskBlockMap = new Map<string, string>(); // taskId -> block start_time
    for (const b of blocks) if (b.taskId) taskBlockMap.set(b.taskId, b.startTime);
    for (const t of state.tasks) {
      if (!t.dueDate || t.dueDate !== iso) continue;
      // Prefer time_block schedule if the task is placed via a block on this day.
      const startFromBlock = taskBlockMap.get(t.id);
      const s = hmToMin(startFromBlock ?? t.startTime); if (s === null) continue;
      const startRel = s - START_H * 60;
      if (startRel < 0 || startRel > (END_H - START_H) * 60) continue;
      out.push({ id: t.id, kind: "task", title: t.title, startMin: startRel, durMin: t.estMinutes ?? 30, area: t.area, done: t.done, task: t });
    }
    // Time blocks without a matching task (standalone events)
    for (const b of blocks) {
      if (b.taskId && state.tasks.some(t => t.id === b.taskId && t.dueDate === iso)) continue;
      const s = hmToMin(b.startTime); if (s === null) continue;
      const e = hmToMin(b.endTime) ?? s + 30;
      out.push({ id: `blk-${b.id}`, kind: "appt", title: b.title, startMin: s - START_H * 60, durMin: Math.max(15, e - s), area: "Appointments" });
    }
    for (const a of state.appointments) {
      if (a.date !== iso) continue;
      const s = hmToMin(a.time ?? undefined); if (s === null) continue;
      const e = hmToMin(a.endTime ?? undefined) ?? s + 30;
      out.push({ id: a.id, kind: "appt", title: a.title, startMin: s - START_H * 60, durMin: Math.max(15, e - s), area: "Appointments" });
    }
    return assignLanes(out);
  }, [state.tasks, state.appointments, blocks, iso]);

  const yToMin = (y: number): number => {
    const rel = Math.max(0, y);
    const raw = (rel / HOUR_PX) * 60;
    return Math.round(raw / SNAP_MIN) * SNAP_MIN;
  };

  const scheduleTaskAt = async (taskId: string, absMin: number) => {
    const task = state.tasks.find(t => t.id === taskId);
    const dur = task?.estMinutes ?? 30;
    const startHM = minToHM(absMin);
    // If a time_block exists for this task, keep them synchronized.
    const existingBlock = blocks.find(b => b.taskId === taskId);
    if (existingBlock) {
      const endHM = minToHM(absMin + dur);
      await updateBlock(existingBlock.id, { startTime: startHM, endTime: endHM, date: iso });
    }
    await updateTask(taskId, { dueDate: iso, startTime: startHM, inbox: false, estMinutes: dur });
    haptics.drop();
    toast.success("Scheduled");
  };

  const onDrop = async (e: React.DragEvent) => {
    const id = e.dataTransfer.getData(TASK_DRAG_MIME);
    if (!id) return;
    e.preventDefault();
    const rect = gridRef.current!.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const abs = yToMin(y) + START_H * 60;
    await scheduleTaskAt(id, abs);
  };

  // Touch/long-press drop from PlannerTaskRow (mobile + web).
  usePlannerDropListener((d) => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (d.clientX < rect.left || d.clientX > rect.right || d.clientY < rect.top || d.clientY > rect.bottom) return;
    const y = d.clientY - rect.top;
    const abs = yToMin(y) + START_H * 60;
    void scheduleTaskAt(d.taskId, abs);
  });

  const onDragOver = (e: React.DragEvent) => {
    if (Array.from(e.dataTransfer.types).includes(TASK_DRAG_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }
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
      suppressClickRef.current = true;
      setTimeout(() => { suppressClickRef.current = false; }, 200);
      setResizing(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [resizing, updateTask]);

  const totalMin = (END_H - START_H) * 60;

  // Tap empty grid → open quick add popover at the clicked slot.
  const onGridClick = (e: React.MouseEvent) => {
    if (suppressClickRef.current) return;
    const target = e.target as HTMLElement;
    // Only trigger on the grid background, not on blocks or their children.
    if (target.closest("[data-planner-block]")) return;
    const rect = gridRef.current!.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const relMin = yToMin(y);
    const abs = relMin + START_H * 60;
    setQuickAdd({ x: e.clientX - rect.left, y: relMin * (HOUR_PX / 60), startAbsMin: abs, text: "" });
  };

  const submitQuickAdd = async () => {
    if (!quickAdd || !quickAdd.text.trim()) { setQuickAdd(null); return; }
    const p = parseTaskInput(quickAdd.text);
    await addTask({
      title: p.title || quickAdd.text,
      area: p.area ?? "Personal",
      priority: p.priority ?? "medium",
      done: false,
      dueDate: p.dueDate ?? iso,
      startTime: p.time ?? minToHM(quickAdd.startAbsMin),
      estMinutes: p.estMinutes ?? 30,
      tags: p.tags,
      energy: p.energy,
      inbox: false,
    } as any);
    haptics.success();
    toast.success("Task added");
    setQuickAdd(null);
  };

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden",
      !bare && "rounded-2xl border border-border/60 bg-card/40")}>
      {!bare && (
        <div className="border-b border-border/60 px-4 py-2 text-xs text-muted-foreground">
          {format(date, "EEEE, MMMM d")}
        </div>
      )}
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
            data-planner-grid
            className="relative flex-1 transition-colors data-[planner-drop-active]:bg-primary/5"
            style={{ height: totalMin * (HOUR_PX / 60) }}
            onDragOver={onDragOver}
            onDragEnter={() => haptics.magnet()}
            onDrop={onDrop}
            onClick={onGridClick}
          >
            {/* Hour lines */}
            {Array.from({ length: END_H - START_H + 1 }, (_, i) => (
              <div key={i} className="absolute left-0 right-0 border-t border-border/40" style={{ top: i * HOUR_PX }} />
            ))}
            {/* Rhythm bands */}
            {RHYTHM_BANDS.map(b => {
              const topMin = (b.startH - START_H) * 60;
              const h = (b.endH - b.startH) * 60 * (HOUR_PX / 60);
              return (
                <div key={b.id}
                  className={cn("pointer-events-none absolute left-0 right-0", b.className)}
                  style={{ top: topMin * (HOUR_PX / 60), height: h }}>
                  <span className="absolute left-1 top-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">
                    {b.label}
                  </span>
                </div>
              );
            })}
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
              const isFocusActive = it.kind === "task" && ((pomo.running && pomo.taskId === it.id) || focusTaskId === it.id);
              return (
                <ContextMenu key={it.id}>
                  <ContextMenuTrigger asChild>
                <div
                  key={it.id}
                  id={`plnr-block-${it.id}`}
                  data-planner-block
                  onClick={() => it.kind === "task" && openTaskEditor(it.id)}
                  className={cn(
                    "group absolute cursor-pointer overflow-hidden rounded-lg border p-1.5 text-[11px] shadow-sm transition-shadow hover:shadow-md",
                    AREA_BG[it.area ?? ""] ?? "bg-muted/60 border-border/60",
                    it.done && "opacity-60",
                    isFocusActive && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                  )}
                  style={{
                    top: it.startMin * (HOUR_PX / 60),
                    height: Math.max(SNAP_MIN, it.durMin) * (HOUR_PX / 60) - 2,
                    left: `calc(${leftPct}% + 4px)`,
                    width: `calc(${widthPct}% - 8px)`,
                  }}
                >
                  <div className="flex h-full min-w-0 flex-col gap-0.5">
                    <div className="flex min-w-0 items-center gap-1 text-[9px] font-mono leading-none opacity-75">
                      <span className="truncate">{minTo12(it.startMin + START_H * 60)}–{minTo12(it.startMin + it.durMin + START_H * 60)}</span>
                      {isFocusActive && <span className="ml-auto shrink-0 rounded-full bg-primary/20 px-1 text-primary">Focus</span>}
                    </div>
                    <div className="flex min-w-0 flex-1 items-start gap-1 font-medium leading-tight">
                      {ic && ic.kind === "lucide" ? <ic.Icon className="mt-0.5 h-3 w-3 shrink-0" /> : ic && ic.kind === "emoji" && <span className="shrink-0 text-xs leading-none">{ic.char}</span>}
                      <span className="min-w-0 flex-1 whitespace-normal break-words [overflow-wrap:anywhere]">{it.title}</span>
                    </div>
                  </div>
                  {it.kind === "task" && (
                    <div
                      onPointerDown={(e) => { e.stopPropagation(); setResizing({ id: it.id, startY: e.clientY, startDur: it.durMin }); }}
                      className="absolute bottom-0 left-0 right-0 h-1.5 cursor-ns-resize opacity-0 transition-opacity hover:bg-primary/30 group-hover:opacity-100"
                    />
                  )}
                </div>
                  </ContextMenuTrigger>
                  {it.task && (
                    <ContextMenuContent className="w-48">
                      <BlockQuickActions task={it.task} asMenuItems />
                    </ContextMenuContent>
                  )}
                </ContextMenu>
              );
            })}

            {/* Quick-add popover at tapped slot */}
            {quickAdd && (
              <Popover open onOpenChange={(o) => !o && setQuickAdd(null)}>
                <PopoverAnchor asChild>
                  <div
                    className="pointer-events-none absolute"
                    style={{ left: quickAdd.x, top: quickAdd.y, width: 1, height: 1 }}
                  />
                </PopoverAnchor>
                <PopoverContent side="right" align="start" className="w-72 p-2">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    New task at {minTo12(quickAdd.startAbsMin)}
                  </p>
                  <Input
                    autoFocus
                    value={quickAdd.text}
                    onChange={(e) => setQuickAdd(q => q ? { ...q, text: e.target.value } : q)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); void submitQuickAdd(); }
                      if (e.key === "Escape") setQuickAdd(null);
                    }}
                    placeholder="Task title (try 'call mom #family 30m')"
                    className="h-9 text-sm"
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}