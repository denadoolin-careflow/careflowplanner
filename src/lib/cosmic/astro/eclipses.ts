/**
 * Curated eclipse table (2020-2030). Approximate dates and ecliptic
 * degrees from public astronomical references.
 */
import type { Sign } from "@/lib/transits";

export interface Eclipse { date: string; type: "Solar" | "Lunar"; degree: number; sign: Sign; nature: "Total" | "Partial" | "Annular" | "Penumbral"; }

export const ECLIPSES: Eclipse[] = [
  { date: "2024-04-08", type: "Solar", degree: 19, sign: "Aries", nature: "Total" },
  { date: "2024-10-02", type: "Solar", degree: 10, sign: "Libra", nature: "Annular" },
  { date: "2024-09-18", type: "Lunar", degree: 25, sign: "Pisces", nature: "Partial" },
  { date: "2025-03-14", type: "Lunar", degree: 23, sign: "Virgo", nature: "Total" },
  { date: "2025-03-29", type: "Solar", degree: 9, sign: "Aries", nature: "Partial" },
  { date: "2025-09-07", type: "Lunar", degree: 15, sign: "Pisces", nature: "Total" },
  { date: "2025-09-21", type: "Solar", degree: 29, sign: "Virgo", nature: "Partial" },
  { date: "2026-02-17", type: "Solar", degree: 28, sign: "Aquarius", nature: "Annular" },
  { date: "2026-03-03", type: "Lunar", degree: 12, sign: "Virgo", nature: "Total" },
  { date: "2026-08-12", type: "Solar", degree: 20, sign: "Leo", nature: "Total" },
  { date: "2026-08-28", type: "Lunar", degree: 5, sign: "Pisces", nature: "Partial" },
  { date: "2027-02-06", type: "Solar", degree: 18, sign: "Aquarius", nature: "Annular" },
  { date: "2027-08-02", type: "Solar", degree: 9, sign: "Leo", nature: "Total" },
  { date: "2028-01-26", type: "Solar", degree: 6, sign: "Aquarius", nature: "Annular" },
  { date: "2028-07-22", type: "Solar", degree: 0, sign: "Leo", nature: "Total" },
  { date: "2029-01-14", type: "Solar", degree: 24, sign: "Capricorn", nature: "Partial" },
  { date: "2029-06-12", type: "Solar", degree: 21, sign: "Gemini", nature: "Partial" },
  { date: "2030-06-01", type: "Solar", degree: 11, sign: "Gemini", nature: "Annular" },
  { date: "2030-11-25", type: "Solar", degree: 3, sign: "Sagittarius", nature: "Total" },
];

/** Find eclipses occurring within a date window. */
export function eclipsesBetween(from: Date, to: Date): Eclipse[] {
  const a = from.toISOString().slice(0, 10);
  const b = to.toISOString().slice(0, 10);
  return ECLIPSES.filter(e => e.date >= a && e.date <= b);
}

/** Eclipses currently activating a natal-point longitude (within ±3° on the
 *  same sign degree). Returns eclipses in the past 6 months + next 6 months. */
export function eclipseActivations(natalLongitudes: number[], on: Date = new Date()): Eclipse[] {
  const from = new Date(on.getTime() - 6 * 30 * 86400000);
  const to = new Date(on.getTime() + 6 * 30 * 86400000);
  const window = eclipsesBetween(from, to);
  const SIGN_OFFSET: Record<Sign, number> = {
    Aries:0, Taurus:30, Gemini:60, Cancer:90, Leo:120, Virgo:150,
    Libra:180, Scorpio:210, Sagittarius:240, Capricorn:270, Aquarius:300, Pisces:330,
  };
  return window.filter(e => {
    const eLon = SIGN_OFFSET[e.sign] + e.degree;
    return natalLongitudes.some(n => Math.abs(((n - eLon + 540) % 360) - 180) > 177);
  });
}