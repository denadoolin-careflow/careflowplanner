import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { format, isSameDay } from "date-fns";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, AlertTriangle, GripHorizontal, Check } from "lucide-react";
import { useTimeBlocks, colorClasses, hmToHours, hoursToHM, BLOCK_COLORS, type TimeBlock } from "@/lib/time-blocks";
import { haptics } from "@/lib/haptics";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LinkedNotesPanel } from "@/components/notes/LinkedNotesPanel";
import { AREAS } from "@/lib/types";

const CLEANING_ZONES = ["Kitchen","Bathroom","Bedrooms","Living","Laundry","Entryway","Outdoor","Whole home"] as const;

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
  const { toggleTask } = useStore();

  const [editing, setEditing] = useState<TimeBlock | null>(null);
  const [draft, setDraft] = useState<{ date: string; start: string; end: string } | null>(null);
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 15000); return () => clearInterval(id); }, []);

  const colRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropHover, setDropHover] = useState<{ iso: string; hour: number } | null>(null);
  const [hoverSlot, setHoverSlot] = useState<{ iso: string; hour: number } | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickUntil = useRef(0);
  const lastHoverIdRef = useRef<string | null>(null);
  dragRef.current = drag;

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
    const block = blocks.find(b => b.id === d.blockId);
    if (d.moved && block) {
      const patch: Partial<TimeBlock> = {
        startTime: hoursToHM(d.curStart),
        endTime: hoursToHM(d.curEnd),
        date: d.curDate,
      };
      suppressClickUntil.current = Date.now() + 250;
      await update(d.blockId, patch);
      haptics.pickup();
    } else if (block) {
      // Treat as a tap — open editor
      haptics.snap();
      setEditing(block);
    }
    setDrag(null);
  }, [onPointerMove, blocks, update]);

  const beginDrag = (block: TimeBlock, mode: "move" | "resize" | "resize-top", e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try { (e.currentTarget as Element).setPointerCapture?.(e.pointerId); } catch {}
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
                    <div className="flex flex-col gap-1 border-b border-border/50 bg-muted/20 px-1 py-1">
                      {dayTasks.map((t) => (
                        <div key={t.id} className={cn(
                          "flex items-center gap-1.5 rounded-md bg-card/80 px-1.5 py-1 text-[11px] shadow-sm ring-1 ring-inset ring-border/40",
                          t.done && "opacity-60"
                        )}>
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
                          <span className={cn("truncate", t.done && "line-through text-muted-foreground")}>{t.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div
                    ref={el => { colRefs.current[iso] = el; }}
                    className="relative cursor-crosshair"
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
                      const endH = Math.min(HOUR_END, startH + 1);
                      if (apptId && onApptDropAt) {
                        onApptDropAt(apptId, iso, startH);
                        setDropHover(null);
                        haptics.tap();
                        return;
                      }
                      let title = e.dataTransfer.getData("text/plain") || "Event";
                      let color: string = "primary";
                      if (eventRaw) {
                        try { const p = JSON.parse(eventRaw); title = p.title ?? title; color = p.color ?? color; } catch {}
                      }
                      void add({
                        date: iso,
                        startTime: hoursToHM(startH),
                        endTime: hoursToHM(endH),
                        title,
                        color,
                        allDay: false,
                      });
                      if (taskId && onTaskDropAt) onTaskDropAt(taskId, iso, startH);
                      setDropHover(null);
                      haptics.tap();
                    }}
                  >
                    {/* Drop indicator */}
                    {dropHover?.iso === iso && (
                      <div
                        className="pointer-events-none absolute inset-x-1 z-30 animate-pulse rounded-md border-2 border-dashed border-primary/70 bg-primary/15 shadow-[0_0_0_4px_hsl(var(--primary)/0.08)] transition-[top] duration-150"
                        style={{ top: (dropHover.hour - HOUR_START) * PX_PER_HOUR, height: PX_PER_HOUR }}
                      />
                    )}
                    {/* Hover slot highlight */}
                    {!drag && !dropHover && hoverSlot?.iso === iso && (
                      <div
                        className="pointer-events-none absolute inset-x-1 z-0 rounded-md bg-primary/5 ring-1 ring-inset ring-primary/15 transition-[top] duration-100"
                        style={{ top: (hoverSlot.hour - HOUR_START) * PX_PER_HOUR, height: (SNAP_DEFAULT_MIN / 60) * PX_PER_HOUR }}
                      />
                    )}
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
                      return (
                        <div
                          key={b.id}
                          onClick={(e) => {
                            if (Date.now() < suppressClickUntil.current) return;
                            e.stopPropagation();
                            haptics.snap();
                            setEditing(b);
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
                            "group absolute left-0.5 right-0.5 z-20 select-none overflow-hidden rounded-md px-2 py-1 text-left text-[11px] shadow-sm ring-1 ring-inset",
                            c.bg, c.text, c.ring, "ring-opacity-30",
                            isDragging
                              ? "z-30 scale-[1.02] shadow-xl ring-opacity-100 transition-none"
                              : "transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md",
                            isConflict && !isDragging && "ring-2 ring-destructive/80 ring-opacity-100 shadow-[0_0_0_3px_hsl(var(--destructive)/0.18)]"
                          )}
                          style={{ top, height, cursor: isDragging ? "grabbing" : "pointer" }}
                          role="button"
                          tabIndex={0}
                        >
                          {/* Top resize handle */}
                          <div
                            onPointerDown={(e) => { haptics.tap(); beginDrag(b, "resize-top", e); }}
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Resize start"
                            className={cn(
                              "absolute inset-x-0 top-0 z-10 flex h-3 items-center justify-center rounded-t-md cursor-ns-resize",
                              "before:block before:h-0.5 before:w-8 before:rounded-full before:bg-current before:opacity-40",
                              "opacity-70 group-hover:opacity-100 md:h-2"
                            )}
                            style={{ touchAction: "none" }}
                          />
                          {/* Move/grip handle */}
                          <div
                            onPointerDown={(e) => { haptics.tap(); beginDrag(b, "move", e); }}
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Drag to move"
                            className={cn(
                              "absolute right-0.5 top-1/2 z-10 -translate-y-1/2 flex h-9 w-7 items-center justify-center rounded-md",
                              "bg-background/40 text-current backdrop-blur-sm ring-1 ring-inset ring-current/20",
                              "opacity-80 group-hover:opacity-100 active:bg-background/70",
                              isDragging && "bg-background/70 opacity-100",
                              "md:h-7 md:w-5"
                            )}
                            style={{ touchAction: "none", cursor: isDragging ? "grabbing" : "grab" }}
                          >
                            <GripHorizontal className="h-4 w-4" />
                          </div>
                          <div className="pointer-events-none flex items-center gap-1 truncate pr-8 font-medium leading-tight">
                            {isConflict && <AlertTriangle className="h-3 w-3 shrink-0 text-destructive" />}
                            <span className="truncate">{b.title}</span>
                          </div>
                          <div className="pointer-events-none pr-8 text-[10px] opacity-70">
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
          {drag && drag.moved && (
            <div
              className="pointer-events-none fixed z-50 rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background shadow-lg"
              style={{ left: 12, bottom: 12 }}
            >
              {fmtTime(hoursToHM(drag.curStart))} – {fmtTime(hoursToHM(drag.curEnd))}
              <span className="ml-2 opacity-60">{drag.curDate}</span>
            </div>
          )}
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>New time block</DialogTitle></DialogHeader>
          {draft && <CreateForm draft={draft} onCancel={() => setDraft(null)} onCreate={async (b) => { await add(b); setDraft(null); }} />}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit time block</DialogTitle></DialogHeader>
          {editing && (
            <EditForm
              block={editing}
              onSave={async (patch) => { await update(editing.id, patch); setEditing(null); }}
              onDelete={async () => { await remove(editing.id); setEditing(null); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CreateForm({ draft, onCreate, onCancel }: {
  draft: { date: string; start: string; end: string };
  onCreate: (b: Omit<TimeBlock, "id">) => void;
  onCancel: () => void;
}) {
  const { state, updateTask } = useStore();
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(draft.start);
  const [end, setEnd] = useState(draft.end);
  const [color, setColor] = useState<string>("primary");
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState<"new" | "task" | "meal" | "zone" | "area">("new");
  const [pickQ, setPickQ] = useState("");

  const openTasks = state.tasks.filter(t => !t.done && !t.parentTaskId);
  const filteredTasks = openTasks.filter(t =>
    !pickQ.trim() || t.title.toLowerCase().includes(pickQ.toLowerCase())
  ).slice(0, 60);

  const meals = state.meals ?? [];
  const filteredMeals = meals.filter(m =>
    !pickQ.trim() || m.name.toLowerCase().includes(pickQ.toLowerCase())
  ).slice(0, 60);

  const attach = async (label: string, taskId?: string) => {
    onCreate({ date: draft.date, startTime: start, endTime: end, title: label, notes, color, allDay: false });
    if (taskId) {
      try { await updateTask(taskId, { dueDate: draft.date, inbox: false }); } catch {}
    }
  };

  return (
    <div className="space-y-3">
      <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="new">New</TabsTrigger>
          <TabsTrigger value="task">Task</TabsTrigger>
          <TabsTrigger value="meal">Meal</TabsTrigger>
          <TabsTrigger value="zone">Zone</TabsTrigger>
          <TabsTrigger value="area">Area</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-2 gap-2">
        <div><Label className="text-xs">Start</Label><Input type="time" value={start} onChange={e => setStart(e.target.value)} /></div>
        <div><Label className="text-xs">End</Label><Input type="time" value={end} onChange={e => setEnd(e.target.value)} /></div>
      </div>

      {mode === "new" && (
      <>
      <div>
        <Label className="text-xs">Title</Label>
        <Input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Focus block, errands, rest…" />
      </div>
      <div>
        <Label className="text-xs">Color</Label>
        <div className="mt-1 flex gap-1.5">
          {BLOCK_COLORS.map(c => {
            const cc = colorClasses(c);
            return (
              <button key={c} type="button" onClick={() => setColor(c)}
                className={cn("h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all", cc.bg,
                  color === c ? "ring-foreground/60" : "ring-transparent")}
                aria-label={c}/>
            );
          })}
        </div>
      </div>
      <div><Label className="text-xs">Notes</Label><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => { if (title.trim()) onCreate({ date: draft.date, startTime: start, endTime: end, title: title.trim(), notes, color, allDay: false }); }}>
          Add block
        </Button>
      </DialogFooter>
      </>
      )}

      {mode === "task" && (
        <div className="space-y-2">
          <Input autoFocus placeholder="Search open tasks…" value={pickQ} onChange={e => setPickQ(e.target.value)} />
          <ScrollArea className="h-64 rounded-md border">
            {filteredTasks.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">No matching tasks.</div>
            ) : (
              <ul className="divide-y">
                {filteredTasks.map(t => {
                  const project = t.projectId ? state.projects?.find(p => p.id === t.projectId) : undefined;
                  return (
                    <li key={t.id}>
                      <button
                        className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-muted/50"
                        onClick={() => attach(t.title, t.id)}
                      >
                        <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border border-muted-foreground/40" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{t.title}</span>
                          {(project || t.area) && (
                            <span className="block truncate text-[10px] text-muted-foreground">
                              {project?.name}{project && t.area ? " · " : ""}{t.area}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
          <DialogFooter><Button variant="ghost" onClick={onCancel}>Cancel</Button></DialogFooter>
        </div>
      )}

      {mode === "meal" && (
        <div className="space-y-2">
          <Input autoFocus placeholder="Search meals…" value={pickQ} onChange={e => setPickQ(e.target.value)} />
          <ScrollArea className="h-64 rounded-md border">
            {filteredMeals.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">No meals planned.</div>
            ) : (
              <ul className="divide-y">
                {filteredMeals.map(m => (
                  <li key={m.id}>
                    <button
                      className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-muted/50"
                      onClick={() => attach(`🍽 ${m.name}`)}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{m.name}</span>
                        <span className="block truncate text-[10px] text-muted-foreground capitalize">
                          {m.slot} · {m.date}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
          <DialogFooter><Button variant="ghost" onClick={onCancel}>Cancel</Button></DialogFooter>
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
                className="rounded-md border border-border/60 bg-card/60 px-3 py-2 text-left text-xs font-medium hover:border-primary/40 hover:bg-primary/10"
              >
                {z}
              </button>
            ))}
          </div>
          <DialogFooter><Button variant="ghost" onClick={onCancel}>Cancel</Button></DialogFooter>
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
                  className="rounded-md border border-border/60 bg-card/60 px-3 py-2 text-left text-xs font-medium hover:border-primary/40 hover:bg-primary/10"
                  style={rec?.color ? { borderColor: rec.color + "55" } : undefined}
                >
                  {a}
                </button>
              );
            })}
          </div>
          <DialogFooter><Button variant="ghost" onClick={onCancel}>Cancel</Button></DialogFooter>
        </div>
      )}
    </div>
  );
}

function EditForm({ block, onSave, onDelete }: { block: TimeBlock; onSave: (p: Partial<TimeBlock>) => void; onDelete: () => void }) {
  const [title, setTitle] = useState(block.title);
  const [start, setStart] = useState(block.startTime);
  const [end, setEnd] = useState(block.endTime);
  const [color, setColor] = useState(block.color);
  const [notes, setNotes] = useState(block.notes ?? "");
  return (
    <div className="space-y-3">
      <div><Label className="text-xs">Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label className="text-xs">Start</Label><Input type="time" value={start} onChange={e => setStart(e.target.value)} /></div>
        <div><Label className="text-xs">End</Label><Input type="time" value={end} onChange={e => setEnd(e.target.value)} /></div>
      </div>
      <div>
        <Label className="text-xs">Color</Label>
        <div className="mt-1 flex gap-1.5">
          {BLOCK_COLORS.map(c => {
            const cc = colorClasses(c);
            return (
              <button key={c} type="button" onClick={() => setColor(c)}
                className={cn("h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all", cc.bg,
                  color === c ? "ring-foreground/60" : "ring-transparent")}
                aria-label={c}/>
            );
          })}
        </div>
      </div>
      <div><Label className="text-xs">Notes</Label><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
      <LinkedNotesPanel entityType="time_block" entityId={block.id} contextTitle={block.title} compact />
      <DialogFooter className="justify-between">
        <Button variant="ghost" className="text-destructive" onClick={onDelete}><Trash2 className="mr-1 h-4 w-4" /> Delete</Button>
        <Button onClick={() => onSave({ title, startTime: start, endTime: end, color, notes })}>Save</Button>
      </DialogFooter>
    </div>
  );
}
