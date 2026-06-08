import { useMemo } from "react";
import { Link } from "react-router-dom";
import { addDays, format, isSameDay } from "date-fns";
import { eventsOnDay } from "@/lib/cosmic/events";

/**
 * Horizontal Past ← Today → Upcoming strip pulling from the cosmic event
 * catalog. Each chip links to the event detail page.
 */
export function CosmicTimelineStrip({
  date,
  pastDays = 5,
  futureDays = 14,
}: { date: Date; pastDays?: number; futureDays?: number }) {
  const items = useMemo(() => {
    const start = addDays(date, -pastDays);
    const total = pastDays + futureDays + 1;
    const out: { date: Date; events: ReturnType<typeof eventsOnDay> }[] = [];
    for (let i = 0; i < total; i++) {
      const d = addDays(start, i);
      const ev = eventsOnDay(d);
      if (ev.length) out.push({ date: d, events: ev });
    }
    return out;
  }, [date, pastDays, futureDays]);

  return (
    <section className="cozy-card glass-panel p-5" aria-label="Cosmic timeline">
      <header className="mb-2 flex items-baseline justify-between">
        <h3 className="font-display text-base">Timeline</h3>
        <p className="text-[11px] text-muted-foreground">Past ← Today → Upcoming</p>
      </header>

      {items.length === 0 ? (
        <p className="text-[12.5px] italic text-muted-foreground">No major events in this window.</p>
      ) : (
        <div className="-mx-2 overflow-x-auto no-scrollbar">
          <ol className="flex min-w-min items-stretch gap-2 px-2 pb-1">
            {items.map(({ date: d, events }) => {
              const today = isSameDay(d, date);
              const past = d.getTime() < date.getTime() && !today;
              return (
                <li
                  key={format(d, "yyyy-MM-dd")}
                  className={
                    "min-w-[180px] shrink-0 rounded-2xl border bg-card/70 p-3 " +
                    (today
                      ? "border-primary/50 ring-1 ring-primary/30"
                      : past
                      ? "border-border/40 opacity-70"
                      : "border-border/50")
                  }
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {today ? "Today" : format(d, "MMM d")}
                  </p>
                  <ul className="mt-1 space-y-1.5">
                    {events.map((e) => (
                      <li key={e.id} className="text-[12.5px] leading-snug">
                        <Link
                          to={`/cosmic-flow/event/${encodeURIComponent(e.id)}`}
                          className="flex items-center gap-1.5 hover:text-primary"
                        >
                          <span aria-hidden>{e.glyph}</span>
                          <span className="truncate">{e.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}