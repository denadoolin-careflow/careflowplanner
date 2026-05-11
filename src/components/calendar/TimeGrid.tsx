import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { format, isSameDay } from "date-fns";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { useTimeBlocks, colorClasses, hmToHours, hoursToHM, BLOCK_COLORS, type TimeBlock } from "@/lib/time-blocks";
import { tap as hapticTap, pickup as hapticPickup, snap as hapticSnap } from "@/lib/haptics";

const HOUR_START = 6;   // 6 AM
const HOUR_END = 23;    // 11 PM
const PX_PER_HOUR = 56;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const GRID_HEIGHT = TOTAL_HOURS * PX_PER_HOUR;
const SNAP_MIN = 15;
const SNAP_PX = (PX_PER_HOUR / 60) * SNAP_MIN; // 14
const DRAG_THRESHOLD = 5;

function snap(h: number, step = SNAP_MIN / 60): number {
  return Math.round(h / step) * step;
}
function fmtTime(hm: string) {
  const [h, m] = hm.split(":").map(Number);
  return format(new Date(2000, 0, 1, h, m), "h:mm a");
}

type DragState = {
  blockId: string;
  mode: "move" | "resize";
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

type ApptLike = { label: string; time?: string | null };

interface Props {
  days: Date[];                                       // 1 day = day view, 7 = week view
  appointmentsOn: (iso: string) => ApptLike[];        // existing appointments per day (incl. gcal)
}

export function TimeGrid({ days, appointmentsOn }: Props) {
  const fromISO = days[0].toISOString().slice(0, 10);
  const toISO = days[days.length - 1].toISOString().slice(0, 10);
  const { blocks, add, update, remove } = useTimeBlocks(fromISO, toISO);

  const [editing, setEditing] = useState<TimeBlock | null>(null);
  const [draft, setDraft] = useState<{ date: string; start: string; end: string } | null>(null);
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(id); }, []);

  const colRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickUntil = useRef(0);
  dragRef.current = drag;

  const startSlot = (date: Date, ev: React.MouseEvent<HTMLDivElement>) => {
    if (Date.now() < suppressClickUntil.current) return;
    const el = ev.currentTarget;
    const rect = el.getBoundingClientRect();
    const y = ev.clientY - rect.top;
    const startH = HOUR_START + snap(y / PX_PER_HOUR);
    const endH = Math.min(HOUR_END, startH + 1);
    setDraft({ date: date.toISOString().slice(0,10), start: hoursToHM(startH), end: hoursToHM(endH) });
  };

  const blocksFor = (iso: string) => blocks.filter(b => b.date === iso && !b.allDay);

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
    const dh = snap(dy / PX_PER_HOUR);
    const dur = d.origEnd - d.origStart;
    let nextStart = d.origStart;
    let nextEnd = d.origEnd;
    let nextDate = d.origDate;
    if (d.mode === "move") {
      nextStart = Math.min(HOUR_END - dur, Math.max(HOUR_START, d.origStart + dh));
      nextEnd = nextStart + dur;
      const overDate = findDateAt(e.clientX);
      if (overDate) nextDate = overDate;
    } else {
      nextEnd = Math.min(HOUR_END, Math.max(d.origStart + SNAP_MIN / 60, d.origEnd + dh));
    }
    const moved = d.moved || Math.abs(dy) >= DRAG_THRESHOLD || Math.abs(e.clientX - d.startClientX) >= DRAG_THRESHOLD;
    if (moved && !d.moved) hapticPickup();
    if (moved && (nextStart !== d.curStart || nextEnd !== d.curEnd || nextDate !== d.curDate)) hapticSnap();
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
      hapticTap();
    } else if (block) {
      // Treat as a tap — open editor
      setEditing(block);
    }
    setDrag(null);
  }, [onPointerMove, blocks, update]);

  const beginDrag = (block: TimeBlock, mode: "move" | "resize", e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
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
      moved: mode === "resize", // resize handle = drag intent confirmed
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
              const dayAppts = appointmentsOn(iso).filter(a => a.time && /^\d{2}:\d{2}/.test(a.time));
              const isToday = isSameDay(d, new Date());
              const nowH = now.getHours() + now.getMinutes() / 60;
              const showNowLine = isToday && nowH >= HOUR_START && nowH <= HOUR_END;
              return (
                <div key={iso} className="border-r border-border/50 last:border-r-0">
                  <div className={cn("flex h-8 items-baseline justify-center gap-1 border-b border-border/50 text-xs", isToday && "bg-primary/5")}>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{format(d, "EEE")}</span>
                    <span className="font-semibold">{format(d, "d")}</span>
                  </div>
                  <div
                    ref={el => { colRefs.current[iso] = el; }}
                    className="relative cursor-crosshair"
                    style={{ height: GRID_HEIGHT }}
                    onClick={(e) => startSlot(d, e)}
                  >
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
                      return (
                        <div key={`a-${idx}`}
                          className="pointer-events-none absolute left-0 right-1/2 mx-0.5 rounded-md bg-secondary-soft px-1.5 py-0.5 text-[10px] text-secondary-foreground shadow-sm"
                          style={{ top, height: PX_PER_HOUR - 4 }}
                          title={a.label}>
                          <span className="font-medium">{a.time?.slice(0,5)}</span> {a.label}
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
                      return (
                        <div
                          key={b.id}
                          onPointerDown={(e) => beginDrag(b, "move", e)}
                          className={cn(
                            "group absolute left-1/2 right-0.5 mx-0.5 select-none rounded-md px-2 py-1 text-left text-[11px] shadow-sm ring-1 ring-inset",
                            c.bg, c.text, c.ring, "ring-opacity-30",
                            isDragging
                              ? "z-20 scale-[1.02] shadow-xl ring-opacity-100 transition-none"
                              : "transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
                          )}
                          style={{ top, height, touchAction: "none", cursor: isDragging ? "grabbing" : "grab" }}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="pointer-events-none font-medium leading-tight">{b.title}</div>
                          <div className="pointer-events-none text-[10px] opacity-70">
                            {fmtTime(hoursToHM(startH))} – {fmtTime(hoursToHM(endH))}
                          </div>
                          {/* Resize handle */}
                          <div
                            onPointerDown={(e) => beginDrag(b, "resize", e)}
                            className={cn(
                              "absolute inset-x-1 bottom-0 h-3 cursor-ns-resize rounded-b-md",
                              "after:mx-auto after:mt-1 after:block after:h-0.5 after:w-6 after:rounded-full after:bg-current after:opacity-30",
                              "opacity-60 group-hover:opacity-100"
                            )}
                            style={{ touchAction: "none" }}
                          />
                        </div>
                      );
                    })}

                    {/* Now line */}
                    {showNowLine && (
                      <div
                        className="pointer-events-none absolute inset-x-0 border-t-2 border-primary transition-[top] duration-500"
                        style={{ top: (nowH - HOUR_START) * PX_PER_HOUR }}
                      >
                        <span className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]" />
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
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(draft.start);
  const [end, setEnd] = useState(draft.end);
  const [color, setColor] = useState<string>("primary");
  const [notes, setNotes] = useState("");
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Title</Label>
        <Input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Focus block, errands, rest…" />
      </div>
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
      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => { if (title.trim()) onCreate({ date: draft.date, startTime: start, endTime: end, title: title.trim(), notes, color, allDay: false }); }}>
          Add block
        </Button>
      </DialogFooter>
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
      <DialogFooter className="justify-between">
        <Button variant="ghost" className="text-destructive" onClick={onDelete}><Trash2 className="mr-1 h-4 w-4" /> Delete</Button>
        <Button onClick={() => onSave({ title, startTime: start, endTime: end, color, notes })}>Save</Button>
      </DialogFooter>
    </div>
  );
}
