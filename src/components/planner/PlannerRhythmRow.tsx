/**
 * Habits and routines as a gentle planner lane. Renders either as a week-grid
 * row (days + colTemplate) or as a single-day card, with one-tap check-off
 * writing straight back to the existing habit logs and routine items.
 */
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Check, Repeat, Sprout } from "lucide-react";
import { useStore } from "@/lib/store";
import { useRoutines, SLOT_LABEL, formatTime12, type Routine } from "@/lib/routines";
import type { Habit } from "@/lib/types";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const KEY = "careflow:planner:rhythm-row";

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

function routineOnDate(routine: Routine, date: Date): boolean {
  if (routine.cadence === "daily" || routine.cadence === "custom") return true;
  if (routine.cadence === "weekly") return date.getDay() === 1;
  return date.getDate() === 1;
}

function RhythmChips({ date }: { date: Date }) {
  const { state, toggleHabit } = useStore() as any;
  const routines = useRoutines();
  const iso = format(date, "yyyy-MM-dd");
  const habits: Habit[] = useMemo(
    () => ((state.habits ?? []) as Habit[]).filter(h => habitOnDate(h, date)),
    [state.habits, iso], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const dayRoutines = useMemo(() => routines.filter(r => routineOnDate(r, date)), [routines, iso]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!habits.length && !dayRoutines.length) {
    return <span className="block px-0.5 text-[9.5px] text-muted-foreground/60">—</span>;
  }

  return (
    <>
      {habits.map(habit => {
        const done = !!habit.log?.[iso];
        return (
          <button
            key={habit.id}
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
            {done ? <Check className="h-3 w-3 shrink-0" /> : <Sprout className="h-3 w-3 shrink-0" />}
            <span className={cn("truncate", done && "line-through")}>{habit.title}</span>
          </button>
        );
      })}
      {dayRoutines.map(routine => (
        <div
          key={routine.id}
          title={`${routine.person_name} · ${SLOT_LABEL[routine.slot]}`}
          className="flex min-h-[22px] items-center gap-1 rounded-md border border-violet-300/70 bg-violet-100/60 px-1.5 py-0.5 text-[10px] leading-tight text-violet-950 dark:border-violet-800/60 dark:bg-violet-900/40 dark:text-violet-50"
        >
          <Repeat className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {routine.time_of_day ? `${formatTime12(routine.time_of_day)} ` : ""}
            {routine.person_name} {SLOT_LABEL[routine.slot].toLowerCase()}
          </span>
        </div>
      ))}
    </>
  );
}

/** Week-grid lane: one column per day, aligned to the grid template. */
export function PlannerRhythmRow({ days, colTemplate }: { days: string[]; colTemplate: string }) {
  return (
    <div className="grid border-b border-border/40 bg-background/30" style={{ gridTemplateColumns: colTemplate }}>
      <div className="sticky left-0 z-30 flex items-center justify-end gap-1 border-r border-border/50 bg-card/95 pr-1 text-[9px] uppercase tracking-wider text-muted-foreground/70 backdrop-blur">
        <Sprout className="h-3 w-3" aria-hidden />
        Rhythm
      </div>
      {days.map((iso, index) => (
        <div key={iso} className={cn("min-w-0 space-y-0.5 p-1", index > 0 && "border-l border-border/40")}>
          <RhythmChips date={new Date(`${iso}T12:00:00`)} />
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
      <div className="flex flex-wrap gap-1 [&>*]:w-auto [&>*]:max-w-full">
        <RhythmChips date={date} />
      </div>
    </section>
  );
}
