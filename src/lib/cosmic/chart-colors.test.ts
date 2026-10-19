import { describe, it, expect, beforeEach } from "vitest";
import { getChartColorMode, setChartColorMode, signTintVar } from "./chart-colors";

describe("chart color mode", () => {
  beforeEach(() => localStorage.clear());
  it("defaults to house", () => expect(getChartColorMode()).toBe("house"));
  it("remembers element", () => { setChartColorMode("element"); expect(getChartColorMode()).toBe("element"); });
  it("sign mode uses per-sign token", () => expect(signTintVar("Scorpio", "sign")).toBe("--sign-scorpio"));
  it("element mode uses element token", () => expect(signTintVar("Scorpio", "element")).not.toBe("--sign-scorpio"));
  it("house colors stay attached to house numbers, not signs", () => {
    expect(signTintVar("Scorpio", "house", 1)).toBe("--chart-house-1");
    expect(signTintVar("Aries", "house", 1)).toBe("--chart-house-1");
    expect(signTintVar("Scorpio", "house", 12)).toBe("--chart-house-12");
  });
  it("groups modalities correctly", () => {
    expect(signTintVar("Aries", "modality")).toBe("--chart-modality-cardinal");
    expect(signTintVar("Scorpio", "modality")).toBe("--chart-modality-fixed");
    expect(signTintVar("Pisces", "modality")).toBe("--chart-modality-mutable");
  });
  it("remembers each selected mode", () => {
    for (const mode of ["house", "sign", "modality", "element"] as const) { setChartColorMode(mode); expect(getChartColorMode()).toBe(mode); }
  });
});
