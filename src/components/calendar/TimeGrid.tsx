import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import { cn } from "@/lib/utils";
import { format, isSameDay } from "date-fns";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, AlertTriangle, GripHorizontal, Check, Clock, Plus, CheckSquare, Utensils, Sparkles, MapPin, FolderKanban, Pencil, X, Move, Repeat, Heart } from "lucide-react";
import { useTimeBlocks, colorClasses, hmToHours, hoursToHM, BLOCK_COLORS, type TimeBlock } from "@/lib/time-blocks";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStore } from "@/lib/store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LinkedNotesPanel } from "@/components/notes/LinkedNotesPanel";
import { AREAS } from "@/lib/types";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import { IconPicker } from "@/components/common/IconPicker";

const CLEANING_ZONES = ["Kitchen","Bathroom","Bedrooms","Living","Laundry","Entryway","Outdoor","Whole home"] as const;

function RowActions({ isEditing, onEdit, onSave, onCancel, onDelete }: {
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void | Promise<void>;
  onCancel: () => void;
  onDelete: () => void | Promise<void>;
}) {
  if (isEditing) {
    return (
      <div className="flex shrink-0 items-center gap-0.5">
        <button onClick={() => void onSave()} className="rounded p-1 text-primary hover:bg-primary/10" aria-label="Save"><Check className="h-3.5 w-3.5" /></button>
        <button onClick={onCancel} className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Cancel"><X className="h-3.5 w-3.5" /></button>
      </div>
    );
  }
  return (
    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
      <button onClick={onEdit} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></button>
      <button onClick={() => void onDelete()} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>
  );
}

const HOUR_START = 6;   // 6 AM
const HOUR_END = 23;    // 11 PM
const PX_PER_HOUR = 64;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const GRID_HEIGHT = TOTAL_HOURS * PX_PER_HOUR;
const SNAP_MIN = 15;
const SNAP_DEFAULT_MIN = 30; // default coarse snap; hold Shift for SNAP_MIN
const SNAP_PX = (PX_PER_HOUR / 60) * SNAP_MIN; // 14
const DRAG_THRESHOLD = 5;

function snap(h: number, step = SNAP_DEFAULT_MIN / 60): number {
  return Math.round(h / step) * step;
}
function snapStepFromEvent(e: { shiftKey?: boolean }): number {
  return (e.shiftKey ? SNAP_MIN : SNAP_DEFAULT_MIN) / 60;
}
function fmtTime(hm: string) {
  const [h, m] = hm.split(":").map(Number);
  return format(new Date(2000, 0, 1, h, m), "h:mm a");
}

function isBlockPointerControl(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest(
    "input,textarea,select,a,[data-block-action],[data-block-resize-handle],[data-block-move-handle]"
  );
}

type DragState = {
  blockId: string;
  mode: "move" | "resize" | "resize-top";
  pointerId: number;
  startClientY: number;
  startClientX: number;
  origStart: number;       // hours
  origEnd: number;
  origDate: string;
  curStart: number;
  curEnd: number;
  curDate: string;
  moved: boolean;
};

export type ApptLike = {
  label: string;
  time?: string | null;
  id?: string;
  kind?: "appt" | "gcal" | "task" | "bday" | "hol";
  done?: boolean;
};

interface Props {
  days: Date[];                                       // 1 day = day view, 7 = week view
  appointmentsOn: (iso: string) => ApptLike[];        // existing appointments per day (incl. gcal)
  /** Called when a task chip from the right rail is dropped on a slot. */
  onTaskDropAt?: (taskId: string, date: string, startHour: number) => void;
  /** Called when an appointment chip is dropped on a slot (move/reschedule). */
  onApptDropAt?: (apptId: string, date: string, startHour: number) => void;
  /** Called when an appointment chip is clicked (for editing). */
  onApptClick?: (apptId: string) => void;
}

const TASK_DRAG_MIME = "application/x-careflow-task";
const EVENT_DRAG_MIME = "application/x-careflow-event";
const APPT_DRAG_MIME = "application/x-careflow-appt";

export function TimeGrid({ days, appointmentsOn, onTaskDropAt, onApptDropAt, onApptClick }: Props) {
  const fromISO = days[0].toISOString().slice(0, 10);
  const toISO = days[days.length - 1].toISOString().slice(0, 10);
  const { blocks, add, update, remove } = useTimeBlocks(fromISO, toISO);
  const { toggleTask, updateTask, state } = useStore();
  // Pre-compute whether any visible day has untimed tasks, so the time axis
  // can reserve a matching spacer row and stay aligned with the hour grid.
  const anyDayHasTasks = days.some(d => {
    const iso = d.toISOString().slice(0, 10);
    return appointmentsOn(iso).some(a => a.kind === "task" && a.id);
  });
  const [inlineEditTaskId, setInlineEditTaskId] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState("");

  const commitInlineEdit = useCallback(async (taskId: string) => {
    const v = inlineEditValue.trim();
    setInlineEditTaskId(null);
    if (!v) return;
    const orig = state.tasks.find(x => x.id === taskId);
    if (!orig || orig.title === v) return;
    await updateTask(taskId, { title: v });
  }, [inlineEditValue, state.tasks, updateTask]);

  const [editing, setEditing] = useState<TimeBlock | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskBlockId, setEditingTaskBlockId] = useState<string | null>(null);
  const editingTask = editingTaskId ? state.tasks.find(t => t.id === editingTaskId) ?? null : null;
  const [draft, setDraft] = useState<{ date: string; start: string; end: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 15000); return () => clearInterval(id); }, []);

  const colRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dragPointer, setDragPointer] = useState<{ x: number; y: number } | null>(null);
  const [dropHover, setDropHover] = useState<{ iso: string; hour: number } | null>(null);
  const [hoverSlot, setHoverSlot] = useState<{ iso: string; hour: number } | null>(null);
  const [externalDrag, setExternalDrag] = useState<null | { kind: "task" | "event" | "appt"; title: string; durationH: number }>(null);
  const externalDragRef = useRef<null | { kind: "task" | "event" | "appt"; title: string; durationH: number }>(null);
  externalDragRef.current = externalDrag;
  const dragRef = useRef<DragState | null>(null);
  const suppressClickUntil = useRef(0);
  const lastHoverIdRef = useRef<string | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressStartRef = useRef<{ x: number; y: number } | null>(null);
  const [pressingId, setPressingId] = useState<string | null>(null);
  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressStartRef.current = null;
    setPressingId(null);
  }, []);
  dragRef.current = drag;

  const openBlockEditor = useCallback((block: TimeBlock) => {
    if (block.taskId) {
      setEditingTaskId(block.taskId);
      setEditingTaskBlockId(block.id);
    } else {
      setEditing(block);
    }
  }, []);

  const selectBlock = useCallback((block: TimeBlock) => {
    setSelectedId(prev => (prev === block.id ? null : block.id));
    haptics.snap();
  }, []);

  // Dismiss selection on outside click / escape
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedId(null); };
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest("[data-block-selection]") || t.closest("[data-block-id='" + selectedId + "']")) return;
      setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [selectedId]);

  const startSlot = (date: Date, ev: React.MouseEvent<HTMLDivElement>) => {
    if (Date.now() < suppressClickUntil.current) return;
    const el = ev.currentTarget;
    const rect = el.getBoundingClientRect();
    const y = ev.clientY - rect.top;
    const startH = HOUR_START + snap(y / PX_PER_HOUR, snapStepFromEvent(ev));
    const endH = Math.min(HOUR_END, startH + 1);
    setDraft({ date: date.toISOString().slice(0,10), start: hoursToHM(startH), end: hoursToHM(endH) });
  };

  const blocksFor = (iso: string) => blocks.filter(b => b.date === iso && !b.allDay);

  /** Return a Set of conflicting block IDs and appointment indices for a given day. */
  const computeConflicts = (iso: string, dayBlocks: TimeBlock[], dayAppts: ApptLike[]) => {
    type Iv = { key: string; s: number; e: number };
    const ivs: Iv[] = [];
    for (const b of dayBlocks) {
      // Use current drag positions if applicable
      const isDragging = drag?.blockId === b.id && drag.curDate === iso;
      const s = isDragging ? drag!.curStart : hmToHours(b.startTime);
      const e = isDragging ? drag!.curEnd : hmToHours(b.endTime);
      ivs.push({ key: `b:${b.id}`, s, e });
    }
    dayAppts.forEach((a, idx) => {
      const s = hmToHours(a.time!.slice(0, 5));
      ivs.push({ key: `a:${idx}`, s, e: s + 1 });
    });
    const conflicts = new Set<string>();
    for (let i = 0; i < ivs.length; i++) {
      for (let j = i + 1; j < ivs.length; j++) {
        if (ivs[i].s < ivs[j].e && ivs[j].s < ivs[i].e) {
          conflicts.add(ivs[i].key);
          conflicts.add(ivs[j].key);
        }
      }
    }
    return conflicts;
  };

  const findDateAt = useCallback((clientX: number): string | null => {
    for (const [iso, el] of Object.entries(colRefs.current)) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right) return iso;
    }
    return null;
  }, []);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    setDragPointer({ x: e.clientX, y: e.clientY });
    const dy = e.clientY - d.startClientY;
    const step = snapStepFromEvent(e);
    const dh = snap(dy / PX_PER_HOUR, step);
    const dur = d.origEnd - d.origStart;
    let nextStart = d.origStart;
    let nextEnd = d.origEnd;
    let nextDate = d.origDate;
    if (d.mode === "move") {
      nextStart = Math.min(HOUR_END - dur, Math.max(HOUR_START, d.origStart + dh));
      nextEnd = nextStart + dur;
      const overDate = findDateAt(e.clientX);
      if (overDate) nextDate = overDate;
    } else if (d.mode === "resize") {
      nextEnd = Math.min(HOUR_END, Math.max(d.origStart + step, d.origEnd + dh));
    } else {
      nextStart = Math.max(HOUR_START, Math.min(d.origEnd - step, d.origStart + dh));
    }
    const moved = d.moved || Math.abs(dy) >= DRAG_THRESHOLD || Math.abs(e.clientX - d.startClientX) >= DRAG_THRESHOLD;
    if (moved && !d.moved) haptics.pickup();
    if (moved && (nextStart !== d.curStart || nextEnd !== d.curEnd || nextDate !== d.curDate)) haptics.snap();
    setDrag({ ...d, curStart: nextStart, curEnd: nextEnd, curDate: nextDate, moved });
  }, [findDateAt]);

  const endDrag = useCallback(async (e: PointerEvent) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("pointercancel", endDrag);
    setDragPointer(null);
    const block = blocks.find(b => b.id === d.blockId);
    if (d.moved && block) {
      const patch: Partial<TimeBlock> = {
        startTime: hoursToHM(d.curStart),
        endTime: hoursToHM(d.curEnd),
        date: d.curDate,
      };
      suppressClickUntil.current = Date.now() + 250;
      await update(d.blockId, patch);
      haptics.drop();
      // Undo toast — reverts to the original time/date.
      const prevStart = hoursToHM(d.origStart);
      const prevEnd = hoursToHM(d.origEnd);
      const prevDate = d.origDate;
      const verb = d.mode === "move" ? "Moved" : "Resized";
      toast(`${verb} "${block.title}"`, {
        description: `${fmtTime(hoursToHM(d.curStart))} – ${fmtTime(hoursToHM(d.curEnd))}`,
        action: {
          label: "Undo",
          onClick: () => {
            void update(d.blockId, { startTime: prevStart, endTime: prevEnd, date: prevDate });
            haptics.tap();
          },
        },
        duration: 6000,
      });
    } else if (block) {
      // Treat as a tap — open the editor directly.
      openBlockEditor(block);
    }
    setDrag(null);
  }, [onPointerMove, blocks, update, openBlockEditor]);

  const beginDrag = (block: TimeBlock, mode: "move" | "resize" | "resize-top", e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try { (e.currentTarget as Element).setPointerCapture?.(e.pointerId); } catch (error) { void error; }
    setDragPointer({ x: e.clientX, y: e.clientY });
    const d: DragState = {
      blockId: block.id,
      mode,
      pointerId: e.pointerId,
      startClientY: e.clientY,
      startClientX: e.clientX,
      origStart: hmToHours(block.startTime),
      origEnd: hmToHours(block.endTime),
      origDate: block.date,
      curStart: hmToHours(block.startTime),
      curEnd: hmToHours(block.endTime),
      curDate: block.date,
      moved: mode !== "move", // resize handle = drag intent confirmed
    };
    setDrag(d);
    dragRef.current = d;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
  };

  const armBlockMove = (block: TimeBlock, e: React.PointerEvent<HTMLElement>) => {
    if (isBlockPointerControl(e.target)) return;
    if (typeof e.button === "number" && e.button !== 0) return;

    e.stopPropagation();

    // Touch/pen: require long-press (450ms) to start dragging — a tap opens the editor.
    // Mouse: start drag immediately; tap-vs-drag is decided by the movement threshold in endDrag().
    if (e.pointerType === "touch" || e.pointerType === "pen") {
      const target = e.currentTarget;
      const pointerId = e.pointerId;
      const startX = e.clientX;
      const startY = e.clientY;
      e.preventDefault();
      cancelLongPress();
      haptics.tap();
      setPressingId(block.id);
      longPressStartRef.current = { x: startX, y: startY };
      try { target.setPointerCapture?.(pointerId); } catch (error) { void error; }
      longPressTimerRef.current = window.setTimeout(() => {
        longPressTimerRef.current = null;
        longPressStartRef.current = null;
        setPressingId(null);
        haptics.longPress();
        beginDrag(block, "move", {
          pointerId,
          clientX: startX,
          clientY: startY,
          currentTarget: target,
          stopPropagation: () => {},
          preventDefault: () => {},
        } as unknown as React.PointerEvent);
      }, 220);
    } else {
      haptics.tap();
      beginDrag(block, "move", e);
    }
  };

  useEffect(() => () => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("pointercancel", endDrag);
  }, [onPointerMove, endDrag]);

  return (
    <>
      <div className="overflow-x-auto">
        <div className="relative flex" style={{ minWidth: days.length > 1 ? `${days.length * 140 + 56}px` : "100%" }}>
          {/* Time axis */}
          <div className="w-14 shrink-0 border-r border-border/50">
            <div className="h-8" />
            {anyDayHasTasks && <div className="h-7 border-b border-border/50" />}
            {Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i).map(h => (
              <div key={h} className="relative text-[10px] text-muted-foreground" style={{ height: PX_PER_HOUR }}>
                <span className="absolute -top-1.5 right-1.5">{format(new Date(2000,0,1,h), "h a")}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
            {days.map(d => {
              const iso = d.toISOString().slice(0,10);
              const dayBlocks = blocksFor(iso);
              const allItems = appointmentsOn(iso);
              const dayAppts = allItems.filter(a => a.time && /^\d{2}:\d{2}/.test(a.time));
              const dayTasks = allItems.filter(a => a.kind === "task" && a.id);
              const conflicts = computeConflicts(iso, dayBlocks, dayAppts);
              const isToday = isSameDay(d, new Date());
              const nowH = now.getHours() + now.getMinutes() / 60;
              const showNowLine = isToday && nowH >= HOUR_START && nowH <= HOUR_END;
              return (
                <div key={iso} className="border-r border-border/50 last:border-r-0">
                  <div className={cn("flex h-8 items-baseline justify-center gap-1 border-b border-border/50 text-xs", isToday && "bg-primary/5")}>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{format(d, "EEE")}</span>
                    <span className="font-semibold">{format(d, "d")}</span>
                  </div>
                  {dayTasks.length > 0 && (
                    <div className="flex h-7 items-center justify-center border-b border-border/50 bg-muted/20 px-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            className="flex h-6 w-full items-center justify-center gap-1 rounded-md bg-card/80 px-2 text-[10px] font-medium text-muted-foreground ring-1 ring-inset ring-border/40 hover:bg-card hover:text-foreground"
                            aria-label={`${dayTasks.length} unscheduled task${dayTasks.length === 1 ? "" : "s"} for the day`}
                          >
                            <CheckSquare className="h-3 w-3" />
                            <span>{dayTasks.length} task{dayTasks.length === 1 ? "" : "s"}</span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="center" className="w-64 p-1.5">
                          <div className="px-1.5 pb-1.5 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Scheduled today · no time
                          </div>
                          <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
                            {dayTasks.map((t) => (
                              <div key={t.id} className={cn(
                                "flex items-center gap-1.5 rounded-md bg-card/80 px-1.5 py-1 text-[11px] shadow-sm ring-1 ring-inset ring-border/40",
                                t.done && "opacity-60"
                              )}
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData(TASK_DRAG_MIME, t.id!);
                                  e.dataTransfer.setData("text/plain", t.label);
                                  e.dataTransfer.effectAllowed = "move";
                                  haptics.pickup();
                                  const taskRow = state.tasks.find(x => x.id === t.id);
                                  const mins = taskRow?.estMinutes ?? 60;
                                  const preview = { kind: "task" as const, title: t.label, durationH: Math.max(0.25, mins / 60) };
                                  externalDragRef.current = preview;
                                  setExternalDrag(preview);
                                }}
                                onDragEnd={() => { externalDragRef.current = null; setExternalDrag(null); setDropHover(null); }}
                                style={{ cursor: "grab" }}
                              >
                                <button
                                  onClick={(e) => { e.stopPropagation(); haptics.tap(); void toggleTask(t.id!); }}
                                  aria-label={t.done ? "Mark task not done" : "Mark task done"}
                                  className={cn(
                                    "group/cb grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 transition-colors",
                                    t.done
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-primary/50 bg-background text-primary hover:bg-primary hover:text-primary-foreground"
                                  )}
                                >
                                  <Check className={cn("h-2.5 w-2.5 transition-opacity", t.done ? "opacity-100" : "opacity-0 group-hover/cb:opacity-100")} />
                                </button>
                                {inlineEditTaskId === t.id ? (
                                  <input
                                    autoFocus
                                    value={inlineEditValue}
                                    onChange={(e) => setInlineEditValue(e.target.value)}
                                    onBlur={() => void commitInlineEdit(t.id!)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") { e.preventDefault(); (e.currentTarget as HTMLInputElement).blur(); }
                                      else if (e.key === "Escape") { e.preventDefault(); setInlineEditTaskId(null); }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onDragStart={(e) => e.preventDefault()}
                                    className="flex-1 min-w-0 bg-transparent text-[11px] outline-none ring-1 ring-primary/40 rounded px-1 -mx-0.5"
                                  />
                                ) : (
                                  <span
                                    className={cn("flex-1 truncate cursor-text", t.done && "line-through text-muted-foreground")}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setInlineEditValue(t.label);
                                      setInlineEditTaskId(t.id!);
                                    }}
                                    title="Click to rename"
                                  >
                                    {t.label}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                  {anyDayHasTasks && dayTasks.length === 0 && (
                    <div className="h-7 border-b border-border/50" aria-hidden />
                  )}
                  <div
                    ref={el => { colRefs.current[iso] = el; }}
                    className={cn(
                      "relative cursor-crosshair transition-colors",
                      externalDrag && dropHover?.iso !== iso && "bg-muted/20",
                      externalDrag && dropHover?.iso === iso && "bg-primary/[0.04]"
                    )}
                    style={{ height: GRID_HEIGHT }}
                    onClick={(e) => startSlot(d, e)}
                    onMouseMove={(e) => {
                      if (drag) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const y = e.clientY - rect.top;
                      const h = HOUR_START + snap(y / PX_PER_HOUR, snapStepFromEvent(e));
                      setHoverSlot({ iso, hour: h });
                    }}
                    onMouseLeave={() => setHoverSlot(p => p?.iso === iso ? null : p)}
                    onDragOver={(e) => {
                      const types = Array.from(e.dataTransfer.types);
                      const hasTask = types.includes(TASK_DRAG_MIME);
                      const hasEvent = types.includes(EVENT_DRAG_MIME);
                      const hasAppt = types.includes(APPT_DRAG_MIME);
                      if (!hasTask && !hasEvent && !hasAppt) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = hasTask ? "move" : "copy";
                      const rect = e.currentTarget.getBoundingClientRect();
                      const y = e.clientY - rect.top;
                      const startH = HOUR_START + snap(y / PX_PER_HOUR, snapStepFromEvent(e));
                      setDropHover({ iso, hour: startH });
                    }}
                    onDragLeave={() => setDropHover(p => p?.iso === iso ? null : p)}
                    onDrop={(e) => {
                      const taskId = e.dataTransfer.getData(TASK_DRAG_MIME);
                      const eventRaw = e.dataTransfer.getData(EVENT_DRAG_MIME);
                      const apptId = e.dataTransfer.getData(APPT_DRAG_MIME);
                      if (!taskId && !eventRaw && !apptId) return;
                      e.preventDefault();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const y = e.clientY - rect.top;
                      const startH = HOUR_START + snap(y / PX_PER_HOUR, snapStepFromEvent(e));
                      const previewDur = externalDragRef.current?.durationH ?? 1;
                      const endH = Math.min(HOUR_END, startH + previewDur);
                      if (apptId && onApptDropAt) {
                        onApptDropAt(apptId, iso, startH);
                        setDropHover(null);
                        setExternalDrag(null);
                        externalDragRef.current = null;
                        haptics.tap();
                        return;
                      }
                      let title = e.dataTransfer.getData("text/plain") || "Event";
                      let color: string = "primary";
                      if (eventRaw) {
                        try { const p = JSON.parse(eventRaw); title = p.title ?? title; color = p.color ?? color; } catch {}
                      }
                      if (taskId) color = "warm";
                      void add({
                        date: iso,
                        startTime: hoursToHM(startH),
                        endTime: hoursToHM(endH),
                        title,
                        color,
                        allDay: false,
                        taskId: taskId || null,
                      });
                      if (taskId && onTaskDropAt) onTaskDropAt(taskId, iso, startH);
                      setDropHover(null);
                      setExternalDrag(null);
                      externalDragRef.current = null;
                      haptics.tap();
                    }}
                  >
                    {/* Drop indicator */}
                    {dropHover?.iso === iso && (() => {
                      const previewDur = externalDrag?.durationH ?? 1;
                      const startH = dropHover.hour;
                      const endH = Math.min(HOUR_END, startH + previewDur);
                      const heightPx = (endH - startH) * PX_PER_HOUR;
                      // Conflict check vs blocks + appts on this day
                      const hasConflict =
                        dayBlocks.some(b => {
                          const s = hmToHours(b.startTime); const e = hmToHours(b.endTime);
                          return s < endH && startH < e;
                        }) ||
                        dayAppts.some(a => {
                          const s = hmToHours(a.time!.slice(0,5)); const e = s + 1;
                          return s < endH && startH < e;
                        });
                      const previewTitle = externalDrag?.title || "Drop here";
                      return (
                        <div
                          className={cn(
                            "pointer-events-none absolute inset-x-1 z-30 rounded-md border-2 border-dashed shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.35)] transition-[top,height] duration-100 overflow-hidden",
                            hasConflict
                              ? "border-destructive/80 bg-destructive/15"
                              : "border-primary bg-primary/20"
                          )}
                          style={{ top: (startH - HOUR_START) * PX_PER_HOUR, height: heightPx }}
                        >
                          <div className={cn("px-2 py-1 text-[11px] font-semibold leading-tight truncate", hasConflict ? "text-destructive" : "text-primary")}>
                            {previewTitle}
                          </div>
                          <div className={cn("px-2 text-[10px] leading-tight", hasConflict ? "text-destructive/80" : "text-primary/80")}>
                            {fmtTime(hoursToHM(startH))} – {fmtTime(hoursToHM(endH))}
                            {hasConflict && <span className="ml-1 font-semibold">· conflicts</span>}
                          </div>
                        </div>
                      );
                    })()}
                    {/* Hover slot highlight */}
                    {!drag && !dropHover && hoverSlot?.iso === iso && (
                      <div
                        className="pointer-events-none absolute inset-x-1 z-0 rounded-md bg-primary/5 ring-1 ring-inset ring-primary/15 transition-[top] duration-100"
                        style={{ top: (hoverSlot.hour - HOUR_START) * PX_PER_HOUR, height: (SNAP_DEFAULT_MIN / 60) * PX_PER_HOUR }}
                      />
                    )}
                    {/* Snap-to-grid indicator while dragging an existing block */}
                    {drag && drag.moved && drag.curDate === iso && (() => {
                      const topPx = (drag.curStart - HOUR_START) * PX_PER_HOUR;
                      const heightPx = Math.max(24, (drag.curEnd - drag.curStart) * PX_PER_HOUR);
                      return (
                        <>
                          <div
                            className="pointer-events-none absolute inset-x-0 z-[26] border-t-2 border-primary/80"
                            style={{ top: topPx }}
                          >
                            <span className="absolute -top-2 left-1 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground shadow">
                              {fmtTime(hoursToHM(drag.curStart))}
                            </span>
                          </div>
                          <div
                            className="pointer-events-none absolute inset-x-0 z-[26] border-t-2 border-primary/60"
                            style={{ top: topPx + heightPx }}
                          >
                            <span className="absolute -top-2 right-1 rounded-full bg-primary/80 px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground shadow">
                              {fmtTime(hoursToHM(drag.curEnd))}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                    {/* Hour grid lines */}
                    {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                      <div key={i}
                        className="pointer-events-none absolute inset-x-0 border-t border-border/30"
                        style={{ top: i * PX_PER_HOUR, height: PX_PER_HOUR }}
                      >
                        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-border/20" />
                      </div>
                    ))}

                    {/* Appointments (read-only at left edge) */}
                    {dayAppts.map((a, idx) => {
                      const h = hmToHours(a.time!.slice(0,5));
                      if (h < HOUR_START || h > HOUR_END) return null;
                      const top = (h - HOUR_START) * PX_PER_HOUR;
                      const isAppt = a.kind === "appt" && !!a.id;
                      const isConflict = conflicts.has(`a:${idx}`);
                      return (
                        <div key={`a-${idx}`}
                          draggable={isAppt}
                          onDragStart={isAppt ? (e) => {
                            e.stopPropagation();
                            e.dataTransfer.setData(APPT_DRAG_MIME, a.id!);
                            e.dataTransfer.setData("text/plain", a.label);
                            e.dataTransfer.effectAllowed = "move";
                            haptics.pickup();
                          } : undefined}
                          onClick={isAppt && onApptClick ? (e) => { e.stopPropagation(); onApptClick(a.id!); } : undefined}
                          className={cn(
                            "absolute left-0.5 right-0.5 z-10 truncate rounded-md bg-secondary-soft px-2 py-0.5 text-[11px] text-secondary-foreground shadow-sm transition-all",
                            isAppt
                              ? "cursor-grab hover:-translate-y-0.5 hover:shadow-md hover:ring-1 hover:ring-primary/40 active:cursor-grabbing"
                              : "pointer-events-none",
                            isConflict && "ring-2 ring-destructive/70 bg-destructive/10 text-destructive-foreground animate-pulse"
                          )}
                          style={{ top, height: PX_PER_HOUR - 6 }}
                          title={isConflict ? `Conflict: ${a.label}` : a.label}>
                          {isConflict && <AlertTriangle className="mr-1 inline h-3 w-3 text-destructive" />}
                          <span className="font-medium">{a.time?.slice(0,5)}</span> <span className="truncate">{a.label}</span>
                        </div>
                      );
                    })}

                    {/* Time blocks */}
                    {dayBlocks.map(b => {
                      const isDragging = drag?.blockId === b.id;
                      const startH = isDragging && drag!.curDate === iso ? drag!.curStart : hmToHours(b.startTime);
                      const endH = isDragging && drag!.curDate === iso ? drag!.curEnd : hmToHours(b.endTime);
                      // Hide original column position if dragged to another day
                      if (isDragging && drag!.curDate !== iso) return null;
                      const top = (startH - HOUR_START) * PX_PER_HOUR;
                      const height = Math.max(24, (endH - startH) * PX_PER_HOUR - 2);
                      const c = colorClasses(b.color);
                      const isConflict = conflicts.has(`b:${b.id}`);
                      const linkedTask = b.taskId ? state.tasks.find(t => t.id === b.taskId) : undefined;
                      const taskDone = !!linkedTask?.done;
                      const isSelected = selectedId === b.id && !isDragging;
                      // Position popover above the block, or below if there isn't room.
                      const popoverAbove = top > 76;
                      return (
                        <Fragment key={b.id}>
                        <div
                          data-block-id={b.id}
                          title={b.title}
                          onPointerDown={(e) => armBlockMove(b, e)}
                          onPointerMove={(e) => {
                            // Only cancel the pending long-press if the finger actually
                            // travels beyond a small slop radius — micro-jitter from
                            // touch pressure changes shouldn't kill the gesture.
                            if (longPressTimerRef.current != null && longPressStartRef.current) {
                              const dx = e.clientX - longPressStartRef.current.x;
                              const dy = e.clientY - longPressStartRef.current.y;
                              if (Math.hypot(dx, dy) > 12) cancelLongPress();
                            }
                          }}
                          onPointerUp={(e) => {
                            // Short tap on touch: open editor.
                            if (longPressTimerRef.current != null) {
                              cancelLongPress();
                              if (Date.now() >= suppressClickUntil.current) {
                                openBlockEditor(b);
                              }
                            }
                          }}
                          onPointerCancel={() => {
                            cancelLongPress();
                          }}
                          onPointerEnter={() => {
                            if (lastHoverIdRef.current !== b.id) {
                              lastHoverIdRef.current = b.id;
                              haptics.magnet();
                            }
                          }}
                          onPointerLeave={() => {
                            if (lastHoverIdRef.current === b.id) lastHoverIdRef.current = null;
                          }}
                          className={cn(
                            // Wider hit area + edge padding on mobile so long-press/drag
                            // doesn't fight column borders or adjacent blocks; tighter on desktop.
                            "group absolute left-1.5 right-1.5 md:left-0.5 md:right-0.5 z-20 select-none overflow-hidden rounded-md px-2.5 py-1.5 md:px-2 md:py-1 text-left text-[11px] shadow-sm ring-1 ring-inset",
                            c.bg, c.text, c.ring, "ring-opacity-30",
                            isDragging
                              ? "z-30 scale-[1.02] shadow-xl ring-opacity-100 transition-none"
                              : "transition-all duration-150 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-lg hover:ring-2 hover:ring-primary/40 hover:ring-opacity-100 hover:brightness-105",
                            isConflict && !isDragging && "ring-2 ring-destructive/80 ring-opacity-100 shadow-[0_0_0_3px_hsl(var(--destructive)/0.18)]",
                            isSelected && "z-30 scale-[1.03] ring-2 ring-primary/80 ring-opacity-100 shadow-[0_0_0_4px_hsl(var(--primary)/0.25),0_18px_40px_-12px_hsl(var(--primary)/0.5)] animate-scale-in",
                            pressingId === b.id && !isDragging && "z-30 scale-[1.04] ring-2 ring-primary ring-opacity-100 shadow-[0_0_0_4px_hsl(var(--primary)/0.25),0_14px_30px_-10px_hsl(var(--primary)/0.55)] animate-pulse",
                            taskDone && "opacity-60"
                          )}
                          style={{ top, minHeight: Math.max(44, height), cursor: isDragging ? "grabbing" : "grab", touchAction: "none", ...(c.style ?? {}) }}
                          role="button"
                          tabIndex={0}
                        >
                          <button
                            type="button"
                            aria-label={`Edit ${b.title}`}
                            onPointerDown={(e) => armBlockMove(b, e)}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (Date.now() < suppressClickUntil.current) return;
                              haptics.tap();
                              openBlockEditor(b);
                            }}
                            className="absolute inset-0 z-0 cursor-grab bg-transparent text-left active:cursor-grabbing"
                            style={{ touchAction: "none" }}
                          />
                          {/* Move/grip handle */}
                          <div
                            data-block-move-handle
                            onPointerDown={(e) => { haptics.tap(); beginDrag(b, "move", e); }}
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Drag to move"
                            className={cn(
                              // Bigger thumb-friendly grip on mobile (44x32) with shrink on desktop.
                              "absolute right-0.5 top-1/2 z-10 -translate-y-1/2 flex h-11 w-8 items-center justify-center rounded-md",
                              "bg-background/40 text-current backdrop-blur-sm ring-1 ring-inset ring-current/20",
                              "opacity-80 group-hover:opacity-100 active:bg-background/70",
                              isDragging && "bg-background/70 opacity-100",
                              "md:h-7 md:w-5"
                            )}
                            style={{ touchAction: "none", cursor: isDragging ? "grabbing" : "grab" }}
                          >
                            <GripHorizontal className="h-4 w-4" />
                          </div>
                          <div className="pointer-events-none relative z-[1] flex items-start gap-1 pr-8 font-medium leading-tight">
                            {isConflict && <AlertTriangle className="h-3 w-3 shrink-0 text-destructive" />}
                            {linkedTask && (
                              <button
                                data-block-action
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => { e.stopPropagation(); haptics.tap(); void toggleTask(linkedTask.id); }}
                                aria-label={taskDone ? "Mark task not done" : "Mark task done"}
                                className={cn(
                                  "group/cb pointer-events-auto grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 transition-colors",
                                  taskDone
                                    ? "border-current bg-current text-background"
                                    : "border-current/60 bg-background/40 hover:bg-current hover:text-background"
                                )}
                              >
                                <Check className={cn("h-2.5 w-2.5 transition-opacity", taskDone ? "opacity-100" : "opacity-0 group-hover/cb:opacity-100")} />
                              </button>
                            )}
                            <span className={cn("min-w-0 whitespace-normal break-words", taskDone && "line-through")}>
                              {b.icon && <span className="mr-1" aria-hidden>{b.icon}</span>}
                              {b.title}
                            </span>
                          </div>
                          <div className="pointer-events-none relative z-[1] pr-8 text-[10px] opacity-70">
                            {fmtTime(hoursToHM(startH))} – {fmtTime(hoursToHM(endH))}
                            {isConflict && <span className="ml-1 font-semibold text-destructive">· conflict</span>}
                          </div>
                          {/* Bottom resize handle */}
                          <div
                            onPointerDown={(e) => { haptics.tap(); beginDrag(b, "resize", e); }}
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Resize end"
                            className={cn(
                              "absolute inset-x-0 bottom-0 z-10 flex h-5 items-end justify-center cursor-ns-resize rounded-b-md pb-1",
                              "after:block after:h-1 after:w-10 after:rounded-full after:bg-current after:opacity-50",
                              "opacity-80 group-hover:opacity-100 md:h-3"
                            )}
                            style={{ touchAction: "none" }}
                          />
                        </div>
                        {isSelected && (
                          <div
                            data-block-selection
                            className={cn(
                              "absolute left-0.5 right-0.5 z-40 animate-fade-in",
                            )}
                            style={popoverAbove
                              ? { top: Math.max(0, top - 64) }
                              : { top: top + height + 6 }}
                          >
                            <div className="mx-auto flex w-max max-w-full items-center gap-1 rounded-full border border-border/60 bg-popover/95 px-1.5 py-1 shadow-xl backdrop-blur-md ring-1 ring-primary/20">
                              <button
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  haptics.tap();
                                  setSelectedId(null);
                                  if (linkedTask) {
                                    setEditingTaskId(linkedTask.id);
                                    setEditingTaskBlockId(b.id);
                                  } else {
                                    setEditing(b);
                                  }
                                }}
                                className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground shadow-sm transition-transform hover:scale-105 active:scale-95"
                              >
                                <Pencil className="h-3 w-3" />
                                Edit {linkedTask ? "task" : "block"}
                              </button>
                              {linkedTask && (
                                <button
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    haptics.tap();
                                    setSelectedId(null);
                                    setEditing(b);
                                  }}
                                  className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-foreground transition-transform hover:scale-105 active:scale-95"
                                >
                                  <Pencil className="h-3 w-3" />
                                  Block
                                </button>
                              )}
                              <span className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] text-muted-foreground">
                                <Move className="h-3 w-3" />
                                Drag to move
                              </span>
                              <button
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => { e.stopPropagation(); haptics.tap(); setSelectedId(null); }}
                                aria-label="Close"
                                className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        )}
                        </Fragment>
                      );
                    })}

                    {/* Now line */}
                    {showNowLine && (
                      <div
                        className="pointer-events-none absolute inset-x-0 z-40 border-t-2 border-primary transition-[top] duration-500"
                        style={{ top: (nowH - HOUR_START) * PX_PER_HOUR }}
                      >
                        <span className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]">
                          <span className="absolute inset-0 animate-ping rounded-full bg-primary/60" />
                        </span>
                        <span className="absolute -top-2 left-2 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary-foreground shadow">
                          {format(now, "h:mm a")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Floating drag time chip */}
          {drag && drag.moved && dragPointer && (() => {
            const block = blocks.find(b => b.id === drag.blockId);
            return (
              <div
                className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-full rounded-lg bg-foreground/95 px-3 py-1.5 text-xs font-medium text-background shadow-2xl ring-1 ring-primary/40 backdrop-blur animate-fade-in"
                style={{ left: dragPointer.x, top: dragPointer.y - 12 }}
              >
                <div className="flex items-center gap-1.5">
                  <Move className="h-3 w-3 opacity-70" />
                  <span className="truncate max-w-[180px]">{block?.title ?? "Time block"}</span>
                </div>
                <div className="mt-0.5 text-[10px] tabular-nums opacity-80">
                  {fmtTime(hoursToHM(drag.curStart))} – {fmtTime(hoursToHM(drag.curEnd))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="flex max-h-[90vh] w-[min(94vw,36rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-h-[85vh]">
          <DialogHeader className="shrink-0 border-b border-border/60 bg-background/95 px-5 py-3 backdrop-blur">
            <DialogTitle>New time block</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
            {draft && <CreateForm draft={draft} onCancel={() => setDraft(null)} onCreate={async (b) => { await add(b); setDraft(null); }} />}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="flex max-h-[90vh] w-[min(94vw,36rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-h-[85vh]">
          <DialogHeader className="shrink-0 border-b border-border/60 bg-background/95 px-5 py-3 backdrop-blur">
            <DialogTitle>Edit time block</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
            {editing && (
              <EditForm
                block={editing}
                onSave={async (patch) => { await update(editing.id, patch); setEditing(null); }}
                onDelete={async () => { await remove(editing.id); setEditing(null); }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Linked task editor */}
      <TaskEditor
        task={editingTask}
        open={!!editingTask}
        onOpenChange={(o) => { if (!o) { setEditingTaskId(null); setEditingTaskBlockId(null); } }}
        onUnschedule={editingTaskBlockId ? async () => {
          const blockId = editingTaskBlockId;
          if (!blockId) return;
          await remove(blockId);
          setEditingTaskBlockId(null);
        } : undefined}
        unscheduleLabel="Unschedule"
      />
    </>
  );
}

function formatDuration(start: string, end: string): string {
  const s = hmToHours(start);
  const e = hmToHours(end);
  let mins = Math.round((e - s) * 60);
  if (!isFinite(mins) || mins <= 0) return "0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function CreateForm({ draft, onCreate, onCancel }: {
  draft: { date: string; start: string; end: string };
  onCreate: (b: Omit<TimeBlock, "id">) => void;
  onCancel: () => void;
}) {
  const { state, updateTask, addTask, addProject, addMeal, deleteTask, updateProject, deleteProject, updateMeal, deleteMeal } = useStore();
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(draft.start);
  const [end, setEnd] = useState(draft.end);
  const [color, setColor] = useState<string>("primary");
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState<"new" | "task" | "project" | "habit" | "meal" | "zone" | "area" | "care">("new");
  const [pickQ, setPickQ] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [careRecipientId, setCareRecipientId] = useState<string>("");
  const [mealSlot, setMealSlot] = useState<"Breakfast" | "Lunch" | "Dinner" | "Snack">("Dinner");
  const recipients = state.recipients ?? [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const startEdit = (id: string, value: string) => { setEditingId(id); setEditingValue(value); };
  const cancelEdit = () => { setEditingId(null); setEditingValue(""); };

  const openTasks = state.tasks.filter(t => !t.done && !t.parentTaskId);
  const filteredTasks = openTasks.filter(t =>
    !pickQ.trim() || t.title.toLowerCase().includes(pickQ.toLowerCase())
  ).slice(0, 60);

  const meals = state.meals ?? [];
  const filteredMeals = meals.filter(m =>
    !pickQ.trim() || m.name.toLowerCase().includes(pickQ.toLowerCase())
  ).slice(0, 60);

  const projects = (state.projects ?? []).filter(p => !p.archivedAt);
  const filteredProjects = projects.filter(p =>
    !pickQ.trim() || p.name.toLowerCase().includes(pickQ.toLowerCase())
  ).slice(0, 60);

  const habits = state.habits ?? [];
  const filteredHabits = habits.filter(h =>
    !pickQ.trim() || h.title.toLowerCase().includes(pickQ.toLowerCase())
  ).slice(0, 60);

  const areaColors = Array.from(
    new Set(((state.areas ?? []) as { color?: string }[])
      .map(a => a.color)
      .filter((c): c is string => !!c && c.startsWith("#")))
  );

  const attach = async (label: string, taskId?: string) => {
    onCreate({ date: draft.date, startTime: start, endTime: end, title: label, notes, color, allDay: false });
    if (taskId) {
      try { await updateTask(taskId, { dueDate: draft.date, inbox: false }); } catch {}
    }
  };

  return (
    <div className="space-y-3">
      <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
        <TabsList className="flex w-full gap-1 overflow-x-auto p-1 h-auto justify-start [&::-webkit-scrollbar]:hidden">
          <TabsTrigger value="new" className="shrink-0 px-2 py-1.5 text-[11px] gap-1 flex-col data-[state=active]:shadow-sm"><Plus className="h-3.5 w-3.5" /><span>New</span></TabsTrigger>
          <TabsTrigger value="task" className="shrink-0 px-2 py-1.5 text-[11px] gap-1 flex-col"><CheckSquare className="h-3.5 w-3.5" /><span>Task</span></TabsTrigger>
          <TabsTrigger value="project" className="shrink-0 px-2 py-1.5 text-[11px] gap-1 flex-col"><FolderKanban className="h-3.5 w-3.5" /><span>Project</span></TabsTrigger>
          <TabsTrigger value="habit" className="shrink-0 px-2 py-1.5 text-[11px] gap-1 flex-col"><Repeat className="h-3.5 w-3.5" /><span>Habit</span></TabsTrigger>
          <TabsTrigger value="meal" className="shrink-0 px-2 py-1.5 text-[11px] gap-1 flex-col"><Utensils className="h-3.5 w-3.5" /><span>Meal</span></TabsTrigger>
          <TabsTrigger value="zone" className="shrink-0 px-2 py-1.5 text-[11px] gap-1 flex-col"><Sparkles className="h-3.5 w-3.5" /><span>Zone</span></TabsTrigger>
          <TabsTrigger value="area" className="shrink-0 px-2 py-1.5 text-[11px] gap-1 flex-col"><MapPin className="h-3.5 w-3.5" /><span>Area</span></TabsTrigger>
          <TabsTrigger value="care" className="shrink-0 px-2 py-1.5 text-[11px] gap-1 flex-col"><Heart className="h-3.5 w-3.5" /><span>Care</span></TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mx-auto w-full max-w-xs space-y-1">
        <div className="grid grid-cols-2 gap-6">
          <div className="min-w-0 space-y-1">
            <Label className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              <Clock className="h-3 w-3" /> Start
            </Label>
            <Input type="time" value={start} onChange={e => setStart(e.target.value)} className="h-8 w-full px-2 text-center text-xs tabular-nums" />
          </div>
          <div className="min-w-0 space-y-1">
            <Label className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              <Clock className="h-3 w-3" /> End
            </Label>
            <Input type="time" value={end} onChange={e => setEnd(e.target.value)} className="h-8 w-full px-2 text-center text-xs tabular-nums" />
          </div>
        </div>
        <p className="text-center text-[11px] tabular-nums text-muted-foreground">
          Duration: {formatDuration(start, end)}
        </p>
      </div>

      {mode === "new" && (
      <>
      <div>
        <Label className="text-xs">Title</Label>
        <Input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Focus block, errands, rest…" />
      </div>
      <div>
        <Label className="text-xs">Color</Label>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {BLOCK_COLORS.map(c => {
            const cc = colorClasses(c);
            return (
              <button key={c} type="button" onClick={() => setColor(c)}
                className={cn("h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all", cc.bg,
                  color === c ? "ring-foreground/60" : "ring-transparent")}
                aria-label={c}/>
            );
          })}
          {areaColors.length > 0 && (
            <span className="mx-1 h-5 w-px bg-border" aria-hidden />
          )}
          {areaColors.map(hex => (
            <button key={hex} type="button" onClick={() => setColor(hex)}
              className={cn("h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all",
                color === hex ? "ring-foreground/60" : "ring-transparent")}
              style={{ backgroundColor: hex }}
              aria-label={`Area color ${hex}`}/>
          ))}
        </div>
        {areaColors.length > 0 && (
          <p className="mt-1 text-[10px] text-muted-foreground">Includes saved colors from your areas.</p>
        )}
      </div>
      <div><Label className="text-xs">Notes</Label><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
      <DialogFooter className="sticky bottom-0 z-10 -mx-5 -mb-4 mt-3 border-t border-border/60 bg-background/95 px-5 py-3 backdrop-blur">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => { if (title.trim()) onCreate({ date: draft.date, startTime: start, endTime: end, title: title.trim(), notes, color, allDay: false }); }}>
          Add block
        </Button>
      </DialogFooter>
      </>
      )}

      {mode === "task" && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Create new task…"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && newTitle.trim()) {
                  e.preventDefault();
                  const t = newTitle.trim();
                  setNewTitle("");
                  await addTask({ title: t, dueDate: draft.date, inbox: false });
                  attach(t);
                }
              }}
              className="h-8 text-xs"
            />
            <Button
              size="sm"
              className="h-8 shrink-0"
              disabled={!newTitle.trim()}
              onClick={async () => {
                const t = newTitle.trim();
                setNewTitle("");
                await addTask({ title: t, dueDate: draft.date, inbox: false });
                attach(t);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Input autoFocus placeholder="Search open tasks…" value={pickQ} onChange={e => setPickQ(e.target.value)} />
          <ScrollArea className="h-[min(50vh,18rem)] rounded-md border">
            {filteredTasks.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">No matching tasks.</div>
            ) : (
              <ul className="divide-y">
                {filteredTasks.map(t => {
                  const project = t.projectId ? state.projects?.find(p => p.id === t.projectId) : undefined;
                  const isEditing = editingId === t.id;
                  return (
                    <li key={t.id} className="group flex items-center gap-1 px-2 py-1.5 text-xs hover:bg-muted/50">
                      <CheckSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      {isEditing ? (
                        <Input
                          autoFocus
                          value={editingValue}
                          onChange={e => setEditingValue(e.target.value)}
                          onKeyDown={async e => {
                            if (e.key === "Enter") { await updateTask(t.id, { title: editingValue.trim() || t.title }); cancelEdit(); }
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="h-7 flex-1 text-xs"
                        />
                      ) : (
                        <button className="min-w-0 flex-1 text-left" onClick={() => attach(t.title, t.id)}>
                          <span className="block truncate font-medium">{t.title}</span>
                          {(project || t.area) && (
                            <span className="block truncate text-[10px] text-muted-foreground">
                              {project?.name}{project && t.area ? " · " : ""}{t.area}
                            </span>
                          )}
                        </button>
                      )}
                      <RowActions
                        isEditing={isEditing}
                        onEdit={() => startEdit(t.id, t.title)}
                        onSave={async () => { await updateTask(t.id, { title: editingValue.trim() || t.title }); cancelEdit(); }}
                        onCancel={cancelEdit}
                        onDelete={async () => { await deleteTask(t.id); }}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
          <DialogFooter className="sticky bottom-0 z-10 -mx-5 -mb-4 mt-3 border-t border-border/60 bg-background/95 px-5 py-3 backdrop-blur"><Button variant="ghost" onClick={onCancel}>Cancel</Button></DialogFooter>
        </div>
      )}

      {mode === "project" && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Create new project…"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && newTitle.trim()) {
                  e.preventDefault();
                  const n = newTitle.trim();
                  setNewTitle("");
                  await addProject({ name: n });
                  attach(n);
                }
              }}
              className="h-8 text-xs"
            />
            <Button
              size="sm"
              className="h-8 shrink-0"
              disabled={!newTitle.trim()}
              onClick={async () => {
                const n = newTitle.trim();
                setNewTitle("");
                await addProject({ name: n });
                attach(n);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Input autoFocus placeholder="Search projects…" value={pickQ} onChange={e => setPickQ(e.target.value)} />
          <ScrollArea className="h-[min(50vh,18rem)] rounded-md border">
            {filteredProjects.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">No projects.</div>
            ) : (
              <ul className="divide-y">
                {filteredProjects.map(p => {
                  const isEditing = editingId === p.id;
                  return (
                    <li key={p.id} className="group flex items-center gap-1 px-2 py-1.5 text-xs hover:bg-muted/50">
                      <FolderKanban className="h-3.5 w-3.5 shrink-0" style={p.color ? { color: p.color } : undefined} />
                      {isEditing ? (
                        <Input
                          autoFocus
                          value={editingValue}
                          onChange={e => setEditingValue(e.target.value)}
                          onKeyDown={async e => {
                            if (e.key === "Enter") { await updateProject(p.id, { name: editingValue.trim() || p.name }); cancelEdit(); }
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="h-7 flex-1 text-xs"
                        />
                      ) : (
                        <button className="min-w-0 flex-1 text-left" onClick={() => attach(p.name)}>
                          <span className="block truncate font-medium">{p.name}</span>
                          {p.areaName && <span className="block truncate text-[10px] text-muted-foreground">{p.areaName}</span>}
                        </button>
                      )}
                      <RowActions
                        isEditing={isEditing}
                        onEdit={() => startEdit(p.id, p.name)}
                        onSave={async () => { await updateProject(p.id, { name: editingValue.trim() || p.name }); cancelEdit(); }}
                        onCancel={cancelEdit}
                        onDelete={async () => { await deleteProject(p.id); }}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
          <DialogFooter className="sticky bottom-0 z-10 -mx-5 -mb-4 mt-3 border-t border-border/60 bg-background/95 px-5 py-3 backdrop-blur"><Button variant="ghost" onClick={onCancel}>Cancel</Button></DialogFooter>
        </div>
      )}

      {mode === "habit" && (
        <div className="space-y-2">
          <Input autoFocus placeholder="Search habits…" value={pickQ} onChange={e => setPickQ(e.target.value)} />
          <ScrollArea className="h-[min(50vh,18rem)] rounded-md border">
            {filteredHabits.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">No habits yet.</div>
            ) : (
              <ul className="divide-y">
                {filteredHabits.map(h => (
                  <li key={h.id}>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted/50"
                      onClick={() => attach(`🔁 ${h.title}`)}
                    >
                      <Repeat className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{h.title}</span>
                        <span className="block truncate text-[10px] text-muted-foreground capitalize">
                          {h.cadence} · {h.category} · {h.streak}🔥
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
          <DialogFooter className="sticky bottom-0 z-10 -mx-5 -mb-4 mt-3 border-t border-border/60 bg-background/95 px-5 py-3 backdrop-blur"><Button variant="ghost" onClick={onCancel}>Cancel</Button></DialogFooter>
        </div>
      )}

      {mode === "meal" && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Create new meal…"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && newTitle.trim()) {
                  e.preventDefault();
                  const n = newTitle.trim();
                  setNewTitle("");
                  await addMeal({ name: n, date: draft.date, slot: mealSlot });
                  attach(`🍽 ${n}`);
                }
              }}
              className="h-8 text-xs"
            />
            <Select value={mealSlot} onValueChange={(v) => setMealSlot(v as any)}>
              <SelectTrigger className="h-8 w-28 shrink-0 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="z-[60]" position="popper" sideOffset={6} collisionPadding={12}>
                <SelectItem value="Breakfast">Breakfast</SelectItem>
                <SelectItem value="Lunch">Lunch</SelectItem>
                <SelectItem value="Dinner">Dinner</SelectItem>
                <SelectItem value="Snack">Snack</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-8 shrink-0"
              disabled={!newTitle.trim()}
              onClick={async () => {
                const n = newTitle.trim();
                setNewTitle("");
                await addMeal({ name: n, date: draft.date, slot: mealSlot });
                attach(`🍽 ${n}`);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Input autoFocus placeholder="Search meals…" value={pickQ} onChange={e => setPickQ(e.target.value)} />
          <ScrollArea className="h-[min(50vh,18rem)] rounded-md border">
            {filteredMeals.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">No meals planned.</div>
            ) : (
              <ul className="divide-y">
                {filteredMeals.map(m => {
                  const isEditing = editingId === m.id;
                  return (
                    <li key={m.id} className="group flex items-center gap-1 px-2 py-1.5 text-xs hover:bg-muted/50">
                      <Utensils className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      {isEditing ? (
                        <Input
                          autoFocus
                          value={editingValue}
                          onChange={e => setEditingValue(e.target.value)}
                          onKeyDown={async e => {
                            if (e.key === "Enter") { await updateMeal(m.id, { name: editingValue.trim() || m.name }); cancelEdit(); }
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="h-7 flex-1 text-xs"
                        />
                      ) : (
                        <button className="min-w-0 flex-1 text-left" onClick={() => attach(`🍽 ${m.name}`)}>
                          <span className="block truncate font-medium">{m.name}</span>
                          <span className="block truncate text-[10px] text-muted-foreground capitalize">
                            {m.slot} · {m.date}
                          </span>
                        </button>
                      )}
                      <RowActions
                        isEditing={isEditing}
                        onEdit={() => startEdit(m.id, m.name)}
                        onSave={async () => { await updateMeal(m.id, { name: editingValue.trim() || m.name }); cancelEdit(); }}
                        onCancel={cancelEdit}
                        onDelete={async () => { await deleteMeal(m.id); }}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
          <DialogFooter className="sticky bottom-0 z-10 -mx-5 -mb-4 mt-3 border-t border-border/60 bg-background/95 px-5 py-3 backdrop-blur"><Button variant="ghost" onClick={onCancel}>Cancel</Button></DialogFooter>
        </div>
      )}

      {mode === "zone" && (
        <div className="space-y-2">
          <Label className="text-xs">Pick a home zone</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {CLEANING_ZONES.map(z => (
              <button
                key={z}
                onClick={() => attach(`🧽 ${z} reset`)}
                className="flex items-center gap-2 rounded-md border border-border/60 bg-card/60 px-3 py-2 text-left text-xs font-medium hover:border-primary/40 hover:bg-primary/10"
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{z}</span>
              </button>
            ))}
          </div>
          <DialogFooter className="sticky bottom-0 z-10 -mx-5 -mb-4 mt-3 border-t border-border/60 bg-background/95 px-5 py-3 backdrop-blur"><Button variant="ghost" onClick={onCancel}>Cancel</Button></DialogFooter>
        </div>
      )}

      {mode === "area" && (
        <div className="space-y-2">
          <Label className="text-xs">Pick an area</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {AREAS.map(a => {
              const rec = (state.areas ?? []).find(x => x.name === a);
              return (
                <button
                  key={a}
                  onClick={() => attach(`📁 ${a}`)}
                  className="flex items-center gap-2 rounded-md border border-border/60 bg-card/60 px-3 py-2 text-left text-xs font-medium hover:border-primary/40 hover:bg-primary/10"
                  style={rec?.color ? { borderColor: rec.color + "55" } : undefined}
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0" style={rec?.color ? { color: rec.color } : undefined} />
                  <span className="truncate">{a}</span>
                </button>
              );
            })}
          </div>
          <DialogFooter className="sticky bottom-0 z-10 -mx-5 -mb-4 mt-3 border-t border-border/60 bg-background/95 px-5 py-3 backdrop-blur"><Button variant="ghost" onClick={onCancel}>Cancel</Button></DialogFooter>
        </div>
      )}

      {mode === "care" && (
        <div className="space-y-3">
          <Label className="text-xs">Care for</Label>
          {recipients.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
              No care recipients yet. Add them from the Caregiving page.
            </div>
          ) : (
            <Select value={careRecipientId} onValueChange={setCareRecipientId}>
              <SelectTrigger className="h-9 w-full text-xs">
                <SelectValue placeholder="Pick a person…" />
              </SelectTrigger>
              <SelectContent className="z-[60] max-h-64" position="popper" sideOffset={6} collisionPadding={12}>
                {recipients.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}{r.kind && r.kind !== "self" ? ` · ${r.kind}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Input
            placeholder="Optional label (e.g. doctor visit)"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            className="h-8 text-xs"
          />
          <DialogFooter className="sticky bottom-0 z-10 -mx-5 -mb-4 mt-3 border-t border-border/60 bg-background/95 px-5 py-3 backdrop-blur">
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button
              disabled={!careRecipientId}
              onClick={() => {
                const r = recipients.find(x => x.id === careRecipientId);
                if (!r) return;
                const label = newTitle.trim();
                setNewTitle("");
                onCreate({
                  date: draft.date,
                  startTime: start,
                  endTime: end,
                  title: label ? `💗 ${r.name} · ${label}` : `💗 ${r.name}`,
                  notes: label || `Care for ${r.name}`,
                  color: "warm",
                  allDay: false,
                });
              }}
            >
              Add block
            </Button>
          </DialogFooter>
        </div>
      )}
    </div>
  );
}

function EditForm({ block, onSave, onDelete }: { block: TimeBlock; onSave: (p: Partial<TimeBlock>) => void; onDelete: () => void }) {
  const { state } = useStore();
  const [title, setTitle] = useState(block.title);
  const [icon, setIcon] = useState<string | undefined>(block.icon ?? undefined);
  const [start, setStart] = useState(block.startTime);
  const [end, setEnd] = useState(block.endTime);
  const [color, setColor] = useState(block.color);
  const [notes, setNotes] = useState(block.notes ?? "");
  const areaColors = Array.from(
    new Set(((state.areas ?? []) as { color?: string }[])
      .map(a => a.color)
      .filter((c): c is string => !!c && c.startsWith("#")))
  );
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Title</Label>
        <div className="flex items-center gap-2">
          <IconPicker value={icon} onChange={setIcon} />
          <Input value={title} onChange={e => setTitle(e.target.value)} className="flex-1" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-xs space-y-1">
        <div className="grid grid-cols-2 gap-6">
          <div className="min-w-0 space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Start</Label>
            <div className="relative">
              <Clock className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input type="time" value={start} onChange={e => setStart(e.target.value)} className="h-8 w-full pl-6 pr-2 text-center text-xs tabular-nums" />
            </div>
          </div>
          <div className="min-w-0 space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">End</Label>
            <div className="relative">
              <Clock className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input type="time" value={end} onChange={e => setEnd(e.target.value)} className="h-8 w-full pl-6 pr-2 text-center text-xs tabular-nums" />
            </div>
          </div>
        </div>
        <p className="text-center text-[11px] tabular-nums text-muted-foreground">
          Duration: {formatDuration(start, end)}
        </p>
      </div>
      <div>
        <Label className="text-xs">Color</Label>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {BLOCK_COLORS.map(c => {
            const cc = colorClasses(c);
            return (
              <button key={c} type="button" onClick={() => setColor(c)}
                className={cn("h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all", cc.bg,
                  color === c ? "ring-foreground/60" : "ring-transparent")}
                aria-label={c}/>
            );
          })}
          {areaColors.length > 0 && (
            <span className="mx-1 h-5 w-px bg-border" aria-hidden />
          )}
          {areaColors.map(hex => (
            <button key={hex} type="button" onClick={() => setColor(hex)}
              className={cn("h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all",
                color === hex ? "ring-foreground/60" : "ring-transparent")}
              style={{ backgroundColor: hex }}
              aria-label={`Area color ${hex}`}/>
          ))}
        </div>
      </div>
      <div><Label className="text-xs">Notes</Label><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
      <LinkedNotesPanel entityType="time_block" entityId={block.id} contextTitle={block.title} compact />
      <DialogFooter className="sticky bottom-0 z-10 -mx-5 -mb-4 mt-3 border-t border-border/60 bg-background/95 px-5 py-3 backdrop-blur justify-between">
        <Button variant="ghost" className="text-destructive" onClick={onDelete}><Trash2 className="mr-1 h-4 w-4" /> Delete</Button>
        <Button onClick={() => onSave({ title, icon, startTime: start, endTime: end, color, notes })}>Save</Button>
      </DialogFooter>
    </div>
  );
}
