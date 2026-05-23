import { useEffect, useState } from "react";

export type EditorTheme =
  | "default"
  | "cream"
  | "sage"
  | "plum"
  | "warm-night"
  | "minimal"
  | "soft-journal";

export type EditorDensity = "cozy" | "comfortable" | "airy";
export type EditorWidth = "narrow" | "regular" | "wide" | "full";

export interface EditorPrefs {
  theme: EditorTheme;
  density: EditorDensity;
  width: EditorWidth;
  fontScale: number; // 0.9 – 1.3
}

const KEY = "careflow.editorPrefs.v1";

const DEFAULTS: EditorPrefs = {
  theme: "default",
  density: "comfortable",
  width: "regular",
  fontScale: 1,
};

function read(): EditorPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

const listeners = new Set<(p: EditorPrefs) => void>();

export function setEditorPrefs(patch: Partial<EditorPrefs>) {
  const next = { ...read(), ...patch };
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach(l => l(next));
}

export function useEditorPrefs(): [EditorPrefs, (p: Partial<EditorPrefs>) => void] {
  const [prefs, setPrefs] = useState<EditorPrefs>(read);
  useEffect(() => {
    const l = (p: EditorPrefs) => setPrefs(p);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return [prefs, setEditorPrefs];
}

export const THEME_OPTIONS: { id: EditorTheme; label: string; swatch: string }[] = [
  { id: "default", label: "Default", swatch: "hsl(var(--background))" },
  { id: "cream", label: "Cream Paper", swatch: "#f6efe1" },
  { id: "sage", label: "Sage Calm", swatch: "#dde7d8" },
  { id: "plum", label: "Dark Plum", swatch: "#2a1b2e" },
  { id: "warm-night", label: "Warm Night", swatch: "#1f1a17" },
  { id: "minimal", label: "Minimal White", swatch: "#ffffff" },
  { id: "soft-journal", label: "Soft Journal", swatch: "#efe7df" },
];

export const WIDTH_PX: Record<EditorWidth, string> = {
  narrow: "38rem",
  regular: "48rem",
  wide: "64rem",
  full: "100%",
};
