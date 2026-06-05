/**
 * Annual Profections (Hellenistic time-lord technique).
 * Each year of life advances the activated house by 1 starting at the
 * Ascendant. The time-lord is the traditional ruler of the profected sign.
 */
import type { Sign } from "@/lib/transits";

const SIGNS: Sign[] = [
  "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
  "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces",
];

const TRADITIONAL_RULER: Record<Sign, string> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon",
  Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Mars",
  Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter",
};

export interface Profection {
  age: number;
  house: number;            // 1..12
  profectedSign: Sign;
  timeLord: string;
  yearStarts: string;
  yearEnds: string;
}

export function computeProfection(birth: Date, ascendantSign: Sign, on: Date = new Date()): Profection {
  const ageMs = on.getTime() - birth.getTime();
  const age = Math.floor(ageMs / (365.25 * 86400000));
  const ascIdx = SIGNS.indexOf(ascendantSign);
  const houseIdx = age % 12;
  const signIdx = (ascIdx + houseIdx) % 12;
  const profectedSign = SIGNS[signIdx];
  const yearStart = new Date(birth);
  yearStart.setFullYear(birth.getFullYear() + age);
  const yearEnd = new Date(yearStart);
  yearEnd.setFullYear(yearStart.getFullYear() + 1);
  return {
    age,
    house: houseIdx + 1,
    profectedSign,
    timeLord: TRADITIONAL_RULER[profectedSign],
    yearStarts: yearStart.toISOString().slice(0, 10),
    yearEnds: yearEnd.toISOString().slice(0, 10),
  };
}

const HOUSE_TOPICS: Record<number, string> = {
  1: "self, body, identity, vitality",
  2: "resources, money, values, what sustains you",
  3: "siblings, communication, short journeys, daily learning",
  4: "home, family of origin, roots, foundations",
  5: "creativity, children, play, romance",
  6: "health, work, daily rhythms, service",
  7: "partnerships, marriage, open enemies, contracts",
  8: "shared resources, intimacy, transformation, endings",
  9: "long journeys, philosophy, teachers, beliefs",
  10: "career, public role, calling, reputation",
  11: "friends, community, hopes, gains",
  12: "rest, retreat, the unseen, what's behind you",
};

export function houseTopics(h: number): string { return HOUSE_TOPICS[h] || ""; }