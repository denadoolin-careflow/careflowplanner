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
    <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
      {months.map(mo => {
        const gStart = startOfWeek(startOfMonth(mo), { weekStartsOn: 1 });
        const gEnd = endOfWeek(endOfMonth(mo), { weekStartsOn: 1 });
        const total = differenceInCalendarDays(gEnd, gStart) + 1;
        const days = Array.from({ length: total }, (_, i) => addDays(gStart, i));
        const monthCount = days.reduce((s, d) => s + (isSameMonth(d, mo) ? (counts.get(format(d, "yyyy-MM-dd")) ?? 0) : 0), 0);
        const isCurrentMonth = isSameMonth(mo, today);
        return (
          <div
            key={format(mo, "yyyy-MM")}
            className={cn(
              "rounded-2xl border border-border/60 bg-card/40 p-2",
              isCurrentMonth && "border-primary/40 bg-primary/[0.04]",
            )}
          >
            <button
              type="button"
              onClick={() => onSelectDay(mo)}
              className="mb-1 flex w-full items-baseline justify-between gap-1 text-left hover:text-primary"
            >
              <span className={cn("truncate font-display text-[13px] font-semibold sm:text-sm", isCurrentMonth && "text-primary")}>
                {format(mo, "MMM")}
              </span>
              {monthCount > 0 && (
                <span className="shrink-0 text-[9px] tabular-nums text-muted-foreground">{monthCount}</span>
              )}
            </button>
            <div className="grid grid-cols-7 gap-[2px] text-center text-[9px] text-muted-foreground">
              {["M","T","W","T","F","S","S"].map((d, i) => (
                <div key={i} className={cn("leading-4", i > 4 && "text-muted-foreground/60")}>{d}</div>
              ))}
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
                      "grid aspect-square min-h-[20px] place-items-center rounded-[5px] text-[10px] leading-none transition-colors hover:bg-muted",
                      dim && "opacity-25",
                      isSameDay(d, today) && "bg-primary font-semibold text-primary-foreground",
                    )}
                    style={!dim && n && !isSameDay(d, today)
                      ? { backgroundColor: `hsl(var(--primary) / ${Math.min(0.75, 0.2 + n * 0.14)})` }
                      : undefined}
                  >
                    {dim ? "" : format(d, "d")}
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
