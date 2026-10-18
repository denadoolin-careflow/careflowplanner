import { hashBirth, type NatalChartV2 } from "./chart";
import { chapterSummary, monthMoon, progressedLunation, solarReturnChart, timeLordReport } from "./year-chapter";

/** Shared calculation for the visible panels and written chapter. */
export function chapterReading(chart: NatalChartV2, on: Date = new Date()) {
  const tl = timeLordReport(chart, on), sr = solarReturnChart(chart, on);
  const pl = progressedLunation(chart, on), mm = monthMoon(chart, on);
  return { tl, sr, pl, mm, summary: chapterSummary(tl, sr, pl, mm), on };
}
export type ChapterReading = ReturnType<typeof chapterReading>;

export function chapterContext(chart: NatalChartV2, reading: ChapterReading) {
  const { tl, sr, pl, mm, summary, on } = reading;
  return {
    version: 2, key: `2:${hashBirth(chart.birth)}:${on.toISOString().slice(0, 10)}`, asOf: on.toISOString(),
    houseBasis: chart.houses ? "birth-time-and-place" : "whole-sign-from-Sun; approximate, not a known rising sign",
    timeLord: tl,
    solarReturn: {
      began: sr.last.toISOString(), next: sr.next.toISOString(), daysToNext: sr.daysToNext,
      rising: sr.rising, sunHouse: sr.sunHouse, sunHouseMeaning: sr.sunHouseMeaning,
      moonSign: sr.moonSign, moonHouse: sr.moonHouse, angular: sr.angular, usesWholeSignFromSun: sr.usesWholeSignFromSun,
    },
    progressedMoon: pl,
    monthlyMoon: { waxing: mm.waxing, next: mm.next.map(l => ({ kind: l.kind, date: l.date.toISOString(), sign: l.sign, house: l.house, eclipseSeason: l.eclipseSeason })) },
    summary,
  };
}

export function chapterMatchesContext(signals: unknown, key: string): boolean {
  if (!signals || typeof signals !== "object" || !("readingContext" in signals)) return false;
  const context = signals.readingContext;
  return !!context && typeof context === "object" && "key" in context && context.key === key;
}