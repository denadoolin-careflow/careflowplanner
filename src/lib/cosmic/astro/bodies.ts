/**
 * Extended bodies for Cosmic Flow v2 — accurate engine.
 *
 * Uses `astronomy-engine` (geocentric apparent ecliptic of date) for Sun,
 * Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto.
 * Mean Node + Lilith via Meeus polynomials; Chiron/Ceres from mean
 * orbital elements (accurate to ~1° — adequate for sign + house).
 */
import * as A from "astronomy-engine";
import { type Planet as InnerPlanet, type Sign } from "@/lib/transits";

export type ExtPlanet =
  | InnerPlanet
  | "Moon" | "Uranus" | "Neptune" | "Pluto"
  | "Chiron" | "Ceres" | "NorthNode" | "SouthNode" | "Lilith";

const SIGNS: Sign[] = [
  "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
  "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces",
];

const D2R = Math.PI / 180;
const norm360 = (x: number) => ((x % 360) + 360) % 360;
const R2D = 180 / Math.PI;

const ENGINE_BODY: Partial<Record<ExtPlanet, A.Body>> = {
  Sun: A.Body.Sun,
  Moon: A.Body.Moon,
  Mercury: A.Body.Mercury,
  Venus: A.Body.Venus,
  Mars: A.Body.Mars,
  Jupiter: A.Body.Jupiter,
  Saturn: A.Body.Saturn,
  Uranus: A.Body.Uranus,
  Neptune: A.Body.Neptune,
  Pluto: A.Body.Pluto,
};

function jcT(d: Date): number {
  const jd = d.getTime() / 86400000 + 2440587.5;
  return (jd - 2451545.0) / 36525;
}

function meanNodeLon(d: Date): number {
  const T = jcT(d);
  return norm360(125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T * T * T) / 450000);
}
function meanLilithLon(d: Date): number {
  const T = jcT(d);
  return norm360(83.353243 + 4069.0137287 * T);
}

/** Mean-elements Chiron / Ceres (≈ ±1°, fine for sign + house). */
function meanElementsLon(d: Date, a: number, e: number, iDeg: number, OmegaDeg: number, wDeg: number, M0Deg: number, sunLon: number): number {
  const jd = d.getTime() / 86400000 + 2440587.5;
  const dEpoch = jd - 2451545.0;
  const i = iDeg * D2R, Omega = OmegaDeg * D2R, w = wDeg * D2R;
  const n = (360 / (Math.pow(a, 1.5) * 365.25)) * D2R; // rad/day
  const M = M0Deg * D2R + n * dEpoch;
  let E = M;
  for (let k = 0; k < 8; k++) E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const xv = a * (Math.cos(E) - e);
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const v = Math.atan2(yv, xv);
  const u = v + w;
  const xh = Math.cos(Omega) * Math.cos(u) - Math.sin(Omega) * Math.sin(u) * Math.cos(i);
  const yh = Math.sin(Omega) * Math.cos(u) + Math.cos(Omega) * Math.sin(u) * Math.cos(i);
  const r = a * (1 - e * Math.cos(E));
  const xH = r * xh, yH = r * yh;
  const lonEarth = (sunLon + 180) * D2R;
  const xE = Math.cos(lonEarth), yE = Math.sin(lonEarth);
  return norm360(Math.atan2(yH - yE, xH - xE) * R2D);
}

function chironLon(d: Date, sunLon: number): number {
  return meanElementsLon(d, 13.6717, 0.3823, 6.9295, 209.3651, 339.4761, 60.5783, sunLon);
}
function ceresLon(d: Date, sunLon: number): number {
  return meanElementsLon(d, 2.7691, 0.0758, 10.5934, 80.3055, 73.5976, 95.9892, sunLon);
}

/** Apparent geocentric ecliptic longitude (deg, 0..360) for any body. */
export function bodyLongitude(body: ExtPlanet, date: Date = new Date()): number {
  const eb = ENGINE_BODY[body];
  if (eb) {
    try {
      const time = new A.AstroTime(date);
      const ecl = A.Ecliptic(A.GeoVector(eb, time, true));
      return norm360(ecl.elon);
    } catch { return 0; }
  }
  if (body === "NorthNode") return meanNodeLon(date);
  if (body === "SouthNode") return norm360(meanNodeLon(date) + 180);
  if (body === "Lilith") return meanLilithLon(date);
  if (body === "Chiron" || body === "Ceres") {
    const sunLon = bodyLongitude("Sun", date);
    return body === "Chiron" ? chironLon(date, sunLon) : ceresLon(date, sunLon);
  }
  return 0;
}

/** True if body is retrograde at `date` (longitude decreasing). */
export function bodyRetrograde(body: ExtPlanet, date: Date = new Date()): boolean {
  // Sun, Moon, and the lunar nodes don't retrograde in the usual sense.
  if (body === "Sun" || body === "Moon") return false;
  if (body === "NorthNode" || body === "SouthNode" || body === "Lilith") return false;
  const dt = 12 * 3600 * 1000;
  const a = bodyLongitude(body, new Date(date.getTime() - dt));
  const b = bodyLongitude(body, new Date(date.getTime() + dt));
  // shortest signed delta
  let delta = b - a;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta < 0;
}

/** Daily motion in deg (signed). Negative = retrograde. */
export function bodySpeed(body: ExtPlanet, date: Date = new Date()): number {
  if (body === "Sun" || body === "Moon" || body === "NorthNode" || body === "SouthNode" || body === "Lilith") {
    const a = bodyLongitude(body, new Date(date.getTime() - 43200000));
    const b = bodyLongitude(body, new Date(date.getTime() + 43200000));
    let d = b - a; if (d > 180) d -= 360; if (d < -180) d += 360;
    return d; // per day
  }
  const a = bodyLongitude(body, new Date(date.getTime() - 43200000));
  const b = bodyLongitude(body, new Date(date.getTime() + 43200000));
  let d = b - a; if (d > 180) d -= 360; if (d < -180) d += 360;
  return d;
}
void InnerPlanet;

export function bodySign(body: ExtPlanet, date: Date = new Date()): Sign {
  const lon = bodyLongitude(body, date);
  return SIGNS[Math.floor(lon / 30) % 12];
}

export function bodyDegreeInSign(body: ExtPlanet, date: Date = new Date()): number {
  return bodyLongitude(body, date) % 30;
}

export const ALL_BODIES: ExtPlanet[] = [
  "Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn",
  "Uranus","Neptune","Pluto","Chiron","Ceres","NorthNode","SouthNode","Lilith",
];

export const BODY_GLYPHS: Record<ExtPlanet, string> = {
  Sun: "☉", Moon: "☾", Mercury: "☿", Venus: "♀", Mars: "♂",
  Jupiter: "♃", Saturn: "♄", Uranus: "♅", Neptune: "♆", Pluto: "♇",
  Chiron: "⚷", Ceres: "⚳", NorthNode: "☊", SouthNode: "☋", Lilith: "⚸",
};

export { SIGNS };