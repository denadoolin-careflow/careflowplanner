/**
 * Planetary returns: solar, lunar, Saturn, Jupiter, generic.
 */
import { bodyLongitude, type ExtPlanet } from "./bodies";

function sweepForReturn(body: ExtPlanet, natalLon: number, startDate: Date, maxDays: number, stepDays: number): Date | null {
  let prev = bodyLongitude(body, startDate);
  for (let i = 1; i <= maxDays / stepDays; i++) {
    const t = new Date(startDate.getTime() + i * stepDays * 86400000);
    const cur = bodyLongitude(body, t);
    // Detect crossing of natalLon
    const a = ((prev - natalLon + 540) % 360) - 180;
    const b = ((cur  - natalLon + 540) % 360) - 180;
    if (a <= 0 && b > 0) {
      // Linear interp
      const frac = -a / (b - a);
      return new Date(t.getTime() - stepDays * 86400000 * (1 - frac));
    }
    prev = cur;
  }
  return null;
}

export function nextSolarReturn(birth: Date, from: Date = new Date()): Date | null {
  const natalLon = bodyLongitude("Sun", birth);
  return sweepForReturn("Sun", natalLon, from, 400, 1);
}
export function nextLunarReturn(birth: Date, from: Date = new Date()): Date | null {
  const natalLon = bodyLongitude("Moon", birth);
  return sweepForReturn("Moon", natalLon, from, 35, 0.25);
}
export function nextSaturnReturn(birth: Date, from: Date = new Date()): Date | null {
  const natalLon = bodyLongitude("Saturn" as ExtPlanet, birth);
  return sweepForReturn("Saturn" as ExtPlanet, natalLon, from, 365 * 30, 7);
}
export function nextJupiterReturn(birth: Date, from: Date = new Date()): Date | null {
  const natalLon = bodyLongitude("Jupiter" as ExtPlanet, birth);
  return sweepForReturn("Jupiter" as ExtPlanet, natalLon, from, 365 * 13, 5);
}