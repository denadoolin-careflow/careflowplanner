import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { upcomingEvents } from "@/lib/cosmic/events";
import { addDays, format, parseISO, isSameDay } from "date-fns";
import { getMoonSign } from "@/lib/zodiac";
import { getMoonPhase, MOON_INFO } from "@/lib/moon";
import { SIGN_GLYPH } from "@/lib/cosmic/glyphs";
import { cn } from "@/lib/utils";

type Range = "Today" | "Tomorrow" | "7 Days" | "30 Days";
const RANGES: Range[] = ["Today", "Tomorrow", "7 Days", "30 Days"];

export function CosmicTimelineTabs({ from = new Date() }: { from?: Date }) {
  const [range, setRange] = useState<Range>("Today");
  const events = useMemo(() => upcomingEvents(from, 30), [from]);

  const items = useMemo(() => {
    const today = from;
    const tomorrow = addDays(from, 1);
    const base = [
      {
        id: "today-moon",
        date: format(today, "yyyy-MM-dd"),
        glyph: MOON_INFO[getMoonPhase(today)].glyph,
        title: `Moon in ${getMoonSign(today).name}`,
        sub: "All day",
      },
    ];
    if (range === "Tomorrow" || range === "7 Days" || range === "30 Days") {
      base.push({
        id: "tomorrow-moon",
        date: format(tomorrow, "yyyy-MM-dd"),
        glyph: SIGN_GLYPH[getMoonSign(tomorrow).name],
        title: `Moon in ${getMoonSign(tomorrow).name}`,
        sub: format(tomorrow, "MMM d"),
      });
    }
    let window = events;
    if (range === "Today") window = events.filter(e => isSameDay(parseISO(e.date), today));
    else if (range === "Tomorrow") window = events.filter(e => isSameDay(parseISO(e.date), tomorrow));
    else if (range === "7 Days") window = events.filter(e => parseISO(e.date) <= addDays(today, 7));
    return [
      ...base,
      ...window.slice(0, range === "30 Days" ? 8 : 6).map(e => ({
        id: e.id, date: e.date, glyph: e.glyph,
        title: e.title, sub: format(parseISO(e.date), "MMM d"),
      })),
    ];
  }, [range, events, from]);

  return (
    <section className="cozy-card p-5" aria-label="Cosmic timeline">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-base">Cosmic Timeline</h3>
        <Link to="/cosmic-flow/calendar" className="text-xs text-primary hover:underline">View calendar</Link>
      </header>
      <div className="mb-3 flex gap-1.5 border-b border-border/40">
        {RANGES.map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={cn(
              "px-2.5 py-1.5 text-[12.5px] -mb-px border-b-2 transition-colors",
              range === r ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="-mx-1 overflow-x-auto">
        <ul className="flex gap-2 px-1 pb-1">
          {items.map(it => (
            <li key={it.id} className="w-[120px] shrink-0 rounded-lg border border-border/50 bg-card/60 p-2.5">
              <p className="text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground">{it.sub}</p>
              <div className="mt-1.5 flex items-center justify-center text-2xl" aria-hidden>{it.glyph}</div>
              <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-snug">{it.title}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mt-2 h-1 rounded-full bg-muted/60">
        <div className="absolute inset-y-0 left-0 w-1/4 rounded-full bg-primary/60" />
      </div>
    </section>
  );
}