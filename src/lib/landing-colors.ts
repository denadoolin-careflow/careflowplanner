import type { CSSProperties } from "react";

export type ColorKey = "background" | "card" | "foreground" | "primary" | "accent" | "secondary";
export type LandingColors = { preset: string; custom: Partial<Record<ColorKey, string>> };

export const COLOR_FIELDS: { key: ColorKey; label: string; vars: string[] }[] = [
  { key: "background", label: "Page background", vars: ["--background"] },
  { key: "card", label: "Cards", vars: ["--card", "--popover"] },
  { key: "foreground", label: "Headings & text", vars: ["--foreground", "--card-foreground"] },
  { key: "primary", label: "Buttons & highlights", vars: ["--primary", "--ring"] },
  { key: "accent", label: "Accent badges", vars: ["--accent"] },
  { key: "secondary", label: "Soft tints", vars: ["--secondary", "--muted"] },
];

/** Presets: "brand" = no override, so the app's default theme shows through. */
export const COLOR_PRESETS: { id: string; label: string; colors: Partial<Record<ColorKey, string>> }[] = [
  { id: "brand", label: "CareFlow brand", colors: {} },
  { id: "cream", label: "Warm cream", colors: { background: "#FBF1E1", card: "#FEF8EE", foreground: "#2F4A24", primary: "#8C1C35", accent: "#B08F42", secondary: "#F7E1E6" } },
  { id: "botanical", label: "Soft botanical", colors: { background: "#F4F6EE", card: "#FCFDF8", foreground: "#2E3F2A", primary: "#5E7F4F", accent: "#C9A85A", secondary: "#E3EBD8" } },
  { id: "kitchen", label: "Warm kitchen", colors: { background: "#FAF0E4", card: "#FFF8F0", foreground: "#4A2C20", primary: "#C0623F", accent: "#D9A441", secondary: "#F5DECF" } },
  { id: "sage", label: "Sage", colors: { background: "#EEF2EC", card: "#F8FAF6", foreground: "#2F3D33", primary: "#6B8F71", accent: "#B7A26B", secondary: "#DCE6D9" } },
  { id: "dusk", label: "Dusk", colors: { background: "#F3EEF4", card: "#FBF8FB", foreground: "#3A2E45", primary: "#7A4F86", accent: "#D08A7A", secondary: "#E6DCEB" } },
];

export const DEFAULT_COLORS: LandingColors = { preset: "brand", custom: {} };

export function hexToHsl(hex: string): string | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Readable text color for a filled background. */
function onColor(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? "0 0% 10%" : "0 0% 100%";
}

export function resolveColors(c: LandingColors): Partial<Record<ColorKey, string>> {
  const preset = COLOR_PRESETS.find((p) => p.id === c.preset)?.colors ?? {};
  return { ...preset, ...c.custom };
}

export function landingColorStyle(c: LandingColors): CSSProperties {
  const out: Record<string, string> = {};
  const resolved = resolveColors(c);
  for (const f of COLOR_FIELDS) {
    const hex = resolved[f.key];
    const hsl = hex && hexToHsl(hex);
    if (!hsl) continue;
    for (const v of f.vars) out[v] = hsl;
    if (f.key === "primary") out["--primary-foreground"] = onColor(hex!);
    if (f.key === "accent") out["--accent-foreground"] = onColor(hex!);
    if (f.key === "secondary") out["--secondary-foreground"] = resolved.foreground ? hexToHsl(resolved.foreground)! : onColor(hex!);
  }
  return out as CSSProperties;
}
