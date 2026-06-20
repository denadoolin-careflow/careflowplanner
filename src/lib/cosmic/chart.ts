/**
 * Full natal chart assembly + caching helpers.
 */
import { ALL_BODIES, bodyLongitude, bodySign, bodyRetrograde, type ExtPlanet, BODY_GLYPHS } from "@/lib/cosmic/astro/bodies";
import { computeHouses, houseOf, chartRulerOf, type HouseSystem, type HouseCusps } from "@/lib/cosmic/astro/houses";
import { aspectGrid, type NamedPoint } from "@/lib/cosmic/astro/aspects";
import { computeDominants, type Dominants } from "@/lib/cosmic/astro/dignities";
import { fixedStarsNear, type FixedStar } from "@/lib/cosmic/astro/fixed-stars";
import type { Sign } from "@/lib/transits";

export interface BirthInputV2 {
  date: string;       // yyyy-mm-dd
  time?: string | null;
  tz?: string | null;
  lat?: number | null;
  lng?: number | null;
  place?: string | null;
  house_system?: HouseSystem;
}

export interface NatalPlanet {
  body: ExtPlanet;
  glyph: string;
  longitude: number;
  sign: Sign;
  degreeInSign: number;
  house?: number;
  retrograde?: boolean;
}

export interface NatalChartV2 {
  birth: BirthInputV2;
  planets: NatalPlanet[];
  houses: HouseCusps | null;
  aspects: ReturnType<typeof aspectGrid>;
  dominants: Dominants;
  chartRuler: string;
  starContacts: { body: ExtPlanet; star: FixedStar }[];
}

/**
 * Convert a wall-clock birth date/time in a given IANA timezone to a true
 * UTC `Date`. Without an accurate UTC instant the Ascendant calculation is
 * wrong (it depends on apparent sidereal time). If `tz` is omitted we fall
 * back to the browser's local zone.
 */
function birthDate(b: BirthInputV2): Date {
  const [y, m, d] = b.date.split("-").map(Number);
  const [hh = 12, mm = 0] = (b.time ?? "12:00").split(":").map(Number);
  const tz = b.tz || (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC");
  const naiveUtc = Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh, mm);
  // Offset (minutes) that `tz` had at this instant, east of UTC positive.
  const offsetMin = tzOffsetMinutes(new Date(naiveUtc), tz);
  return new Date(naiveUtc - offsetMin * 60_000);
}

function tzOffsetMinutes(date: Date, timeZone: string): number {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    const parts = dtf.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});
    const asUtc = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), Number(parts.second),
    );
    return Math.round((asUtc - date.getTime()) / 60_000);
  } catch {
    return 0;
  }
}

export function computeNatalV2(b: BirthInputV2): NatalChartV2 {
  const date = birthDate(b);
  const planets: NatalPlanet[] = ALL_BODIES.map(body => {
    const longitude = bodyLongitude(body, date);
    return {
      body,
      glyph: BODY_GLYPHS[body],
      longitude,
      sign: bodySign(body, date),
      degreeInSign: longitude % 30,
      retrograde: bodyRetrograde(body, date),
    };
  });
  const houses = computeHouses(date, b.lat ?? null, b.lng ?? null, b.house_system ?? "whole-sign");
  if (houses) for (const p of planets) p.house = houseOf(p.longitude, houses);

  const points: NamedPoint[] = planets.map(p => ({ id: p.body, longitude: p.longitude }));
  const aspects = aspectGrid(points, points);

  const signsOnlyMajor = planets
    .filter(p => ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn"].includes(p.body as string))
    .map(p => p.sign);
  const majorLons = planets
    .filter(p => ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn"].includes(p.body as string))
    .map(p => p.longitude);
  const dominants = computeDominants(signsOnlyMajor, majorLons);

  const starContacts: { body: ExtPlanet; star: FixedStar }[] = [];
  for (const p of planets) {
    for (const s of fixedStarsNear(p.longitude, 2)) starContacts.push({ body: p.body, star: s });
  }

  return {
    birth: b,
    planets,
    houses,
    aspects,
    dominants,
    chartRuler: houses ? chartRulerOf(houses.ascendantSign) : "",
    starContacts,
  };
}

export function hashBirth(b: BirthInputV2): string {
  return [
    "v2", b.date, b.time ?? "", b.tz ?? "", b.lat ?? "", b.lng ?? "", b.house_system ?? "whole-sign",
  ].join("|");
}