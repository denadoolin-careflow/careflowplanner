import type { ZodiacInfo } from "@/lib/zodiac";

export type ZElement = ZodiacInfo["element"];

export type ElementTheme = {
  /** Accent color (hsl string). */
  color: string;
  /** Soft background wash. */
  soft: string;
  /** Slightly stronger border. */
  border: string;
  /** Panel gradient. */
  gradient: string;
  label: string;
};

/** Palette per zodiac element — used to tint moon insight + weather surfaces. */
export const ELEMENT_THEME: Record<ZElement, ElementTheme> = {
  Fire:  { color: "hsl(14 78% 52%)",  soft: "hsl(14 78% 52% / 0.12)",  border: "hsl(14 78% 52% / 0.32)",  gradient: "linear-gradient(135deg, hsl(14 84% 55% / 0.16), hsl(38 90% 58% / 0.08))",  label: "Fire" },
  Earth: { color: "hsl(142 38% 38%)", soft: "hsl(142 38% 38% / 0.12)", border: "hsl(142 38% 38% / 0.30)", gradient: "linear-gradient(135deg, hsl(142 40% 40% / 0.16), hsl(84 40% 46% / 0.08))",   label: "Earth" },
  Air:   { color: "hsl(199 78% 46%)", soft: "hsl(199 78% 46% / 0.12)", border: "hsl(199 78% 46% / 0.30)", gradient: "linear-gradient(135deg, hsl(199 80% 52% / 0.16), hsl(255 60% 62% / 0.08))",  label: "Air" },
  Water: { color: "hsl(248 62% 58%)", soft: "hsl(248 62% 58% / 0.12)", border: "hsl(248 62% 58% / 0.30)", gradient: "linear-gradient(135deg, hsl(248 62% 58% / 0.16), hsl(190 60% 50% / 0.08))",  label: "Water" },
};

export function elementTheme(el: ZElement | undefined | null): ElementTheme {
  return ELEMENT_THEME[(el ?? "Air") as ZElement] ?? ELEMENT_THEME.Air;
}
