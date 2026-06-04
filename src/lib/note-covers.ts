import { ATMOSPHERES } from "@/lib/atmospheres";

export interface NoteCoverPreset {
  id: string;
  name: string;
  /** CSS background value (linear/radial gradient combos) */
  css: string;
  /** swatches for the preview chip */
  swatches: string[];
}

/** Build a layered gradient from up to 4 palette swatches. */
function buildGradient(palette: string[]): string {
  const [a, b, c, d] = palette;
  const c1 = a ?? "#A8B29A";
  const c2 = b ?? "#6F7C65";
  const c3 = c ?? "#F7F3EC";
  const c4 = d ?? c1;
  return [
    `radial-gradient(120% 90% at 10% 10%, ${c1} 0%, transparent 55%)`,
    `radial-gradient(110% 80% at 90% 20%, ${c4} 0%, transparent 60%)`,
    `radial-gradient(140% 100% at 50% 110%, ${c2} 0%, transparent 65%)`,
    `linear-gradient(135deg, ${c3} 0%, ${c1} 100%)`,
  ].join(", ");
}

export const NOTE_COVER_PRESETS: NoteCoverPreset[] = ATMOSPHERES.map((a) => ({
  id: a.id,
  name: a.name,
  css: buildGradient(a.palette),
  swatches: a.palette.slice(0, 4),
}));

export function getNoteCoverCss(id: string | null | undefined): string | null {
  if (!id) return null;
  const p = NOTE_COVER_PRESETS.find((x) => x.id === id);
  return p ? p.css : null;
}

export function getNoteCoverPreset(id: string | null | undefined): NoteCoverPreset | null {
  if (!id) return null;
  return NOTE_COVER_PRESETS.find((x) => x.id === id) ?? null;
}