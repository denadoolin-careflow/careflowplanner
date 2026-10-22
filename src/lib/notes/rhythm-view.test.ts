import { describe, it, expect } from "vitest";
import { applyRhythmView, groupByRhythm, NO_VALUE } from "./rhythm-view";

const n = (id: string, sign?: string, season?: string) => ({
  id,
  properties: [
    ...(sign ? [{ id: "rhythm-moon-sign", name: "Moon sign", type: "select", value: sign }] : []),
    ...(season ? [{ id: "rhythm-season", name: "Season", type: "select", value: season }] : []),
  ],
}) as any;

const notes = [n("a", "Leo", "Autumn"), n("b", "Aries", "Spring"), n("c"), n("d", "Leo", "Spring")];

describe("rhythm view", () => {
  it("sorts moon signs in zodiac order with unset last", () => {
    expect(applyRhythmView(notes, { group: null, sort: "moonSign", filters: {} }).map(x => x.id)).toEqual(["b", "a", "d", "c"]);
  });
  it("filters by season", () => {
    expect(applyRhythmView(notes, { group: null, sort: null, filters: { season: ["Spring"] } }).map(x => x.id)).toEqual(["b", "d"]);
  });
  it("groups by moon sign with Not set last", () => {
    expect(groupByRhythm(notes, "moonSign").map(g => [g.key, g.notes.length])).toEqual([["Aries", 1], ["Leo", 2], [NO_VALUE, 1]]);
  });
});
