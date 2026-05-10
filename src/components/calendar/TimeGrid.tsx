import { useMemo, useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { format, isSameDay } from "date-fns";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { useTimeBlocks, colorClasses, hmToHours, hoursToHM, BLOCK_COLORS, type TimeBlock } from "@/lib/time-blocks";

const HOUR_START = 6;   // 6 AM
const HOUR_END = 23;    // 11 PM
const PX_PER_HOUR = 56;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const GRID_HEIGHT = TOTAL_HOURS * PX_PER_HOUR;

type ApptLike = { id: string; title: string; time?: string | null; kind?: string };

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
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(id); }, []);

  const startSlot = (date: Date, ev: React.MouseEvent<HTMLDivElement>) => {
    const el = ev.currentTarget;
    const rect = el.getBoundingClientRect();
    const y = ev.clientY - rect.top;
    const startH = HOUR_START + Math.floor((y / PX_PER_HOUR) * 2) / 2; // snap 30 min
    const endH = Math.min(HOUR_END, startH + 1);
    setDraft({ date: date.toISOString().slice(0,10), start: hoursToHM(startH), end: hoursToHM(endH) });
  };

  const blocksFor = (iso: string) => blocks.filter(b => b.date === iso && !b.allDay);

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
                    className="relative cursor-crosshair"
                    style={{ height: GRID_HEIGHT }}
                    onClick={(e) => startSlot(d, e)}
                  >
                    {/* Hour grid lines */}
                    {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                      <div key={i}
                        className={cn("absolute inset-x-0 border-t border-border/30",
                          isToday && "hover:bg-primary/5")}
                        style={{ top: i * PX_PER_HOUR, height: PX_PER_HOUR }}
                      />
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
                          title={a.title}>
                          <span className="font-medium">{a.time?.slice(0,5)}</span> {a.title}
                        </div>
                      );
                    })}

                    {/* Time blocks */}
                    {dayBlocks.map(b => {
                      const top = (hmToHours(b.startTime) - HOUR_START) * PX_PER_HOUR;
                      const height = Math.max(20, (hmToHours(b.endTime) - hmToHours(b.startTime)) * PX_PER_HOUR - 2);
                      const c = colorClasses(b.color);
                      return (
                        <button
                          key={b.id}
                          onClick={(e) => { e.stopPropagation(); setEditing(b); }}
                          className={cn(
                            "absolute left-1/2 right-0.5 mx-0.5 rounded-md px-2 py-1 text-left text-[11px] shadow-sm ring-1 ring-inset transition-all hover:-translate-y-0.5 hover:shadow-md",
                            c.bg, c.text, c.ring, "ring-opacity-30"
                          )}
                          style={{ top, height }}
                        >
                          <div className="font-medium leading-tight">{b.title}</div>
                          <div className="text-[10px] opacity-70">{b.startTime}–{b.endTime}</div>
                        </button>
                      );
                    })}

                    {/* Now line */}
                    {showNowLine && (
                      <div
                        className="pointer-events-none absolute inset-x-0 border-t-2 border-primary"
                        style={{ top: (nowH - HOUR_START) * PX_PER_HOUR }}
                      >
                        <span className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-primary" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
