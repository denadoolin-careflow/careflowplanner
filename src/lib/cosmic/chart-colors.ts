import { useEffect, useState } from "react";
import type { Sign } from "@/lib/transits";
import { ELEMENT_VAR, SIGN_ELEMENT } from "@/lib/cosmic/glyphs";

export type ChartColorMode = "sign" | "element";
const KEY = "careflow:chart-color-mode";
const EVT = "careflow:chart-color-mode";

export function getChartColorMode(): ChartColorMode {
  try { return localStorage.getItem(KEY) === "element" ? "element" : "sign"; } catch { return "sign"; }
}
export function setChartColorMode(m: ChartColorMode) {
  try { localStorage.setItem(KEY, m); } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVT));
}
export function useChartColorMode(): [ChartColorMode, (m: ChartColorMode) => void] {
  const [mode, setMode] = useState(getChartColorMode);
  useEffect(() => {
    const f = () => setMode(getChartColorMode());
    window.addEventListener(EVT, f);
    return () => window.removeEventListener(EVT, f);
  }, []);
  return [mode, setChartColorMode];
}

/** CSS variable name for the tint of a sign under the chosen mode. */
export function signTintVar(sign: Sign, mode: ChartColorMode): string {
  return mode === "element" ? ELEMENT_VAR[SIGN_ELEMENT[sign]] : `--sign-${sign.toLowerCase()}`;
}
