import { useStore } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import {
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth,
  isSameDay, startOfWeek, endOfWeek, addDays, addMonths, subMonths, addWeeks, subWeeks,
  startOfYear, endOfYear, eachMonthOfInterval, addYears, subYears,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2, RefreshCw } from "lucide-react";
import { gcalFetchEvents, type GCalEvent } from "@/lib/google-calendar";
import { toast } from "sonner";
import { TimeGrid } from "@/components/calendar/TimeGrid";
import { UnscheduledTasksRail, TASK_DRAG_MIME } from "@/components/calendar/UnscheduledTasksRail";
import { supabase } from "@/integrations/supabase/client";
import { hoursToHM } from "@/lib/time-blocks";

type View = "day" | "week" | "month" | "year";

export default function CalendarPage() {
  const { state, addAppointment, deleteAppointment, updateTask } = useStore();
  const [title, setTitle] = useState(""); const [date, setDate] = useState(""); const [time, setTime] = useState(""); const [type, setType] = useState<any>("other");
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [gEvents, setGEvents] = useState<GCalEvent[]>([]);
  const [gLoading, setGLoading] = useState(false);

  const loadGoogle = async () => {
    setGLoading(true);
    try {
      const r = await gcalFetchEvents();
      setGEvents(r.events ?? []);
    } catch (e: any) {
      // Silent on first load when not connected; show on manual refresh
      console.warn("gcal load failed", e);
    } finally { setGLoading(false); }
  };

  useEffect(() => { loadGoogle(); }, []);

  const colorOf = (k: "appt"|"bday"|"hol"|"gcal"|"task") =>
    k === "appt" ? "bg-primary-soft text-foreground"
    : k === "bday" ? "bg-accent-soft text-accent-foreground"
    : k === "hol" ? "bg-secondary-soft text-secondary-foreground"
    : k === "task" ? "bg-warm-soft text-warm-foreground border border-primary/30"
    : "bg-muted text-foreground";

  const eventsOn = (k: string) => [
    ...state.appointments.filter(a => a.date === k).map(a => ({ kind: "appt" as const, label: a.title, time: a.time })),
    ...state.birthdays.filter(b => b.date === k).map(b => ({ kind: "bday" as const, label: `🎂 ${b.name}`, time: undefined })),
    ...state.holidays.filter(h => h.date === k).map(h => ({ kind: "hol" as const, label: `✨ ${h.name}`, time: undefined })),
    ...gEvents.filter(g => g.date === k).map(g => ({ kind: "gcal" as const, label: g.title, time: g.time ?? undefined, color: g.color })),
    ...state.tasks.filter(t => t.dueDate === k && !t.done && !t.parentTaskId).map(t => ({
      kind: "task" as const,
      label: `${t.done ? "✓" : "○"} ${t.title}`,
      time: undefined,
    })),
  ];

  /** Drop a task onto a day — sets due date only. */
  const handleDayDrop = async (taskId: string, dateISO: string) => {
    const t = state.tasks.find(x => x.id === taskId);
    if (!t) return;
    await updateTask(taskId, { dueDate: dateISO, inbox: false });
    toast(`Scheduled “${t.title}” for ${dateISO}`);
  };

  /** Drop onto a time slot (week/day) — sets due date AND creates a 1h time block. */
  const handleTimeDrop = async (taskId: string, dateISO: string, startHour: number) => {
    const t = state.tasks.find(x => x.id === taskId);
    if (!t) return;
    await updateTask(taskId, { dueDate: dateISO, inbox: false });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const startH = Math.max(6, Math.min(22, startHour));
    const endH = Math.min(23, startH + 1);
    await supabase.from("time_blocks").insert({
      user_id: user.id,
      date: dateISO,
      start_time: hoursToHM(startH),
      end_time: hoursToHM(endH),
      title: t.title,
      color: "primary",
      all_day: false,
    });
    toast(`Scheduled “${t.title}” at ${hoursToHM(startH)}`);
    // TimeGrid reads via its own hook; nudge a refresh by touching state.
    window.dispatchEvent(new CustomEvent("careflow:time-blocks-changed"));
  };

  const shift = (dir: 1 | -1) => {
    setCursor(c => {
      if (view === "day") return addDays(c, dir);
      if (view === "week") return dir > 0 ? addWeeks(c, 1) : subWeeks(c, 1);
      if (view === "month") return dir > 0 ? addMonths(c, 1) : subMonths(c, 1);
      return dir > 0 ? addYears(c, 1) : subYears(c, 1);
    });
  };

  const headerLabel = view === "day"
    ? format(cursor, "EEEE, MMMM d, yyyy")
    : view === "week"
      ? `${format(startOfWeek(cursor, { weekStartsOn: 0 }), "MMM d")} – ${format(endOfWeek(cursor, { weekStartsOn: 0 }), "MMM d, yyyy")}`
      : view === "month"
        ? format(cursor, "MMMM yyyy")
        : format(cursor, "yyyy");

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-6">
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

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
        <span>{gEvents.length > 0 ? `Showing ${gEvents.length} Google event${gEvents.length === 1 ? "" : "s"}.` : "Connect Google Calendar in Settings to see your events here."}</span>
        <Button size="sm" variant="ghost" className="h-7 rounded-full" onClick={() => { loadGoogle(); toast("Refreshing Google events…"); }} disabled={gLoading}>
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${gLoading ? "animate-spin" : ""}`} /> Refresh Google
        </Button>
      </div>

      <SectionCard
        title={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => shift(-1)} aria-label="Previous"><ChevronLeft className="h-4 w-4" /></Button>
            <span>{headerLabel}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => shift(1)} aria-label="Next"><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" className="ml-1 h-7 px-2 text-xs" onClick={() => setCursor(new Date())}>Today</Button>
          </div>
        }
        action={
          <div className="flex gap-1 rounded-full bg-muted/60 p-0.5">
            {(["day","week","month","year"] as View[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                  view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        }
        accent="warm"
      >
        {view === "month" && <MonthView cursor={cursor} eventsOn={eventsOn} colorOf={colorOf} onTaskDropDay={handleDayDrop} />}
        {view === "week" && (
          <TimeGrid
            days={Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor, { weekStartsOn: 0 }), i))}
            appointmentsOn={eventsOn}
            onTaskDropAt={handleTimeDrop}
          />
        )}
        {view === "day" && (
          <TimeGrid days={[cursor]} appointmentsOn={eventsOn} onTaskDropAt={handleTimeDrop} />
        )}
        {view === "year" && <YearView cursor={cursor} eventsOn={eventsOn} setCursor={setCursor} setView={setView} />}
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
      <UnscheduledTasksRail />
    </div>
  );
}

type EventItem = { kind: "appt" | "bday" | "hol" | "gcal" | "task"; label: string; time?: string; color?: string };
type EventsFn = (k: string) => EventItem[];
type ColorFn = (k: "appt"|"bday"|"hol"|"gcal"|"task") => string;

function MonthView({ cursor, eventsOn, colorOf, onTaskDropDay }: { cursor: Date; eventsOn: EventsFn; colorOf: ColorFn; onTaskDropDay?: (taskId: string, dateISO: string) => void }) {
  const ms = startOfMonth(cursor);
  const gs = startOfWeek(ms, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gs, end: addDays(gs, 41) });
  const [hoverISO, setHoverISO] = useState<string | null>(null);
  return (
    <>
      <div className="grid grid-cols-7 gap-1 text-xs uppercase tracking-wider text-muted-foreground">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d} className="px-2 py-1 text-center">{d}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map(d => {
          const k = d.toISOString().slice(0,10);
          const ev = eventsOn(k);
          const today = isSameDay(d, new Date());
          const inMonth = isSameMonth(d, cursor);
          return (
            <div
              key={k}
              onDragOver={(e) => {
                if (!onTaskDropDay) return;
                if (!Array.from(e.dataTransfer.types).includes("application/x-careflow-task")) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setHoverISO(k);
              }}
              onDragLeave={() => setHoverISO(p => p === k ? null : p)}
              onDrop={(e) => {
                if (!onTaskDropDay) return;
                const id = e.dataTransfer.getData("application/x-careflow-task");
                if (!id) return;
                e.preventDefault();
                onTaskDropDay(id, k);
                setHoverISO(null);
              }}
              className={cn(
                "min-h-24 rounded-lg border p-1.5 text-xs transition-colors",
                inMonth ? "border-border/60 bg-card" : "border-transparent text-muted-foreground/50",
                today && "ring-2 ring-primary",
                hoverISO === k && "ring-2 ring-primary bg-primary/10",
              )}
            >
              <div className="text-right text-[11px] font-medium">{format(d, "d")}</div>
              <div className="mt-0.5 space-y-0.5">
                {ev.map((e, i) => <div key={i} className={cn("truncate rounded px-1 py-0.5 text-[10px]", colorOf(e.kind))}>{e.label}</div>)}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function WeekView({ cursor, eventsOn, colorOf }: { cursor: Date; eventsOn: EventsFn; colorOf: ColorFn }) {
  const start = startOfWeek(cursor, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
      {days.map(d => {
        const k = d.toISOString().slice(0,10);
        const ev = eventsOn(k);
        const today = isSameDay(d, new Date());
        return (
          <div key={k} className={cn("min-h-32 rounded-xl border border-border/60 bg-card p-2", today && "ring-2 ring-primary")}>
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{format(d, "EEE")}</span>
              <span className="text-sm font-semibold">{format(d, "d")}</span>
            </div>
            <div className="space-y-1">
              {ev.length === 0 && <p className="text-[11px] text-muted-foreground">—</p>}
              {ev.map((e, i) => (
                <div key={i} className={cn("truncate rounded px-1.5 py-1 text-[11px]", colorOf(e.kind))}>
                  {e.time && <span className="mr-1 font-medium">{e.time}</span>}{e.label}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayView({ cursor, eventsOn, colorOf }: { cursor: Date; eventsOn: EventsFn; colorOf: ColorFn }) {
  const k = cursor.toISOString().slice(0,10);
  const ev = eventsOn(k).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  return (
    <div className="space-y-2">
      {ev.length === 0 ? (
        <p className="rounded-lg bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">A clear day. Enjoy it.</p>
      ) : ev.map((e, i) => (
        <div key={i} className={cn("flex items-center gap-3 rounded-xl px-3 py-2 text-sm", colorOf(e.kind))}>
          <span className="w-16 text-xs font-medium opacity-80">{e.time ?? "any time"}</span>
          <span className="flex-1">{e.label}</span>
          <span className="text-[10px] uppercase tracking-wider opacity-60">{e.kind}</span>
        </div>
      ))}
    </div>
  );
}

function YearView({ cursor, eventsOn, setCursor, setView }: { cursor: Date; eventsOn: EventsFn; setCursor: (d: Date) => void; setView: (v: View) => void }) {
  const months = eachMonthOfInterval({ start: startOfYear(cursor), end: endOfYear(cursor) });
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {months.map(m => {
        const ms = startOfMonth(m);
        const gs = startOfWeek(ms, { weekStartsOn: 0 });
        const cells = eachDayOfInterval({ start: gs, end: addDays(gs, 41) });
        return (
          <button
            key={m.toISOString()}
            onClick={() => { setCursor(m); setView("month"); }}
            className="rounded-xl border border-border/60 bg-card p-3 text-left transition-colors hover:bg-muted/40"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">{format(m, "MMMM")}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{format(m, "yyyy")}</span>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-[9px] text-muted-foreground/70">
              {["S","M","T","W","T","F","S"].map((d, i) => <div key={i} className="text-center">{d}</div>)}
            </div>
            <div className="mt-0.5 grid grid-cols-7 gap-0.5">
              {cells.map(d => {
                const k = d.toISOString().slice(0,10);
                const has = eventsOn(k).length > 0;
                const today = isSameDay(d, new Date());
                const inMonth = isSameMonth(d, m);
                return (
                  <div key={k} className={cn(
                    "relative aspect-square rounded text-center text-[9px] leading-[1.4]",
                    inMonth ? "text-foreground" : "text-muted-foreground/30",
                    today && "bg-primary/15 font-bold text-primary",
                  )}>
                    {format(d, "d")}
                    {has && inMonth && <span className="absolute inset-x-0 bottom-0 mx-auto h-0.5 w-1 rounded-full bg-accent-foreground" />}
                  </div>
                );
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
}
