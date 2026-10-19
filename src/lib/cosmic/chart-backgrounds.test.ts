import { beforeEach, describe, expect, it } from "vitest";
import { CHART_BACKGROUNDS, getChartBackground, resolveChartBackground, setChartBackground } from "./chart-backgrounds";

describe("chart seasonal backgrounds", () => {
  beforeEach(() => localStorage.clear());
  it("defaults to matching the active atmosphere", () => expect(getChartBackground()).toBe("auto"));
  it("matches all eight recommended seasonal atmospheres", () => {
    expect(CHART_BACKGROUNDS).toHaveLength(8);
    for (const { id } of CHART_BACKGROUNDS) expect(resolveChartBackground("auto", id)).toBe(id);
  });
  it("preserves other atmospheres", () => expect(resolveChartBackground("auto", "moonlit-plum")).toBe("atmosphere"));
  it("remembers an independent chart background", () => {
    setChartBackground("christmas-time");
    expect(getChartBackground()).toBe("christmas-time");
    expect(resolveChartBackground(getChartBackground(), "apple-orchard")).toBe("christmas-time");
  });
});