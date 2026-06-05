/**
 * Curated fixed stars with ecliptic longitudes for current epoch.
 */
export interface FixedStar { name: string; longitude: number; magnitude: number; nature: string; }

export const FIXED_STARS: FixedStar[] = [
  { name: "Regulus",   longitude: 150.0, magnitude: 1.4, nature: "Royal, ambition, leadership" },
  { name: "Spica",     longitude: 204.0, magnitude: 1.0, nature: "Brilliance, gift, harvest" },
  { name: "Algol",     longitude: 56.0,  magnitude: 2.1, nature: "Transformation, intensity" },
  { name: "Sirius",    longitude: 104.0, magnitude: -1.5, nature: "Honor, devotion, sacred work" },
  { name: "Antares",   longitude: 250.0, magnitude: 1.1, nature: "Courage, depth, warrior heart" },
  { name: "Aldebaran", longitude: 70.0,  magnitude: 0.9, nature: "Integrity, the watcher of the east" },
  { name: "Fomalhaut", longitude: 333.0, magnitude: 1.2, nature: "Vision, idealism, the dreamer" },
];

export function fixedStarsNear(longitude: number, orbDeg = 2): FixedStar[] {
  return FIXED_STARS.filter(s => Math.abs(((s.longitude - longitude + 540) % 360) - 180) > (180 - orbDeg));
}