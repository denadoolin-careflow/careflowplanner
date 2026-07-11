import { useMemo } from "react";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, format, isSameMonth, isSameDay } from "date-fns";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function MonthView({ date }: { date: Date }) {
  const { state } = useStore();
  const grid = useMemo(() => {
    const start = startOfWeek(startOfMonth(date), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(date), { weekStartsOn: 0 });
    const days: Date[] = [];
    let d = start;
    while (d <= end) { days.push(d); d = addDays(d, 1); }
    return days;
  }, [date]);

  return (
    <section className="reset-glass rounded-3xl p-4">
      <header className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {format(date, "MMMM yyyy")}
      </header>
      <div className="grid grid-cols-7 gap-1 text-[10px] uppercase text-muted-foreground">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d} className="pb-1 text-center">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {grid.map((d) => {
          const iso = format(d, "yyyy-MM-dd");
          const inMonth = isSameMonth(d, date);
          const today = isSameDay(d, new Date());
          const appts = (state.appointments ?? []).filter((a) => a.date === iso);
          const tasks = state.tasks.filter((t) => t.dueDate === iso && !t.parentTaskId && t.status !== "parked");
          const count = appts.length + tasks.length;
          return (
            <div key={iso} className={cn(
              "min-h-[76px] rounded-lg border p-1.5",
              inMonth ? "border-border/50 bg-background/50" : "border-border/20 bg-background/20 opacity-60",
              today && "border-primary/60 bg-primary/10"
            )}>
              <div className={cn("mb-0.5 text-[11px]", today ? "font-semibold text-primary" : "text-foreground")}>
                {format(d, "d")}
              </div>
              {appts.slice(0, 2).map((a) => (
                <div key={a.id} className="mb-0.5 truncate rounded bg-primary/15 px-1 py-[1px] text-[9px] text-foreground">
                  {a.time?.slice(0, 5) ?? ""} {a.title}
                </div>
              ))}
              {tasks.slice(0, Math.max(0, 2 - appts.length)).map((t) => (
                <div key={t.id} className="mb-0.5 truncate rounded bg-muted/70 px-1 py-[1px] text-[9px] text-foreground">
                  · {t.title}
                </div>
              ))}
              {count > 2 && <div className="text-[9px] text-muted-foreground">+{count - 2}</div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}