/** Single source of truth for astrology glyphs + element colors. */
import type { Sign } from "@/lib/transits";

export const SIGN_GLYPH: Record<Sign, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋",
  Leo: "♌", Virgo: "♍", Libra: "♎", Scorpio: "♏",
  Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓",
};

export const PLANET_GLYPH: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂",
  Jupiter: "♃", Saturn: "♄", Uranus: "♅", Neptune: "♆", Pluto: "♇",
  Chiron: "⚷", Ceres: "⚳", NorthNode: "☊", SouthNode: "☋", Lilith: "⚸",
};

export const ASPECT_GLYPH: Record<string, string> = {
  conjunction: "☌", opposition: "☍", trine: "△", square: "□",
  sextile: "✶", quincunx: "⚻", semisextile: "⚺", semisquare: "∠",
  sesquiquadrate: "⚼", quintile: "Q", biquintile: "bQ",
};

export type Element = "Fire" | "Earth" | "Air" | "Water";

export const SIGN_ELEMENT: Record<Sign, Element> = {
  Aries: "Fire", Leo: "Fire", Sagittarius: "Fire",
  Taurus: "Earth", Virgo: "Earth", Capricorn: "Earth",
  Gemini: "Air", Libra: "Air", Aquarius: "Air",
  Cancer: "Water", Scorpio: "Water", Pisces: "Water",
};

/** CSS variable holding the HSL color for each element. */
export const ELEMENT_VAR: Record<Element, string> = {
  Fire: "--element-fire",
  Earth: "--element-earth",
  Air: "--element-air",
  Water: "--element-water",
};

export const ASPECT_COLOR_VAR: Record<string, string> = {
  conjunction: "--aspect-neutral",
  opposition: "--aspect-dynamic",
  square: "--aspect-dynamic",
  trine: "--aspect-harmonious",
  sextile: "--aspect-harmonious",
  quincunx: "--aspect-dynamic",
};

export const PLANET_NAME: Record<string, string> = {
  NorthNode: "North Node", SouthNode: "South Node",
};

export function planetDisplay(body: string): string {
  return PLANET_NAME[body] ?? body;
}

export function formatDms(degInSign: number): string {
  const deg = Math.floor(degInSign);
  const min = Math.floor((degInSign - deg) * 60);
  return `${deg}°${String(min).padStart(2, "0")}'`;
}