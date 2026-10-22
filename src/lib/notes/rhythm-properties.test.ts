import { describe, expect, it } from "vitest";
import { mergeRhythm, rhythmDateFor, rhythmPropertiesFor, RHYTHM_PROP_IDS } from "./rhythm-properties";

const date = new Date("2026-10-22T12:00:00");

describe("rhythm properties", () => {
  it("stamps moon phase, sign, rhythm and season but no cycle when tracking is off", () => {
    const ids = rhythmPropertiesFor(date, null).map(p => p.id);
    expect(ids).toEqual([RHYTHM_PROP_IDS.moonPhase, RHYTHM_PROP_IDS.moonSign, RHYTHM_PROP_IDS.rhythm, RHYTHM_PROP_IDS.season]);
  });

  it("uses Plan, Grow, Care, Let go labels", () => {
    const rhythm = rhythmPropertiesFor(date).find(p => p.id === RHYTHM_PROP_IDS.rhythm)!;
    expect(["Plan", "Grow", "Care", "Let go"]).toContain(rhythm.value);
  });

  it("uses the note's own date when it has one", () => {
    expect(rhythmDateFor("2026-01-05").getDate()).toBe(5);
  });

  it("does not overwrite a user edit unless refreshing", () => {
    const edited = [{ id: RHYTHM_PROP_IDS.season, name: "Season", type: "select" as const, value: "My season" }];
    const bundle = rhythmPropertiesFor(date);
    expect(mergeRhythm(edited, bundle).find(p => p.id === RHYTHM_PROP_IDS.season)!.value).toBe("My season");
    expect(mergeRhythm(edited, bundle, true).find(p => p.id === RHYTHM_PROP_IDS.season)!.value).not.toBe("My season");
  });
});
