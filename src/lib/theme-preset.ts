import { useEffect, useState } from "react";

export type ThemePreset =
  | "default" | "sage" | "dusk" | "mono"
  | "rose" | "ocean" | "sunset" | "forest" | "lavender"
  | "plum" | "midnight" | "ember" | "moss" | "sand" | "blossom" | "noir";

export const THEME_PRESETS: { id: ThemePreset; label: string; swatch: string }[] = [
  { id: "default",  label: "Cream",    swatch: "hsl(258 45% 62%)" },
  { id: "plum",     label: "Plum",     swatch: "hsl(285 45% 45%)" },
  { id: "sage",     label: "Sage",     swatch: "hsl(160 40% 45%)" },
  { id: "moss",     label: "Moss",     swatch: "hsl(95 35% 38%)"  },
  { id: "forest",   label: "Forest",   swatch: "hsl(140 35% 38%)" },
  { id: "ocean",    label: "Ocean",    swatch: "hsl(205 65% 50%)" },
  { id: "midnight", label: "Midnight", swatch: "hsl(220 60% 35%)" },
  { id: "dusk",     label: "Dusk",     swatch: "hsl(270 50% 60%)" },
  { id: "lavender", label: "Lavender", swatch: "hsl(255 60% 70%)" },
  { id: "blossom",  label: "Blossom",  swatch: "hsl(320 55% 65%)" },
  { id: "rose",     label: "Rose",     swatch: "hsl(345 65% 58%)" },
  { id: "ember",    label: "Ember",    swatch: "hsl(8 75% 52%)"   },
  { id: "sunset",   label: "Sunset",   swatch: "hsl(20 80% 58%)"  },
  { id: "sand",     label: "Sand",     swatch: "hsl(35 50% 55%)"  },
  { id: "mono",     label: "Mono",     swatch: "hsl(0 0% 25%)"    },
  { id: "noir",     label: "Noir",     swatch: "hsl(240 10% 18%)" },
];
const KEY = "careflow:theme-preset";

function read(): ThemePreset {
  if (typeof localStorage === "undefined") return "default";
  return ((localStorage.getItem(KEY) as ThemePreset) ?? "default");
}

function apply(p: ThemePreset) {
  if (typeof document === "undefined") return;
  if (p === "default") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", p);
}

let current: ThemePreset = read();
const listeners = new Set<(p: ThemePreset) => void>();
apply(current);

export function getThemePreset(): ThemePreset { return current; }
export function setThemePreset(p: ThemePreset) {
  current = p;
  try { localStorage.setItem(KEY, p); } catch { /* noop */ }
  apply(p);
  listeners.forEach(fn => fn(p));
}
export function useThemePreset(): [ThemePreset, (p: ThemePreset) => void] {
  const [p, setP] = useState<ThemePreset>(current);
  useEffect(() => { listeners.add(setP); return () => { listeners.delete(setP); }; }, []);
  return [p, setThemePreset];
}
