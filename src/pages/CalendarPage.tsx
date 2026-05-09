import { useStore } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Trash2 } from "lucide-react";

export default function CalendarPage() {
  const { state, addAppointment, deleteAppointment } = useStore();
  const [title, setTitle] = useState(""); const [date, setDate] = useState(""); const [time, setTime] = useState(""); const [type, setType] = useState<any>("other");

  const cursor = new Date();
  const ms = startOfMonth(cursor);
  const me = endOfMonth(cursor);
  const gs = startOfWeek(ms, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gs, end: addDays(gs, 41) });
  const colorOf = (k: "appt"|"bday"|"hol") => k === "appt" ? "bg-primary-soft text-foreground" : k === "bday" ? "bg-accent-soft text-accent-foreground" : "bg-secondary-soft text-secondary-foreground";

  return (
    <div className="space-y-6">
      <div className="cozy-card gradient-calm p-6">
        <h2 className="font-display text-3xl font-semibold">Calendar</h2>
        <p className="mt-1 text-sm text-muted-foreground">Appointments, birthdays, holidays — color-coded and gentle.</p>
      </div>

      <SectionCard title="Quick add event" accent="calm">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{["doctor","therapy","school","family","personal","other"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={() => { if (!title || !date) return; addAppointment({ title, date, time, type }); setTitle(""); setDate(""); setTime(""); }}>Add</Button>
        </div>
      </SectionCard>

      <SectionCard title={format(cursor, "MMMM yyyy")} accent="warm">
        <div className="grid grid-cols-7 gap-1 text-xs uppercase tracking-wider text-muted-foreground">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d} className="px-2 py-1 text-center">{d}</div>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map(d => {
            const k = d.toISOString().slice(0,10);
            const ev = [
              ...state.appointments.filter(a => a.date === k).map(a => ({ kind: "appt" as const, label: a.title })),
              ...state.birthdays.filter(b => b.date === k).map(b => ({ kind: "bday" as const, label: `🎂 ${b.name}` })),
              ...state.holidays.filter(h => h.date === k).map(h => ({ kind: "hol" as const, label: `✨ ${h.name}` })),
            ];
            const today = isSameDay(d, new Date());
            const inMonth = isSameMonth(d, cursor);
            return (
              <div key={k} className={cn("min-h-24 rounded-lg border p-1.5 text-xs", inMonth ? "border-border/60 bg-card" : "border-transparent text-muted-foreground/50", today && "ring-2 ring-primary")}>
                <div className="text-right text-[11px] font-medium">{format(d, "d")}</div>
                <div className="mt-0.5 space-y-0.5">
                  {ev.map((e, i) => <div key={i} className={cn("truncate rounded px-1 py-0.5 text-[10px]", colorOf(e.kind))}>{e.label}</div>)}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="All appointments" accent="sage">
        <ul className="space-y-1.5">
          {state.appointments.sort((a,b) => a.date.localeCompare(b.date)).map(a => (
            <li key={a.id} className="group flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm">
              <span className="text-xs text-muted-foreground">{format(parseISO(a.date), "MMM d")} {a.time ?? ""}</span>
              <span className="flex-1">{a.title}</span>
              <span className="text-xs text-muted-foreground">{a.type}</span>
              <button onClick={() => deleteAppointment(a.id)} className="opacity-0 group-hover:opacity-60"><Trash2 className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
