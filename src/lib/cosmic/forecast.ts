/**
 * Lightweight 7-day "cosmic forecast" scoring.
 * Favorable = phase momentum + no active retrogrades.
 * Challenging = retrograde stations, void moon, eclipses.
 * Reflective = full or last-quarter days, eclipses adjacent.
 */
import { addDays, format } from "date-fns";
import { isRetrograde, isVoidOfCourse, type Planet } from "@/lib/transits";
import { getMoonPhase } from "@/lib/moon";

export type ForecastTone = "favorable" | "challenging" | "reflective";

export interface ForecastDay {
  date: string;
  label: string;
  score: number;       // -3..+3
  tone: ForecastTone;
}

const RX_PLANETS: Planet[] = ["Mercury", "Venus", "Mars"];

export function getForecast(from: Date = new Date(), days = 7): ForecastDay[] {
  const out: ForecastDay[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(from, i);
    let score = 1;
    const phase = getMoonPhase(d);
    if (phase === "waxing-crescent" || phase === "waxing-gibbous") score += 1;
    if (phase === "full" || phase === "last-quarter") score -= 1;
    if (isVoidOfCourse(d)) score -= 1;
    for (const p of RX_PLANETS) {
      if (isRetrograde(p, d)) score -= 1;
    }
    let tone: ForecastTone = "favorable";
    if (score <= -1) tone = "challenging";
    else if (phase === "full" || phase === "last-quarter") tone = "reflective";
    out.push({
      date: format(d, "yyyy-MM-dd"),
      label: format(d, "EEE"),
      score,
      tone,
    });
  }
  return out;
}