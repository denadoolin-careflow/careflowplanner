import { useEffect, useMemo, useState } from "react";
import { format, isSameDay, addDays } from "date-fns";
import { AlertCircle, CalendarClock, Check, Inbox, Plus, Sun } from "lucide-react";
import { useStore, todayISO } from "@/lib/store";
import { useTimeBlocks } from "@/lib/time-blocks";
import { useMealCompletion } from "@/lib/meal-completion";
import { PlannerTaskRow } from "./PlannerTaskRow";
import { buildAgendaDay, label12, parseTypedTime, type AgendaFilter, type AgendaRow } from "@/lib/planner/agenda-rows";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const FILTER_KEY = "careflow:agenda-filter:v1";
const FILTERS: { id: AgendaFilter; label: string }[] = [
  { id: "all", label: "All" }, { id: "tasks", label: "Tasks" }, { id: "events", label: "Events" }, { id: "meals", label: "Meals" },
];
const EDGE: Record<AgendaRow["kind"], string> = {
  task: "before:bg-primary/70", appt: "before:bg-accent", meal: "before:bg-secondary-foreground/60",
};

function dayLabel(d: Date) {
  const now = new Date();
  if (isSameDay(d, now)) return "Today";
  if (isSameDay(d, addDays(now, 1))) return "Tomorrow";
  if (isSameDay(d, addDays(now, -1))) return "Yesterday";
  return format(d, "EEEE");
}

/** Agenda ("Schedule") — everything for the day in one scannable, actionable list. */
export function PlannerScheduleList({ date }: { date: Date }) {
  const { state, addTask } = useStore();
  const iso = format(date, "yyyy-MM-dd");
  const today = todayISO();
  const { blocks } = useTimeBlocks(iso, iso);
  const meals = useMealCompletion(iso);
  const [filter, setFilter] = useState<AgendaFilter>(() => (localStorage.getItem(FILTER_KEY) as AgendaFilter) || "all");
  const [draft, setDraft] = useState("");
  const [nowMin, setNowMin] = useState(() => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); });
  useEffect(() => { localStorage.setItem(FILTER_KEY, filter); }, [filter]);
  useEffect(() => { const t = setInterval(() => { const n = new Date(); setNowMin(n.getHours() * 60 + n.getMinutes()); }, 60_000); return () => clearInterval(t); }, []);

  const agenda = useMemo(() => {
    const blockStart = new Map<string, string>();
    for (const b of blocks) if (b.taskId) blockStart.set(b.taskId, b.startTime);
    return buildAgendaDay({ iso, today, tasks: state.tasks, appointments: state.appointments ?? [], meals: state.meals ?? [], mealDone: meals.done, blockStart, filter });
  }, [state.tasks, state.appointments, state.meals, meals.done, blocks, iso, today, filter]);

  const all = [...agenda.allDay, ...agenda.timed, ...agenda.unscheduled];
  const doneCount = all.filter(r => r.done).length;
  const isToday = iso === today;
  const nowIndex = isToday ? agenda.timed.findIndex(r => r.start! >= nowMin) : -1;

  const submit = async () => {
    if (!draft.trim()) return;
    const { title, time } = parseTypedTime(draft);
    setDraft("");
    await addTask({ title: title || draft.trim(), dueDate: iso, area: "Personal", done: false, ...(time ? { startTime: time } : {}) } as any);
    haptics.success();
  };

  const renderRow = (r: AgendaRow) => (
    <div key={r.key} className="flex items-start gap-2.5">
      <span className="mt-2 w-14 shrink-0 text-right font-mono text-[11px] tabular-nums leading-tight text-muted-foreground">
        {r.start != null ? <>{label12(r.start)}{r.end != null && r.end > r.start && <span className="block opacity-60">–{label12(r.end)}</span>}</> : r.kind === "task" ? "" : "All day"}
      </span>
      <div className={cn("relative min-w-0 flex-1 pl-2.5 before:absolute before:bottom-1 before:left-0 before:top-1 before:w-[3px] before:rounded-full", EDGE[r.kind], r.done && "opacity-60")}>
        {r.task ? <PlannerTaskRow task={r.task} /> : (
          <div className="flex min-h-11 items-center gap-2.5 rounded-lg bg-muted/40 px-2.5 py-1.5 text-[13.5px]">
            {r.kind === "meal" && (
              <button type="button" onClick={() => { haptics.tap(); void meals.toggle(r.mealId!); }} aria-label={r.done ? "Mark meal not eaten" : "Mark meal eaten"}
                className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors", r.done ? "border-primary bg-primary text-primary-foreground" : "border-primary/50")}>
                {r.done && <Check className="h-3.5 w-3.5" />}
              </button>
            )}
            {r.kind === "appt" && <CalendarClock className="h-4 w-4 shrink-0 text-accent" aria-hidden />}
            <span className={cn("min-w-0 flex-1 whitespace-normal break-words", r.done && "line-through text-muted-foreground")}>{r.title}</span>
            {r.appt?.location && <span className="hidden truncate text-[11px] text-muted-foreground sm:inline">{r.appt.location}</span>}
          </div>
        )}
      </div>
    </div>
  );

  const Section = ({ label, icon: Icon, tone, children, count }: { label: string; icon: typeof Sun; tone?: string; children: React.ReactNode; count: number }) => (
    <section className="space-y-1.5">
      <div className={cn("flex items-center gap-1.5 px-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground", tone)}>
        <Icon className="h-3 w-3" /> {label} <span className="font-normal opacity-70">· {count}</span>
      </div>
      {children}
    </section>
  );

  return (
    <div className="flex h-full min-h-[320px] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40">
      <div className="sticky top-0 z-10 space-y-2 border-b border-border/60 bg-card/95 px-4 py-2.5 backdrop-blur">
        <div className="flex items-baseline gap-2">
          <span className={cn("font-display text-lg leading-none", isToday && "text-primary")}>{dayLabel(date)}</span>
          <span className="text-xs text-muted-foreground">{format(date, "MMM d")}</span>
          <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">{all.length - doneCount} open · {doneCount} done</span>
        </div>
        <div role="tablist" aria-label="Filter agenda" className="flex gap-1 overflow-x-auto">
          {FILTERS.map(f => (
            <button key={f.id} role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)}
              className={cn("min-h-8 rounded-full px-3 text-xs font-medium transition-colors", filter === f.id ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted")}>
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-3 [-webkit-overflow-scrolling:touch]">
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-border/70 px-3">
          <Plus className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void submit(); } }}
            placeholder={`Add to ${dayLabel(date).toLowerCase()}… (try "call mom 3pm")`} aria-label="Add a task to this day"
            className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70" />
        </div>

        {agenda.overdue.length > 0 && (
          <Section label="Overdue" icon={AlertCircle} tone="text-destructive" count={agenda.overdue.length}>
            <div className="space-y-1.5">{agenda.overdue.map(t => (
              <div key={t.id} className="flex items-start gap-2.5">
                <span className="mt-2 w-14 shrink-0 text-right text-[11px] text-destructive">{format(new Date(t.dueDate! + "T00:00"), "MMM d")}</span>
                <div className="min-w-0 flex-1"><PlannerTaskRow task={t} /></div>
              </div>
            ))}</div>
          </Section>
        )}

        {all.length === 0 && agenda.overdue.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Nothing planned for this day yet.</p>
        )}

        {agenda.allDay.length > 0 && <Section label="All day" icon={Sun} count={agenda.allDay.length}><div className="space-y-1.5">{agenda.allDay.map(renderRow)}</div></Section>}

        {agenda.timed.length > 0 && (
          <Section label="Scheduled" icon={CalendarClock} count={agenda.timed.length}>
            <div className="space-y-1.5">
              {agenda.timed.map((r, i) => (
                <div key={r.key}>
                  {i === nowIndex && <NowLine min={nowMin} />}
                  {renderRow(r)}
                </div>
              ))}
              {isToday && nowIndex === -1 && <NowLine min={nowMin} />}
            </div>
          </Section>
        )}

        {agenda.unscheduled.length > 0 && <Section label="Unscheduled" icon={Inbox} count={agenda.unscheduled.length}><div className="space-y-1.5">{agenda.unscheduled.map(renderRow)}</div></Section>}
      </div>
    </div>
  );
}

function NowLine({ min }: { min: number }) {
  return (
    <div className="my-1 flex items-center gap-2" aria-label={`Now, ${label12(min)}`}>
      <span className="w-14 text-right text-[10px] font-semibold text-primary">Now</span>
      <span className="h-2 w-2 rounded-full bg-primary" />
      <span className="h-px flex-1 bg-primary/50" />
    </div>
  );
}
