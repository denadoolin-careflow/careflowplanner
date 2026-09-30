import { useMemo, useRef, useState } from "react";
import { addDays, addWeeks, format, isSameDay, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { useStore } from "@/lib/store";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/** Compact 7-day strip: tap to jump, long-press to peek that day's scheduled tasks. */
export function MobileWeekAgendaStrip({ day, onSelect }: { day: Date; onSelect: (d: Date) => void }) {
  const { state, toggleTask } = useStore();
  const [peek, setPeek] = useState<string | null>(null);
  const press = useRef<{ t: number; long: boolean; x: number }>({ t: 0, long: false, x: 0 });
  const swipeX = useRef<number | null>(null);
  const start = startOfWeek(day, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = new Date();

  const byDay = useMemo(() => {
    const m = new Map<string, typeof state.tasks>();
    for (const t of state.tasks) {
      if (!t.dueDate) continue;
      const arr = m.get(t.dueDate) ?? [];
      arr.push(t);
      m.set(t.dueDate, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => (a.startTime ?? "99").localeCompare(b.startTime ?? "99"));
    return m;
  }, [state.tasks]);

  const shiftWeek = (n: number) => { haptics.tap(); onSelect(addWeeks(day, n)); };

  return (
    <div
      className="flex items-center gap-1"
      onTouchStart={(e) => { swipeX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (swipeX.current == null) return;
        const dx = e.changedTouches[0].clientX - swipeX.current;
        swipeX.current = null;
        if (Math.abs(dx) > 60) shiftWeek(dx < 0 ? 1 : -1);
      }}
    >
      <button type="button" aria-label="Previous week" onClick={() => shiftWeek(-1)} className="grid h-11 w-6 shrink-0 place-items-center text-muted-foreground">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="grid flex-1 grid-cols-7 gap-1">
        {days.map((d) => {
          const iso = format(d, "yyyy-MM-dd");
          const tasks = byDay.get(iso) ?? [];
          const selected = isSameDay(d, day);
          const isToday = isSameDay(d, today);
          return (
            <Popover key={iso} open={peek === iso} onOpenChange={(o) => setPeek(o ? iso : null)}>
              <PopoverAnchor asChild>
                <button
                  type="button"
                  aria-label={`${format(d, "EEEE MMM d")}, ${tasks.length} tasks`}
                  aria-current={selected ? "date" : undefined}
                  onPointerDown={(e) => {
                    press.current = { long: false, x: e.clientX, t: window.setTimeout(() => { press.current.long = true; haptics.pickup(); setPeek(iso); }, 700) };
                  }}
                  onPointerUp={() => window.clearTimeout(press.current.t)}
                  onPointerLeave={() => window.clearTimeout(press.current.t)}
                  onContextMenu={(e) => e.preventDefault()}
                  onClick={() => { if (press.current.long) return; haptics.tap(); onSelect(d); }}
                  className={cn(
                    "flex min-h-[52px] select-none flex-col items-center justify-center rounded-xl border py-1 transition-colors",
                    selected ? "border-primary bg-primary text-primary-foreground" : "border-border/50 bg-card/60",
                    !selected && isToday && "border-primary/60",
                  )}
                >
                  <span className="text-[9.5px] uppercase tracking-wide opacity-75">{format(d, "EEEEE")}</span>
                  <span className="text-[14px] font-semibold leading-tight">{format(d, "d")}</span>
                  <span className="flex h-2 items-center gap-0.5">
                    {tasks.slice(0, 3).map((t) => (
                      <span key={t.id} className={cn("h-1 w-1 rounded-full", selected ? "bg-primary-foreground" : "bg-primary", t.done && "opacity-40")} />
                    ))}
                    {tasks.length > 3 && <span className="text-[8px] leading-none">+{tasks.length - 3}</span>}
                  </span>
                </button>
              </PopoverAnchor>
              <PopoverContent className="w-72 p-2" align="center">
                <div className="flex items-baseline justify-between px-1 pb-1.5">
                  <p className="text-xs font-semibold">{format(d, "EEEE, MMM d")}</p>
                  <span className="text-[10px] text-muted-foreground">{tasks.length} scheduled</span>
                </div>
                {tasks.length === 0 ? (
                  <p className="px-1 py-2 text-xs text-muted-foreground">Nothing scheduled.</p>
                ) : (
                  <ul className="max-h-60 space-y-0.5 overflow-y-auto">
                    {tasks.map((t) => (
                      <li key={t.id} className="flex min-h-9 items-start gap-2 rounded-md px-1.5 py-1.5 text-xs hover:bg-muted/50">
                        <button
                          type="button"
                          aria-label={t.done ? "Mark not done" : "Mark done"}
                          onClick={() => void toggleTask(t.id)}
                          className={cn("h-4 w-4 shrink-0 rounded-full border-2", t.done ? "border-primary bg-primary" : "border-muted-foreground/40")}
                        />
                        <span className="w-10 shrink-0 pt-0.5 font-mono text-[10px] text-muted-foreground">{t.startTime?.slice(0, 5) ?? "—"}</span>
                        <span className={cn("min-w-0 flex-1 whitespace-normal break-words leading-snug", t.done && "line-through opacity-60")}>{t.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <button type="button" onClick={() => { setPeek(null); onSelect(d); }} className="mt-1 w-full rounded-md py-1.5 text-xs text-primary">Open day</button>
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
      <button type="button" aria-label="Next week" onClick={() => shiftWeek(1)} className="grid h-11 w-6 shrink-0 place-items-center text-muted-foreground">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
