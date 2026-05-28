import { useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { HabitDetailSheet } from "@/components/habits/HabitDetailSheet";
import { Sprout } from "lucide-react";

export function WeekHabitsStrip({ weekStart }: { weekStart: Date }) {
  const { state, toggleHabit } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  if (!state.habits.length) return null;

  return (
    <>
      <section className="cozy-card p-4">
        <header className="mb-3 flex items-center justify-between gap-2">
          <h3 className="inline-flex items-center gap-2 font-display text-sm font-semibold">
            <Sprout className="h-4 w-4 text-primary" /> Habits this week
          </h3>
          <div className="hidden gap-1 text-[10px] uppercase tracking-wide text-muted-foreground sm:flex">
            {days.map(d => (
              <span key={d.toISOString()} className="w-7 text-center">{format(d, "EEEEE")}</span>
            ))}
          </div>
        </header>
        <ul className="space-y-1.5">
          {state.habits.map(h => {
            const dowFilter = h.cadence === "weekly" && h.daysOfWeek?.length ? new Set(h.daysOfWeek) : null;
            return (
              <li key={h.id} className="flex items-center gap-2">
                <button onClick={() => setOpenId(h.id)} className="min-w-0 flex-1 truncate text-left text-sm hover:text-primary">
                  {h.title}
                </button>
                <div className="flex items-center gap-1">
                  {days.map(d => {
                    const k = format(d, "yyyy-MM-dd");
                    const done = !!h.log[k];
                    const dim = dowFilter && !dowFilter.has(d.getDay());
                    return (
                      <button
                        key={k}
                        onClick={async () => { await toggleHabit(h.id, k); haptics.tap(); }}
                        title={format(d, "EEE MMM d")}
                        className={cn("h-6 w-7 rounded-md text-[10px] transition",
                          done ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted",
                          dim && !done && "opacity-30",
                        )}
                      >
                        {done ? "✓" : format(d, "d")}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      <HabitDetailSheet habitId={openId} open={!!openId} onOpenChange={(o) => !o && setOpenId(null)} />
    </>
  );
}