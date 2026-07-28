import { useCallback, useEffect, useState } from "react";

export type BandId = "morning" | "afternoon" | "evening";

/** Theme-safe presets — each entry keeps light/dark legibility. */
export const BAND_COLOR_PRESETS = [
  { id: "amber",   label: "Amber",   band: "bg-amber-50/60 dark:bg-amber-950/25",     swatch: "bg-amber-300" },
  { id: "peach",   label: "Peach",   band: "bg-orange-50/60 dark:bg-orange-950/25",   swatch: "bg-orange-300" },
  { id: "rose",    label: "Rose",    band: "bg-rose-50/60 dark:bg-rose-950/25",       swatch: "bg-rose-300" },
  { id: "sky",     label: "Sky",     band: "bg-sky-50/50 dark:bg-sky-950/25",         swatch: "bg-sky-300" },
  { id: "teal",    label: "Teal",    band: "bg-teal-50/50 dark:bg-teal-950/25",       swatch: "bg-teal-300" },
  { id: "emerald", label: "Emerald", band: "bg-emerald-50/50 dark:bg-emerald-950/25", swatch: "bg-emerald-300" },
  { id: "violet",  label: "Violet",  band: "bg-violet-50/50 dark:bg-violet-950/25",   swatch: "bg-violet-300" },
  { id: "indigo",  label: "Indigo",  band: "bg-indigo-50/50 dark:bg-indigo-950/25",   swatch: "bg-indigo-300" },
  { id: "slate",   label: "Neutral", band: "bg-muted/40",                             swatch: "bg-muted-foreground/40" },
] as const;

export type BandColorId = typeof BAND_COLOR_PRESETS[number]["id"];

export type BandColors = Record<BandId, BandColorId>;

export const DEFAULT_BAND_COLORS: BandColors = {
  morning: "amber",
  afternoon: "sky",
  evening: "violet",
};

const KEY = "careflow:planner:band-colors:v1";
const listeners = new Set<(c: BandColors) => void>();

function read(): BandColors {
  if (typeof window === "undefined") return { ...DEFAULT_BAND_COLORS };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_BAND_COLORS };
    return { ...DEFAULT_BAND_COLORS, ...(JSON.parse(raw) as Partial<BandColors>) };
  } catch { return { ...DEFAULT_BAND_COLORS }; }
}

let current: BandColors = read();

export function bandClass(id: BandId, colors: BandColors = current): string {
  const preset = BAND_COLOR_PRESETS.find(p => p.id === colors[id]);
  return preset?.band ?? "bg-muted/30";
}

export function swatchClass(colorId: BandColorId): string {
  return BAND_COLOR_PRESETS.find(p => p.id === colorId)?.swatch ?? "bg-muted";
}

export function setBandColors(patch: Partial<BandColors>) {
  current = { ...current, ...patch };
  try { window.localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* noop */ }
  listeners.forEach(l => l(current));
}

export function resetBandColors() {
  current = { ...DEFAULT_BAND_COLORS };
  try { window.localStorage.removeItem(KEY); } catch { /* noop */ }
  listeners.forEach(l => l(current));
}

export function useBandColors(): [BandColors, (p: Partial<BandColors>) => void, () => void] {
  const [colors, setColors] = useState<BandColors>(current);
  useEffect(() => {
    listeners.add(setColors);
    return () => { listeners.delete(setColors); };
  }, []);
  const update = useCallback((p: Partial<BandColors>) => setBandColors(p), []);
  return [colors, update, resetBandColors];
}