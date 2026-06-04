import { useMemo } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { upcomingEvents } from "@/lib/cosmic/events";
import { ChevronRight } from "lucide-react";

export function UpcomingEventsList({ from = new Date(), days = 30, limit = 6 }: { from?: Date; days?: number; limit?: number }) {
  const events = useMemo(() => upcomingEvents(from, days).slice(0, limit), [from, days, limit]);
  return (
    <section className="cozy-card flex flex-col gap-3 p-5" aria-label="Upcoming cosmic events">
      <header className="flex items-center justify-between">
        <h3 className="font-display text-base">Upcoming Cosmic Events</h3>
        <Link to="/cosmic-flow/timeline" className="text-xs text-primary hover:underline">View calendar</Link>
      </header>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No major events in the next {days} days.</p>
      ) : (
        <ul className="space-y-2">
          {events.map(e => {
            const d = parseISO(e.date);
            return (
              <li key={e.id}>
                <Link
                  to={`/cosmic-flow/event/${encodeURIComponent(e.id)}`}
                  className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/60 p-2.5 transition-colors hover:bg-card"
                >
                  <div className="flex h-10 w-10 flex-col items-center justify-center rounded-md bg-muted text-xs font-medium">
                    <span className="uppercase text-[9px] text-muted-foreground">{format(d, "MMM")}</span>
                    <span>{format(d, "d")}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      <span aria-hidden className="mr-1">{e.glyph}</span>{e.title}
                    </p>
                    {e.subtitle && <p className="truncate text-[12px] text-muted-foreground">{e.subtitle}</p>}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}