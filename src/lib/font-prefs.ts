/**
 * User font overrides for the display + body type pair.
 * When set, they take precedence over the active atmosphere's fonts
 * by being applied as inline CSS variables on the <html> element.
 */

export interface FontOption {
  id: string;
  label: string;
  /** CSS font-family value (must already be loaded in index.html). */
  family: string;
  kind: "display" | "body" | "both";
}

export const FONT_OPTIONS: FontOption[] = [
  { id: "fraunces",     label: "Fraunces",           family: "'Fraunces', ui-serif, Georgia, serif",                    kind: "both" },
  { id: "playfair",     label: "Playfair Display",   family: "'Playfair Display', ui-serif, Georgia, serif",            kind: "display" },
  { id: "cormorant",    label: "Cormorant Garamond", family: "'Cormorant Garamond', ui-serif, Georgia, serif",          kind: "display" },
  { id: "inter",        label: "Inter",              family: "'Inter', ui-sans-serif, system-ui, sans-serif",           kind: "body" },
  { id: "dm-sans",      label: "DM Sans",            family: "'DM Sans', ui-sans-serif, system-ui, sans-serif",         kind: "body" },
  { id: "jakarta",      label: "Plus Jakarta Sans",  family: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif", kind: "body" },
];

const K_DISPLAY = "careflow:font:display";
const K_BODY    = "careflow:font:body";

export function getFontPref(slot: "display" | "body"): string | null {
  try { return localStorage.getItem(slot === "display" ? K_DISPLAY : K_BODY); } catch { return null; }
}
export function setFontPref(slot: "display" | "body", id: string | null) {
  const key = slot === "display" ? K_DISPLAY : K_BODY;
  try {
    if (id === null) localStorage.removeItem(key);
    else localStorage.setItem(key, id);
  } catch { /* */ }
  applyFontPrefs();
}

export function applyFontPrefs() {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  const d = getFontPref("display");
  const b = getFontPref("body");
  const dOpt = d ? FONT_OPTIONS.find(o => o.id === d) : null;
  const bOpt = b ? FONT_OPTIONS.find(o => o.id === b) : null;
  if (dOpt) html.style.setProperty("--atmo-font-display", dOpt.family);
  else html.style.removeProperty("--atmo-font-display");
  if (bOpt) html.style.setProperty("--atmo-font-body", bOpt.family);
  else html.style.removeProperty("--atmo-font-body");
}