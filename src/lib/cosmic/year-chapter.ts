/**
 * Year chapter — deterministic, on-device synthesis of the profection time
 * lord, solar return chart and moon cycles into a plain-language summary.
 */
import { computeProfection, houseTopics, type Profection } from "@/lib/cosmic/astro/profections";
import { computeProgressions } from "@/lib/cosmic/astro/progressions";
import { bodyLongitude, bodyRetrograde, type ExtPlanet } from "@/lib/cosmic/astro/bodies";
import { houseOf } from "@/lib/cosmic/astro/houses";
import { computeNatalV2, type NatalChartV2 } from "@/lib/cosmic/chart";
import { MAJOR_ASPECTS, SIGNS, aspectOrb, dignityOf, lunations, norm, signOf, type Dignity, type Lunation } from "@/lib/cosmic/sky";
import type { Sign } from "@/lib/transits";

const DAY = 86400000;
const ord = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;

export function birthMoment(chart: NatalChartV2): Date {
  return new Date(`${chart.birth.date}T${(chart.birth.time ?? "12:00").slice(0, 5)}:00`);
}
/** House of a longitude: real cusps when available, else whole signs from the anchor sign. */
function houseIn(lon: number, chart: NatalChartV2, anchor: Sign): number {
  if (chart.houses) return houseOf(lon, chart.houses);
  return ((SIGNS.indexOf(signOf(lon)) - SIGNS.indexOf(anchor) + 12) % 12) + 1;
}
const sunSign = (c: NatalChartV2) => c.planets.find(p => p.body === "Sun")!.sign;
const ascOrSun = (c: NatalChartV2) => c.houses?.ascendantSign ?? sunSign(c);

/* ---------- Copy ---------- */
export const TIME_LORD_STYLE: Record<string, string> = {
  Sun: "visibility, confidence and living from the heart",
  Moon: "feelings, home, care and the body's daily needs",
  Mercury: "learning, conversations, paperwork and busy minds",
  Venus: "relationships, beauty, pleasure and what you value",
  Mars: "courage, effort, boundaries and getting things moving",
  Jupiter: "growth, generosity, teachers and widening horizons",
  Saturn: "structure, responsibility, patience and long-term foundations",
};
export const PHASE_COPY: Record<string, { asks: string; lean: string; gentle: string }> = {
  New: { asks: "Planting seeds — a new life-season is beginning, often quietly.", lean: "trying new things without needing a plan", gentle: "expecting clear answers yet" },
  Crescent: { asks: "Pushing past early doubts and protecting what you've started.", lean: "small brave steps", gentle: "old habits that pull you backward" },
  "First Quarter": { asks: "Building and deciding — action and visible effort.", lean: "commitments and clear choices", gentle: "taking every obstacle personally" },
  Gibbous: { asks: "Refining and adjusting — polishing what you've built.", lean: "learning and fine-tuning", gentle: "perfectionism" },
  Full: { asks: "Seeing clearly — relationships and results come to light.", lean: "sharing your work and being seen", gentle: "all-or-nothing reactions" },
  Disseminating: { asks: "Sharing what you've learned and giving back.", lean: "teaching and mentoring", gentle: "over-explaining yourself" },
  "Last Quarter": { asks: "Re-evaluating — turning toward what really matters.", lean: "honest reviews and letting go", gentle: "clinging to roles you've outgrown" },
  Balsamic: { asks: "Resting and releasing — a quiet, wise closing season.", lean: "rest, retreat and spiritual practice", gentle: "forcing big new starts" },
};
const PHASE_ORDER = ["New", "Crescent", "First Quarter", "Gibbous", "Full", "Disseminating", "Last Quarter", "Balsamic"];
const SR_SUN_HOUSE: Record<number, string> = {
  1: "you — health, appearance and fresh personal starts", 2: "money, security and self-worth",
  3: "learning, siblings, local errands and conversations", 4: "home, family and roots",
  5: "joy, creativity, children and play", 6: "work routines, health and service",
  7: "partnerships and one-to-one relationships", 8: "shared resources, intimacy and deep change",
  9: "travel, study and beliefs", 10: "career, reputation and visibility",
  11: "friends, community and hopes", 12: "rest, retreat and inner work",
};
const HOUSE_SHORT: Record<number, string> = {
  1: "self and body", 2: "money and values", 3: "communication and learning", 4: "home and family",
  5: "creativity and joy", 6: "daily rhythms and health", 7: "partnership", 8: "shared resources and change",
  9: "beliefs and travel", 10: "career and calling", 11: "friends and community", 12: "rest and the unseen",
};

/* ---------- Time lord ---------- */
export interface TimeLordReport {
  profection: Profection; next: Profection;
  lord: string; style: string; topics: string;
  natalSign?: Sign; natalHouse?: number; natalDignity: Dignity | null;
  nowSign: Sign; nowHouse: number; nowRetrograde: boolean;
  aspects: { aspect: string; natal: string; orb: number }[];
}
export function timeLordReport(chart: NatalChartV2, on: Date = new Date()): TimeLordReport {
  const birth = birthMoment(chart);
  const anchor = ascOrSun(chart);
  const profection = computeProfection(birth, anchor, on);
  const next = computeProfection(birth, anchor, new Date(new Date(profection.yearEnds).getTime() + 2 * DAY));
  const lord = profection.timeLord as ExtPlanet;
  const natal = chart.planets.find(p => p.body === lord);
  const lon = bodyLongitude(lord, on);
  const aspects = chart.planets.filter(p => ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn"].includes(p.body))
    .flatMap(p => MAJOR_ASPECTS.map(a => ({ aspect: a.name, natal: p.body as string, orb: aspectOrb(lon, p.longitude, a.angle) })))
    .filter(x => x.orb <= 3).sort((a, b) => a.orb - b.orb);
  return {
    profection, next, lord, style: TIME_LORD_STYLE[lord] ?? "", topics: houseTopics(profection.house),
    natalSign: natal?.sign, natalHouse: natal?.house, natalDignity: natal ? dignityOf(lord, natal.sign) : null,
    nowSign: signOf(lon), nowHouse: houseIn(lon, chart, anchor), nowRetrograde: bodyRetrograde(lord, on), aspects,
  };
}

/* ---------- Solar return ---------- */
function sunReturnNear(natalLon: number, from: Date, dir: 1 | -1): Date {
  let t = from.getTime();
  let prev = norm(bodyLongitude("Sun", new Date(t)) - natalLon + 180) - 180;
  for (let i = 0; i < 400; i++) {
    const nt = t + dir * DAY;
    const cur = norm(bodyLongitude("Sun", new Date(nt)) - natalLon + 180) - 180;
    if ((dir === 1 && prev <= 0 && cur > 0) || (dir === -1 && prev > 0 && cur <= 0)) {
      const [a, b] = dir === 1 ? [prev, cur] : [cur, prev];
      const start = dir === 1 ? t : nt;
      return new Date(start + DAY * (-a / (b - a)));
    }
    prev = cur; t = nt;
  }
  return new Date(from);
}
export interface SolarReturnReport {
  last: Date; next: Date; daysToNext: number; chart: NatalChartV2;
  rising: Sign | null; sunHouse: number; moonSign: Sign; moonHouse: number;
  angular: string[]; sunHouseMeaning: string; usesWholeSignFromSun: boolean;
}
export function solarReturnChart(chart: NatalChartV2, on: Date = new Date()): SolarReturnReport {
  const natalSun = chart.planets.find(p => p.body === "Sun")!.longitude;
  const last = sunReturnNear(natalSun, on, -1);
  const next = sunReturnNear(natalSun, new Date(on.getTime() + DAY), 1);
  const iso = last.toISOString();
  const sr = computeNatalV2({ date: iso.slice(0, 10), time: iso.slice(11, 16), tz: "UTC", lat: chart.birth.lat, lng: chart.birth.lng, house_system: "whole-sign" });
  const anchor = sr.houses?.ascendantSign ?? sunSign(sr);
  const sun = sr.planets.find(p => p.body === "Sun")!;
  const moon = sr.planets.find(p => p.body === "Moon")!;
  const sunHouse = houseIn(sun.longitude, sr, anchor);
  const angles = sr.houses ? [sr.houses.ascendant, sr.houses.midheaven, sr.houses.ascendant + 180, sr.houses.midheaven + 180] : [];
  const angular = sr.planets.filter(p => ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn"].includes(p.body) && angles.some(a => aspectOrb(p.longitude, a, 0) <= 8)).map(p => p.body as string);
  return {
    last, next, daysToNext: Math.max(0, Math.ceil((next.getTime() - on.getTime()) / DAY)), chart: sr,
    rising: sr.houses?.ascendantSign ?? null, sunHouse, moonSign: moon.sign, moonHouse: houseIn(moon.longitude, sr, anchor),
    angular, sunHouseMeaning: SR_SUN_HOUSE[sunHouse], usesWholeSignFromSun: !sr.houses,
  };
}

/* ---------- Progressed lunation ---------- */
export interface ProgressedLunation { phase: string; index: number; progress: number; enteredYear: number; nextPhase: string; nextYear: number; copy: typeof PHASE_COPY[string] }
export function progressedLunation(chart: NatalChartV2, on: Date = new Date()): ProgressedLunation {
  const birth = birthMoment(chart);
  const phaseAt = (t: Date) => computeProgressions(birth, t).progressedMoon.lunarPhase;
  const phase = phaseAt(on);
  const step = 30 * DAY;
  let back = on.getTime(); for (let i = 0; i < 60 && phaseAt(new Date(back - step)) === phase; i++) back -= step;
  let fwd = on.getTime(); for (let i = 0; i < 60 && phaseAt(new Date(fwd + step)) === phase; i++) fwd += step;
  const index = PHASE_ORDER.indexOf(phase);
  return {
    phase, index, progress: Math.min(1, Math.max(0, (on.getTime() - back) / Math.max(step, fwd - back))),
    enteredYear: new Date(back).getFullYear(), nextPhase: PHASE_ORDER[(index + 1) % 8], nextYear: new Date(fwd + step).getFullYear(),
    copy: PHASE_COPY[phase] ?? PHASE_COPY.New,
  };
}

/* ---------- Monthly moon ---------- */
export interface MonthMoon { waxing: boolean; next: (Lunation & { house: number })[] }
export function monthMoon(chart: NatalChartV2, on: Date = new Date()): MonthMoon {
  const anchor = ascOrSun(chart);
  const el = norm(bodyLongitude("Moon", on) - bodyLongitude("Sun", on));
  return { waxing: el < 180, next: lunations(on, 2).map(l => ({ ...l, house: houseIn(l.longitude, chart, anchor) })) };
}

/* ---------- Summary ---------- */
export interface ChapterSummary { text: string; lean: string[]; gentle: string[] }
export function chapterSummary(t: TimeLordReport, sr: SolarReturnReport, pl: ProgressedLunation, mm: MonthMoon): ChapterSummary {
  const h = t.profection.house;
  const lines = [
    `This is a ${ord(h)}-house year guided by ${t.lord}: ${HOUSE_SHORT[h]} take centre stage, coloured by ${t.style}.`,
    `${t.lord} is moving through ${t.nowSign}${t.nowRetrograde ? " (retrograde — a time to revisit rather than push)" : ""}, lighting your ${ord(t.nowHouse)} house of ${HOUSE_SHORT[t.nowHouse]}.`,
    `Your birthday chart puts the Sun in the ${ord(sr.sunHouse)} house, so ${sr.sunHouseMeaning} keep coming up.`,
    `You're in a ${pl.phase} progressed-moon season: ${pl.copy.asks.charAt(0).toLowerCase() + pl.copy.asks.slice(1)}`,
    mm.next[0] ? `This month's Moon is ${mm.waxing ? "waxing" : "waning"} toward the ${mm.next[0].kind} Moon in ${mm.next[0].sign}, touching your ${ord(mm.next[0].house)} house.` : "",
  ].filter(Boolean);
  return {
    text: lines.join(" "),
    lean: [`Tending ${HOUSE_SHORT[h]}`, pl.copy.lean.charAt(0).toUpperCase() + pl.copy.lean.slice(1), `Themes of ${HOUSE_SHORT[sr.sunHouse]}`],
    gentle: [t.nowRetrograde ? `Rushing ${t.lord} matters while it's retrograde` : `Overloading your ${ord(t.nowHouse)}-house areas`, pl.copy.gentle.charAt(0).toUpperCase() + pl.copy.gentle.slice(1), mm.waxing ? "Starting too many things at once" : "Holding on to what's ready to go"],
  };
}
