import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MoonGlyph } from "@/components/widgets/MoonGlyph";
import { getMoonPhase } from "@/lib/moon";
import { cn } from "@/lib/utils";

interface MoonCalendarProps {
  selected: Date;
  onSelect: (d: Date) => void;
  markedDates?: Set<string>; // yyyy-MM-dd dates that have a journal entry
}

/**
 * Monthly calendar with a soft moon glyph in each cell.
 * Showcase phases at a glance + select a date to journal.
 */
export function MoonCalendar({ selected, onSelect, markedDates }: MoonCalendarProps) {
  const [cursor, setCursor] = useState(() => startOfMonth(selected));

  const days = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(cursor)),
      end: endOfWeek(endOfMonth(cursor)),
    });
  }, [cursor]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursor(addMonths(cursor, -1))}
          className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="font-display text-lg">{format(cursor, "MMMM yyyy")}</h3>
        <button
          type="button"
          onClick={() => setCursor(addMonths(cursor, 1))}
          className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="py-1 text-center">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const inMonth = isSameMonth(d, cursor);
          const isSel = isSameDay(d, selected);
          const phase = getMoonPhase(d);
          const isMajor =
            phase === "new" ||
            phase === "first-quarter" ||
            phase === "full" ||
            phase === "last-quarter";
          const iso = format(d, "yyyy-MM-dd");
          const hasEntry = markedDates?.has(iso);
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(d)}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-xl border text-[11px] transition",
                inMonth
                  ? "border-border/40 bg-card hover:bg-secondary-soft/40"
                  : "border-transparent text-muted-foreground/50",
                isSel && "border-primary ring-2 ring-primary/30",
              )}
            >
              <span className="text-[10px]">{format(d, "d")}</span>
              <MoonGlyph date={d} size={isMajor ? 22 : 16} className="mt-0.5" />
              {hasEntry && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}