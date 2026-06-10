/**
 * Daily transiting-planet aspect events (conjunction, sextile, square,
 * trine, opposition) plus cazimi (Sun conjunct planet within 17'). We
 * emit an event only on the day the aspect is closest to exact, so the
 * timeline doesn't get spammed across the multi-day applying/separating
 * window.
 */
import { addDays, format } from "date-fns";
import {
  type Planet, planetLongitude, PLANET_GLYPH,
} from "@/lib/transits";
import type { CosmicEvent } from "./events";
export type { AspectName as AspectKind };

const PLANETS: Planet[] = ["Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];

export type AspectName = "conjunction" | "sextile" | "square" | "trine" | "opposition";

interface AspectDef { name: AspectName; angle: number; glyph: string; orb: number; tone: CosmicEvent["tone"]; }

const ASPECTS: AspectDef[] = [
  { name: "conjunction", angle: 0,   glyph: "☌", orb: 1.0, tone: "soft" },
  { name: "sextile",     angle: 60,  glyph: "✶", orb: 1.0, tone: "soft" },
  { name: "square",      angle: 90,  glyph: "□", orb: 1.0, tone: "warn" },
  { name: "trine",       angle: 120, glyph: "△", orb: 1.0, tone: "soft" },
  { name: "opposition",  angle: 180, glyph: "☍", orb: 1.0, tone: "warn" },
];

const CAZIMI_ORB = 17 / 60; // 0°17'

function sep(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}
function orbFor(la: number, lb: number, target: number): number {
  return Math.abs(sep(la, lb) - target);
}

export function aspectEventsOnDay(date: Date): CosmicEvent[] {
  const out: CosmicEvent[] = [];
  const yday = addDays(date, -1);
  const tmrw = addDays(date, 1);
  const lons: Record<string, number> = {};
  const ly: Record<string, number> = {};
  const lt: Record<string, number> = {};
  for (const p of PLANETS) {
    lons[p] = planetLongitude(p, date);
    ly[p] = planetLongitude(p, yday);
    lt[p] = planetLongitude(p, tmrw);
  }
  const iso = format(date, "yyyy-MM-dd");

  for (let i = 0; i < PLANETS.length; i++) {
    for (let j = i + 1; j < PLANETS.length; j++) {
      const a = PLANETS[i], b = PLANETS[j];
      for (const asp of ASPECTS) {
        const o = orbFor(lons[a], lons[b], asp.angle);
        if (o > asp.orb) continue;
        const oy = orbFor(ly[a], ly[b], asp.angle);
        const ot = orbFor(lt[a], lt[b], asp.angle);
        // Emit only on the local minimum day (closest to exact).
        if (o > oy || o > ot) continue;

        const isCazimi = asp.name === "conjunction" && (a === "Sun" || b === "Sun") && o < CAZIMI_ORB;
        const other = a === "Sun" ? b : a;
        const id = `${isCazimi ? "cazimi" : "aspect"}~${iso}~${a}-${asp.name}-${b}`;
        const titleAsp = asp.name.charAt(0).toUpperCase() + asp.name.slice(1);
        out.push({
          id,
          date: iso,
          kind: isCazimi ? "cazimi" : "aspect",
          planet: a,
          glyph: `${PLANET_GLYPH[a]}${asp.glyph}${PLANET_GLYPH[b]}`,
          title: isCazimi
            ? `${other} cazimi`
            : `${a} ${titleAsp.toLowerCase()} ${b}`,
          subtitle: isCazimi
            ? `${other} is in the heart of the Sun — a brief, illuminating empowerment.`
            : `${titleAsp} exact today (orb ${o.toFixed(1)}°).`,
          tone: asp.tone,
          aspect: asp.name,
          partner: b,
        } as CosmicEvent);
      }
    }
  }
  return out;
}