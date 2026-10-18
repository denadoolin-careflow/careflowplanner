import { describe, it, expect } from "vitest";
import { computeNatalV2 } from "./chart";
import { timeLordReport, solarReturnChart, progressedLunation, monthMoon, chapterSummary } from "./year-chapter";
import { bodyLongitude } from "./astro/bodies";
import { separation } from "./sky";

const chart = computeNatalV2({ date: "1990-04-15", time: "08:30", tz: "America/Indiana/Indianapolis", lat: 39.77, lng: -86.16, house_system: "whole-sign" });
const on = new Date("2026-10-18T12:00:00Z");

describe("year chapter", () => {
  it("profection year advances one house per year", () => {
    const t = timeLordReport(chart, on);
    expect(t.profection.age).toBe(36);
    expect(t.profection.house).toBe(1); // 36 % 12 = 0 → 1st house
    expect(t.next.house).toBe(2);
  });
  it("solar return Sun returns to the natal Sun degree, within the past year", () => {
    const sr = solarReturnChart(chart, on);
    const natalSun = chart.planets.find(p => p.body === "Sun")!.longitude;
    expect(separation(bodyLongitude("Sun", sr.last), natalSun)).toBeLessThan(0.1);
    expect(on.getTime() - sr.last.getTime()).toBeLessThan(366 * 86400000);
    expect(sr.next.getTime()).toBeGreaterThan(on.getTime());
  });
  it("builds a summary from every part", () => {
    const s = chapterSummary(timeLordReport(chart, on), solarReturnChart(chart, on), progressedLunation(chart, on), monthMoon(chart, on));
    expect(s.text).toMatch(/1st-house year/);
    expect(s.lean).toHaveLength(3);
  });
});
