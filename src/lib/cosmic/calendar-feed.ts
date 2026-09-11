/**
 * Adapter that exposes Cosmic Flow events as calendar items, keyed by
 * ISO date. Pure-compute; never persisted. Used by CalendarPage.
 */
import { addDays, format } from "date-fns";
import { eventsOnDay } from "@/lib/cosmic/events";
import type { CosmicEvent } from "@/lib/cosmic/events";

export interface CosmicCalendarItem {
  kind: "cosmic";
  id: string;
  label: string;
  time?: string;
  /** Short meaning text, shown in hover previews. */
  subtitle?: string;
  tone?: CosmicEvent["tone"];
  glyph?: string;
  title?: string;
  eventKind?: CosmicEvent["kind"];
}

/** Compute cosmic events for a window and return a Map keyed by ISO date. */
export function buildCosmicCalendarIndex(from: Date, days: number): Map<string, CosmicCalendarItem[]> {
  const map = new Map<string, CosmicCalendarItem[]>();
  for (let i = 0; i < days; i++) {
    const d = addDays(from, i);
    const iso = format(d, "yyyy-MM-dd");
    const list = eventsOnDay(d).map(e => ({
      kind: "cosmic" as const,
      id: e.id,
      label: `${e.glyph} ${e.title}`,
      subtitle: e.subtitle,
      tone: e.tone,
      glyph: e.glyph,
      title: e.title,
      eventKind: e.kind,
    }));
    if (list.length) map.set(iso, list);
  }
  return map;
}
