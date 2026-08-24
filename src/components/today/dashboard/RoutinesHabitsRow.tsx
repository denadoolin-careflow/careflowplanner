import { useMemo } from "react";
import { format, subDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { useRoutines } from "@/lib/routines";
import { ChevronRight, Clock, Moon, Sun, Sunrise } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashCard, EmptyLine } from "./DashCard";
import { capacityLimit, useCapacity } from "./capacity-context";

function routineMinutes(items: { durationMin?: number }[]) {
  return items.reduce((n, i) => n + (i.durationMin ?? 0), 0);
}

const SLOT_ICON: Record<string, typeof Sunrise> = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Moon,
};

/** Which routine slot the current hour belongs to. */
function currentSlot(d: Date): string {
  const h = d.getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

/** Small SVG progress ring — done / total of a routine. */
function ProgressRing({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? done / total : 0;
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 -rotate-90" aria-hidden>
      <circle cx="12" cy="12" r={r} className="fill-none stroke-border" strokeWidth="3" />
      <circle
        cx="12" cy="12" r={r}
        className="fill-none stroke-primary transition-[stroke-dashoffset] duration-300"
        strokeWidth="3" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
      />
    </svg>
  );
}

export function RoutinesHabitsRow({ date }: { date: Date }) {
  const { state, toggleHabit } = useStore();
  const { routines } = useRoutines();
  const navigate = useNavigate();
  const capacity = useCapacity();
  const iso = format(date, "yyyy-MM-dd");

  // Due-now first, then nearly-finished, then untouched; completed sink.
  const shownRoutines = useMemo(() => {
    const now = currentSlot(new Date());
    const score = (r: { slot: string; items: { done?: boolean }[] }) => {
      const total = r.items.length || 1;
      const done = r.items.filter(i => i.done).length;
      if (done === r.items.length && r.items.length > 0) return 100;
      if (r.slot === now) return 0;
      return 10 - Math.round((done / total) * 5);
    };
    return [...routines].sort((a, b) => score(a) - score(b)).slice(0, capacityLimit(3, capacity));
  }, [routines, capacity]);

  const shownHabits = state.habits.slice(0, capacityLimit(5, capacity));

  const last7 = useMemo(
    () => Array.from({ length: 7 }, (_, i) => format(subDays(date, 6 - i), "yyyy-MM-dd")),
    [date],
  );


  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <DashCard
        eyebrow="Rhythm" title="Routines"
        action={
          <button type="button" onClick={() => navigate("/routines")}
            className="inline-flex items-center text-[11px] text-muted-foreground hover:text-foreground">
            All <ChevronRight className="h-3 w-3" aria-hidden />
          </button>
        }
      >
        {shownRoutines.length === 0 ? (
          <EmptyLine>No routines yet — build one for the part of the day that feels hardest.</EmptyLine>
        ) : (
          <ul className="space-y-2">
            {shownRoutines.map(r => {
              const done = r.items.filter(i => i.done).length;
              const mins = routineMinutes(r.items);
              const Icon = SLOT_ICON[r.slot] ?? Sun;
              const complete = r.items.length > 0 && done === r.items.length;
              return (
                <li key={r.id} className={cn("rounded-2xl bg-muted/35 p-3", complete && "opacity-70")}>
                  <div className="flex items-center gap-2">
                    <ProgressRing done={done} total={r.items.length} />
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">
                      {r.person_name} · <span className="capitalize">{r.slot}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {mins > 0 && (<><Clock className="mr-0.5 inline h-3 w-3" aria-hidden />{mins}m · </>)}
                      {done}/{r.items.length} steps
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1" aria-hidden>
                    {r.items.slice(0, 10).map(i => (
                      <span key={i.id} className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        i.done ? "bg-care-rhythm" : "bg-border",
                      )} />
                    ))}
                  </div>
                </li>
              );
            })}

          </ul>
        )}
      </DashCard>

      <DashCard
        eyebrow="Grow" title="Habits"
        action={
          <button type="button" onClick={() => navigate("/habits")}
            className="inline-flex items-center text-[11px] text-muted-foreground hover:text-foreground">
            All <ChevronRight className="h-3 w-3" aria-hidden />
          </button>
        }
      >
        {shownHabits.length === 0 ? (
          <EmptyLine>No habits tracked. One tiny one is plenty.</EmptyLine>
        ) : (
          <ul className="space-y-2.5">
            {shownHabits.map(h => {
              const weekDone = last7.filter(d => h.log[d]).length;
              return (
                <li key={h.id} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void toggleHabit(h.id, iso)}
                    aria-label={h.log[iso] ? `Mark ${h.title} not done today` : `Mark ${h.title} done today`}
                    className={cn(
                      "min-w-0 flex-1 text-left text-[12.5px] transition-colors",
                      h.log[iso] ? "text-muted-foreground line-through" : "hover:text-primary",
                    )}
                  >
                    {h.title}
                  </button>
                  <span className="flex shrink-0 gap-1" aria-hidden>
                    {last7.map(d => (
                      <span key={d} className={cn(
                        "h-2 w-2 rounded-full",
                        h.log[d] ? "bg-primary" : "bg-border",
                      )} />
                    ))}
                  </span>
                  <span className="w-8 shrink-0 text-right text-[11px] text-muted-foreground">{weekDone}/7</span>
                </li>
              );
            })}
          </ul>
        )}
      </DashCard>
    </div>
  );
}