import { useMemo, useState } from "react";
import {
  addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameDay, isSameMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { JournalEntryDialog } from "./JournalEntryDialog";

/**
 * Month-grid calendar showing journal entries.
 * Days with entries show a mood emoji or a soft dot.
 * Clicking a day opens that day in the JournalEntryDialog.
 */
export function JournalCalendarView() {
  const { state } = useStore();
  const [cursor, setCursor] = useState(() => new Date());
  const [openDate, setOpenDate] = useState<Date | null>(null);

  const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  const byDate = useMemo(() => {
    const m = new Map<string, { count: number; mood?: string }>();
    for (const j of state.journal) {
      const k = j.date;
      const cur = m.get(k) ?? { count: 0, mood: undefined as string | undefined };
      cur.count += 1;
      if (!cur.mood && (j as any).mood) cur.mood = (j as any).mood as string;
      m.set(k, cur);
    }
    return m;
  }, [state.journal]);

  const today = new Date();

  return (
    <div className="cozy-card p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCursor((c) => subMonths(c, 1))}
          className="grid h-8 w-8 place-items-center rounded-full border border-border/60 text-muted-foreground hover:text-foreground"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="font-display text-lg font-semibold">
          {format(cursor, "MMMM yyyy")}
        </h3>
        <button
          type="button"
          onClick={() => setCursor((c) => addMonths(c, 1))}
          className="grid h-8 w-8 place-items-center rounded-full border border-border/60 text-muted-foreground hover:text-foreground"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </header>
      <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
          <div key={d} className="px-1 py-1 text-center">{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const info = byDate.get(key);
          const isToday = isSameDay(d, today);
          const inMonth = isSameMonth(d, cursor);
          return (
            <button
              key={key}
              type="button"
              onClick={() => setOpenDate(d)}
              className={cn(
                "flex aspect-square flex-col items-center justify-between rounded-lg border border-border/40 bg-background/60 p-1.5 text-left transition hover:bg-muted/40",
                !inMonth && "opacity-40",
                isToday && "ring-1 ring-primary",
                info && "border-primary/40",
              )}
            >
              <span className="text-[11px] font-medium text-foreground">
                {format(d, "d")}
              </span>
              <span className="self-end text-base leading-none">
                {info?.mood ?? (info ? "·" : "")}
              </span>
              {info && info.count > 1 && (
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  {info.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <JournalEntryDialog
        open={!!openDate}
        onOpenChange={(o) => { if (!o) setOpenDate(null); }}
        date={openDate ?? undefined}
      />
    </div>
  );
}