/**
 * Aspect detection (major + minor) between any two ecliptic longitudes.
 */
export type AspectName =
  | "conjunction" | "opposition" | "trine" | "square" | "sextile"
  | "quincunx" | "semisextile" | "semisquare" | "sesquiquadrate" | "quintile" | "biquintile";

export interface AspectDef { name: AspectName; angle: number; defaultOrb: number; tone: "harmonious" | "dynamic" | "neutral"; }

export const ASPECTS: AspectDef[] = [
  { name: "conjunction",     angle: 0,   defaultOrb: 8, tone: "neutral" },
  { name: "opposition",      angle: 180, defaultOrb: 7, tone: "dynamic" },
  { name: "trine",           angle: 120, defaultOrb: 7, tone: "harmonious" },
  { name: "square",          angle: 90,  defaultOrb: 7, tone: "dynamic" },
  { name: "sextile",         angle: 60,  defaultOrb: 5, tone: "harmonious" },
  { name: "quincunx",        angle: 150, defaultOrb: 3, tone: "dynamic" },
  { name: "semisextile",     angle: 30,  defaultOrb: 2, tone: "neutral" },
  { name: "semisquare",      angle: 45,  defaultOrb: 2, tone: "dynamic" },
  { name: "sesquiquadrate",  angle: 135, defaultOrb: 2, tone: "dynamic" },
  { name: "quintile",        angle: 72,  defaultOrb: 2, tone: "harmonious" },
  { name: "biquintile",      angle: 144, defaultOrb: 2, tone: "harmonious" },
];

export interface AspectHit {
  name: AspectName;
  angle: number;
  orb: number;          // actual orb (deg from exact)
  tone: "harmonious" | "dynamic" | "neutral";
}

const norm = (x: number) => ((x % 360) + 360) % 360;

export function aspectBetween(lonA: number, lonB: number, orbs?: Partial<Record<AspectName, number>>): AspectHit | null {
  const diff = Math.abs(((norm(lonA) - norm(lonB) + 540) % 360) - 180); // 0..180
  let best: AspectHit | null = null;
  for (const a of ASPECTS) {
    const target = 180 - Math.abs(a.angle - 180); // same triangle inversion as above
    const delta = Math.abs(diff - a.angle);
    const orb = orbs?.[a.name] ?? a.defaultOrb;
    if (delta <= orb) {
      if (!best || delta < best.orb) best = { name: a.name, angle: a.angle, orb: delta, tone: a.tone };
    }
    void target;
  }
  return best;
}

/** Build a full aspect grid between two sets of points. */
export interface NamedPoint { id: string; longitude: number; }
export function aspectGrid(a: NamedPoint[], b: NamedPoint[], orbs?: Partial<Record<AspectName, number>>) {
  const out: { a: string; b: string; aspect: AspectHit }[] = [];
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      if (a === b && i >= j) continue;
      const hit = aspectBetween(a[i].longitude, b[j].longitude, orbs);
      if (hit) out.push({ a: a[i].id, b: b[j].id, aspect: hit });
    }
  }
  return out;
}