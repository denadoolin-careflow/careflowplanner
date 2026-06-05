import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format, parseISO } from "date-fns";
import { ChevronLeft, ChevronDown, Sparkles } from "lucide-react";
import { upcomingEvents, type CosmicEvent } from "@/lib/cosmic/events";
import {
  categoriesFor, elementFor, fourFoldFor, themesFor,
  CATEGORY_LABEL, type EventCategory, intensityFor,
} from "@/lib/cosmic/event-meta";
import { ELEMENT_VAR, type Element } from "@/lib/cosmic/glyphs";
import { cn } from "@/lib/utils";

const FILTERS: { value: EventCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  ...(Object.entries(CATEGORY_LABEL) as [EventCategory, string][]).map(([v, l]) => ({ value: v, label: l })),
];

function elementChipStyle(el: Element | null): React.CSSProperties {
  if (!el) return {};
  const v = ELEMENT_VAR[el];
  return { background: `hsl(var(${v}) / 0.16)`, color: `hsl(var(${v}))`, borderColor: `hsl(var(${v}) / 0.3)` };
}

function rowGradient(el: Element | null): React.CSSProperties {
  if (!el) return {};
  const v = ELEMENT_VAR[el];
  return { background: `linear-gradient(135deg, hsl(var(${v}) / 0.10), hsl(var(--card)))` };
}

function Stars({ n }: { n: number }) {
  const filled = Math.max(0, Math.min(5, n));
  return <span className="font-mono text-[11px] text-primary/70" aria-label={`Intensity ${filled} of 5`}>{"★".repeat(filled)}{"☆".repeat(5 - filled)}</span>;
}

function TimelineRow({ event, date }: { event: CosmicEvent; date: Date }) {
  const [open, setOpen] = useState(false);
  const el = elementFor(event, date);
  const cats = categoriesFor(event);
  const ff = fourFoldFor(event);
  const themes = themesFor(event);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn("rounded-lg border transition-colors", event.tone === "warn" ? "border-amber-500/40" : "border-border/50")}
        style={rowGradient(el)}
      >
        <CollapsibleTrigger className="flex w-full items-start gap-3 p-3 text-left">
          <span aria-hidden className="mt-0.5 text-lg">{event.glyph}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-tight">{event.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {el && (
                <Badge variant="outline" className="border px-1.5 py-0 text-[10px]" style={elementChipStyle(el)}>
                  {el}
                </Badge>
              )}
              {cats.slice(0, 2).map(c => (
                <Badge key={c} variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">{CATEGORY_LABEL[c]}</Badge>
              ))}
              <Stars n={intensityFor(event)} />
            </div>
            {event.subtitle && <p className="mt-1 text-[12px] text-muted-foreground">{event.subtitle}</p>}
          </div>
          <ChevronDown className={cn("h-4 w-4 mt-1 text-muted-foreground transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-3 border-t border-border/40 px-3 py-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Block label="Plan" body={ff.plan} />
              <Block label="Care" body={ff.care} />
              <Block label="Grow" body={ff.grow} />
              <Block label="Release" body={ff.release} />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Block label="Emotional" body={themes.emotional} />
              <Block label="Relationships" body={themes.relationships} />
              <Block label="Career" body={themes.career} />
              <Block label="Family" body={themes.family} />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild size="sm" variant="default" className="h-8 gap-1.5">
                <Link to={`/cosmic-flow/event/${encodeURIComponent(event.id)}`}>
                  <Sparkles className="h-3.5 w-3.5" /> Deeper insight
                </Link>
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function Block({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-md border border-border/40 bg-background/40 p-2">
      <p className="text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-[12.5px] leading-snug">{body}</p>
    </div>
  );
}

export default function CosmicFlowTimeline() {
  const [filter, setFilter] = useState<EventCategory | "all">("all");
  const [days, setDays] = useState(30);
  const events = useMemo(() => upcomingEvents(new Date(), days), [days]);
  const filtered = useMemo(
    () => filter === "all" ? events : events.filter(e => categoriesFor(e).includes(filter)),
    [filter, events],
  );
  const groups = useMemo(() => {
    const map = new Map<string, CosmicEvent[]>();
    for (const e of filtered) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-3 pb-28 sm:p-6 sm:pb-6">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h1 className="font-display text-xl sm:text-2xl">Transit Timeline</h1>
          <p className="text-sm text-muted-foreground">The next {days} days of cosmic events — tap any row to open the deeper read.</p>
        </div>
        <Button asChild variant="ghost" size="sm" className="shrink-0">
          <Link to="/cosmic-flow" className="flex items-center gap-1"><ChevronLeft className="h-4 w-4" /><span className="hidden sm:inline">Dashboard</span></Link>
        </Button>
      </header>

      <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {FILTERS.map(f => (
          <Button
            key={f.value}
            size="sm"
            variant={filter === f.value ? "default" : "outline"}
            className="h-7 shrink-0 text-xs"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <span className="mr-1 text-xs text-muted-foreground">Range:</span>
        {[30, 60, 90].map(d => (
          <Button key={d} variant={days === d ? "default" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setDays(d)}>{d}d</Button>
        ))}
      </div>

      {groups.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">No events match this filter.</p>
      ) : (
        <div className="space-y-4">
          {groups.map(([date, items]) => {
            const d = parseISO(date);
            return (
              <section key={date} className="cozy-card p-3 sm:p-4">
                <header className="mb-2 flex items-baseline justify-between">
                  <h3 className="font-display text-sm">{format(d, "EEEE, MMM d")}</h3>
                  <span className="text-xs text-muted-foreground">{format(d, "yyyy")}</span>
                </header>
                <ul className="space-y-2">
                  {items.map(e => (
                    <li key={e.id}>
                      <TimelineRow event={e} date={d} />
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
