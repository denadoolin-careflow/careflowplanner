import { describe, it, expect } from "vitest";
import { applyRhythmView, groupByRhythm, NO_VALUE, activeRhythmCount, notePropValues, collectPropFields } from "./rhythm-view";

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

  const pn = (id: string, name: string, value: any, type: "select" | "multi" = "select") =>
    ({ id, properties: [{ id: "p1", name, type, value }] }) as any;

  it("reads a note's values for a named select/multi property", () => {
    expect(notePropValues(pn("a", "Mood", "Happy"), "mood")).toEqual(["Happy"]);
    expect(notePropValues(pn("a", "Mood", ["Calm", "Happy"], "multi"), "mood")).toEqual(["Calm", "Happy"]);
    expect(notePropValues(pn("a", "Mood", null), "mood")).toEqual([]);
  });

  it("filters by a custom property value, case-insensitively", () => {
    const props = [pn("a", "Mood", "Happy"), pn("b", "Mood", "Low"), pn("c", "Mood", "happy"), pn("d", "Other", "Happy"), pn("e", "Mood", null)];
    expect(applyRhythmView(props, { group: null, sort: null, filters: {}, props: { mood: ["Happy"] } }).map(x => x.id)).toEqual(["a", "c"]);
  });

  it("matches multi-select values and Not set", () => {
    const props = [pn("a", "Tags", ["x", "y"], "multi"), pn("b", "Tags", ["z"], "multi"), pn("c", "Tags", null)];
    expect(applyRhythmView(props, { group: null, sort: null, filters: {}, props: { tags: ["y"] } }).map(x => x.id)).toEqual(["a"]);
    expect(applyRhythmView(props, { group: null, sort: null, filters: {}, props: { tags: [NO_VALUE] } }).map(x => x.id)).toEqual(["c"]);
  });

  it("combines rhythm and property filters with AND", () => {
    const props = [{ id: "a", properties: [{ id: "p", name: "Mood", type: "select", value: "Happy" }, { id: "r", name: "Season", type: "select", value: "Spring" }] }, pn("b", "Mood", "Happy")] as any[];
    expect(applyRhythmView(props, { group: null, sort: null, filters: { season: ["Spring"] }, props: { mood: ["Happy"] } }).map(x => x.id)).toEqual(["a"]);
  });

  it("counts property filters in the active count", () => {
    expect(activeRhythmCount({ group: null, sort: null, filters: {}, props: { mood: ["Happy"] } })).toBe(1);
  });

  it("collects custom property filter fields, excluding rhythm properties", () => {
    const props = [pn("a", "Mood", "Happy"), pn("b", "Moon phase", "Full Moon"), pn("c", "Mood", "Low")];
    expect(collectPropFields(props)).toEqual([{ key: "mood", name: "Mood", values: ["Happy", "Low"] }]);
  });
});
