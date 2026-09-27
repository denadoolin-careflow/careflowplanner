/**
 * Habits and routines as a gentle planner lane, grouped and interactive.
 * Renders either as a week-grid row (days + colTemplate) or as a single-day
 * card. Habits and routines check off on today or any past day (past routine
 * steps go to routine_completions), support skip/rest days, and habits can
 * carry a flexible weekly target with a forgiving streak.
 */
import { useEffect, useMemo, useState } from "react";
import { addDays, format, startOfWeek, subDays } from "date-fns";
import { Check, ChevronDown, ChevronUp, CloudSun, Coffee, Flame, Moon, MoreHorizontal, Repeat, Sprout, Sun } from "lucide-react";
import { useRoutineHistory, isStepDoneOn, setStepDoneOn } from "@/lib/routine-history";
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
  if (habit.weeklyTarget && habit.weeklyTarget > 0) return true; // flexible: any day this week
  if (habit.daysOfWeek?.length) return habit.daysOfWeek.includes(date.getDay());
  if (habit.cadence === "daily") return true;
  if (habit.cadence === "weekly") return date.getDay() === 1;
  return date.getDate() === 1;
}

/** Completed / total habit count for a date — used by the month markers. */
export function habitProgress(habits: Habit[], date: Date): { done: number; total: number } {
  const iso = format(date, "yyyy-MM-dd");
  const due = habits.filter(h => habitCountsOn(h, date));
  return { done: due.filter(h => !!h.log?.[iso]).length, total: due.length };
}

const todayKey = () => format(new Date(), "yyyy-MM-dd");

/** Check-ins in the Mon–Sun week containing `date`. */
export function habitWeekCount(habit: Habit, date: Date): number {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  let n = 0;
  for (let i = 0; i < 7; i++) if (habit.log?.[format(addDays(start, i), "yyyy-MM-dd")]) n++;
  return n;
}

/** Should this habit count toward a day's totals? Skips and met flexible targets drop out. */
export function habitCountsOn(habit: Habit, date: Date): boolean {
  if (!habitOnDate(habit, date)) return false;
  const iso = format(date, "yyyy-MM-dd");
  if (habit.log?.[iso]) return true;
  if (habit.skips?.includes(iso)) return false;
  if (habit.weeklyTarget) return habitWeekCount(habit, date) < habit.weeklyTarget;
  return true;
}

/**
 * Forgiving streak. Flexible habits count consecutive weeks meeting their
 * target; others count consecutive due days. Skip/rest days never break it,
 * and an unfinished today / current week doesn't either.
 */
export function habitStreak(habit: Habit, now = new Date()): { count: number; unit: "day" | "week" } {
  const skips = new Set(habit.skips ?? []);
  if (habit.weeklyTarget && habit.weeklyTarget > 0) {
    let count = 0;
    let week = startOfWeek(now, { weekStartsOn: 1 });
    for (let i = 0; i < 104; i++) {
      const done = habitWeekCount(habit, week);
      let skipped = 0;
      for (let d = 0; d < 7; d++) if (skips.has(format(addDays(week, d), "yyyy-MM-dd"))) skipped++;
      const target = Math.max(0, Math.min(habit.weeklyTarget, 7 - skipped));
      if (done >= target && (target > 0 || done > 0)) count++;
      else if (i > 0) break;
      week = subDays(week, 7);
    }
    return { count, unit: "week" };
  }
  let count = 0;
  for (let i = 0; i < 730; i++) {
    const d = subDays(now, i);
    const iso = format(d, "yyyy-MM-dd");
    if (!habitOnDate(habit, d) || skips.has(iso)) continue;
    if (habit.log?.[iso]) count++;
    else if (i > 0) break;
  }
  return { count, unit: "day" };
}

/** Is a routine step done on a given date (today uses live flags, past uses history). */
function stepDoneOn(routine: Routine, item: Routine["items"][number], iso: string): boolean {
  return iso === todayKey() ? !!item.done : isStepDoneOn(routine.id, item.id, iso);
}

function routineSkippedOn(routine: Routine, iso: string) {
  return !!routine.meta?.skips?.includes(iso);
}

function routineProgressOn(list: Routine[], iso: string): { done: number; total: number } {
  let done = 0, total = 0;
  for (const r of list) {
    if (routineSkippedOn(r, iso)) continue;
    total += r.items.length;
    done += r.items.filter(i => stepDoneOn(r, i, iso)).length;
  }
  return { done, total };
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

function HabitMenu({ habit, iso, skipped }: { habit: Habit; iso: string; skipped: boolean }) {
  const { updateHabit } = useStore() as any;
  const streak = habitStreak(habit);
  const toggleSkip = () => {
    haptics.tap?.();
    const skips = new Set(habit.skips ?? []);
    if (skipped) skips.delete(iso); else skips.add(iso);
    void updateHabit(habit.id, { skips: Array.from(skips) });
  };
  const setTarget = (n: number) => { haptics.tap?.(); void updateHabit(habit.id, { weeklyTarget: n }); };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`Options for ${habit.title}`} className="shrink-0 rounded opacity-60 hover:opacity-100">
          <MoreHorizontal className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 space-y-2 p-2.5">
        <p className="text-[12px] font-medium">{habit.title}</p>
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Flame className="h-3 w-3 text-primary" aria-hidden />
          {streak.count} {streak.unit}{streak.count === 1 ? "" : "s"} streak
        </p>
        <Button type="button" variant={skipped ? "secondary" : "outline"} size="sm" className="h-7 w-full justify-start gap-1.5 text-[11px]" onClick={toggleSkip}>
          <Coffee className="h-3 w-3" /> {skipped ? "Undo rest day" : "Skip · rest day"}
        </Button>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Weekly target</p>
          <div className="flex flex-wrap gap-1">
            {[0, 1, 2, 3, 4, 5, 6].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setTarget(n)}
                aria-pressed={(habit.weeklyTarget ?? 0) === n}
                className={cn(
                  "rounded-md border px-1.5 py-0.5 text-[10px]",
                  (habit.weeklyTarget ?? 0) === n ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50",
                )}
              >
                {n === 0 ? "Schedule" : `${n}×`}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">Pick a number to check in on any days until the week's goal is met.</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function HabitChip({ habit, iso, date }: { habit: Habit; iso: string; date: Date }) {
  const { toggleHabit, updateHabit } = useStore() as any;
  const done = !!habit.log?.[iso];
  const skipped = !done && !!habit.skips?.includes(iso);
  const target = habit.weeklyTarget;
  const weekCount = target ? habitWeekCount(habit, date) : 0;
  const onToggle = () => {
    haptics.snap();
    if (skipped) void updateHabit(habit.id, { skips: (habit.skips ?? []).filter(d => d !== iso) });
    void toggleHabit(habit.id, iso);
  };
  return (
    <div
      className={cn(
        "flex min-h-[22px] w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-left text-[10px] leading-tight",
        "border-emerald-300/70 bg-emerald-100/60 text-emerald-950 dark:border-emerald-800/60 dark:bg-emerald-900/40 dark:text-emerald-50",
        (done || skipped) && "opacity-55",
        skipped && "border-dashed",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={done}
        aria-label={`${done ? "Undo" : "Check in"}: ${habit.title}`}
        className="flex min-w-0 flex-1 items-center gap-1 text-left"
      >
        {skipped ? <Coffee className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <CheckCircle done={done} />}
        <span className={cn("truncate", done && "line-through", skipped && "italic")}>{habit.title}</span>
        {skipped && <span className="shrink-0 opacity-70">rest</span>}
        {target ? <span className="ml-auto shrink-0 tabular-nums opacity-70" title="This week">{weekCount}/{target}</span> : null}
      </button>
      <HabitMenu habit={habit} iso={iso} skipped={skipped} />
    </div>
  );
}

function RoutineChip({ routine, iso, showPerson = true }: { routine: Routine; iso: string; showPerson?: boolean }) {
  const [open, setOpen] = useState(false);
  const isToday = iso === todayKey();
  const editable = iso <= todayKey();
  const skipped = routineSkippedOn(routine, iso);
  const total = routine.items.length;
  const done = routine.items.filter(i => stepDoneOn(routine, i, iso)).length;
  const allDone = total > 0 && done === total;
  const label = `${routine.time_of_day ? `${formatTime12(routine.time_of_day)} · ` : ""}${showPerson ? `${routine.person_name} · ` : ""}${SLOT_LABEL[routine.slot]}`;

  const toggleStep = async (itemId: string, current: boolean) => {
    if (isToday) await routinesApi.toggleItem(routine.person_name, routine.slot, itemId);
    else await setStepDoneOn(routine.id, itemId, iso, !current);
  };

  const toggleAll = async () => {
    if (!editable) return;
    haptics.snap();
    if (skipped) await toggleSkip();
    const next = !allDone;
    for (const item of routine.items) {
      const cur = stepDoneOn(routine, item, iso);
      if (cur !== next) await toggleStep(item.id, cur);
    }
  };

  async function toggleSkip() {
    haptics.tap?.();
    const skips = new Set(routine.meta?.skips ?? []);
    if (skipped) skips.delete(iso); else skips.add(iso);
    await routinesApi.upsert(routine.person_name, routine.slot, { meta: { ...routine.meta, skips: Array.from(skips) } });
  }

  const chipClass = cn(
    "flex min-h-[22px] w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-left text-[10px] leading-tight",
    "border-violet-300/70 bg-violet-100/60 text-violet-950 dark:border-violet-800/60 dark:bg-violet-900/40 dark:text-violet-50",
    (allDone || skipped) && "opacity-55",
    skipped && "border-dashed",
  );

  return (
    <div className={chipClass}>
      <button
        type="button"
        onClick={() => void toggleAll()}
        disabled={!editable || total === 0}
        aria-pressed={allDone}
        aria-label={`${allDone ? "Undo" : "Complete"} routine: ${label}`}
        className="shrink-0 disabled:opacity-60"
      >
        {skipped ? <Coffee className="h-3.5 w-3.5" aria-hidden /> : total === 0 ? <Repeat className="h-3 w-3" aria-hidden /> : <CheckCircle done={allDone} />}
      </button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title={label}
            className="flex min-w-0 flex-1 items-center gap-1 text-left"
            aria-label={`Open steps for ${label}`}
          >
            <span className={cn("truncate", allDone && "line-through", skipped && "italic")}>{label}</span>
            <span className="ml-auto shrink-0 tabular-nums opacity-70">{skipped ? "rest" : `${done}/${total}`}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-60 space-y-2 p-2">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          {!editable && <p className="text-[11px] text-muted-foreground">Steps can be checked on the day or later.</p>}
          <ul className="space-y-1">
            {routine.items.map(item => {
              const d = stepDoneOn(routine, item, iso);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={!editable}
                    onClick={() => { haptics.snap(); void toggleStep(item.id, d); }}
                    aria-pressed={d}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg border border-border/50 px-2 py-1.5 text-left text-[12px] transition-colors hover:border-primary/40 disabled:opacity-60",
                      d && "bg-primary/10 text-muted-foreground",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "grid h-4 w-4 shrink-0 place-items-center rounded-full border-2",
                        d ? "border-primary bg-primary" : "border-muted-foreground/40",
                      )}
                    >
                      {d && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                    </span>
                    <span className={cn("min-w-0 flex-1 [overflow-wrap:anywhere]", d && "line-through")}>
                      {item.icon ? `${item.icon} ` : ""}{item.text}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <Button type="button" variant={skipped ? "secondary" : "outline"} size="sm" className="h-7 w-full justify-start gap-1.5 text-[11px]" onClick={() => void toggleSkip()}>
            <Coffee className="h-3 w-3" /> {skipped ? "Undo rest day" : "Skip · rest day"}
          </Button>
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
  habitTotal: number;
  routineCount: number;
  habitsDone: number;
  routinesDone: number;
  routineDone: number;
  routineTotal: number;
}

function useRhythmDayData(date: Date): RhythmDayData {
  const { state } = useStore() as any;
  const { routines: allRoutines } = useRoutines();
  const iso = format(date, "yyyy-MM-dd");
  useRoutineHistory(iso === todayKey() ? [] : [iso]);

  const habits: Habit[] = useMemo(
    () => ((state.habits ?? []) as Habit[]).filter(h => habitOnDate(h, date)),
    [state.habits, iso], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const dayRoutines = useMemo(
    () => sortRoutines(allRoutines.filter(r => routineOnDate(r, date))),
    [allRoutines, iso], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const rp = routineProgressOn(dayRoutines, iso);
  const countedHabits = habits.filter(h => habitCountsOn(h, date));
  const countedRoutines = dayRoutines.filter(r => !routineSkippedOn(r, iso));
  return {
    iso,
    habits,
    routines: dayRoutines,
    habitTotal: countedHabits.length,
    routineCount: countedRoutines.length,
    habitsDone: countedHabits.filter(h => !!h.log?.[iso]).length,
    routinesDone: countedRoutines.filter(routine => routine.items.length > 0 && routine.items.every(item => stepDoneOn(routine, item, iso))).length,
    routineDone: rp.done,
    routineTotal: rp.total,
  };
}

function RhythmSummary({ data, expanded, onToggle }: { data: RhythmDayData; expanded: boolean; onToggle: () => void }) {
  const combinedDone = data.habitsDone + data.routinesDone;
  const combinedTotal = data.habitTotal + data.routineCount;

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
          <span className="tabular-nums">{data.habitsDone}/{data.habitTotal}</span>
          <span className="truncate text-muted-foreground">habits</span>
        </span>
        <span className="flex items-center gap-1 whitespace-nowrap">
          <Repeat className="h-2.5 w-2.5 text-primary" aria-hidden />
          <span className="tabular-nums">{data.routinesDone}/{data.routineCount}</span>
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
        const countedPartHabits = partHabits.filter(habit => habitCountsOn(habit, date));
        const partHabitDone = countedPartHabits.filter(habit => !!habit.log?.[iso]).length;
        const partRoutineProgress = routineProgressOn(partRoutines, iso);
        const people = Array.from(new Set(partRoutines.map(routine => routine.person_name)));
        return (
          <section key={id} className="space-y-1">
            <GroupHeader
              icon={<Icon className={cn("h-2.5 w-2.5", tone)} aria-hidden />}
              label={label}
              done={partHabitDone + partRoutineProgress.done}
              total={countedPartHabits.length + partRoutineProgress.total}
            />
            {partHabits.length > 0 && (
              <div className={listClass}>
                {partHabits.map(habit => <HabitChip key={habit.id} habit={habit} iso={iso} date={date} />)}
              </div>
            )}
            {people.map(person => (
              <div key={person} className="space-y-0.5">
                <p className="truncate px-0.5 text-[9px] font-medium text-muted-foreground">{person}</p>
                <div className={listClass}>
                  {partRoutines.filter(routine => routine.person_name === person).map(routine => (
                    <RoutineChip key={routine.id} routine={routine} iso={iso} showPerson={false} />
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
