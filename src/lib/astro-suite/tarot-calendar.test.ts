import { describe, it, expect } from "vitest";
import { pullsByDate, dailyPullFor, type TarotPull } from "./tarot-pulls";
const mk = (id: string, date: string, spread: TarotPull["spread"], t: number): TarotPull => ({ id, date, spread, cards: [], createdAt: t });
const pulls = [mk("a","2026-10-01","single",1), mk("b","2026-10-01","three-time",2), mk("c","2026-09-30","single",3)];
describe("tarot calendar", () => {
  it("groups by date within a month", () => {
    const m = pullsByDate(pulls, "2026-10");
    expect([...m.keys()]).toEqual(["2026-10-01"]);
    expect(m.get("2026-10-01")!.map(p => p.id)).toEqual(["b","a"]);
  });
  it("finds the daily pull for a date", () => {
    expect(dailyPullFor(pulls, "2026-10-01")?.id).toBe("a");
    expect(dailyPullFor(pulls, "2026-10-02")).toBeUndefined();
  });
});
