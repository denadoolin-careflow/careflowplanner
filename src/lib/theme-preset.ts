import { useEffect, useState } from "react";

export type ThemePreset = "default" | "sage" | "dusk" | "mono";
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
