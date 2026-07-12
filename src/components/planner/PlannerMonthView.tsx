import { useMemo } from "react";
import { addDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

export function PlannerMonthView({ date, onSelectDay }: { date: Date; onSelectDay: (d: Date) => void }) {
  const { state } = useStore();
  const start = startOfWeek(startOfMonth(date));
  const end = endOfWeek(endOfMonth(date));
  const days: Date[] = []; for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  const today = new Date();

  const dotsByDay = useMemo(() => {
    const m = new Map<string, { tasks: number; appts: number; meals: number }>();
    for (const t of state.tasks) {
      if (!t.dueDate) continue;
      const key = t.dueDate;
      const rec = m.get(key) ?? { tasks: 0, appts: 0, meals: 0 };
      if (t.area === "Meals") rec.meals++; else rec.tasks++;
      m.set(key, rec);
    }
    for (const a of state.appointments) {
      const rec = m.get(a.date) ?? { tasks: 0, appts: 0, meals: 0 };
      rec.appts++;
      m.set(a.date, rec);
    }
    return m;
  }, [state.tasks, state.appointments]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40">
      <div className="grid grid-cols-7 border-b border-border/60 text-[10px] uppercase tracking-wider text-muted-foreground">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} className="px-2 py-1.5">{d}</div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 auto-rows-fr">
        {days.map((d, i) => {
          const iso = format(d, "yyyy-MM-dd");
          const info = dotsByDay.get(iso);
          const dim = !isSameMonth(d, date);
          const isToday = isSameDay(d, today);
          return (
            <button key={i} onClick={() => onSelectDay(d)}
              className={cn(
                "flex flex-col items-start gap-1 border-b border-r border-border/40 p-1.5 text-left transition-colors hover:bg-muted/60",
                dim && "bg-muted/20 text-muted-foreground/50",
              )}>
              <span className={cn("grid h-6 w-6 place-items-center rounded-full text-[11px]",
                isToday && "bg-primary text-primary-foreground font-semibold")}>{format(d, "d")}</span>
              <div className="flex flex-wrap items-center gap-0.5">
                {info?.tasks ? <span className="rounded-full bg-sky-400/70 px-1 py-0.5 text-[9px] font-mono text-white">{info.tasks}</span> : null}
                {info?.appts ? <span className="rounded-full bg-violet-400/70 px-1 py-0.5 text-[9px] font-mono text-white">{info.appts}</span> : null}
                {info?.meals ? <span className="rounded-full bg-yellow-400/70 px-1 py-0.5 text-[9px] font-mono text-white">{info.meals}</span> : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
