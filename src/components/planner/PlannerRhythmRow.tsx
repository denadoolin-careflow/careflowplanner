/**
 * Habits and routines as a gentle planner lane, grouped and interactive.
 * Renders either as a week-grid row (days + colTemplate) or as a single-day
 * card. Habits check off on any date; routine steps check off for today,
 * writing straight back to the existing habit logs and routine items.
 */
import { useEffect, useMemo, useState } from "react";
import { format, isToday } from "date-fns";
import { Check, ChevronDown, ChevronUp, CloudSun, Moon, Repeat, Sprout, Sun } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import {
  useRoutines, routines as routinesApi, SLOT_LABEL, ROUTINE_SLOTS, formatTime12,
  type Routine,
} from "@/lib/routines";
import type { Habit } from "@/lib/types";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const KEY = "careflow:planner:rhythm-row";
const DENSITY_KEY = "careflow:planner:rhythm-density:v1";

type DayPart = "morning" | "afternoon" | "evening";
type DensityPreference = { allExpanded: boolean; days: Record<string, boolean> };

const DAY_PARTS: Array<{
  id: DayPart;
  label: string;
  Icon: typeof Sun;
  tone: string;
}> = [
  { id: "morning", label: "Morning", Icon: Sun, tone: "text-amber-600 dark:text-amber-300" },
  { id: "afternoon", label: "Afternoon", Icon: CloudSun, tone: "text-sky-600 dark:text-sky-300" },
  { id: "evening", label: "Evening", Icon: Moon, tone: "text-primary" },
];

function readDensityPreference(): DensityPreference {
  try {
    const saved = JSON.parse(localStorage.getItem(DENSITY_KEY) ?? "") as Partial<DensityPreference>;
    return {
      allExpanded: saved.allExpanded === true,
      days: saved.days && typeof saved.days === "object" ? saved.days : {},
    };
  } catch {
    return { allExpanded: false, days: {} };
  }
}

function habitDayPart(habit: Habit): DayPart {
  const slot = habit.timesOfDay?.[0];
  if (slot === "midday" || slot === "afternoon") return "afternoon";
  if (slot === "evening") return "evening";
  return "morning";
}

function routineDayPart(routine: Routine): DayPart {
  if (routine.time_of_day) {
    const hour = Number.parseInt(routine.time_of_day.split(":")[0], 10);
    if (!Number.isNaN(hour)) {
      if (hour < 12) return "morning";
      if (hour < 17) return "afternoon";
      return "evening";
    }
  }
  if (routine.slot === "afternoon" || routine.slot === "nap") return "afternoon";
  if (routine.slot === "evening" || routine.slot === "night") return "evening";
  return "morning";
}

/** Remembered show/hide for the habits + routines lane. */
export function useRhythmRowVisible(): [boolean, () => void] {
  const [on, setOn] = useState(() => {
    try { return localStorage.getItem(KEY) !== "0"; } catch { return true; }
  });
  const toggle = () => setOn(v => {
    const next = !v;
    try { localStorage.setItem(KEY, next ? "1" : "0"); } catch { /* ignore */ }
    return next;
  });
  return [on, toggle];
}

/** Does this habit belong on that date? */
export function habitOnDate(habit: Habit, date: Date): boolean {
  if (habit.daysOfWeek?.length) return habit.daysOfWeek.includes(date.getDay());
  if (habit.cadence === "daily") return true;
  if (habit.cadence === "weekly") return date.getDay() === 1;
  return date.getDate() === 1;
}

/** Completed / total habit count for a date — used by the month markers. */
export function habitProgress(habits: Habit[], date: Date): { done: number; total: number } {
  const iso = format(date, "yyyy-MM-dd");
  const due = habits.filter(h => habitOnDate(h, date));
  return { done: due.filter(h => !!h.log?.[iso]).length, total: due.length };
}

/** Completed / total steps across a set of routines. */
export function routineProgress(list: Routine[]): { done: number; total: number } {
  let done = 0, total = 0;
  for (const r of list) {
    total += r.items.length;
    done += r.items.filter(i => i.done).length;
  }
  return { done, total };
}

function routineOnDate(routine: Routine, date: Date): boolean {
  if (routine.cadence === "daily" || routine.cadence === "custom") return true;
  if (routine.cadence === "weekly") return date.getDay() === 1;
  return date.getDate() === 1;
}

function slotRank(slot: Routine["slot"]) {
  const i = ROUTINE_SLOTS.indexOf(slot);
  return i < 0 ? 99 : i;
}

function sortRoutines(list: Routine[]): Routine[] {
  return [...list].sort((a, b) => {
    const at = a.time_of_day ?? "";
    const bt = b.time_of_day ?? "";
    if (at && bt && at !== bt) return at.localeCompare(bt);
    if (at && !bt) return -1;
    if (!at && bt) return 1;
    return slotRank(a.slot) - slotRank(b.slot) || a.person_name.localeCompare(b.person_name);
  });
}

function CheckCircle({ done, className }: { done: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border-2 transition-colors",
        done ? "border-current bg-current" : "border-current/50",
        className,
      )}
    >
      {done && <Check className="h-2 w-2 text-background" strokeWidth={4} />}
    </span>
  );
}

function HabitChip({ habit, iso }: { habit: Habit; iso: string }) {
  const { toggleHabit } = useStore() as any;
  const done = !!habit.log?.[iso];
  return (
    <button
      type="button"
      onClick={() => { haptics.snap(); void toggleHabit(habit.id, iso); }}
      aria-pressed={done}
      aria-label={`${done ? "Undo" : "Check in"}: ${habit.title}`}
      className={cn(
        "flex min-h-[22px] w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-left text-[10px] leading-tight",
        "border-emerald-300/70 bg-emerald-100/60 text-emerald-950 dark:border-emerald-800/60 dark:bg-emerald-900/40 dark:text-emerald-50",
        done && "opacity-55",
      )}
    >
      <CheckCircle done={done} />
      <span className={cn("truncate", done && "line-through")}>{habit.title}</span>
    </button>
  );
}

function RoutineChip({ routine, editable, showPerson = true }: { routine: Routine; editable: boolean; showPerson?: boolean }) {
  const [open, setOpen] = useState(false);
  const total = routine.items.length;
  const done = routine.items.filter(i => i.done).length;
  const allDone = total > 0 && done === total;
  const label = `${routine.time_of_day ? `${formatTime12(routine.time_of_day)} · ` : ""}${showPerson ? `${routine.person_name} · ` : ""}${SLOT_LABEL[routine.slot]}`;

  const toggleAll = async () => {
    haptics.snap();
    const next = !allDone;
    for (const item of routine.items) {
      if (!!item.done !== next) await routinesApi.toggleItem(routine.person_name, routine.slot, item.id);
    }
  };

  const chipClass = cn(
    "flex min-h-[22px] w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-left text-[10px] leading-tight",
    "border-violet-300/70 bg-violet-100/60 text-violet-950 dark:border-violet-800/60 dark:bg-violet-900/40 dark:text-violet-50",
    allDone && "opacity-55",
  );

  if (!editable || total === 0) {
    return (
      <div title={editable ? label : `${label} · today only`} className={chipClass}>
        <Repeat className="h-3 w-3 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </div>
    );
  }

  return (
    <div className={chipClass}>
      <button
        type="button"
        onClick={() => void toggleAll()}
        aria-pressed={allDone}
        aria-label={`${allDone ? "Undo" : "Complete"} routine: ${label}`}
        className="shrink-0"
      >
        <CheckCircle done={allDone} />
      </button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title={label}
            className="flex min-w-0 flex-1 items-center gap-1 text-left"
            aria-label={`Open steps for ${label}`}
          >
            <span className={cn("truncate", allDone && "line-through")}>{label}</span>
            <span className="ml-auto shrink-0 tabular-nums opacity-70">{done}/{total}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-60 p-2">
          <p className="mb-1.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          <ul className="space-y-1">
            {routine.items.map(item => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => { haptics.snap(); void routinesApi.toggleItem(routine.person_name, routine.slot, item.id); }}
                  aria-pressed={!!item.done}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border border-border/50 px-2 py-1.5 text-left text-[12px] transition-colors hover:border-primary/40",
                    item.done && "bg-primary/10 text-muted-foreground",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "grid h-4 w-4 shrink-0 place-items-center rounded-full border-2",
                      item.done ? "border-primary bg-primary" : "border-muted-foreground/40",
                    )}
                  >
                    {item.done && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                  </span>
                  <span className={cn("min-w-0 flex-1 [overflow-wrap:anywhere]", item.done && "line-through")}>
                    {item.icon ? `${item.icon} ` : ""}{item.text}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function GroupHeader({ icon, label, done, total }: { icon: React.ReactNode; label: string; done: number; total: number }) {
  return (
    <p className="flex items-center gap-1 px-0.5 text-[9px] uppercase tracking-[0.14em] text-muted-foreground/80">
      {icon}
      <span className="truncate">{label}</span>
      <span className="ml-auto shrink-0 tabular-nums">{done}/{total}</span>
    </p>
  );
}

function MiniProgressRing({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.min(done / total, 1) : 0;
  const radius = 7;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg className="h-5 w-5 shrink-0 -rotate-90" viewBox="0 0 20 20" role="img" aria-label={`${done} of ${total} rhythm items complete`}>
      <circle cx="10" cy="10" r={radius} fill="none" className="stroke-muted" strokeWidth="2.5" />
      <circle
        cx="10"
        cy="10"
        r={radius}
        fill="none"
        className="stroke-primary transition-[stroke-dashoffset] duration-300"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - pct)}
      />
    </svg>
  );
}

interface RhythmDayData {
  iso: string;
  habits: Habit[];
  routines: Routine[];
  habitsDone: number;
  routinesDone: number;
  routineDone: number;
  routineTotal: number;
}

function useRhythmDayData(date: Date): RhythmDayData {
  const { state } = useStore() as any;
  const { routines: allRoutines } = useRoutines();
  const iso = format(date, "yyyy-MM-dd");

  const habits: Habit[] = useMemo(
    () => ((state.habits ?? []) as Habit[]).filter(h => habitOnDate(h, date)),
    [state.habits, iso], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const dayRoutines = useMemo(
    () => sortRoutines(allRoutines.filter(r => routineOnDate(r, date))),
    [allRoutines, iso], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const rp = routineProgress(dayRoutines);
  return {
    iso,
    habits,
    routines: dayRoutines,
    habitsDone: habits.filter(h => !!h.log?.[iso]).length,
    routinesDone: dayRoutines.filter(routine => routine.items.length > 0 && routine.items.every(item => item.done)).length,
    routineDone: rp.done,
    routineTotal: rp.total,
  };
}

function RhythmSummary({ data, expanded, onToggle }: { data: RhythmDayData; expanded: boolean; onToggle: () => void }) {
  const combinedDone = data.habitsDone + data.routinesDone;
  const combinedTotal = data.habits.length + data.routines.length;

  if (!data.habits.length && !data.routines.length) {
    return <span className="block px-0.5 py-1 text-[9.5px] text-muted-foreground/60">—</span>;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label={`${expanded ? "Collapse" : "Expand"} habits and routines for ${data.iso}`}
      className="h-auto min-h-8 w-full justify-start gap-1 rounded-md border border-border/50 bg-card/60 px-1.5 py-1 text-[9px] font-medium hover:bg-muted/70"
    >
      <MiniProgressRing done={combinedDone} total={combinedTotal} />
      <span className="min-w-0 flex-1 space-y-0.5 text-left leading-none">
        <span className="flex items-center gap-1 whitespace-nowrap">
          <Sprout className="h-2.5 w-2.5 text-primary" aria-hidden />
          <span className="tabular-nums">{data.habitsDone}/{data.habits.length}</span>
          <span className="truncate text-muted-foreground">habits</span>
        </span>
        <span className="flex items-center gap-1 whitespace-nowrap">
          <Repeat className="h-2.5 w-2.5 text-primary" aria-hidden />
          <span className="tabular-nums">{data.routinesDone}/{data.routines.length}</span>
          <span className="truncate text-muted-foreground">routines</span>
        </span>
      </span>
      {expanded ? <ChevronUp className="h-3 w-3 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />}
    </Button>
  );
}

function RhythmGroups({ date, wrap, data: suppliedData }: { date: Date; wrap?: boolean; data?: RhythmDayData }) {
  const queriedData = useRhythmDayData(date);
  const data = suppliedData ?? queriedData;
  const { iso, habits, routines: dayRoutines } = data;
  const editableRoutines = isToday(date);

  if (!habits.length && !dayRoutines.length) {
    return <span className="block px-0.5 text-[9.5px] text-muted-foreground/60">—</span>;
  }

  const listClass = wrap ? "flex flex-wrap gap-1 [&>*]:w-auto [&>*]:max-w-full" : "space-y-0.5";

  return (
    <div className="space-y-2 pt-1">
      {DAY_PARTS.map(({ id, label, Icon, tone }) => {
        const partHabits = habits.filter(habit => habitDayPart(habit) === id);
        const partRoutines = dayRoutines.filter(routine => routineDayPart(routine) === id);
        if (!partHabits.length && !partRoutines.length) return null;
        const partHabitDone = partHabits.filter(habit => !!habit.log?.[iso]).length;
        const partRoutineProgress = routineProgress(partRoutines);
        const people = Array.from(new Set(partRoutines.map(routine => routine.person_name)));
        return (
          <section key={id} className="space-y-1">
            <GroupHeader
              icon={<Icon className={cn("h-2.5 w-2.5", tone)} aria-hidden />}
              label={label}
              done={partHabitDone + partRoutineProgress.done}
              total={partHabits.length + partRoutineProgress.total}
            />
            {partHabits.length > 0 && (
              <div className={listClass}>
                {partHabits.map(habit => <HabitChip key={habit.id} habit={habit} iso={iso} />)}
              </div>
            )}
            {people.map(person => (
              <div key={person} className="space-y-0.5">
                <p className="truncate px-0.5 text-[9px] font-medium text-muted-foreground">{person}</p>
                <div className={listClass}>
                  {partRoutines.filter(routine => routine.person_name === person).map(routine => (
                    <RoutineChip key={routine.id} routine={routine} editable={editableRoutines} showPerson={false} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}

function RhythmDayColumn({ iso, expanded, onToggle }: { iso: string; expanded: boolean; onToggle: () => void }) {
  const date = useMemo(() => new Date(`${iso}T12:00:00`), [iso]);
  const data = useRhythmDayData(date);
  return (
    <>
      <RhythmSummary data={data} expanded={expanded} onToggle={onToggle} />
      {expanded && <RhythmGroups date={date} data={data} />}
    </>
  );
}

/** Week-grid lane: one column per day, aligned to the grid template. */
export function PlannerRhythmRow({ days, colTemplate }: { days: string[]; colTemplate: string }) {
  const [density, setDensity] = useState<DensityPreference>(readDensityPreference);
  const everyExpanded = days.every(iso => density.days[iso] ?? density.allExpanded);

  useEffect(() => {
    try { localStorage.setItem(DENSITY_KEY, JSON.stringify(density)); } catch { /* ignore */ }
  }, [density]);

  const toggleDay = (iso: string) => {
    haptics.tap?.();
    setDensity(current => ({
      ...current,
      days: { ...current.days, [iso]: !(current.days[iso] ?? current.allExpanded) },
    }));
  };

  const toggleAll = () => {
    haptics.tap?.();
    const next = !everyExpanded;
    setDensity(current => ({
      allExpanded: next,
      days: { ...current.days, ...Object.fromEntries(days.map(iso => [iso, next])) },
    }));
  };

  return (
    <div className="grid border-b border-border/40 bg-background/30" style={{ gridTemplateColumns: colTemplate }}>
      <div className="sticky left-0 z-30 flex flex-col items-end justify-center gap-0.5 border-r border-border/50 bg-card/95 px-1 py-1 backdrop-blur">
        <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground/70">
          <Sprout className="h-3 w-3" aria-hidden /> Rhythm
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleAll}
          aria-expanded={everyExpanded}
          className="h-5 rounded px-1 text-[8px] font-medium text-muted-foreground"
          title={everyExpanded ? "Collapse all days" : "Expand all days"}
        >
          {everyExpanded ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
          {everyExpanded ? "Collapse" : "Expand"}
        </Button>
      </div>
      {days.map((iso, index) => (
        <div key={iso} className={cn("min-w-0 p-1", index > 0 && "border-l border-border/40")}>
          <RhythmDayColumn iso={iso} expanded={density.days[iso] ?? density.allExpanded} onToggle={() => toggleDay(iso)} />
        </div>
      ))}
    </div>
  );
}

/** Single-day card for the Day view. */
export function PlannerRhythmCard({ date, className }: { date: Date; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-border/60 bg-card/50 p-2.5", className)}>
      <p className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <Sprout className="h-3 w-3" aria-hidden /> Habits &amp; routines
      </p>
      <RhythmGroups date={date} wrap />
    </section>
  );
}
