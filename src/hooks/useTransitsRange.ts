/**
 * Compute cosmic events across an arbitrary date range, with natal-house
 * overlay attached when the user has a birth chart on file.
 *
 * Pure-client; relies on `eventsOnDay()` (deterministic) + `computeHouses()`.
 */
import { useMemo } from "react";
import { addDays, differenceInCalendarDays } from "date-fns";
import { eventsOnDay, type CosmicEvent } from "@/lib/cosmic/events";
import { computeHouses, houseOf } from "@/lib/cosmic/astro/houses";
import { planetLongitude } from "@/lib/transits";
import { useBirthChart } from "@/lib/cosmic/hooks";

export interface RangeEvent extends CosmicEvent {
  natalHouse?: number;
}

export function useTransitsRange(from: Date, to: Date) {
  const { row } = useBirthChart();

  const houses = useMemo(() => {
    if (!row) return null;
    const birth = new Date(`${row.birth_date}T${row.birth_time ?? "12:00"}:00`);
    return computeHouses(birth, row.birth_lat ?? null, row.birth_lng ?? null, "whole-sign");
  }, [row]);

  return useMemo(() => {
    const start = from < to ? from : to;
    const end = from < to ? to : from;
    const days = Math.max(1, differenceInCalendarDays(end, start) + 1);
    const out: RangeEvent[] = [];
    for (let i = 0; i < days; i++) {
      const d = addDays(start, i);
      for (const e of eventsOnDay(d)) {
        const ev: RangeEvent = { ...e };
        if (houses && e.planet) {
          try {
            const lon = planetLongitude(e.planet, d);
            ev.natalHouse = houseOf(lon, houses);
          } catch { /* ignore */ }
        }
        out.push(ev);
      }
    }
    return out;
  }, [from, to, houses]);
}

/** Standalone helper for places that don't want the hook. */
export function natalHouseForEvent(
  event: CosmicEvent,
  date: Date,
  row: { birth_date: string; birth_time: string | null; birth_lat: number | null; birth_lng: number | null } | null,
): number | undefined {
  if (!row || !event.planet) return undefined;
  const birth = new Date(`${row.birth_date}T${row.birth_time ?? "12:00"}:00`);
  const houses = computeHouses(birth, row.birth_lat ?? null, row.birth_lng ?? null, "whole-sign");
  if (!houses) return undefined;
  try {
    return houseOf(planetLongitude(event.planet, date), houses);
  } catch { return undefined; }
}