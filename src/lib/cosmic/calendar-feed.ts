/**
 * Adapter that exposes Cosmic Flow events as calendar items, keyed by
 * ISO date. Pure-compute; never persisted. Used by CalendarPage.
 */
import { addDays, format } from "date-fns";
import { eventsOnDay } from "@/lib/cosmic/events";

export interface CosmicCalendarItem {
  kind: "cosmic";
  id: string;
  label: string;
  time?: string;
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
    }));
    if (list.length) map.set(iso, list);
  }
  return map;
}