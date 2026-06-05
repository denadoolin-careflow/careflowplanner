import type { Sign } from "@/lib/transits";

export type Element = "Fire" | "Earth" | "Air" | "Water";
export type Modality = "Cardinal" | "Fixed" | "Mutable";

const ELEMENT: Record<Sign, Element> = {
  Aries: "Fire", Leo: "Fire", Sagittarius: "Fire",
  Taurus: "Earth", Virgo: "Earth", Capricorn: "Earth",
  Gemini: "Air", Libra: "Air", Aquarius: "Air",
  Cancer: "Water", Scorpio: "Water", Pisces: "Water",
};
const MODALITY: Record<Sign, Modality> = {
  Aries: "Cardinal", Cancer: "Cardinal", Libra: "Cardinal", Capricorn: "Cardinal",
  Taurus: "Fixed", Leo: "Fixed", Scorpio: "Fixed", Aquarius: "Fixed",
  Gemini: "Mutable", Virgo: "Mutable", Sagittarius: "Mutable", Pisces: "Mutable",
};

export function elementOf(s: Sign): Element { return ELEMENT[s]; }
export function modalityOf(s: Sign): Modality { return MODALITY[s]; }

export interface Dominants {
  elements: Record<Element, number>;
  modalities: Record<Modality, number>;
  dominantElement: Element;
  dominantModality: Modality;
  hemispheres: { north: number; south: number; east: number; west: number };
  chartShape: "Bowl" | "Bundle" | "Locomotive" | "Splash" | "Seesaw" | "Mixed";
}

export function computeDominants(signs: Sign[], longitudes: number[]): Dominants {
  const elements: Record<Element, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  const modalities: Record<Modality, number> = { Cardinal: 0, Fixed: 0, Mutable: 0 };
  for (const s of signs) { elements[ELEMENT[s]]++; modalities[MODALITY[s]]++; }
  const dominantElement = (Object.entries(elements).sort((a, b) => b[1] - a[1])[0][0]) as Element;
  const dominantModality = (Object.entries(modalities).sort((a, b) => b[1] - a[1])[0][0]) as Modality;

  let north = 0, south = 0, east = 0, west = 0;
  for (const lon of longitudes) {
    if (lon >= 0 && lon < 180) south++; else north++;
    if (lon >= 90 && lon < 270) west++; else east++;
  }

  // Crude chart-shape detection by largest gap between consecutive longitudes.
  const sorted = [...longitudes].sort((a, b) => a - b);
  let maxGap = 0;
  for (let i = 0; i < sorted.length; i++) {
    const next = i + 1 < sorted.length ? sorted[i + 1] : sorted[0] + 360;
    maxGap = Math.max(maxGap, next - sorted[i]);
  }
  let chartShape: Dominants["chartShape"] = "Mixed";
  if (maxGap > 240) chartShape = "Bundle";
  else if (maxGap > 180) chartShape = "Bowl";
  else if (maxGap > 120) chartShape = "Locomotive";
  else if (maxGap < 60) chartShape = "Splash";

  return { elements, modalities, dominantElement, dominantModality, hemispheres: { north, south, east, west }, chartShape };
}