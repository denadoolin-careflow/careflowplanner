import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, isSameDay, parseISO } from "date-fns";
import { AlertTriangle, Redo2, Undo2, Wand2 } from "lucide-react";
import { NotebookPen, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { TASK_DRAG_MIME } from "@/components/calendar/UnscheduledTasksRail";
import { openTaskEditor } from "@/lib/open-task-editor";
import { openMobileBlockEditor } from "@/lib/open-mobile-block-editor";
import { resolveTaskIcon } from "@/lib/task-icons";
import type { Task, Appointment } from "@/lib/types";
import { toast } from "sonner";
import { usePomodoro } from "@/lib/pomodoro-store";
import { usePlannerFocusTaskId } from "@/lib/planner-prefs";
import { haptics } from "@/lib/haptics";
import { BlockQuickActions } from "./BlockQuickActions";
import { BlockCheckbox } from "./BlockCheckbox";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { usePlannerDropListener } from "@/lib/planner-touch-drag";
import { useTimeBlocks, hmToHours } from "@/lib/time-blocks";
import { createWriteBlock, openWriteBlock } from "@/lib/planner/write-blocks";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { parseTaskInput } from "@/lib/nlp-task";
import { inferArea } from "@/lib/area-infer";
import { usePlannerHistory, type HistoryEntry } from "@/lib/planner-history";
import { useAutoSchedulePrefs } from "@/lib/auto-schedule-prefs";
import { AutoScheduleSettings } from "./AutoScheduleSettings";
import { ConflictPopover, type ConflictInfo } from "./ConflictPopover";
import { DurationEditor } from "./DurationEditor";
import { PlannerTemplatesMenu } from "./PlannerTemplatesMenu";
import { PlannerMealLane } from "./PlannerMealLane";
import { PlannerAtmosphereStrip } from "./PlannerAtmosphereStrip";
import { useBandColors, bandClass, type BandId } from "@/lib/planner-band-colors";
import type { PlannerTemplate, TemplateItem } from "@/lib/planner-templates";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  PLANNER_START_H as START_H,
  PLANNER_END_H as END_H,
  HOUR_PX,
  SNAP_MIN,
  SLOT_PX,
} from "@/lib/planner-metrics";

export const RHYTHM_BANDS = [
  { id: "morning" as BandId, label: "Morning", startH: 5, endH: 12, className: "bg-amber-50/50 dark:bg-amber-950/20" },
  { id: "afternoon" as BandId, label: "Afternoon", startH: 12, endH: 17, className: "bg-sky-50/40 dark:bg-sky-950/20" },
  { id: "evening" as BandId, label: "Evening", startH: 17, endH: 22, className: "bg-violet-50/40 dark:bg-violet-950/20" },
];

/** Default landing time for a task that only has a day part. */
const DAY_PART_START_H: Record<string, number> = { Morning: 9, Afternoon: 13, Evening: 18, "Late Night": 21 };

// Grid metrics come from @/lib/planner-metrics so unscheduled rows share the same baseline.

interface ScheduledItem {
  id: string;
  kind: "task" | "appt" | "write";
  title: string;
  startMin: number; // minutes from START_H
  durMin: number;
  area?: string;
  done?: boolean;
  color?: string;
  task?: Task;
  /** For writing blocks: what record the block points at. */
  write?: { kind: "note" | "journal"; recordId: string; blockId: string };
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
  Writing: "bg-indigo-100/70 dark:bg-indigo-900/30 border-indigo-300/60",
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

export function PlannerTimeline({ date, compact, bare, gutterless, noScroll }: {
  date: Date;
  compact?: boolean;
  bare?: boolean;
  /** Hide the built-in hour rail — the week grid supplies one shared gutter. */
  gutterless?: boolean;
  /** Let an outer container own vertical scrolling (multi-day grid). */
  noScroll?: boolean;
}) {
  const { state, updateTask, addTask, toggleTask } = useStore();
  const pomo = usePomodoro();
  const [focusTaskId] = usePlannerFocusTaskId();
  const iso = format(date, "yyyy-MM-dd");
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [nowMin, setNowMin] = useState<number | null>(null);
  const [resizing, setResizing] = useState<{ id: string; startY: number; startDur: number } | null>(null);
  const [moving, setMoving] = useState<{ id: string; startY: number; startMin: number; durMin: number; offsetMin: number } | null>(null);
  const [movePreview, setMovePreview] = useState<number | null>(null);
  const [quickAdd, setQuickAdd] = useState<{
    x: number; y: number; startAbsMin: number; text: string; durMin: number;
    mode: "task" | "note" | "journal";
  } | null>(null);
  const [dragOverMin, setDragOverMin] = useState<number | null>(null);
  /** Live range painted by press-dragging on empty grid space. */
  const [dragCreate, setDragCreate] = useState<{ startMin: number; endMin: number } | null>(null);
  const createRef = useRef<{ start: number; armed: boolean; moved: boolean; timer: number | null } | null>(null);
  /** Mirror of `dragCreate` readable from pointer handlers without re-binding. */
  const dragRangeRef = useRef<{ startMin: number; endMin: number } | null>(null);
  const [nowVisible, setNowVisible] = useState(true);
  const suppressClickRef = useRef(false);
  const { blocks, update: updateBlock } = useTimeBlocks(iso, iso);
  const { prefs: autoPrefs, update: updateAutoPrefs, reset: resetAutoPrefs } = useAutoSchedulePrefs();
  const [announcement, setAnnouncement] = useState("");
  const [dismissedConflicts, setDismissedConflicts] = useState<string[]>([]);
  const [bandColors] = useBandColors();
  const isMobile = useIsMobile();

  // Anchor the timeline on the current hour so the day opens where you are.
  const scrollToNow = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = scrollRef.current;
    if (!el) return;
    const mins = (new Date().getHours() - START_H) * 60 + new Date().getMinutes();
    const top = Math.max(0, mins * (HOUR_PX / 60) - el.clientHeight / 3);
    el.scrollTo({ top, behavior });
  }, []);
  useEffect(() => {
    const t = window.setTimeout(() => scrollToNow("auto"), 80);
    return () => window.clearTimeout(t);
  }, [iso, scrollToNow]);

  const applyHistory = useCallback(async (
    tasks: { id: string; patch: Record<string, unknown> }[],
    blks: { id: string; patch: Record<string, unknown> }[],
  ) => {
    for (const t of tasks) await updateTask(t.id, t.patch as any);
    for (const b of blks) await updateBlock(b.id, b.patch as any);
  }, [updateTask, updateBlock]);

  const history = usePlannerHistory(applyHistory, iso, {
    task: (id) => state.tasks.some(t => t.id === id),
    block: (id) => blocks.some(b => b.id === id),
  });

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

  // Keep a "Jump to now" affordance only when the current time is scrolled out of view.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || nowMin === null) { setNowVisible(true); return; }
    const check = () => {
      const top = nowMin * (HOUR_PX / 60);
      setNowVisible(top >= el.scrollTop - 8 && top <= el.scrollTop + el.clientHeight + 8);
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    return () => el.removeEventListener("scroll", check);
  }, [nowMin, noScroll]);

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
      const isWrite = b.linkType === "note" || b.linkType === "journal";
      out.push({
        id: `blk-${b.id}`,
        kind: isWrite ? "write" : "appt",
        title: b.title,
        startMin: s - START_H * 60,
        durMin: Math.max(15, e - s),
        area: isWrite ? "Writing" : "Appointments",
        write: isWrite && b.linkId
          ? { kind: b.linkType as "note" | "journal", recordId: b.linkId, blockId: b.id }
          : undefined,
      });
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
    toast.success(`Scheduled ${minTo12(absMin)}`, {
      action: { label: "Undo", onClick: () => { void runUndo(); } },
    });
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
    toast.success(`Duration ${nextDur}m`, {
      action: { label: "Undo", onClick: () => { void runUndo(); } },
    });
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
      const held = moving.id;
      const unmoved = next === moving.startMin;
      setMoving(null);
      setMovePreview(null);
      suppressClickRef.current = true;
      setTimeout(() => { suppressClickRef.current = false; }, 250);
      if (!unmoved) { await scheduleTaskAt(held, next + START_H * 60); return; }
      // Long-press then release without dragging → mobile quick-action menu.
      if (isMobile && e.pointerType === "touch") openMobileBlockEditor(held, "quick");
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
    setDragOverMin(null);
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
      const rect = gridRef.current?.getBoundingClientRect();
      if (rect) setDragOverMin(yToMin(e.clientY - rect.top));
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

  /** Open stretches of at least 30 minutes inside the planning window. */
  const gaps = useMemo(() => {
    const winStart = Math.max(0, (autoPrefs.dayStartH - START_H) * 60);
    const winEnd = Math.min(totalMin, (autoPrefs.dayEndH - START_H) * 60);
    const busy = items
      .map(i => [Math.max(winStart, i.startMin), Math.min(winEnd, i.startMin + i.durMin)] as [number, number])
      .filter(([s, e]) => e > s)
      .sort((a, b) => a[0] - b[0]);
    const out: { start: number; dur: number }[] = [];
    let cursor = winStart;
    for (const [s, e] of busy) {
      if (s - cursor >= 30) out.push({ start: cursor, dur: s - cursor });
      cursor = Math.max(cursor, e);
    }
    if (winEnd - cursor >= 30) out.push({ start: cursor, dur: winEnd - cursor });
    return out;
  }, [items, autoPrefs.dayStartH, autoPrefs.dayEndH, totalMin]);

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

  /**
   * Press-drag on empty grid space paints a time range; releasing opens the
   * composer already sized to it. Mouse/pen start painting immediately, touch
   * needs a short press so ordinary finger scrolling still works.
   */
  const onGridPointerDown = (e: React.PointerEvent) => {
    if (e.button > 0) return;
    const target = e.target as HTMLElement;
    // Gap buttons blanket the empty grid, so painting must work on top of them.
    if (target.closest("[data-planner-block]")) return;
    if (target.closest("button") && !target.closest("[data-planner-gap]")) return;
    if (quickAdd) return; // click handler closes it
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    const start = yToMin(e.clientY - rect.top);
    const touch = e.pointerType === "touch";
    const st = { start, armed: !touch, moved: false, timer: null as number | null };
    createRef.current = st;
    if (touch) {
      st.timer = window.setTimeout(() => {
        if (!createRef.current || createRef.current.moved) return;
        createRef.current.armed = true;
        dragRangeRef.current = { startMin: start, endMin: start + SNAP_MIN * 2 };
        setDragCreate(dragRangeRef.current);
        haptics.magnet();
      }, 300);
    }

    const move = (ev: PointerEvent) => {
      const st2 = createRef.current;
      if (!st2) return;
      const r = gridRef.current?.getBoundingClientRect();
      if (!r) return;
      const cur = yToMin(ev.clientY - r.top);
      if (!st2.armed) {
        // Finger moved before the long-press landed → it's a scroll, bail out.
        if (Math.abs(cur - st2.start) >= SNAP_MIN) {
          st2.moved = true;
          if (st2.timer) window.clearTimeout(st2.timer);
          cleanup();
        }
        return;
      }
      ev.preventDefault();
      const a = Math.min(st2.start, cur), b = Math.max(st2.start, cur);
      dragRangeRef.current = { startMin: a, endMin: Math.max(a + SNAP_MIN, b) };
      setDragCreate(dragRangeRef.current);
    };
    const up = () => {
      const st2 = createRef.current;
      const range = dragRangeRef.current;
      cleanup();
      if (!st2?.armed || !range || range.endMin - range.startMin < SNAP_MIN * 2) return;
      suppressClickRef.current = true;
      window.setTimeout(() => { suppressClickRef.current = false; }, 300);
      haptics.success();
      setQuickAdd({
        x: 24,
        y: range.startMin * (HOUR_PX / 60),
        startAbsMin: range.startMin + START_H * 60,
        text: "",
        durMin: range.endMin - range.startMin,
        mode: "task",
      });
    };
    function cleanup() {
      if (createRef.current?.timer) window.clearTimeout(createRef.current.timer);
      createRef.current = null;
      dragRangeRef.current = null;
      setDragCreate(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cleanup);
    }
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cleanup);
  };

  // Tap empty grid → open quick add popover at the clicked slot.
  const onGridClick = (e: React.MouseEvent) => {
    if (suppressClickRef.current) return;
    const target = e.target as HTMLElement;
    // Only trigger on the grid background, not on blocks or their children.
    if (target.closest("[data-planner-block]")) return;
    // An open composer stays open: the first tap outside just closes it, so a
    // duration choice is never lost to a stray click.
    if (quickAdd) { setQuickAdd(null); return; }
    const rect = gridRef.current!.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const relMin = yToMin(y);
    const abs = relMin + START_H * 60;
    setQuickAdd({ x: e.clientX - rect.left, y: relMin * (HOUR_PX / 60), startAbsMin: abs, text: "", durMin: 30, mode: "task" });
  };

  /** Complete a task from its block without bouncing into the editor. */
  const toggleWithUndo = (id: string, title: string, done: boolean) => {
    suppressClickRef.current = true;
    window.setTimeout(() => { suppressClickRef.current = false; }, 400);
    void toggleTask(id);
    setAnnouncement(done ? `${title} marked not done` : `${title} completed`);
    if (!done) {
      toast.success(`Completed ${title}`, {
        action: { label: "Undo", onClick: () => { void toggleTask(id); } },
      });
    }
  };

  const submitQuickAdd = async () => {
    if (!quickAdd) return;
    if (quickAdd.mode !== "task") { await submitWriteBlock(); return; }
    if (!quickAdd.text.trim()) { setQuickAdd(null); return; }
    const p = parseTaskInput(quickAdd.text);
    const guessed = p.area ?? inferArea({ title: p.title || quickAdd.text, tags: p.tags })?.area ?? "Personal";
    await addTask({
      title: p.title || quickAdd.text,
      area: guessed,
      priority: p.priority ?? "medium",
      done: false,
      dueDate: p.dueDate ?? iso,
      startTime: p.time ?? minToHM(quickAdd.startAbsMin),
      estMinutes: p.estMinutes ?? quickAdd.durMin,
      tags: p.tags,
      energy: p.energy,
      inbox: false,
    } as any);
    haptics.success();
    toast.success("Task added");
    setQuickAdd(null);
  };

  /** Create a note or journal entry scheduled as a block at the tapped slot. */
  const submitWriteBlock = async () => {
    if (!quickAdd || quickAdd.mode === "task") return;
    const kind = quickAdd.mode;
    const title = quickAdd.text.trim() || (kind === "note" ? "Untitled note" : `Journal — ${format(date, "MMM d")}`);
    try {
      const target = await createWriteBlock({
        kind,
        title,
        date: iso,
        startTime: minToHM(quickAdd.startAbsMin),
        endTime: minToHM(quickAdd.startAbsMin + quickAdd.durMin),
      });
      haptics.success();
      setQuickAdd(null);
      openWriteBlock(target);
    } catch {
      toast.error("Couldn't create that. Try again?");
    }
  };

  const setStart = (deltaMin: number) => setQuickAdd(q => {
    if (!q) return q;
    const next = Math.min((END_H * 60) - q.durMin, Math.max(START_H * 60, q.startAbsMin + deltaMin));
    return { ...q, startAbsMin: next };
  });

  const composerBody = quickAdd ? (
    // Portalled content still bubbles through the React tree into the grid's
    // click/pointer handlers, so stop it here or the composer closes itself.
    <div
      className="space-y-3"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Mode */}
      <div className="flex items-center gap-1.5" role="group" aria-label="What to create">
        {([
          { id: "task" as const, label: "Task" },
          { id: "note" as const, label: "Note" },
          { id: "journal" as const, label: "Journal" },
        ]).map(m => (
          <button
            key={m.id}
            type="button"
            aria-pressed={quickAdd.mode === m.id}
            onClick={() => setQuickAdd(q => q ? { ...q, mode: m.id } : q)}
            className={cn(
              "flex-1 rounded-full px-3 text-[12px] font-medium leading-none transition-colors",
              isMobile ? "h-11" : "h-7",
              quickAdd.mode === m.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:bg-muted",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <Input
        autoFocus={!isMobile}
        value={quickAdd.text}
        onChange={(e) => setQuickAdd(q => q ? { ...q, text: e.target.value } : q)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); void submitQuickAdd(); }
          if (e.key === "Escape") setQuickAdd(null);
        }}
        placeholder={
          quickAdd.mode === "task"
            ? "Task title (try 'call mom #family 30m')"
            : quickAdd.mode === "note"
              ? "Note title — opens the editor"
              : "Journal entry title — opens the editor"
        }
        className={cn("text-sm", isMobile ? "h-12 text-base" : "h-9")}
      />

      {/* Time frame */}
      <div className="rounded-xl border border-border/60 bg-muted/30 p-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Starts</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Start 15 minutes earlier"
              onClick={() => setStart(-SNAP_MIN)}
              className={cn("grid place-items-center rounded-full border border-border/60 text-sm", isMobile ? "h-10 w-10" : "h-7 w-7")}
            >−</button>
            <span className="min-w-[64px] text-center font-mono text-[12px]">{minTo12(quickAdd.startAbsMin)}</span>
            <button
              type="button"
              aria-label="Start 15 minutes later"
              onClick={() => setStart(SNAP_MIN)}
              className={cn("grid place-items-center rounded-full border border-border/60 text-sm", isMobile ? "h-10 w-10" : "h-7 w-7")}
            >+</button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {[15, 30, 45, 60, 90, 120].map(d => (
            <button
              key={d}
              type="button"
              aria-pressed={quickAdd.durMin === d}
              onClick={() => setQuickAdd(q => q ? { ...q, durMin: d } : q)}
              className={cn(
                "rounded-full border px-3 text-[12px] leading-none transition-colors",
                isMobile ? "h-10" : "h-7",
                quickAdd.durMin === d
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border/60 text-muted-foreground hover:bg-muted",
              )}
            >
              {d < 60 ? `${d}m` : d % 60 === 0 ? `${d / 60}h` : `${Math.floor(d / 60)}h${d % 60}`}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <label htmlFor="plnr-end-time" className="text-[11px] uppercase tracking-wide text-muted-foreground">Ends</label>
          <input
            id="plnr-end-time"
            type="time"
            step={900}
            value={minToHM((quickAdd.startAbsMin + quickAdd.durMin) % (24 * 60))}
            onChange={(e) => {
              const v = hmToMin(e.target.value);
              if (v === null) return;
              setQuickAdd(q => q ? { ...q, durMin: Math.max(SNAP_MIN, v - q.startAbsMin) } : q);
            }}
            className={cn(
              "rounded-lg border border-border/60 bg-background px-2 font-mono text-[12px]",
              isMobile ? "h-10" : "h-7",
            )}
          />
        </div>
      </div>

      {(() => {
        const t = quickAdd.text.trim();
        if (!t || quickAdd.mode !== "task") return null;
        const p = parseTaskInput(t);
        const a = p.area ?? inferArea({ title: p.title || t, tags: p.tags })?.area;
        return a ? (
          <p className="text-[11px] text-muted-foreground">{a} <span className="opacity-60">auto-detected</span></p>
        ) : null;
      })()}

      <div className="flex items-center gap-2">
        <Button
          className={cn("flex-1 rounded-full text-[12.5px]", isMobile ? "h-12" : "h-8")}
          disabled={quickAdd.mode === "task" && !quickAdd.text.trim()}
          onClick={() => void submitQuickAdd()}
        >
          {quickAdd.mode === "task" ? "Add" : quickAdd.mode === "note" ? "Write note" : "Journal"} · {minTo12(quickAdd.startAbsMin)}–{minTo12(quickAdd.startAbsMin + quickAdd.durMin)}
        </Button>
        <Button
          variant="ghost"
          className={cn("rounded-full px-3 text-[12.5px]", isMobile ? "h-12" : "h-8")}
          onClick={() => setQuickAdd(null)}
        >
          Cancel
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {quickAdd.mode === "task"
          ? "Press and drag on the grid to paint a time frame."
          : "Creates a scheduled writing block and opens the editor right here."}
      </p>
    </div>
  ) : null;

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
            <PlannerTemplatesMenu onApply={applyTemplate} buildCurrentItems={buildCurrentItems} date={date} />
            <AutoScheduleSettings prefs={autoPrefs} update={updateAutoPrefs} reset={resetAutoPrefs} />
          </div>
        </div>
      )}
      {!compact && (
        <div className="space-y-2 px-3 pb-2 sm:px-4">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1"><PlannerAtmosphereStrip date={date} /></div>
            {nowMin !== null && !nowVisible && (
              <button
                type="button"
                onClick={() => scrollToNow("smooth")}
                className="shrink-0 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                aria-label="Scroll the timeline to the current time"
              >
                Jump to now
              </button>
            )}
          </div>
        </div>
      )}
      <div ref={scrollRef} className={cn("flex-1", noScroll ? "overflow-visible" : "overflow-y-auto")}>
        <div className="relative flex">
          {/* Hour rail */}
          {!gutterless && (
          <div className="w-14 shrink-0 border-r border-border/50 text-[10px] text-muted-foreground">
            {Array.from({ length: END_H - START_H }, (_, i) => {
              const h = START_H + i;
              const label = format(new Date(2000, 0, 1, h), "h a");
              const wx = hourWeather.get(h);
              const tint = hourTint(wx);
              return <div key={h} style={{ height: HOUR_PX }} className="relative pr-1 text-right">
                <span className="absolute -top-2 right-1">{label}</span>
                {wx && tint && (
                  <span
                    className="absolute left-1 top-1 dark:brightness-[1.9]"
                    style={{ color: tint.color }}
                    title={`${label} · ${wx.conditionLabel}${wx.precipChance >= 10 ? ` · ${wx.precipChance}% precip` : ""}`}
                    aria-hidden
                  >
                    <ConditionIcon condition={wx.condition} isNight={wx.isNight} className="h-3 w-3" />
                  </span>
                )}
              </div>;
            })}
          </div>
          )}
          {/* Grid */}
          <div
            ref={gridRef}
            data-planner-grid
            className="relative flex-1 transition-colors data-[planner-drop-active]:bg-primary/5"
            style={{ height: totalMin * (HOUR_PX / 60) }}
            onDragOver={onDragOver}
            onDragEnter={() => haptics.magnet()}
            onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOverMin(null); }}
            onDrop={onDrop}
            onClick={onGridClick}
            onPointerDown={onGridPointerDown}
          >
            {/* Hour lines */}
            {Array.from({ length: END_H - START_H + 1 }, (_, i) => (
              <div key={i} className="absolute left-0 right-0 border-t border-border/40" style={{ top: i * HOUR_PX }} />
            ))}
            {/* Weather wash per hour — same condition colors as the strip and capacity bar */}
            {Array.from({ length: END_H - START_H }, (_, i) => {
              const tint = hourTint(hourWeather.get(START_H + i));
              if (!tint) return null;
              return (
                <div
                  key={`wx-${i}`}
                  className="pointer-events-none absolute left-0 right-0"
                  style={{ top: i * HOUR_PX, height: HOUR_PX, background: tint.wash }}
                  aria-hidden
                />
              );
            })}
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

            {/* Open time — tap a gap to plan into it */}
            {gaps.map(g => (
              <button
                key={`gap-${g.start}`}
                type="button"
                data-planner-gap
                onClick={(e) => {
                  e.stopPropagation();
                  setQuickAdd({ x: 24, y: g.start * (HOUR_PX / 60), startAbsMin: g.start + START_H * 60, text: "", durMin: Math.min(g.dur, 60), mode: "task" });
                }}
                aria-label={`${g.dur} minutes free from ${minTo12(g.start + START_H * 60)}. Add a task here.`}
                className="group/gap absolute left-1 right-1 z-0 flex items-start justify-end rounded-md border border-dashed border-transparent px-2 pt-1 text-[9px] text-muted-foreground/0 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-muted-foreground"
                style={{ top: g.start * (HOUR_PX / 60), height: g.dur * (HOUR_PX / 60) }}
              >
                <span className="rounded-full bg-background/80 px-1.5 py-0.5 font-mono opacity-0 transition-opacity group-hover/gap:opacity-100">
                  {g.dur >= 60 ? `${Math.round((g.dur / 60) * 10) / 10}h free` : `${g.dur}m free`}
                </span>
              </button>
            ))}

            {/* Live preview of the task being composed, sized by the chosen duration */}
            {dragCreate && (
              <div
                className="pointer-events-none absolute left-1 right-1 z-30 overflow-hidden rounded-lg border-2 border-dashed border-primary/70 bg-primary/15 px-1.5 py-1 text-[11px] text-primary"
                style={{
                  top: dragCreate.startMin * (HOUR_PX / 60),
                  height: Math.max(SNAP_MIN, dragCreate.endMin - dragCreate.startMin) * (HOUR_PX / 60) - 2,
                }}
                aria-hidden
              >
                <span className="block truncate font-mono text-[9px] opacity-80">
                  {minTo12(dragCreate.startMin + START_H * 60)}–{minTo12(dragCreate.endMin + START_H * 60)} · {dragCreate.endMin - dragCreate.startMin}m
                </span>
                <span className="block truncate font-medium">Drag to set the time frame</span>
              </div>
            )}

            {quickAdd && (() => {
              const rel = quickAdd.startAbsMin - START_H * 60;
              return (
                <div
                  className="pointer-events-none absolute left-1 right-1 z-20 overflow-hidden rounded-lg border-2 border-dashed border-primary/70 bg-primary/10 px-1.5 py-1 text-[11px] text-primary"
                  style={{ top: rel * (HOUR_PX / 60), height: Math.max(SNAP_MIN, quickAdd.durMin) * (HOUR_PX / 60) - 2 }}
                  aria-hidden
                >
                  <span className="block truncate font-mono text-[9px] opacity-80">
                    {minTo12(quickAdd.startAbsMin)}–{minTo12(quickAdd.startAbsMin + quickAdd.durMin)} · {quickAdd.durMin}m
                  </span>
                  <span className="block truncate font-medium">{quickAdd.text.trim() || "New task"}</span>
                </div>
              );
            })()}

            {/* Drop preview while dragging a task in from a rail or tray */}
            {dragOverMin !== null && (
              <div
                className="pointer-events-none absolute left-0 right-0 z-30 flex items-center"
                style={{ top: dragOverMin * (HOUR_PX / 60), height: SLOT_PX }}
                aria-hidden
              >
                <span className="h-px flex-1 bg-primary/70" />
                <span className="ml-1 rounded bg-primary/90 px-1 font-mono text-[9px] text-primary-foreground">
                  Drop {minTo12(dragOverMin + START_H * 60)}
                </span>
              </div>
            )}

            {/* Snap guide while dragging — lines up with the unscheduled row baseline */}
            {moving && movePreview !== null && (
              <div
                className="pointer-events-none absolute left-0 right-0 z-30 flex items-center"
                style={{ top: movePreview * (HOUR_PX / 60), height: SLOT_PX }}
                aria-hidden
              >
                <span className="h-px flex-1 bg-primary/70" />
                <span className="ml-1 rounded bg-primary/90 px-1 font-mono text-[9px] text-primary-foreground">
                  {minTo12(movePreview + START_H * 60)}–{minTo12(movePreview + moving.durMin + START_H * 60)} · {moving.durMin}m
                </span>
              </div>
            )}

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
                  onClick={() => {
                    // Never open the editor straight after a move, resize or completion.
                    if (suppressClickRef.current) return;
                    if (it.kind === "write" && it.write) {
                      openWriteBlock({ kind: it.write.kind, recordId: it.write.recordId, blockId: it.write.blockId, title: it.title });
                      return;
                    }
                    if (it.kind !== "task") return;
                    // Phones get the compact grid editor; desktop opens the full editor.
                    if (isMobile) openMobileBlockEditor(it.id, "sheet");
                    else openTaskEditor(it.id);
                  }}
                  className={cn(
                    "group absolute select-none overflow-hidden rounded-lg border px-1.5 py-1 text-[11px] shadow-sm outline-none transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                    it.kind === "task" ? "cursor-grab touch-none active:cursor-grabbing" : "cursor-pointer",
                    AREA_BG[it.area ?? ""] ?? "bg-muted/60 border-border/60",
                    it.done && "opacity-55 saturate-50 shadow-none",
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
                      {it.kind === "task" && (
                        <BlockCheckbox
                          done={!!it.done}
                          title={it.title}
                          onToggle={() => toggleWithUndo(it.id, it.title, !!it.done)}
                        />
                      )}
                      {ic && ic.kind === "lucide" ? <ic.Icon className="h-3 w-3 shrink-0" /> : ic && ic.kind === "emoji" && <span className="shrink-0 text-[11px] leading-none">{ic.char}</span>}
                      {it.kind === "write" && (it.write?.kind === "journal"
                        ? <NotebookPen className="h-3 w-3 shrink-0" />
                        : <StickyNote className="h-3 w-3 shrink-0" />)}
                      <span className={cn("min-w-0 flex-1 truncate font-medium", it.done && "line-through")}>{it.title}</span>
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
                        {it.kind === "task" && (
                          <BlockCheckbox
                            done={!!it.done}
                            title={it.title}
                            className="mt-[1px]"
                            onToggle={() => toggleWithUndo(it.id, it.title, !!it.done)}
                          />
                        )}
                        {ic && ic.kind === "lucide" ? <ic.Icon className="mt-[1px] h-3 w-3 shrink-0" /> : ic && ic.kind === "emoji" && <span className="shrink-0 text-xs leading-none">{ic.char}</span>}
                        {it.kind === "write" && (it.write?.kind === "journal"
                          ? <NotebookPen className="mt-[1px] h-3 w-3 shrink-0" />
                          : <StickyNote className="mt-[1px] h-3 w-3 shrink-0" />)}
                        <span
                          className={cn("min-w-0 flex-1 whitespace-normal break-words [overflow-wrap:break-word] [word-break:normal]", it.done && "line-through")}
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

            {/* Quick-add composer — bottom sheet on touch, popover on desktop */}
            {quickAdd && !isMobile && (
              <Popover open onOpenChange={(o) => !o && setQuickAdd(null)}>
                <PopoverAnchor asChild>
                  <div
                    className="pointer-events-none absolute"
                    style={{ left: quickAdd.x, top: quickAdd.y, width: 1, height: 1 }}
                  />
                </PopoverAnchor>
                <PopoverContent
                  side="right"
                  align="start"
                  className="w-80 p-3"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                  onInteractOutside={(e) => e.preventDefault()}
                  onPointerDownOutside={(e) => e.preventDefault()}
                >
                  {composerBody}
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </div>

      {/* Mobile composer sheet — never clipped by a narrow column */}
      <Sheet open={!!quickAdd && isMobile} onOpenChange={(o) => { if (!o) setQuickAdd(null); }}>
        <SheetContent side="bottom" className="rounded-t-3xl px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
          <SheetHeader className="mb-2 text-left">
            <SheetTitle className="font-display text-base">New on the grid</SheetTitle>
          </SheetHeader>
          {composerBody}
        </SheetContent>
      </Sheet>
    </div>
  );
}