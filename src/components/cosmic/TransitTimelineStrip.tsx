import { useMemo } from "react";
import { addDays, format, isSameDay } from "date-fns";
import { Link } from "react-router-dom";
import { eventsOnDay } from "@/lib/cosmic/events";

export function TransitTimelineStrip({ from = new Date(), days = 7 }: { from?: Date; days?: number }) {
  const cells = useMemo(() => {
    return Array.from({ length: days }, (_, i) => {
      const d = addDays(from, i);
      return { date: d, events: eventsOnDay(d) };
    });
  }, [from, days]);

  return (
    <section className="cozy-card flex flex-col gap-3 p-5" aria-label="Transit timeline">
      <header className="flex items-center justify-between">
        <h3 className="font-display text-base">Transit Timeline</h3>
        <Link to="/cosmic-flow/timeline" className="text-xs text-primary hover:underline">View full timeline</Link>
      </header>
      <div className="overflow-x-auto">
        <div className="flex min-w-full gap-2">
          {cells.map(({ date, events }) => (
            <div
              key={date.toISOString()}
              className={`flex min-w-[78px] flex-col gap-1.5 rounded-lg border p-2 text-center
                ${isSameDay(date, new Date()) ? "border-primary/60 bg-primary/10" : "border-border/50 bg-card/60"}`}
            >
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{format(date, "EEE")}</p>
              <p className="text-sm font-medium">{format(date, "MMM d")}</p>
              <div className="flex min-h-[40px] flex-col items-center gap-0.5">
                {events.length === 0 ? (
                  <span className="text-[11px] italic text-muted-foreground">—</span>
                ) : events.slice(0, 3).map(e => (
                  <Link
                    key={e.id}
                    to={`/cosmic-flow/event/${encodeURIComponent(e.id)}`}
                    className="text-[11px] leading-tight hover:underline"
                    title={e.title}
                  >
                    {e.glyph}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}