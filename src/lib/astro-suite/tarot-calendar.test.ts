import { describe, it, expect } from "vitest";
import { pullsByDate, dailyPullFor, eveningPullFor, eveningCardChoices, type TarotPull } from "./tarot-pulls";
const mk = (id: string, date: string, spread: TarotPull["spread"], t: number): TarotPull => ({ id, date, spread, cards: [], createdAt: t });
const pulls = [mk("a","2026-10-01","single",1), mk("b","2026-10-01","three-time",2), mk("c","2026-09-30","single",3)];
describe("tarot calendar", () => {
  it("groups by date within a month", () => {
    const m = pullsByDate(pulls, "2026-10");
    expect([...m.keys()]).toEqual(["2026-10-01"]);
    expect(m.get("2026-10-01")?.map(p => p.id)).toEqual(["b","a"]);
  });
  it("finds the daily pull for a date", () => {
    expect(dailyPullFor(pulls, "2026-10-01")?.id).toBe("a");
    expect(dailyPullFor(pulls, "2026-10-02")).toBeUndefined();
  });
  it("keeps an evening selection separate from the morning reset", () => {
    const evening: TarotPull = { ...mk("evening", "2026-10-01", "single", 4), ritual: "evening" };
    const both = [evening, ...pulls];
    expect(dailyPullFor(both, "2026-10-01")?.id).toBe("a");
    expect(eveningPullFor(both, "2026-10-01")?.id).toBe("evening");
    expect(eveningPullFor(both, "2026-10-02")).toBeUndefined();
  });
  it("excludes the morning card from evening choices", () => {
    const choices = eveningCardChoices("m-0");
    expect(choices).toHaveLength(77);
    expect(choices.some(c => c.id === "m-0")).toBe(false);
    expect(choices.some(c => c.id === "m-1")).toBe(true);
  });
});
