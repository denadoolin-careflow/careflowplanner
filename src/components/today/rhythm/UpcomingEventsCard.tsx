import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { CalendarDays, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";

export function UpcomingEventsCard({ date }: { date: Date }) {
  const { state } = useStore();
  const iso = format(date, "yyyy-MM-dd");

  const events = useMemo(() => {
    return state.appointments
      .filter(a => a.date > iso)
      .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")))
      .slice(0, 5);
  }, [state.appointments, iso]);

  return (
    <section className="cozy-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-primary" />
          <h3 className="font-display text-sm font-semibold text-foreground">Upcoming</h3>
        </div>
        <Link to="/calendar" className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground">
          Calendar <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>
      {events.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/50 px-2 py-3 text-center text-xs text-muted-foreground">
          Nothing on the horizon.
        </p>
      ) : (
        <ul className="space-y-2">
          {events.map(e => {
            const d = parseISO(e.date);
            return (
              <li key={e.id} className="flex items-center gap-2.5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted/50 text-center leading-tight">
                  <div>
                    <div className="text-[9px] uppercase text-muted-foreground">{format(d, "MMM")}</div>
                    <div className="font-display text-sm font-semibold text-foreground">{format(d, "d")}</div>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{e.title}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {e.allDay ? "All day" : (e.time ?? "")}{e.location ? ` · ${e.location}` : ""}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}