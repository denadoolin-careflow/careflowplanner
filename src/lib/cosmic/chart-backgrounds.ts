import { useEffect, useState } from "react";
import { useAtmosphere } from "@/lib/atmospheres";

export const CHART_BACKGROUNDS = [
  { id: "tulip-garden", name: "Tulip Garden" },
  { id: "rain-garden", name: "Rain Garden" },
  { id: "lemon-grove", name: "Lemon Grove" },
  { id: "firefly-nights", name: "Firefly Nights" },
  { id: "apple-orchard", name: "Apple Orchard" },
  { id: "pumpkin-patch", name: "Pumpkin Patch" },
  { id: "christmas-time", name: "Christmas Time" },
  { id: "cocoa-quilts", name: "Cocoa & Quilts" },
] as const;
export type ChartBackground = "auto" | "atmosphere" | typeof CHART_BACKGROUNDS[number]["id"];
const KEY = "careflow:chart-background";
export function getChartBackground(): ChartBackground {
  try {
    const value = localStorage.getItem(KEY);
    return value === "atmosphere" || CHART_BACKGROUNDS.some(b => b.id === value) ? value as ChartBackground : "auto";
  } catch { return "auto"; }
}
export function setChartBackground(value: ChartBackground) {
  try { localStorage.setItem(KEY, value); } catch { /* device storage unavailable */ }
  window.dispatchEvent(new Event(KEY));
}
export function resolveChartBackground(value: ChartBackground, atmosphere: string): string {
  if (value !== "auto") return value;
  return CHART_BACKGROUNDS.some(b => b.id === atmosphere) ? atmosphere : "atmosphere";
}
export function useChartBackground() {
  const [background, setBackground] = useState(getChartBackground);
  const { current } = useAtmosphere();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const refresh = () => setBackground(getChartBackground());
    const observer = new MutationObserver(() => setDark(document.documentElement.classList.contains("dark")));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener(KEY, refresh);
    window.addEventListener("storage", refresh);
    return () => { observer.disconnect(); window.removeEventListener(KEY, refresh); window.removeEventListener("storage", refresh); };
  }, []);
  return { background, setBackground: setChartBackground, resolved: resolveChartBackground(background, current), dark, current };
}