import { useMemo } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { MOON_INFO, getMoonPhase, getIllumination } from "@/lib/moon";
import { getMoonSign, SIGN_EMOJI } from "@/lib/zodiac";
import { eventsOnDay } from "@/lib/cosmic/events";
import { cn } from "@/lib/utils";

/** The note's day: period notes use their date; others use the created day. */
export function noteCosmicDate(date?: string | null, createdAt?: string | null): Date {
  try {
    if (date) return parseISO(date);
    if (createdAt) return parseISO(createdAt);
  } catch { /* fall through */ }
  return new Date();
}

/** Moon phase + sign for the note's day, with the day's cosmic events on hover. */
export function NoteCosmicStrip({ date, className }: { date: Date; className?: string }) {
  const { phase, sign, events, illum } = useMemo(() => {
    const noon = new Date(date); noon.setHours(12, 0, 0, 0);
    return {
      phase: MOON_INFO[getMoonPhase(noon)],
      sign: getMoonSign(noon),
      events: eventsOnDay(noon),
      illum: Math.round(getIllumination(noon) * 100),
    };
  }, [date]);
  const iso = format(date, "yyyy-MM-dd");

  return (
    <HoverCard openDelay={150} closeDelay={120}>
      <HoverCardTrigger asChild>
        <Link
          to={`/cosmic-flow/calendar?date=${iso}`}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] text-foreground/90 transition hover:border-primary/40 hover:bg-primary/5",
            className,
          )}
          aria-label={`${phase.label} in ${sign.name}, ${events.length} cosmic events`}
        >
          <span aria-hidden>{phase.glyph}</span>
          <span className="font-medium">{phase.label}</span>
          <span className="text-muted-foreground">in</span>
          <span aria-hidden>{SIGN_EMOJI[sign.name as keyof typeof SIGN_EMOJI]}</span>
          <span className="font-medium">{sign.name}</span>
          {events.length > 0 && (
            <span className="ml-0.5 rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">{events.length}</span>
          )}
        </Link>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-80 p-3">
        <div className="mb-2">
          <p className="font-display text-sm font-semibold">{phase.glyph} {phase.label} in {sign.name}</p>
          <p className="text-[11px] text-muted-foreground">{format(date, "EEEE, MMM d")} · {illum}% lit</p>
          <p className="mt-1 text-xs italic text-foreground/80">{phase.invitation}</p>
        </div>
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground">No other cosmic events this day.</p>
        ) : (
          <ul className="max-h-64 space-y-1.5 overflow-auto">
            {events.map(e => (
              <li key={e.id}>
                <Link to={`/cosmic-flow/event/${encodeURIComponent(e.id)}`} className="block rounded-md px-2 py-1.5 hover:bg-muted">
                  <p className="text-xs font-medium">{e.glyph} {e.title}</p>
                  {e.subtitle && <p className="text-[11px] leading-snug text-muted-foreground">{e.subtitle}</p>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

export function useNoteCosmicEvents(date: Date) {
  return useMemo(() => {
    const noon = new Date(date); noon.setHours(12, 0, 0, 0);
    return eventsOnDay(noon);
  }, [date]);
}
