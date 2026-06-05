/**
 * Secondary progressions ("day-for-a-year") and solar arc directions.
 */
import { bodyLongitude, bodySign, type ExtPlanet } from "./bodies";
import type { Sign } from "@/lib/transits";

export interface ProgressedSnapshot {
  date: string;
  progressedSun: { sign: Sign; longitude: number };
  progressedMoon: { sign: Sign; longitude: number; lunarPhase: string };
  solarArc: number; // degrees of arc since birth
}

const SIGNS = [
  "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
  "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces",
] as Sign[];

/** Convert birth + target date into a "progressed date" (one day = one year). */
function progressedDate(birth: Date, target: Date): Date {
  const years = (target.getTime() - birth.getTime()) / (365.25 * 86400000);
  return new Date(birth.getTime() + years * 86400000);
}

function lunarPhaseLabel(sunLon: number, moonLon: number): string {
  const diff = ((moonLon - sunLon + 360) % 360);
  if (diff < 45) return "New";
  if (diff < 90) return "Crescent";
  if (diff < 135) return "First Quarter";
  if (diff < 180) return "Gibbous";
  if (diff < 225) return "Full";
  if (diff < 270) return "Disseminating";
  if (diff < 315) return "Last Quarter";
  return "Balsamic";
}

export function computeProgressions(birth: Date, target: Date = new Date()): ProgressedSnapshot {
  const pd = progressedDate(birth, target);
  const sunLon = bodyLongitude("Sun" as ExtPlanet, pd);
  const moonLon = bodyLongitude("Moon" as ExtPlanet, pd);
  const sunSign = bodySign("Sun" as ExtPlanet, pd);
  const moonSign = bodySign("Moon" as ExtPlanet, pd);
  const natalSunLon = bodyLongitude("Sun" as ExtPlanet, birth);
  const solarArc = ((sunLon - natalSunLon + 540) % 360) - 180;
  return {
    date: target.toISOString().slice(0, 10),
    progressedSun: { sign: sunSign, longitude: sunLon },
    progressedMoon: { sign: moonSign, longitude: moonLon, lunarPhase: lunarPhaseLabel(sunLon, moonLon) },
    solarArc,
  };
}

/** Apply solar-arc directions to a natal longitude. */
export function solarArcLongitude(natalLon: number, arc: number): number {
  return ((natalLon + arc) % 360 + 360) % 360;
}

/** Approx years remaining until progressed Moon changes sign. */
export function progressedMoonNextIngress(birth: Date, from: Date = new Date()): { date: string; sign: Sign } {
  // Progressed Moon moves ~12-15° / year (1 deg ≈ 1 month).
  let cur = bodySign("Moon" as ExtPlanet, progressedDate(birth, from));
  for (let m = 1; m < 36; m++) {
    const probe = new Date(from.getTime() + m * 30 * 86400000);
    const s = bodySign("Moon" as ExtPlanet, progressedDate(birth, probe));
    if (s !== cur) {
      return { date: probe.toISOString().slice(0, 10), sign: s };
    }
    cur = cur;
  }
  return { date: "", sign: cur };
}

export { SIGNS };