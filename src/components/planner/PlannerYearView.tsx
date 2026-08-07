import { useMemo } from "react";
import { addDays, eachMonthOfInterval, endOfYear, format, isSameDay, startOfMonth, startOfWeek, startOfYear, differenceInCalendarDays, endOfMonth, endOfWeek, isSameMonth } from "date-fns";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Twelve mini-months with load shading — a year at a glance. */
export function PlannerYearView({ date, onSelectDay }: { date: Date; onSelectDay: (d: Date) => void }) {
  const { state } = useStore() as any;
  const months = eachMonthOfInterval({ start: startOfYear(date), end: endOfYear(date) });
  const today = new Date();

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    const bump = (k?: string) => { if (k) m.set(k, (m.get(k) ?? 0) + 1); };
    for (const t of state.tasks ?? []) bump(t.dueDate);
    for (const a of state.appointments ?? []) bump(a.date);
    for (const meal of state.meals ?? []) bump(meal.date);
    return m;
  }, [state.tasks, state.appointments, state.meals]);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {months.map(mo => {
        const gStart = startOfWeek(startOfMonth(mo), { weekStartsOn: 1 });
        const gEnd = endOfWeek(endOfMonth(mo), { weekStartsOn: 1 });
        const total = differenceInCalendarDays(gEnd, gStart) + 1;
        const days = Array.from({ length: total }, (_, i) => addDays(gStart, i));
        return (
          <div key={format(mo, "yyyy-MM")} className="rounded-2xl border border-border/60 bg-card/40 p-2">
            <button
              type="button"
              onClick={() => onSelectDay(mo)}
              className="mb-1 w-full text-left font-display text-sm font-semibold hover:text-primary"
            >
              {format(mo, "MMMM")}
            </button>
            <div className="grid grid-cols-7 gap-[2px] text-center text-[9px] text-muted-foreground">
              {["M","T","W","T","F","S","S"].map((d, i) => <div key={i}>{d}</div>)}
              {days.map((d, i) => {
                const key = format(d, "yyyy-MM-dd");
                const n = counts.get(key) ?? 0;
                const dim = !isSameMonth(d, mo);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onSelectDay(d)}
                    aria-label={`${format(d, "MMMM d")}${n ? ` — ${n} planned` : ""}`}
                    className={cn(
                      "aspect-square rounded text-[9px] leading-none transition-colors hover:bg-muted",
                      dim && "opacity-30",
                      isSameDay(d, today) && "bg-primary font-semibold text-primary-foreground",
                    )}
                    style={!dim && n && !isSameDay(d, today)
                      ? { backgroundColor: `hsl(var(--primary) / ${Math.min(0.45, 0.08 + n * 0.07)})` }
                      : undefined}
                  >
                    {format(d, "d")}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
