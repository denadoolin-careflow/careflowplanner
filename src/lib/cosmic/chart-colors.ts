import { useEffect, useState } from "react";
import type { Sign } from "@/lib/transits";
import { ELEMENT_VAR, SIGN_ELEMENT } from "@/lib/cosmic/glyphs";
import { modalityOf } from "@/lib/cosmic/astro/dignities";

export const CHART_COLOR_MODES = ["house", "sign", "element", "modality"] as const;
export type ChartColorMode = typeof CHART_COLOR_MODES[number];
const KEY = "careflow:chart-color-mode";
const EVT = "careflow:chart-color-mode";
const DEFAULT_KEY = "careflow:chart-house-default-v1";

export function getChartColorMode(): ChartColorMode {
  try {
    if (!localStorage.getItem(DEFAULT_KEY)) return "house";
    const stored = localStorage.getItem(KEY);
    return CHART_COLOR_MODES.find(mode => mode === stored) ?? "house";
  } catch { return "house"; }
}
export function setChartColorMode(m: ChartColorMode) {
  try { localStorage.setItem(KEY, m); localStorage.setItem(DEFAULT_KEY, "1"); } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVT));
}
export function useChartColorMode(): [ChartColorMode, (m: ChartColorMode) => void] {
  const [mode, setMode] = useState(getChartColorMode);
  useEffect(() => {
    const f = () => setMode(getChartColorMode());
    window.addEventListener(EVT, f);
    window.addEventListener("storage", f);
    return () => { window.removeEventListener(EVT, f); window.removeEventListener("storage", f); };
  }, []);
  return [mode, setChartColorMode];
}

/** CSS variable name for the tint of a sign under the chosen mode. */
export function signTintVar(sign: Sign, mode: ChartColorMode, house = 1): string {
  if (mode === "house") return `--chart-house-${Math.max(1, Math.min(12, Math.floor(house)))}`;
  if (mode === "modality") return `--chart-modality-${modalityOf(sign).toLowerCase()}`;
  return mode === "element" ? `--chart-${ELEMENT_VAR[SIGN_ELEMENT[sign]].slice(2)}` : `--sign-${sign.toLowerCase()}`;
}
