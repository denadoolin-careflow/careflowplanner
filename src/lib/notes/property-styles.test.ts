import { describe, it, expect } from "vitest";
import { resolveOption, resolveProp } from "./property-styles";

describe("property styles", () => {
  it("user choice color beats per-note color", () => {
    const map = { mood: { options: { calm: { color: "#111" } } } };
    expect(resolveOption(map, "Mood", "Calm", "#222").color).toBe("#111");
  });
  it("per-note color beats default", () => {
    expect(resolveOption({}, "Rhythm phase", "Plan", "#222").color).toBe("#222");
  });
  it("falls back to rhythm defaults", () => {
    expect(resolveOption({}, "Rhythm phase", "Let go").color).toBe("#FBE3E3");
    expect(resolveProp({}, "Moon phase").icon).toBe("moon");
  });
});
