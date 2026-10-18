import { describe, expect, it } from "vitest";
import { computeNatalV2 } from "./chart";
import { chapterContext, chapterMatchesContext, chapterReading } from "./chapter-context";

const chart = computeNatalV2({ date: "1990-04-15", time: "08:30", tz: "America/Indiana/Indianapolis", lat: 39.77, lng: -86.16, house_system: "whole-sign" });
const reading = chapterReading(chart, new Date("2026-10-18T16:29:00Z"));
const context = chapterContext(chart, reading);
describe("written chapter alignment", () => {
  it("shares the displayed time lord and profection", () => {
    expect(context.timeLord).toBe(reading.tl);
    expect(context.timeLord.profection.house).toBe(1);
    expect(context.timeLord.profection.age).toBe(36);
  });
  it("shares the displayed solar return and emotional-care readings", () => {
    expect(context.solarReturn.began).toBe(reading.sr.last.toISOString());
    expect(context.solarReturn.sunHouse).toBe(reading.sr.sunHouse);
    expect(context.solarReturn.moonHouse).toBe(reading.sr.moonHouse);
    expect(context.solarReturn.moonSign).toBe(reading.sr.moonSign);
    expect(context.solarReturn.usesWholeSignFromSun).toBe(false);
  });
  it("includes both the displayed long-term moon season and monthly moons", () => {
    expect(context.progressedMoon).toBe(reading.pl);
    expect(context.monthlyMoon.next).toHaveLength(2);
    expect(context.monthlyMoon.next[0].date).toBe(reading.mm.next[0].date.toISOString());
    expect(context.monthlyMoon.waxing).toBe(reading.mm.waxing);
    expect(context.summary).toBe(reading.summary);
  });
  it("rejects legacy or different birth/date chapters", () => {
    expect(chapterMatchesContext({ year: {} }, context.key)).toBe(false);
    expect(chapterMatchesContext({ readingContext: context }, context.key)).toBe(true);
    expect(chapterMatchesContext({ readingContext: context }, `${context.key}:different`)).toBe(false);
  });
});