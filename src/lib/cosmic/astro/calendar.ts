/**
 * Astro calendar — month view of moon phases, ingresses, retrogrades,
 * VoC moon, solstices/equinoxes, cross-quarter shifts.
 */
import { bodySign, bodyLongitude, bodyRetrograde, type ExtPlanet } from "./bodies";
import { isIngressDay, isVoidOfCourse, planetSign, type Planet } from "@/lib/transits";

export type AstroEventKind =
  | "new-moon" | "first-quarter" | "full-moon" | "last-quarter"
  | "ingress" | "retrograde-start" | "direct-station"
  | "voc" | "solstice" | "equinox" | "cross-quarter";

export interface AstroEvent {
  date: string;       // yyyy-mm-dd
  kind: AstroEventKind;
  label: string;
  detail?: string;
  planet?: string;
  sign?: string;
}

function lunarPhase(d: Date): number {
  // 0 = new, 0.5 = full
  const sun = bodyLongitude("Sun", d);
  const moon = bodyLongitude("Moon", d);
  return (((moon - sun) % 360 + 360) % 360) / 360;
}

export function buildMonthEvents(year: number, month0: number): AstroEvent[] {
  const events: AstroEvent[] = [];
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const PLANETS_OUT: Planet[] = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
  const PLANETS_EXT: ExtPlanet[] = ["Uranus", "Neptune", "Pluto", "Chiron"];

  let prevPhase = lunarPhase(new Date(year, month0, 1));
  let prevSign: Record<string, string> = {};
  let prevRetro: Record<string, boolean> = {};
  for (const p of [...PLANETS_OUT, ...PLANETS_EXT]) {
    prevSign[p] = bodySign(p as ExtPlanet, new Date(year, month0, 1)) as string;
    prevRetro[p] = bodyRetrograde(p as ExtPlanet, new Date(year, month0, 1));
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month0, d, 12);
    const iso = date.toISOString().slice(0, 10);
    const phase = lunarPhase(date);
    // detect phase crossings
    const crossings: Array<[number, AstroEventKind, string]> = [
      [0,    "new-moon",        "New Moon"],
      [0.25, "first-quarter",   "First Quarter Moon"],
      [0.5,  "full-moon",       "Full Moon"],
      [0.75, "last-quarter",    "Last Quarter Moon"],
    ];
    for (const [target, kind, label] of crossings) {
      const a = ((prevPhase - target + 1) % 1);
      const b = ((phase - target + 1) % 1);
      if (a > 0.9 && b < 0.1) {
        const sign = bodySign("Moon", date);
        events.push({ date: iso, kind, label, sign, detail: `${label} in ${sign}` });
      }
    }
    prevPhase = phase;

    for (const p of [...PLANETS_OUT, ...PLANETS_EXT]) {
      const sign = bodySign(p as ExtPlanet, date) as string;
      if (sign !== prevSign[p]) {
        events.push({ date: iso, kind: "ingress", label: `${p} enters ${sign}`, planet: p, sign });
        prevSign[p] = sign;
      }
      if (p !== "Sun" && PLANETS_OUT.includes(p as Planet)) {
        const rx = isRetrograde(p as Planet, date);
        if (rx !== prevRetro[p]) {
          events.push({
            date: iso,
            kind: rx ? "retrograde-start" : "direct-station",
            label: rx ? `${p} retrograde begins` : `${p} stations direct`,
            planet: p,
          });
          prevRetro[p] = rx;
        }
      }
    }

    if (isVoidOfCourse(date)) {
      events.push({ date: iso, kind: "voc", label: "Void of course moon" });
    }

    // Solstices/equinoxes — when Sun enters Aries/Cancer/Libra/Capricorn
    const sunSign = planetSign("Sun", date);
    const yesterday = planetSign("Sun", new Date(date.getTime() - 86400000));
    if (sunSign !== yesterday) {
      if (sunSign === "Aries") events.push({ date: iso, kind: "equinox", label: "Spring Equinox" });
      else if (sunSign === "Cancer") events.push({ date: iso, kind: "solstice", label: "Summer Solstice" });
      else if (sunSign === "Libra") events.push({ date: iso, kind: "equinox", label: "Autumn Equinox" });
      else if (sunSign === "Capricorn") events.push({ date: iso, kind: "solstice", label: "Winter Solstice" });
    }
  }
  return events;
}