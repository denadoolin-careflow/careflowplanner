/**
 * Sky toolkit — pure, on-device calculations behind the Astro Suite-style views:
 * essential dignity, sign ingresses & stations, lunations/eclipse seasons,
 * natal transit grid, orb curves and transit search.
 */
import { bodyLongitude, bodySpeed, bodyRetrograde, type ExtPlanet } from "@/lib/cosmic/astro/bodies";
import { ASPECTS, type AspectName } from "@/lib/cosmic/astro/aspects";
import type { NatalChartV2 } from "@/lib/cosmic/chart";
import { houseOf } from "@/lib/cosmic/astro/houses";
import type { Sign } from "@/lib/transits";

export const SIGNS: Sign[] = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
export const signOf = (lon: number): Sign => SIGNS[Math.floor(norm(lon) / 30) % 12];
export const norm = (x: number) => ((x % 360) + 360) % 360;
const DAY = 86400000;

/* ---------- Essential dignity ---------- */
export type Dignity = "domicile" | "exaltation" | "detriment" | "fall" | "peregrine";
const DOMICILE: Record<string, Sign[]> = {
  Sun: ["Leo"], Moon: ["Cancer"], Mercury: ["Gemini", "Virgo"], Venus: ["Taurus", "Libra"],
  Mars: ["Aries", "Scorpio"], Jupiter: ["Sagittarius", "Pisces"], Saturn: ["Capricorn", "Aquarius"],
};
const EXALT: Record<string, Sign> = { Sun: "Aries", Moon: "Taurus", Mercury: "Virgo", Venus: "Pisces", Mars: "Capricorn", Jupiter: "Cancer", Saturn: "Libra" };
const opposite = (s: Sign) => SIGNS[(SIGNS.indexOf(s) + 6) % 12];

export function dignityOf(body: string, sign: Sign): Dignity | null {
  if (!DOMICILE[body]) return null; // only traditional planets carry essential dignity
  if (DOMICILE[body].includes(sign)) return "domicile";
  if (EXALT[body] === sign) return "exaltation";
  if (DOMICILE[body].some(s => opposite(s) === sign)) return "detriment";
  if (opposite(EXALT[body]) === sign) return "fall";
  return "peregrine";
}
export const DIGNITY_MEANING: Record<Dignity, string> = {
  domicile: "At home — this energy flows easily and on its own terms.",
  exaltation: "Honoured guest — this energy shows up at its best, sometimes idealised.",
  detriment: "Far from home — works, but needs extra effort and creativity.",
  fall: "Low ground — this energy can feel muted; gentleness helps it grow.",
  peregrine: "Wanderer — neutral; takes its colour from the planets around it.",
};
export const TRADITIONAL_RULER: Record<Sign, string> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon", Leo: "Sun", Virgo: "Mercury",
  Libra: "Venus", Scorpio: "Mars", Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter",
};

/* ---------- Ingresses & stations ---------- */
export interface SkyBodyStatus {
  body: ExtPlanet; longitude: number; sign: Sign; degree: number; speed: number; retrograde: boolean;
  nextIngress: { date: Date; sign: Sign } | null;
  nextStation: { date: Date; turns: "retrograde" | "direct" } | null;
}
export const SKY_BODIES: ExtPlanet[] = ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto","NorthNode","Chiron"];

export function skyStatus(body: ExtPlanet, from: Date = new Date(), horizonDays = 730): SkyBodyStatus {
  const lon = bodyLongitude(body, from);
  const sign = signOf(lon);
  const retro = bodyRetrograde(body, from);
  const step = body === "Moon" ? 1 / 24 : 1; // days
  let nextIngress: SkyBodyStatus["nextIngress"] = null;
  let nextStation: SkyBodyStatus["nextStation"] = null;
  const limit = body === "Moon" ? 4 : horizonDays;
  for (let d = step; d <= limit && (!nextIngress || (!nextStation && body !== "Sun" && body !== "Moon")); d += step) {
    const t = new Date(from.getTime() + d * DAY);
    if (!nextIngress) {
      const s = signOf(bodyLongitude(body, t));
      if (s !== sign) nextIngress = { date: t, sign: s };
    }
    if (!nextStation && body !== "Sun" && body !== "Moon" && body !== "NorthNode") {
      const r = bodyRetrograde(body, t);
      if (r !== retro) nextStation = { date: t, turns: r ? "retrograde" : "direct" };
    }
  }
  return { body, longitude: lon, sign, degree: lon % 30, speed: bodySpeed(body, from), retrograde: retro, nextIngress, nextStation };
}

/* ---------- Lunations ---------- */
export interface Lunation { date: Date; kind: "new" | "full"; longitude: number; sign: Sign; nodeDistance: number; eclipseSeason: boolean }
const elong = (t: Date) => norm(bodyLongitude("Moon", t) - bodyLongitude("Sun", t));

export function lunations(from: Date = new Date(), count = 12): Lunation[] {
  const out: Lunation[] = [];
  let t = from.getTime();
  let prev = elong(new Date(t));
  const stepH = 6 * 3600000;
  while (out.length < count && t < from.getTime() + 400 * DAY) {
    const nt = t + stepH;
    const cur = elong(new Date(nt));
    const crossed = (target: number) => {
      const a = norm(prev - target + 180) - 180, b = norm(cur - target + 180) - 180;
      return a < 0 && b >= 0;
    };
    const kind = crossed(0) ? "new" : crossed(180) ? "full" : null;
    if (kind) {
      const date = new Date(nt);
      const lon = kind === "new" ? bodyLongitude("Sun", date) : bodyLongitude("Moon", date);
      const node = bodyLongitude("NorthNode", date);
      const d = Math.abs(norm(lon - node + 180) - 180);
      const nodeDistance = Math.min(d, 180 - d);
      out.push({ date, kind, longitude: lon, sign: signOf(lon), nodeDistance, eclipseSeason: nodeDistance <= (kind === "new" ? 18 : 12) });
    }
    prev = cur; t = nt;
  }
  return out;
}

/* ---------- Transits to natal ---------- */
export const MAJOR_ASPECTS = ASPECTS.filter(a => ["conjunction","opposition","trine","square","sextile"].includes(a.name));
export const TRANSIT_BODIES: ExtPlanet[] = ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto"];

export interface TransitRow {
  transit: ExtPlanet; aspect: AspectName; natal: string; house: number | null;
  orb: number; applying: boolean; exactDate: Date | null; tone: "harmonious" | "dynamic" | "neutral";
}
export function separation(a: number, b: number) { return Math.abs(norm(a - b + 180) - 180); }
export function aspectOrb(tLon: number, nLon: number, angle: number) { return Math.abs(separation(tLon, nLon) - angle); }

/** Find next exact hit within `days` (coarse daily scan + local minimum). */
export function nextExact(body: ExtPlanet, natalLon: number, angle: number, from: Date, days = 400): Date | null {
  const step = body === "Moon" ? 1 / 24 : 1;
  let prevOrb = aspectOrb(bodyLongitude(body, from), natalLon, angle);
  let falling = false;
  for (let d = step; d <= days; d += step) {
    const t = new Date(from.getTime() + d * DAY);
    const o = aspectOrb(bodyLongitude(body, t), natalLon, angle);
    if (o < prevOrb) falling = true;
    else if (falling && o > prevOrb) {
      if (prevOrb < 1) return new Date(t.getTime() - step * DAY);
      falling = false;
    }
    prevOrb = o;
  }
  return null;
}

export function transitGrid(chart: NatalChartV2, on: Date = new Date()): TransitRow[] {
  const rows: TransitRow[] = [];
  const points = [...chart.planets.map(p => ({ id: p.body as string, lon: p.longitude })),
    ...(chart.houses ? [{ id: "Ascendant", lon: chart.houses.ascendant }, { id: "Midheaven", lon: chart.houses.midheaven }] : [])];
  for (const body of TRANSIT_BODIES) {
    const tLon = bodyLongitude(body, on);
    const later = bodyLongitude(body, new Date(on.getTime() + (body === "Moon" ? 3600000 : DAY)));
    for (const n of points) {
      for (const a of MAJOR_ASPECTS) {
        const orbLimit = body === "Moon" ? 4 : a.defaultOrb > 6 ? 6 : a.defaultOrb;
        const orb = aspectOrb(tLon, n.lon, a.angle);
        if (orb > orbLimit) continue;
        const applying = aspectOrb(later, n.lon, a.angle) < orb;
        rows.push({
          transit: body, aspect: a.name, natal: n.id, orb, applying, tone: a.tone,
          house: chart.houses ? houseOf(tLon, chart.houses) : null,
          exactDate: applying ? nextExact(body, n.lon, a.angle, on, body === "Moon" ? 3 : 200) : null,
        });
      }
    }
  }
  return rows.sort((x, y) => x.orb - y.orb);
}

/** Orb over time (positive = degrees from exact) for the peak chart. */
export function orbSeries(body: ExtPlanet, natalLon: number, angle: number, from: Date, days = 180, step = 2) {
  const out: { date: Date; orb: number }[] = [];
  for (let d = 0; d <= days; d += step) {
    const t = new Date(from.getTime() + d * DAY);
    out.push({ date: t, orb: aspectOrb(bodyLongitude(body, t), natalLon, angle) });
  }
  return out;
}

/** All exact passes (including retrograde re-passes) within the window. */
export function searchTransit(body: ExtPlanet, natalLon: number, angle: number, from: Date = new Date(), days = 730): Date[] {
  const hits: Date[] = [];
  const step = body === "Moon" ? 1 / 24 : body === "Sun" || body === "Mercury" || body === "Venus" || body === "Mars" ? 0.5 : 1;
  let p2 = aspectOrb(bodyLongitude(body, from), natalLon, angle);
  let p1 = aspectOrb(bodyLongitude(body, new Date(from.getTime() + step * DAY)), natalLon, angle);
  for (let d = 2 * step; d <= days; d += step) {
    const o = aspectOrb(bodyLongitude(body, new Date(from.getTime() + d * DAY)), natalLon, angle);
    if (p1 <= p2 && p1 < o && p1 < 1.5) hits.push(new Date(from.getTime() + (d - step) * DAY));
    p2 = p1; p1 = o;
  }
  return hits;
}

/* ---------- Synastry ---------- */
export interface SynastryHit { a: string; b: string; aspect: AspectName; orb: number; tone: "harmonious" | "dynamic" | "neutral" }
export function synastry(a: NatalChartV2, b: NatalChartV2): SynastryHit[] {
  const pa = a.planets.filter(p => TRANSIT_BODIES.includes(p.body));
  const pb = b.planets.filter(p => TRANSIT_BODIES.includes(p.body));
  const out: SynastryHit[] = [];
  for (const x of pa) for (const y of pb) for (const asp of MAJOR_ASPECTS) {
    const orb = aspectOrb(x.longitude, y.longitude, asp.angle);
    if (orb <= Math.min(asp.defaultOrb, 6)) out.push({ a: x.body, b: y.body, aspect: asp.name, orb, tone: asp.tone });
  }
  return out.sort((m, n) => m.orb - n.orb);
}
export function overlay(planetsOf: NatalChartV2, housesOf: NatalChartV2) {
  if (!housesOf.houses) return [];
  return planetsOf.planets.filter(p => TRANSIT_BODIES.includes(p.body)).map(p => ({ body: p.body, house: houseOf(p.longitude, housesOf.houses!) }));
}
