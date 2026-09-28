import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import type { RecurrenceRule } from "@/lib/types";
import { RepeatSelector } from "./RepeatSelector";
import { EVENT_TYPES, apptTypeFor, useEventTypeColors, type EventTypeKey } from "@/lib/event-type-colors";
import { cn } from "@/lib/utils";

export const ADD_EVENT_EVENT = "careflow:add-event";

/** Open the global "Add event" dialog, optionally on a given date. */
export function openAddEvent(date?: Date | string) {
  const iso = !date ? undefined : typeof date === "string" ? date : format(date, "yyyy-MM-dd");
  window.dispatchEvent(new CustomEvent(ADD_EVENT_EVENT, { detail: { date: iso } }));
}

const addHour = (hm: string) => {
  const [h, m] = hm.split(":").map(Number);
  return `${String(Math.min(23, h + 1)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/** App-wide event dialog: title, date, time range or all day, location, repeat, notes. */
export function AddEventHost() {
  const { addAppointment } = useStore();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [rule, setRule] = useState<RecurrenceRule | undefined>();
  const [saving, setSaving] = useState(false);
  const [etype, setEtype] = useState<EventTypeKey>("appointment");
  const { colorOf } = useEventTypeColors();

  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent).detail?.date as string | undefined;
      const now = new Date();
      const nextHour = `${String(Math.min(23, now.getHours() + 1)).padStart(2, "0")}:00`;
      setTitle(""); setLocation(""); setNotes(""); setRule(undefined); setAllDay(false); setEtype("appointment");
      setDate(d ?? format(now, "yyyy-MM-dd")); setStart(nextHour); setEnd(addHour(nextHour));
      setOpen(true);
    };
    window.addEventListener(ADD_EVENT_EVENT, onOpen);
    return () => window.removeEventListener(ADD_EVENT_EVENT, onOpen);
  }, []);

  const save = async () => {
    if (!title.trim() || saving) return;
    if (!allDay && end <= start) { toast.error("End time needs to be after the start."); return; }
    setSaving(true);
    try {
      await addAppointment({
        title: title.trim(), date, allDay,
        time: allDay ? undefined : start, endTime: allDay ? undefined : end,
        location: location.trim() || undefined, notes: notes.trim() || undefined,
        type: apptTypeFor(etype), recurrenceRule: rule, recurrenceSeriesId: rule ? crypto.randomUUID() : undefined,
      } as any);
      toast.success(`Event added to ${format(new Date(`${date}T12:00:00`), "EEE, MMM d")}`);
      setOpen(false);
    } catch {
      toast.error("Couldn't add that event. Try again?");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CalendarPlus className="h-4 w-4 text-primary" /> Add event</DialogTitle>
          <DialogDescription>It shows on your planner and calendar.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input autoFocus value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void save(); }} placeholder="What's happening?" className="h-11 text-base" />
          <div className="grid grid-cols-[1fr_auto] items-center gap-3">
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-11" aria-label="Date" />
            <Label className="flex items-center gap-2 text-xs"><Switch checked={allDay} onCheckedChange={setAllDay} /> All day</Label>
          </div>
          {!allDay && <div className="grid grid-cols-2 gap-2">
            <Input type="time" value={start} onChange={e => { const v = e.target.value; setStart(v); if (end <= v) setEnd(addHour(v)); }} className="h-11" aria-label="Start time" />
            <Input type="time" value={end} onChange={e => setEnd(e.target.value)} className="h-11" aria-label="End time" />
          </div>}
          <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location (optional)" className="h-11" />
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} />
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Event type">
            {EVENT_TYPES.map(t => (
              <button key={t.key} type="button" role="radio" aria-checked={etype === t.key} onClick={() => setEtype(t.key)}
                className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs", etype === t.key ? "border-foreground font-medium" : "border-border/60 text-muted-foreground")}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorOf(t.key) }} />{t.label}
              </button>
            ))}
          </div>
          <div className="space-y-2 rounded-md border border-border/60 p-3">
            <div className="flex flex-wrap gap-1.5">
              {([["Doesn't repeat", undefined], ["Weekly", { freq: "weekly", interval: 1, byWeekday: [new Date(`${date}T12:00:00`).getDay()] }], ["Every 2 weeks", { freq: "weekly", interval: 2, byWeekday: [new Date(`${date}T12:00:00`).getDay()] }], ["Monthly", { freq: "monthly", interval: 1 }]] as [string, RecurrenceRule | undefined][]).map(([l, r]) => {
                const on = JSON.stringify(r ?? null) === JSON.stringify(rule ?? null);
                return <button key={l} type="button" onClick={() => setRule(r)} className={cn("rounded-full border px-3 py-1 text-xs", on ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground")}>{l}</button>;
              })}
            </div>
            <RepeatSelector value={rule} onChange={setRule} />
          </div>
          <Button className="h-11 w-full" disabled={!title.trim() || saving} onClick={() => void save()}>{saving ? "Adding…" : "Add event"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
