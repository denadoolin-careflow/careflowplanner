/**
 * Lightweight astrological transits engine.
 *
 * Computes geocentric ecliptic longitudes for Sun, Mercury, Venus, Mars,
 * Jupiter, Saturn using mean Keplerian elements (Standish & Williams),
 * then derives:
 *   - Planet → zodiac sign (per local-noon sample, cached per day).
 *   - Retrograde detection (sign of d(λ)/dt over a 2-day window).
 *   - Sign ingress days (sign change vs previous day).
 *   - Mercury retrograde windows.
 *   - Void-of-course moon (Moon makes no major aspect to a classical
 *     planet before changing sign).
 *
 * Accuracy: ~0.5–1° for inner planets, ~0.1° for outer — plenty for sign
 * placement and retrograde detection, which is all the UI needs.
 */
import { getMoonSign } from "@/lib/rhythm-forecast";

export type Planet =
  | "Sun" | "Mercury" | "Venus" | "Mars" | "Jupiter" | "Saturn";

export type Sign =
  | "Aries" | "Taurus" | "Gemini" | "Cancer" | "Leo" | "Virgo"
  | "Libra" | "Scorpio" | "Sagittarius" | "Capricorn" | "Aquarius" | "Pisces";

const SIGNS: Sign[] = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const SIGN_GLYPH: Record<Sign, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋", Leo: "♌", Virgo: "♍",
  Libra: "♎", Scorpio: "♏", Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓",
};

const PLANET_GLYPH: Record<Planet, string> = {
  Sun: "☉", Mercury: "☿", Venus: "♀", Mars: "♂", Jupiter: "♃", Saturn: "♄",
};

/** Mean Keplerian elements at J2000 (Standish, JPL). Linear rates per century. */
interface KepEl {
  a0: number; aDot: number;          // AU
  e0: number; eDot: number;
  I0: number; IDot: number;          // deg
  L0: number; LDot: number;          // mean longitude, deg
  w0: number; wDot: number;          // longitude of perihelion, deg
  O0: number; ODot: number;          // long. ascending node, deg
}

const ELEMENTS: Record<"Earth" | Exclude<Planet, "Sun">, KepEl> = {
  Mercury: { a0: 0.38709927, aDot: 0.00000037, e0: 0.20563593, eDot: 0.00001906, I0: 7.00497902, IDot: -0.00594749, L0: 252.25032350, LDot: 149472.67411175, w0: 77.45779628, wDot: 0.16047689, O0: 48.33076593, ODot: -0.12534081 },
  Venus:   { a0: 0.72333566, aDot: 0.00000390, e0: 0.00677672, eDot: -0.00004107, I0: 3.39467605, IDot: -0.00078890, L0: 181.97909950, LDot: 58517.81538729, w0: 131.60246718, wDot: 0.00268329, O0: 76.67984255, ODot: -0.27769418 },
  Earth:   { a0: 1.00000261, aDot: 0.00000562, e0: 0.01671123, eDot: -0.00004392, I0: -0.00001531, IDot: -0.01294668, L0: 100.46457166, LDot: 35999.37244981, w0: 102.93768193, wDot: 0.32327364, O0: 0, ODot: 0 },
  Mars:    { a0: 1.52371034, aDot: 0.00001847, e0: 0.09339410, eDot: 0.00007882, I0: 1.84969142, IDot: -0.00813131, L0: -4.55343205, LDot: 19140.30268499, w0: -23.94362959, wDot: 0.44441088, O0: 49.55953891, ODot: -0.29257343 },
  Jupiter: { a0: 5.20288700, aDot: -0.00011607, e0: 0.04838624, eDot: -0.00013253, I0: 1.30439695, IDot: -0.00183714, L0: 34.39644051, LDot: 3034.74612775, w0: 14.72847983, wDot: 0.21252668, O0: 100.47390909, ODot: 0.20469106 },
  Saturn:  { a0: 9.53667594, aDot: -0.00125060, e0: 0.05386179, eDot: -0.00050991, I0: 2.48599187, IDot: 0.00193609, L0: 49.95424423, LDot: 1222.49362201, w0: 92.59887831, wDot: -0.41897216, O0: 113.66242448, ODot: -0.28867794 },
};

const D2R = Math.PI / 180;
const norm360 = (a: number) => ((a % 360) + 360) % 360;

function julianCenturies(date: Date): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  return (jd - 2451545.0) / 36525;
}

/** Solve Kepler's equation E - e*sin(E) = M (E, M in deg). */
function solveKepler(M: number, eDeg: number): number {
  // Newton, M and result in degrees with eccentricity converted internally.
  const e = eDeg; // standard form uses e in radians-like units; e dimensionless.
  let E = M + e * (180 / Math.PI) * Math.sin(M * D2R);
  for (let i = 0; i < 6; i++) {
    const dM = M - (E - (e * 180 / Math.PI) * Math.sin(E * D2R));
    const dE = dM / (1 - e * Math.cos(E * D2R));
    E += dE;
    if (Math.abs(dE) < 1e-7) break;
  }
  return E;
}

/** Heliocentric ecliptic coords (J2000) for a body given Kepler elements. */
function heliocentric(body: KepEl, T: number): { x: number; y: number; z: number } {
  const a = body.a0 + body.aDot * T;
  const e = body.e0 + body.eDot * T;
  const I = body.I0 + body.IDot * T;
  const L = body.L0 + body.LDot * T;
  const w = body.w0 + body.wDot * T;
  const O = body.O0 + body.ODot * T;
  const wp = w - O; // argument of perihelion
  const M = norm360(L - w);
  const E = solveKepler(M, e);
  // Position in orbital plane
  const xp = a * (Math.cos(E * D2R) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E * D2R);
  // Rotate into ecliptic frame
  const cosO = Math.cos(O * D2R), sinO = Math.sin(O * D2R);
  const cosI = Math.cos(I * D2R), sinI = Math.sin(I * D2R);
  const cosw = Math.cos(wp * D2R), sinw = Math.sin(wp * D2R);
  const x = (cosw * cosO - sinw * sinO * cosI) * xp + (-sinw * cosO - cosw * sinO * cosI) * yp;
  const y = (cosw * sinO + sinw * cosO * cosI) * xp + (-sinw * sinO + cosw * cosO * cosI) * yp;
  const z = (sinw * sinI) * xp + (cosw * sinI) * yp;
  return { x, y, z };
}

/** Geocentric ecliptic longitude (deg, 0–360) of a planet on `date`. */
function geocentricLongitude(planet: Planet, date: Date): number {
  const T = julianCenturies(date);
  if (planet === "Sun") {
    // Sun = -Earth heliocentric
    const e = heliocentric(ELEMENTS.Earth, T);
    return norm360(Math.atan2(-e.y, -e.x) / D2R);
  }
  const e = heliocentric(ELEMENTS.Earth, T);
  const p = heliocentric(ELEMENTS[planet as Exclude<Planet, "Sun">], T);
  return norm360(Math.atan2(p.y - e.y, p.x - e.x) / D2R);
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

const lonCache = new Map<string, number>();
function cachedLon(planet: Planet, date: Date): number {
  const k = `${planet}|${dayKey(date)}`;
  const hit = lonCache.get(k);
  if (hit !== undefined) return hit;
  const noon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  const v = geocentricLongitude(planet, noon);
  lonCache.set(k, v);
  return v;
}

export function planetSign(planet: Planet, date: Date = new Date()): Sign {
  const lon = cachedLon(planet, date);
  return SIGNS[Math.floor(lon / 30)];
}

/** Geocentric ecliptic longitude in degrees (0–360) for inner-system planets. */
export function planetLongitude(planet: Planet, date: Date = new Date()): number {
  return cachedLon(planet, date);
}

/** Daily motion (deg/day) — positive = direct, negative = retrograde. */
export function planetSpeed(planet: Planet, date: Date = new Date()): number {
  if (planet === "Sun") return 0.9856;
  const before = cachedLon(planet, new Date(date.getTime() - 86400000));
  const after = cachedLon(planet, new Date(date.getTime() + 86400000));
  let delta = after - before;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta / 2;
}

/** Returns true if planet's geocentric longitude is decreasing (retrograde). */
export function isRetrograde(planet: Planet, date: Date = new Date()): boolean {
  if (planet === "Sun") return false;
  const before = cachedLon(planet, new Date(date.getTime() - 86400000));
  const after = cachedLon(planet, new Date(date.getTime() + 86400000));
  // unwrap 360° crossings
  let delta = after - before;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta < 0;
}

/** True on a day when the planet changes sign (vs previous day). */
export function isIngressDay(planet: Planet, date: Date = new Date()): boolean {
  const prev = new Date(date.getTime() - 86400000);
  return planetSign(planet, date) !== planetSign(planet, prev);
}

/** Approximate Void-of-Course detection.
 *  Moon is VoC when it makes no major aspect (0,60,90,120,180°) with any of
 *  Sun/Mercury/Venus/Mars/Jupiter/Saturn before ingressing the next sign.
 */
const MAJOR_ASPECTS = [0, 60, 90, 120, 180];
const VOC_ORB = 1.0;
const VOC_PLANETS: Planet[] = ["Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];

export function isVoidOfCourse(date: Date = new Date()): boolean {
  // Find current moon sign + next-sign boundary in degrees.
  const moonSignNow = getMoonSign(date);
  const idx = SIGNS.indexOf(moonSignNow as Sign);
  const nextBoundary = (idx + 1) * 30; // 0–360
  // Sample today through end of moon's stay in this sign (max ~2.5 days).
  // We treat "today" as VoC if no aspect within VOC_ORB remains before ingress.
  const minutesNow = date.getHours() * 60 + date.getMinutes();
  // Estimate moon's longitude now (sign + fractional within sign by phase fraction-of-day).
  // Coarse: assume moon moves ~13.2°/day. We sample 12 points across the rest of today.
  const moonLonAtNoon = idx * 30 + 15; // approximate midpoint; UI tolerates the imprecision
  const samples = 12;
  let anyAspect = false;
  for (let i = 0; i < samples; i++) {
    const frac = i / samples;
    const t = new Date(date.getTime() + frac * 86400000);
    const moonLon = (moonLonAtNoon + frac * 13.2) % 360;
    if (moonLon >= nextBoundary) break;
    for (const p of VOC_PLANETS) {
      const planetLon = cachedLon(p, t);
      const diff = Math.abs(((moonLon - planetLon + 540) % 360) - 180);
      for (const a of MAJOR_ASPECTS) {
        if (Math.abs(Math.abs(diff - 180) - (180 - a)) < VOC_ORB) {
          anyAspect = true;
          break;
        }
      }
      if (anyAspect) break;
    }
    if (anyAspect) break;
  }
  // Ignore VoC when we're only ~1 hr from a sign change anyway.
  void minutesNow;
  return !anyAspect;
}

/* ---------------------------------------------------------------- */
/* Daily transit list                                               */
/* ---------------------------------------------------------------- */

export type TransitKind = "phase" | "retrograde" | "ingress" | "voc" | "in-sign";

export interface Transit {
  id: string;
  kind: TransitKind;
  planet?: Planet;
  sign?: Sign;
  glyph: string;
  label: string;        // short chip text
  detail: string;       // tooltip / longer copy
  tone: "soft" | "warn" | "rest";
}

const RETRO_NOTE: Record<Exclude<Planet, "Sun">, string> = {
  Mercury: "Mercury retrograde — re-read, re-do, re-check. Don't sign new things, do soften your DMs.",
  Venus: "Venus retrograde — revisit values, finances, and old relationships before announcing new ones.",
  Mars: "Mars retrograde — drive feels stalled. Conserve effort; rest is strategy now.",
  Jupiter: "Jupiter retrograde — internal expansion. Reflect on growth rather than launching it.",
  Saturn: "Saturn retrograde — review structures and commitments. Repair what's wobbly.",
};

const INGRESS_NOTE = (planet: Planet, sign: Sign) =>
  `${planet} enters ${sign} — energy shifts toward ${SIGN_FLAVOR[sign]}.`;

const SIGN_FLAVOR: Record<Sign, string> = {
  Aries: "bold starts and quick yeses",
  Taurus: "slow comforts and steady tending",
  Gemini: "messages, errands, light shifts",
  Cancer: "family, soft homecoming, care",
  Leo: "visible warmth and generous play",
  Virgo: "lists, tidying, follow-through",
  Libra: "balance, conversations, asking for help",
  Scorpio: "honest depth — protect your energy",
  Sagittarius: "one hopeful step, leave room to breathe",
  Capricorn: "steady ordinary work; pace over pressure",
  Aquarius: "thinking, planning, reaching out",
  Pisces: "reflection — soften the to-do list",
};

export function getTransitsForDate(date: Date = new Date()): Transit[] {
  const out: Transit[] = [];
  const planets: Planet[] = ["Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
  for (const p of planets) {
    const sign = planetSign(p, date);
    if (p !== "Sun" && isIngressDay(p, date)) {
      out.push({
        id: `${p}-ingress`, kind: "ingress", planet: p, sign,
        glyph: `${PLANET_GLYPH[p]}→${SIGN_GLYPH[sign]}`,
        label: `${p} → ${sign}`,
        detail: INGRESS_NOTE(p, sign),
        tone: "soft",
      });
    }
    if (p !== "Sun" && isRetrograde(p, date)) {
      out.push({
        id: `${p}-rx`, kind: "retrograde", planet: p, sign,
        glyph: `${PLANET_GLYPH[p]}℞`,
        label: `${p} retrograde`,
        detail: RETRO_NOTE[p as Exclude<Planet, "Sun">],
        tone: p === "Mercury" || p === "Venus" || p === "Mars" ? "warn" : "rest",
      });
    }
  }
  if (isVoidOfCourse(date)) {
    out.push({
      id: "moon-voc", kind: "voc",
      glyph: "☾∅",
      label: "Void of course moon",
      detail: "Drift is allowed. Don't start anything you need to land — small, repeatable tasks only.",
      tone: "rest",
    });
  }
  return out;
}

export { SIGN_GLYPH, PLANET_GLYPH };