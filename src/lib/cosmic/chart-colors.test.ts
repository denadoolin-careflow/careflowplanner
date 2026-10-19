import { describe, it, expect, beforeEach } from "vitest";
import { getChartColorMode, setChartColorMode, signTintVar } from "./chart-colors";

describe("chart color mode", () => {
  beforeEach(() => localStorage.clear());
  it("defaults to sign", () => expect(getChartColorMode()).toBe("sign"));
  it("remembers element", () => { setChartColorMode("element"); expect(getChartColorMode()).toBe("element"); });
  it("sign mode uses per-sign token", () => expect(signTintVar("Scorpio", "sign")).toBe("--sign-scorpio"));
  it("element mode uses element token", () => expect(signTintVar("Scorpio", "element")).not.toBe("--sign-scorpio"));
});
