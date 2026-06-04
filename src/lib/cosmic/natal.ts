/**
 * Very lightweight natal helper. We don't ship full Placidus houses in v1 —
 * instead we compute sun sign, moon sign (from the existing rhythm helper),
 * and ascendant via local sidereal time approximation. Aspects between
 * transiting and natal planets are computed by ecliptic longitude with a
 * small orb.
 */
import { getMoonSign } from "@/lib/zodiac";
import { planetSign, type Sign, type Planet } from "@/lib/transits";

export interface BirthInfo {
  date: string;            // yyyy-mm-dd
  time?: string;           // HH:mm (local)
  tz?: string;
  lat?: number;
  lng?: number;
  place?: string;
}

export interface NatalSnapshot {
  sun: Sign;
  moon: Sign;
  ascendant?: Sign;
  /** Per-planet natal sign placement (Mercury..Saturn). */
  planets: Partial<Record<Planet, Sign>>;
}

const SIGNS: Sign[] = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

export function computeNatal(birth: BirthInfo): NatalSnapshot {
  const [y, m, d] = birth.date.split("-").map(Number);
  const [hh = 12, mm = 0] = (birth.time ?? "12:00").split(":").map(Number);
  const date = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh, mm));
  // Reuse the same transits engine for natal-equivalent sign placements.
  const planets: Partial<Record<Planet, Sign>> = {};
  const ps: Planet[] = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
  for (const p of ps) planets[p] = planetSign(p, date);
  const sun = planetSign("Sun", date);
  const moon = (getMoonSign(date)?.name ?? "Aries") as Sign;

  // Ascendant approx: sidereal time at birth + 90° (rough). Only meaningful
  // when birth time + lng provided; otherwise omitted.
  let asc: Sign | undefined;
  if (birth.time && birth.lng != null) {
    const jd = date.getTime() / 86400000 + 2440587.5;
    const T = (jd - 2451545.0) / 36525;
    const gmst = 280.46061837 + 360.98564736629 * (jd - 2451545)
      + 0.000387933 * T * T - (T * T * T) / 38710000;
    const lst = ((gmst + birth.lng) % 360 + 360) % 360;
    asc = SIGNS[Math.floor(lst / 30) % 12];
  }
  return { sun, moon, ascendant: asc, planets };
}

/** Plain English chart summary used in the UI. */
export function natalSummary(n: NatalSnapshot): string {
  const parts = [`Sun in ${n.sun}`, `Moon in ${n.moon}`];
  if (n.ascendant) parts.push(`${n.ascendant} rising`);
  return parts.join(" · ");
}

/** Find aspects (conjunction/opposition/square/trine/sextile, ±4° orb)
 *  between a transiting planet's current sign-mid-degree and the natal
 *  placements. Sign-level only — good enough for the dashboard tile. */
export function planetTouchesNatal(transitSign: Sign, natal: NatalSnapshot): { planet: Planet; relation: string }[] {
  const out: { planet: Planet; relation: string }[] = [];
  const idx = (s: Sign) => SIGNS.indexOf(s);
  const ti = idx(transitSign);
  const check: { planet: Planet; sign?: Sign }[] = [
    { planet: "Mercury", sign: natal.planets.Mercury },
    { planet: "Venus", sign: natal.planets.Venus },
    { planet: "Mars", sign: natal.planets.Mars },
    { planet: "Jupiter", sign: natal.planets.Jupiter },
    { planet: "Saturn", sign: natal.planets.Saturn },
  ];
  for (const c of check) {
    if (!c.sign) continue;
    const ni = idx(c.sign);
    const diff = ((ti - ni) % 12 + 12) % 12;
    if (diff === 0) out.push({ planet: c.planet, relation: "meets natal" });
    else if (diff === 6) out.push({ planet: c.planet, relation: "opposes natal" });
    else if (diff === 3 || diff === 9) out.push({ planet: c.planet, relation: "squares natal" });
    else if (diff === 4 || diff === 8) out.push({ planet: c.planet, relation: "trines natal" });
    else if (diff === 2 || diff === 10) out.push({ planet: c.planet, relation: "sextiles natal" });
  }
  return out;
}