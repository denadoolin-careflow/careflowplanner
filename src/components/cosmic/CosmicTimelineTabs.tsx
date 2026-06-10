import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { eventsOnDay, type CosmicEvent } from "@/lib/cosmic/events";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { getMoonSign } from "@/lib/zodiac";
import { getMoonPhase, MOON_INFO } from "@/lib/moon";
import { ELEMENT_VAR } from "@/lib/cosmic/glyphs";
import { elementFor } from "@/lib/cosmic/event-meta";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TransitDetailSheet } from "./TransitDetailSheet";

export function CosmicTimelineTabs({ from = new Date() }: { from?: Date }) {
  const [anchor, setAnchor] = useState<Date>(() => startOfWeek(from, { weekStartsOn: 0 }));
  const [active, setActive] = useState<CosmicEvent | null>(null);

  const items = useMemo(() => {
    const today = new Date();
    const all: { id: string; date: Date; event?: CosmicEvent; glyph: string; title: string; sub: string; isMoon?: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(anchor, i);
      // Always include the day's Moon-in-sign as a soft marker.
      const ms = getMoonSign(d);
      all.push({
        id: `${format(d, "yyyy-MM-dd")}-moon`,
        date: d,
        glyph: MOON_INFO[getMoonPhase(d)].glyph,
        title: `Moon in ${ms.name}`,
        sub: isSameDay(d, today) ? "Today" : format(d, "EEE MMM d"),
        isMoon: true,
      });
      for (const ev of eventsOnDay(d)) {
        all.push({
          id: ev.id,
          date: d,
          event: ev,
          glyph: ev.glyph,
          title: ev.title,
          sub: format(d, "EEE MMM d"),
        });
      }
    }
    return all;
  }, [anchor]);

  return (
    <section className="cozy-card p-5" aria-label="Cosmic timeline">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-display text-base">Cosmic Timeline · This Week</h3>
        <Link to="/cosmic-flow/calendar" className="text-xs text-primary hover:underline">View calendar</Link>
      </header>

      <div className="mb-3 flex items-center justify-between gap-2">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAnchor(a => addDays(a, -7))} aria-label="Previous week">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
              <CalendarIcon className="h-3.5 w-3.5" />
              {format(anchor, "MMM d")} – {format(addDays(anchor, 6), "MMM d, yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              mode="single"
              selected={anchor}
              onSelect={(d) => d && setAnchor(startOfWeek(d, { weekStartsOn: 0 }))}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAnchor(a => addDays(a, 7))} aria-label="Next week">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="-mx-1 overflow-x-auto">
        <ul className="flex gap-2 px-1 pb-1">
          {items.map(it => {
            const el = it.event ? elementFor(it.event, it.date) : null;
            const styleAccent: React.CSSProperties = el
              ? { borderColor: `hsl(var(${ELEMENT_VAR[el]}) / 0.55)`, background: `hsl(var(${ELEMENT_VAR[el]}) / 0.08)` }
              : {};
            const glyphStyle: React.CSSProperties = el ? { color: `hsl(var(${ELEMENT_VAR[el]}))` } : {};
            const clickable = !!it.event;
            return (
              <li key={it.id} className="w-[128px] shrink-0">
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => it.event && setActive(it.event)}
                  className={cn(
                    "w-full rounded-lg border border-border/50 bg-card/60 p-2.5 text-left transition-transform",
                    clickable && "hover:scale-[1.02] hover:border-primary/40",
                  )}
                  style={styleAccent}
                  aria-label={clickable ? `Open ${it.title}` : it.title}
                >
                  <p className="text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground">{it.sub}</p>
                  <div className="mt-1.5 flex items-center justify-center text-2xl" aria-hidden style={glyphStyle}>{it.glyph}</div>
                  <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-snug">{it.title}</p>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <TransitDetailSheet event={active} open={!!active} onOpenChange={v => !v && setActive(null)} />
    </section>
  );
}