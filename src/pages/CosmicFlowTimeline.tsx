import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { upcomingEvents } from "@/lib/cosmic/events";
import type { CosmicEventKind } from "@/lib/cosmic/event-id";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";

const FILTERS: { value: CosmicEventKind | "all"; label: string }[] = [
  { value: "all",         label: "All" },
  { value: "phase",       label: "Moon phases" },
  { value: "ingress",     label: "Ingresses" },
  { value: "retrograde",  label: "Retrogrades" },
  { value: "direct",      label: "Direct" },
  { value: "voc",         label: "Void moon" },
  { value: "eclipse",     label: "Eclipses" },
];

export default function CosmicFlowTimeline() {
  const [filter, setFilter] = useState<CosmicEventKind | "all">("all");
  const [days, setDays] = useState(30);
  const events = useMemo(() => upcomingEvents(new Date(), days), [days]);
  const filtered = filter === "all" ? events : events.filter(e => e.kind === filter);
  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const e of filtered) {
      if (!map.has(e.date)) map.set(e.date, [] as any);
      map.get(e.date)!.push(e);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-3 sm:p-6">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl">Transit Timeline</h1>
          <p className="text-sm text-muted-foreground">The next {days} days of cosmic events.</p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/cosmic-flow" className="flex items-center gap-1"><ChevronLeft className="h-4 w-4" />Dashboard</Link>
        </Button>
      </header>
      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map(f => (
          <Button
            key={f.value}
            size="sm"
            variant={filter === f.value ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          {[30, 60, 90].map(d => (
            <Button key={d} variant={days === d ? "default" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setDays(d)}>{d}d</Button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">No events match this filter.</p>
      ) : (
        <div className="space-y-3">
          {groups.map(([date, items]) => {
            const d = parseISO(date);
            return (
              <section key={date} className="cozy-card p-4">
                <header className="mb-2 flex items-baseline justify-between">
                  <h3 className="font-display text-sm">{format(d, "EEEE, MMM d")}</h3>
                  <span className="text-xs text-muted-foreground">{format(d, "yyyy")}</span>
                </header>
                <ul className="space-y-1.5">
                  {items.map(e => (
                    <li key={e.id}>
                      <Link
                        to={`/cosmic-flow/event/${encodeURIComponent(e.id)}`}
                        className={cn("flex items-start gap-3 rounded-md border border-border/50 bg-card/60 p-2.5 transition-colors hover:bg-card",
                          e.tone === "warn" && "border-amber-500/40")}
                      >
                        <span className="text-base" aria-hidden>{e.glyph}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{e.title}</p>
                          {e.subtitle && <p className="text-[12px] text-muted-foreground">{e.subtitle}</p>}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}