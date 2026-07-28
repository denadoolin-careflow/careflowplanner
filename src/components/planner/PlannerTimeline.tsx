import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, isSameDay, parseISO } from "date-fns";
import { AlertTriangle, Redo2, Undo2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { usePlannerHistory, type HistoryEntry } from "@/lib/planner-history";
import { useAutoSchedulePrefs } from "@/lib/auto-schedule-prefs";
import { AutoScheduleSettings } from "./AutoScheduleSettings";
import { ConflictPopover, type ConflictInfo } from "./ConflictPopover";
import { DurationEditor } from "./DurationEditor";
import { PlannerTemplatesMenu } from "./PlannerTemplatesMenu";
import { PlannerMealLane } from "./PlannerMealLane";
import { PlannerMobileInboxRail } from "./PlannerMobileInboxRail";
import { PlannerAtmosphereStrip } from "./PlannerAtmosphereStrip";
import { useBandColors, bandClass, type BandId } from "@/lib/planner-band-colors";
import type { PlannerTemplate, TemplateItem } from "@/lib/planner-templates";
import { useIsMobile } from "@/hooks/use-mobile";

export const RHYTHM_BANDS = [
  { id: "morning" as BandId, label: "Morning", startH: 5, endH: 12, className: "bg-amber-50/50 dark:bg-amber-950/20" },
  { id: "afternoon" as BandId, label: "Afternoon", startH: 12, endH: 17, className: "bg-sky-50/40 dark:bg-sky-950/20" },
  { id: "evening" as BandId, label: "Evening", startH: 17, endH: 22, className: "bg-violet-50/40 dark:bg-violet-950/20" },
];

/** Default landing time for a task that only has a day part. */
const DAY_PART_START_H: Record<string, number> = { Morning: 9, Afternoon: 13, Evening: 18, "Late Night": 21 };

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
  const [moving, setMoving] = useState<{ id: string; startY: number; startMin: number; durMin: number; offsetMin: number } | null>(null);
  const [movePreview, setMovePreview] = useState<number | null>(null);
  const [quickAdd, setQuickAdd] = useState<{ x: number; y: number; startAbsMin: number; text: string } | null>(null);
  const suppressClickRef = useRef(false);
  const { blocks, update: updateBlock } = useTimeBlocks(iso, iso);
  const { prefs: autoPrefs, update: updateAutoPrefs, reset: resetAutoPrefs } = useAutoSchedulePrefs();
  const [announcement, setAnnouncement] = useState("");
  const [dismissedConflicts, setDismissedConflicts] = useState<string[]>([]);
  const [bandColors] = useBandColors();
  const isMobile = useIsMobile();

  const applyHistory = useCallback(async (
    tasks: { id: string; patch: Record<string, unknown> }[],
    blks: { id: string; patch: Record<string, unknown> }[],
  ) => {
    for (const t of tasks) await updateTask(t.id, t.patch as any);
    for (const b of blks) await updateBlock(b.id, b.patch as any);
  }, [updateTask, updateBlock]);

  const history = usePlannerHistory(applyHistory);
  const historyReset = history.reset;
  useEffect(() => { historyReset(); }, [iso, historyReset]);

  const runUndo = useCallback(async () => {
    const entry = await history.undo();
    if (!entry) { toast.info("Nothing to undo"); return; }
    haptics.success();
    setAnnouncement(`Undid ${entry.label}`);
    toast.success(`Undid ${entry.label}`);
  }, [history]);

  const runRedo = useCallback(async () => {
    const entry = await history.redo();
    if (!entry) { toast.info("Nothing to redo"); return; }
    haptics.success();
    setAnnouncement(`Redid ${entry.label}`);
    toast.success(`Redid ${entry.label}`);
  }, [history]);

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

  /** Tasks due today that have a day part but no clock time — surfaced in the band header. */
  const dayPartTasks = useMemo(() => {
    const map: Record<string, Task[]> = { morning: [], afternoon: [], evening: [] };
    for (const t of state.tasks) {
      if (t.dueDate !== iso || t.done || !t.dayPart) continue;
      if (hmToMin(t.startTime) !== null) continue;
      if (blocks.some(b => b.taskId === t.id)) continue;
      const key = t.dayPart.toLowerCase();
      if (key === "late night") map.evening.push(t);
      else if (map[key]) map[key].push(t);
    }
    return map;
  }, [state.tasks, iso, blocks]);

  const yToMin = (y: number): number => {
    const rel = Math.max(0, y);
    const raw = (rel / HOUR_PX) * 60;
    return Math.round(raw / SNAP_MIN) * SNAP_MIN;
  };

  const scheduleTaskAt = async (taskId: string, absMin: number) => {
    const task = state.tasks.find(t => t.id === taskId);
    const dur = task?.estMinutes ?? 30;
    const startHM = minToHM(absMin);
    const entry: HistoryEntry = {
      label: "reschedule",
      tasks: [{
        taskId,
        before: { dueDate: task?.dueDate, startTime: task?.startTime ?? null, estMinutes: task?.estMinutes ?? dur, inbox: task?.inbox ?? false },
        after: { dueDate: iso, startTime: startHM, estMinutes: dur, inbox: false },
      }],
      blocks: [],
    };
    // If a time_block exists for this task, keep them synchronized.
    const existingBlock = blocks.find(b => b.taskId === taskId);
    if (existingBlock) {
      const endHM = minToHM(absMin + dur);
      entry.blocks!.push({
        blockId: existingBlock.id,
        before: { startTime: existingBlock.startTime, endTime: existingBlock.endTime, date: existingBlock.date },
        after: { startTime: startHM, endTime: endHM, date: iso },
      });
      await updateBlock(existingBlock.id, { startTime: startHM, endTime: endHM, date: iso });
    }
    await updateTask(taskId, { dueDate: iso, startTime: startHM, inbox: false, estMinutes: dur });
    history.push(entry);
    haptics.drop();
    setAnnouncement(`${task?.title ?? "Task"} scheduled at ${minTo12(absMin)}`);
    toast.success("Scheduled");
  };

  /** Change a task's duration (and its paired time block), recorded in history. */
  const setTaskDuration = async (taskId: string, nextDur: number) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const prevDur = task.estMinutes ?? 30;
    if (nextDur === prevDur) return;
    const entry: HistoryEntry = {
      label: "duration change",
      tasks: [{ taskId, before: { estMinutes: prevDur }, after: { estMinutes: nextDur } }],
      blocks: [],
    };
    const blk = blocks.find(b => b.taskId === taskId);
    const startAbs = hmToMin(blk?.startTime ?? task.startTime);
    if (blk && startAbs !== null) {
      entry.blocks!.push({
        blockId: blk.id,
        before: { endTime: blk.endTime },
        after: { endTime: minToHM(startAbs + nextDur) },
      });
      await updateBlock(blk.id, { endTime: minToHM(startAbs + nextDur) });
    }
    await updateTask(taskId, { estMinutes: nextDur });
    history.push(entry);
    haptics.snap();
    setAnnouncement(`${task.title} set to ${nextDur} minutes`);
  };

  // ---- Move (reschedule) an existing block by dragging it ----
  useEffect(() => {
    if (!moving) return;
    const clamp = (m: number) => Math.min(Math.max(0, m), (END_H - START_H) * 60 - SNAP_MIN);
    const calc = (clientY: number) => {
      const dy = clientY - moving.startY;
      const delta = Math.round((dy / HOUR_PX) * 60 / SNAP_MIN) * SNAP_MIN;
      return clamp(moving.startMin + delta);
    };
    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      const next = calc(e.clientY);
      setMovePreview(next);
      const el = document.getElementById(`plnr-block-${moving.id}`);
      if (el) el.style.top = `${next * (HOUR_PX / 60)}px`;
    };
    const onUp = async (e: PointerEvent) => {
      const next = calc(e.clientY);
      setMoving(null);
      setMovePreview(null);
      suppressClickRef.current = true;
      setTimeout(() => { suppressClickRef.current = false; }, 250);
      if (next !== moving.startMin) await scheduleTaskAt(moving.id, next + START_H * 60);
    };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp, { once: true });
    window.addEventListener("pointercancel", () => { setMoving(null); setMovePreview(null); }, { once: true });
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp as any); };
  }, [moving]); // eslint-disable-line react-hooks/exhaustive-deps

  const startMoveGesture = (e: React.PointerEvent, it: { id: string; startMin: number; durMin: number; kind: string }) => {
    if (it.kind !== "task") return;
    if (e.button !== undefined && e.button !== 0) return;
    const begin = () => {
      haptics.longPress();
      setMoving({ id: it.id, startY: e.clientY, startMin: it.startMin, durMin: it.durMin, offsetMin: 0 });
    };
    if (e.pointerType === "touch") {
      // Long-press to lift on touch so vertical scrolling still works.
      const timer = window.setTimeout(begin, 260);
      const cancel = () => { window.clearTimeout(timer); window.removeEventListener("pointerup", cancel); window.removeEventListener("pointermove", onEarlyMove); };
      const onEarlyMove = (ev: PointerEvent) => { if (Math.abs(ev.clientY - e.clientY) > 8) cancel(); };
      window.addEventListener("pointerup", cancel, { once: true });
      window.addEventListener("pointermove", onEarlyMove);
    } else {
      begin();
    }
  };

  // ---- Auto-schedule: fill the day using priority, energy and estimated duration ----
  const autoSchedule = async () => {
    const prio: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const pending = state.tasks.filter(t =>
      t.dueDate === iso && !t.done && hmToMin(t.startTime) === null && !blocks.some(b => b.taskId === t.id));
    if (!pending.length) { toast.info("Nothing left to auto-schedule for this day"); return; }

    const buffer = autoPrefs.bufferMin;
    const busy: [number, number][] = autoPrefs.respectAppointments
      ? items.map(i => [i.startMin, i.startMin + i.durMin])
      : items.filter(i => i.kind === "task").map(i => [i.startMin, i.startMin + i.durMin]);
    const dayStart = Math.max(0, (autoPrefs.dayStartH - START_H) * 60);
    const dayEnd = Math.min((END_H - START_H) * 60, (autoPrefs.dayEndH - START_H) * 60);
    const now = new Date();
    const floor = autoPrefs.skipPastTimes && isSameDay(now, date)
      ? Math.max(0, Math.ceil((now.getHours() * 60 + now.getMinutes() - START_H * 60) / SNAP_MIN) * SNAP_MIN)
      : dayStart;
    const lowerBound = Math.max(dayStart, floor);

    const dur0 = (t: Task) => Math.max(SNAP_MIN, t.estMinutes ?? autoPrefs.defaultDuration);
    const sorted = pending.slice().sort((a, b) => autoPrefs.order === "duration"
      ? dur0(b) - dur0(a) || (prio[a.priority] ?? 1) - (prio[b.priority] ?? 1)
      : (prio[a.priority] ?? 1) - (prio[b.priority] ?? 1) || dur0(b) - dur0(a));

    const fits = (s: number, dur: number) =>
      s >= dayStart && s + dur <= dayEnd &&
      !busy.some(([bs, be]) => s < be + buffer && s + dur + buffer > bs);

    const entry: HistoryEntry = { label: "auto-schedule", tasks: [], blocks: [] };
    for (const t of sorted) {
      const dur = dur0(t);
      // Energy-aware preferred window: high → morning, low → late afternoon.
      const preferredH = t.energy === "high" ? autoPrefs.highEnergyH
        : t.energy === "low" ? autoPrefs.lowEnergyH : autoPrefs.mediumEnergyH;
      const first = Math.max(lowerBound, (preferredH - START_H) * 60);
      let slot: number | null = null;
      for (let s = first; s + dur <= dayEnd; s += SNAP_MIN) if (fits(s, dur)) { slot = s; break; }
      if (slot === null) for (let s = lowerBound; s + dur <= dayEnd; s += SNAP_MIN) if (fits(s, dur)) { slot = s; break; }
      if (slot === null) continue;
      busy.push([slot, slot + dur]);
      entry.tasks.push({
        taskId: t.id,
        before: { dueDate: t.dueDate, startTime: t.startTime ?? null, estMinutes: t.estMinutes ?? dur, inbox: t.inbox ?? false },
        after: { dueDate: iso, startTime: minToHM(slot + START_H * 60), estMinutes: dur, inbox: false },
      });
      await updateTask(t.id, { dueDate: iso, startTime: minToHM(slot + START_H * 60), estMinutes: dur, inbox: false });
    }
    const placed = entry.tasks.length;
    if (placed) history.push(entry);
    haptics.success();
    setAnnouncement(placed ? `Auto-scheduled ${placed} tasks` : "No free time left today");
    if (placed) {
      toast.success(`Auto-scheduled ${placed} task${placed === 1 ? "" : "s"}`, {
        action: { label: "Undo", onClick: () => { void runUndo(); } },
      });
    } else {
      toast.info("No free time left in your day window");
    }
  };

  /** Apply a schedule template: create any missing tasks at their template times. */
  const applyTemplate = async (tpl: PlannerTemplate) => {
    const existing = new Set(state.tasks.filter(t => t.dueDate === iso).map(t => t.title.toLowerCase()));
    let added = 0;
    for (const item of tpl.items) {
      if (existing.has(item.title.toLowerCase())) continue;
      const fallbackH = DAY_PART_START_H[item.dayPart ? item.dayPart[0].toUpperCase() + item.dayPart.slice(1) : "Morning"] ?? 9;
      const startHM = item.startTime ?? minToHM(fallbackH * 60);
      await addTask({
        title: item.title,
        area: (item.area as any) ?? "Personal",
        priority: "medium",
        done: false,
        dueDate: iso,
        startTime: startHM,
        estMinutes: item.durMin,
        energy: item.energy,
        dayPart: item.dayPart ? ((item.dayPart[0].toUpperCase() + item.dayPart.slice(1)) as any) : undefined,
        inbox: false,
      } as any);
      existing.add(item.title.toLowerCase());
      added++;
    }
    haptics.success();
    setAnnouncement(added ? `Applied ${tpl.name}, added ${added} tasks` : `${tpl.name} already on this day`);
    if (added) toast.success(`${tpl.name}: added ${added} task${added === 1 ? "" : "s"}`);
    else toast.info("Everything from this template is already here");
  };

  /** Snapshot the day's scheduled tasks so it can be saved as a template. */
  const buildCurrentItems = (): TemplateItem[] =>
    items
      .filter(i => i.kind === "task")
      .sort((a, b) => a.startMin - b.startMin)
      .map(i => ({
        title: i.title,
        startTime: minToHM(i.startMin + START_H * 60),
        dayPart: (i.startMin + START_H * 60 < 12 * 60 ? "morning" : i.startMin + START_H * 60 < 17 * 60 ? "afternoon" : "evening") as TemplateItem["dayPart"],
        durMin: i.durMin,
        area: i.area,
        energy: i.task?.energy as TemplateItem["energy"],
      }));

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
  const setDurationRef = useRef(setTaskDuration);
  setDurationRef.current = setTaskDuration;
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
      await setDurationRef.current(resizing.id, newDur);
      suppressClickRef.current = true;
      setTimeout(() => { suppressClickRef.current = false; }, 200);
      setResizing(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [resizing]);

  const totalMin = (END_H - START_H) * 60;

  // ---- Conflicts ----
  const conflictMap = useMemo(() => {
    const map = new Map<string, ConflictInfo[]>();
    for (const a of items) {
      const overlaps = items.filter(b => b.id !== a.id
        && a.startMin < b.startMin + b.durMin && a.startMin + a.durMin > b.startMin)
        .map(b => ({
          id: b.id,
          title: b.title,
          timeLabel: `${minTo12(b.startMin + START_H * 60)}–${minTo12(b.startMin + b.durMin + START_H * 60)}`,
        }));
      if (overlaps.length) map.set(a.id, overlaps);
    }
    return map;
  }, [items]);

  const conflictCount = useMemo(
    () => Array.from(conflictMap.keys()).filter(id => !dismissedConflicts.includes(id)).length,
    [conflictMap, dismissedConflicts],
  );

  const scrollToFirstConflict = () => {
    const first = Array.from(conflictMap.keys()).find(id => !dismissedConflicts.includes(id));
    if (!first) return;
    document.getElementById(`plnr-block-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  /** Next start (relative minutes) where `dur` fits without overlapping anything but `id`. */
  const nextFreeSlot = (id: string, from: number, dur: number): number | null => {
    const busy = items.filter(i => i.id !== id).map(i => [i.startMin, i.startMin + i.durMin] as [number, number]);
    for (let s = Math.max(0, from); s + dur <= totalMin; s += SNAP_MIN) {
      if (!busy.some(([bs, be]) => s < be && s + dur > bs)) return s;
    }
    return null;
  };

  const resolveMoveNextFree = async (it: { id: string; startMin: number; durMin: number }) => {
    const slot = nextFreeSlot(it.id, it.startMin + SNAP_MIN, it.durMin);
    if (slot === null) { toast.info("No free slot left today"); return; }
    await scheduleTaskAt(it.id, slot + START_H * 60);
  };

  const resolveShorten = async (it: { id: string; startMin: number; durMin: number }) => {
    const nextStart = items
      .filter(o => o.id !== it.id && o.startMin > it.startMin)
      .reduce<number | null>((min, o) => (min === null || o.startMin < min ? o.startMin : min), null);
    if (nextStart === null || nextStart - it.startMin < SNAP_MIN) { toast.info("Not enough room to shorten"); return; }
    await setTaskDuration(it.id, nextStart - it.startMin);
    toast.success("Shortened to fit");
  };

  const resolvePushLater = async (it: { id: string; startMin: number; durMin: number }) => {
    const later = items
      .filter(o => o.id !== it.id && o.kind === "task" && o.startMin >= it.startMin
        && o.startMin < it.startMin + it.durMin)
      .sort((a, b) => a.startMin - b.startMin)[0];
    if (!later) { toast.info("Nothing to push — the other item can't be moved"); return; }
    await scheduleTaskAt(later.id, it.startMin + it.durMin + START_H * 60);
    toast.success("Moved the later item down");
  };

  // ---- Keyboard controls on a focused block ----
  const onBlockKeyDown = async (e: React.KeyboardEvent, it: { id: string; kind: string; startMin: number; durMin: number; title: string }) => {
    if (it.kind !== "task") return;
    const step = e.shiftKey ? 60 : SNAP_MIN;
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const dir = e.key === "ArrowDown" ? 1 : -1;
      if (e.altKey) {
        await setTaskDuration(it.id, Math.max(SNAP_MIN, it.durMin + dir * step));
      } else {
        const next = Math.min(Math.max(0, it.startMin + dir * step), totalMin - SNAP_MIN);
        await scheduleTaskAt(it.id, next + START_H * 60);
      }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openTaskEditor(it.id);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      await updateTask(it.id, { startTime: null } as any);
      setAnnouncement(`${it.title} unscheduled`);
      toast.success("Unscheduled");
    }
  };

  // Cmd/Ctrl+Z / Cmd/Ctrl+Shift+Z inside the timeline.
  const onRootKeyDown = (e: React.KeyboardEvent) => {
    if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
    e.preventDefault();
    if (e.shiftKey) void runRedo(); else void runUndo();
  };

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
    <div
      onKeyDown={onRootKeyDown}
      className={cn("flex h-full min-h-0 flex-col overflow-hidden",
      !bare && "rounded-2xl border border-border/60 bg-card/40")}>
      <span aria-live="polite" className="sr-only">{announcement}</span>
      {!compact && (
        <div className={cn(
          "flex items-center justify-between gap-2 px-3 py-2 text-xs text-muted-foreground",
          !bare && "border-b border-border/60 px-4",
        )}>
          <span className="truncate">{bare ? "Timeline" : format(date, "EEEE, MMMM d")}</span>
          <div className="flex shrink-0 items-center gap-1">
            {conflictCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={scrollToFirstConflict}
                className="h-7 gap-1 rounded-full px-2 text-[11.5px] font-medium text-destructive hover:bg-destructive/10"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                {conflictCount} conflict{conflictCount === 1 ? "" : "s"}
              </Button>
            )}
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 rounded-full"
              disabled={!history.canUndo}
              onClick={() => void runUndo()}
              title={history.nextUndoLabel ? `Undo ${history.nextUndoLabel}` : "Undo"}
              aria-label={history.nextUndoLabel ? `Undo ${history.nextUndoLabel}` : "Undo"}
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 rounded-full"
              disabled={!history.canRedo}
              onClick={() => void runRedo()}
              title={history.nextRedoLabel ? `Redo ${history.nextRedoLabel}` : "Redo"}
              aria-label={history.nextRedoLabel ? `Redo ${history.nextRedoLabel}` : "Redo"}
            >
              <Redo2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 gap-1.5 rounded-full px-2.5 text-[11.5px] font-medium text-primary hover:bg-primary/10"
              onClick={() => void autoSchedule()}
            >
              <Wand2 className="h-3.5 w-3.5" />
              Auto-schedule
            </Button>
            <PlannerTemplatesMenu onApply={applyTemplate} buildCurrentItems={buildCurrentItems} />
            <AutoScheduleSettings prefs={autoPrefs} update={updateAutoPrefs} reset={resetAutoPrefs} />
          </div>
        </div>
      )}
      {!compact && (
        <div className="space-y-2 px-3 pb-2 sm:px-4">
          <PlannerAtmosphereStrip date={date} />
          {isMobile && <PlannerMobileInboxRail />}
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
              const parked = dayPartTasks[b.id] ?? [];
              return (
                <div key={b.id}
                  className={cn("pointer-events-none absolute left-0 right-0", bandClass(b.id, bandColors))}
                  style={{ top: topMin * (HOUR_PX / 60), height: h }}>
                  <span className="absolute left-1 top-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">
                    {b.label}
                  </span>
                  {parked.length > 0 && (
                    <div className="pointer-events-auto absolute left-14 right-2 top-0.5 flex flex-wrap gap-1">
                      {parked.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); void scheduleTaskAt(t.id, (DAY_PART_START_H[t.dayPart ?? "Morning"] ?? b.startH) * 60); }}
                          title={`${t.title} — ${b.label}. Tap to place on the grid.`}
                          aria-label={`${t.title}, planned for the ${b.label.toLowerCase()}. Tap to place it on the grid.`}
                          className="max-w-[45%] truncate rounded-full border border-dashed border-border/70 bg-card/80 px-2 py-0.5 text-[10px] text-muted-foreground shadow-sm hover:border-primary/60 hover:text-foreground"
                        >
                          {t.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {/* Quarter lines */}
            {Array.from({ length: (END_H - START_H) * 4 }, (_, i) => (
              <div key={i} className="absolute left-0 right-0 border-t border-border/10" style={{ top: (i + 1) * (HOUR_PX / 4) }} />
            ))}

            {/* Meals: breakfast · lunch · dinner */}
            <PlannerMealLane
              iso={iso}
              topFor={(absMin) => {
                const rel = absMin - START_H * 60;
                if (rel < 0 || rel > totalMin) return null;
                return rel * (HOUR_PX / 60);
              }}
            />

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
              const heightPx = Math.max(SNAP_MIN, it.durMin) * (HOUR_PX / 60) - 2;
              const tiny = heightPx < 34;      // single-line layout
              const short = heightPx < 56;     // no room for 2+ title lines
              const titleLines = tiny ? 1 : short ? 1 : heightPx < 90 ? 2 : 4;
              const conflicts = conflictMap.get(it.id) ?? [];
              const hasConflict = conflicts.length > 0 && !dismissedConflicts.includes(it.id);
              const isMoving = moving?.id === it.id;
              const shownStart = isMoving && movePreview !== null ? movePreview : it.startMin;
              const timeLabel = `${minTo12(shownStart + START_H * 60)}–${minTo12(shownStart + it.durMin + START_H * 60)}`;
              const conflictNode = hasConflict ? (
                <ConflictPopover
                  title={it.title}
                  conflicts={conflicts}
                  canEdit={it.kind === "task"}
                  onMoveNextFree={() => void resolveMoveNextFree(it)}
                  onShorten={() => void resolveShorten(it)}
                  onPushLater={() => void resolvePushLater(it)}
                  onDismiss={() => setDismissedConflicts(d => [...d, it.id])}
                />
              ) : null;
              return (
                <ContextMenu key={it.id}>
                  <ContextMenuTrigger asChild>
                <div
                  key={it.id}
                  id={`plnr-block-${it.id}`}
                  data-planner-block
                  tabIndex={0}
                  role="button"
                  aria-label={`${it.title}, ${timeLabel}, ${it.durMin} minutes${hasConflict ? ", overlaps another item" : ""}${it.kind === "task" ? ". Arrow keys move, Alt plus arrows change duration, Enter opens" : ""}`}
                  onKeyDown={(e) => void onBlockKeyDown(e, it)}
                  title={`${it.title} · ${timeLabel}${hasConflict ? " · overlaps another item" : ""}`}
                  onPointerDown={(e) => startMoveGesture(e, it)}
                  onClick={() => it.kind === "task" && openTaskEditor(it.id)}
                  className={cn(
                    "group absolute select-none overflow-hidden rounded-lg border px-1.5 py-1 text-[11px] shadow-sm outline-none transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                    it.kind === "task" ? "cursor-grab touch-none active:cursor-grabbing" : "cursor-pointer",
                    AREA_BG[it.area ?? ""] ?? "bg-muted/60 border-border/60",
                    it.done && "opacity-60",
                    hasConflict && "ring-1 ring-destructive/60",
                    isMoving && "z-30 scale-[1.02] shadow-xl ring-2 ring-primary",
                    isFocusActive && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                  )}
                  style={{
                    top: it.startMin * (HOUR_PX / 60),
                    height: heightPx,
                    left: `calc(${leftPct}% + 4px)`,
                    width: `calc(${widthPct}% - 8px)`,
                  }}
                >
                  {tiny ? (
                    <div className="flex h-full min-w-0 items-center gap-1 leading-none">
                      {ic && ic.kind === "lucide" ? <ic.Icon className="h-3 w-3 shrink-0" /> : ic && ic.kind === "emoji" && <span className="shrink-0 text-[11px] leading-none">{ic.char}</span>}
                      <span className="min-w-0 flex-1 truncate font-medium">{it.title}</span>
                      <span className="shrink-0 font-mono text-[9px] opacity-70">{minTo12(it.startMin + START_H * 60)}</span>
                      {conflictNode}
                    </div>
                  ) : (
                    <div className="flex h-full min-w-0 flex-col gap-0.5">
                      <div className="flex min-w-0 items-center gap-1 font-mono text-[9px] leading-none opacity-75">
                        {it.kind === "task" ? (
                          <DurationEditor
                            durMin={it.durMin}
                            label={timeLabel}
                            title={it.title}
                            onCommit={(next) => void setTaskDuration(it.id, next)}
                          />
                        ) : (
                          <span className="truncate">{timeLabel}</span>
                        )}
                        {conflictNode}
                        {isFocusActive && <span className="ml-auto shrink-0 rounded-full bg-primary/20 px-1 text-primary">Focus</span>}
                      </div>
                      <div className="flex min-w-0 flex-1 items-start gap-1 font-medium leading-[1.25]">
                        {ic && ic.kind === "lucide" ? <ic.Icon className="mt-[1px] h-3 w-3 shrink-0" /> : ic && ic.kind === "emoji" && <span className="shrink-0 text-xs leading-none">{ic.char}</span>}
                        <span
                          className="min-w-0 flex-1 whitespace-normal break-words [overflow-wrap:break-word] [word-break:normal]"
                          style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: titleLines, overflow: "hidden" }}
                        >
                          {it.title}
                        </span>
                      </div>
                    </div>
                  )}
                  {it.kind === "task" && (
                    <div
                      onPointerDown={(e) => { e.stopPropagation(); haptics.snap(); setResizing({ id: it.id, startY: e.clientY, startDur: it.durMin }); }}
                      className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize touch-none opacity-0 transition-opacity hover:bg-primary/30 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100 [@media(pointer:coarse)]:bg-foreground/10"
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