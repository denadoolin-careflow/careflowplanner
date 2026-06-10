import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, addDays, startOfMonth, endOfMonth } from "date-fns";
import { ChevronLeft, Sparkles, ChevronRight, Home } from "lucide-react";
import type { CosmicEvent } from "@/lib/cosmic/events";
import {
  categoriesFor, elementFor, fourFoldFor, themesFor,
  CATEGORY_LABEL, type EventCategory, intensityFor,
} from "@/lib/cosmic/event-meta";
import { ELEMENT_VAR, type Element } from "@/lib/cosmic/glyphs";
import { useTransitsRange, type RangeEvent } from "@/hooks/useTransitsRange";
import { TransitDetailSheet } from "@/components/cosmic/TransitDetailSheet";
import { houseOverlayLine } from "@/lib/cosmic/transit-copy";
import { cn } from "@/lib/utils";

const FILTERS: { value: EventCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  ...(Object.entries(CATEGORY_LABEL) as [EventCategory, string][]).map(([v, l]) => ({ value: v, label: l })),
];

const RANGE_PRESETS: { value: string; label: string; resolve: (anchor: Date) => { from: Date; to: Date } }[] = [
  { value: "today",  label: "Today",     resolve: a => ({ from: a, to: a }) },
  { value: "week",   label: "±7 days",   resolve: a => ({ from: addDays(a, -7), to: addDays(a, 7) }) },
  { value: "30",     label: "Next 30",   resolve: a => ({ from: a, to: addDays(a, 30) }) },
  { value: "month",  label: "This month",resolve: a => ({ from: startOfMonth(a), to: endOfMonth(a) }) },
  { value: "2026",   label: "2026",      resolve: () => ({ from: new Date(2026, 0, 1), to: new Date(2026, 11, 31) }) },
  { value: "2027",   label: "2027",      resolve: () => ({ from: new Date(2027, 0, 1), to: new Date(2027, 11, 31) }) },
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

function TimelineRow({ event, date, onOpen }: { event: RangeEvent; date: Date; onOpen: () => void }) {
  const el = elementFor(event, date);
  const cats = categoriesFor(event);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "w-full rounded-lg border text-left transition-colors hover:border-primary/60",
        event.tone === "warn" ? "border-amber-500/40" : "border-border/50",
      )}
      style={rowGradient(el)}
    >
      <div className="flex items-start gap-3 p-3">
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
          {event.natalHouse && (
            <p className="mt-1 flex items-center gap-1 text-[11.5px] text-primary/80">
              <Sparkles className="h-3 w-3" /> {houseOverlayLine(event.natalHouse)}
            </p>
          )}
          {event.subtitle && <p className="mt-1 text-[12px] text-muted-foreground">{event.subtitle}</p>}
        </div>
        <Sparkles className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
    </button>
  );
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _suppressUnused = { fourFoldFor, themesFor };

export default function CosmicFlowTimeline() {
  const [filter, setFilter] = useState<EventCategory | "all">("all");
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [preset, setPreset] = useState<string>("30");
  const [active, setActive] = useState<CosmicEvent | null>(null);

  const { from, to } = useMemo(() => {
    const p = RANGE_PRESETS.find(r => r.value === preset) ?? RANGE_PRESETS[2];
    return p.resolve(anchor);
  }, [preset, anchor]);

  const events = useTransitsRange(from, to);
  const filtered = useMemo(
    () => filter === "all" ? events : events.filter(e => categoriesFor(e).includes(filter)),
    [filter, events],
  );
  const groups = useMemo(() => {
    const map = new Map<string, RangeEvent[]>();
    for (const e of filtered) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const shiftBy = (deltaDays: number) => () => setAnchor(d => addDays(d, deltaDays));

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-3 pb-28 sm:p-6 sm:pb-6">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h1 className="font-display text-xl sm:text-2xl">Transit Timeline</h1>
          <p className="text-sm text-muted-foreground">
            {format(from, "MMM d, yyyy")} – {format(to, "MMM d, yyyy")} · tap any row for the deeper read.
          </p>
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

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-muted-foreground">Range:</span>
        {RANGE_PRESETS.map(r => (
          <Button key={r.value} variant={preset === r.value ? "default" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setPreset(r.value)}>
            {r.label}
          </Button>
        ))}
        <div className="ml-auto flex items-center gap-0.5">
          <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={shiftBy(-30)} aria-label="Back 30 days">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setAnchor(new Date())}>
            <Home className="mr-1 h-3 w-3" /> Today
          </Button>
          <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={shiftBy(30)} aria-label="Forward 30 days">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
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
                      <TimelineRow event={e} date={d} onOpen={() => setActive(e)} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <TransitDetailSheet event={active} open={!!active} onOpenChange={v => !v && setActive(null)} />
    </div>
  );
}
