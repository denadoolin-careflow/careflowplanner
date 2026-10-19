import { bodyLongitude, type ExtPlanet } from "@/lib/cosmic/astro/bodies";
import { aspectOrb } from "@/lib/cosmic/sky";
import { aspectTone, type AspectTone } from "@/lib/cosmic/plain-language";

const DAY = 86400000;

export function orbLimitFor(body: string, defaultOrb: number) {
  return body === "Moon" ? 4 : Math.min(defaultOrb, 6);
}

/** Scan back/forward from `on` while the aspect stays within orb. */
export function transitWindow(
  body: ExtPlanet, natalLon: number, angle: number, on: Date, orbLimit: number,
  lonAt: (b: ExtPlanet, t: Date) => number = bodyLongitude,
): { start: Date; end: Date; days: number; capped: boolean } {
  const step = body === "Moon" ? 1 / 24 : 1;
  const max = body === "Moon" ? 5 : 730;
  const within = (d: number) => aspectOrb(lonAt(body, new Date(on.getTime() + d * DAY)), natalLon, angle) <= orbLimit;
  let back = 0; while (back < max && within(-(back + step))) back += step;
  let fwd = 0; while (fwd < max && within(fwd + step)) fwd += step;
  return {
    start: new Date(on.getTime() - back * DAY),
    end: new Date(on.getTime() + fwd * DAY),
    days: back + fwd,
    capped: back >= max || fwd >= max,
  };
}

export function lengthLabel(days: number): string {
  if (days < 1) return `about ${Math.max(1, Math.round(days * 24))} hours`;
  if (days < 14) return `about ${Math.round(days)} day${Math.round(days) === 1 ? "" : "s"}`;
  if (days < 70) return `about ${Math.round(days / 7)} weeks`;
  return `about ${Math.round(days / 30)} months`;
}

export const HOUSE_AREA: Record<number, string> = {
  1: "you, your body and how you show up", 2: "money, possessions and self-worth",
  3: "conversations, siblings, errands and learning", 4: "home, family and your inner foundation",
  5: "joy, creativity, romance and children", 6: "daily routines, health and work tasks",
  7: "partners and one-to-one relationships", 8: "shared money, intimacy and deep change",
  9: "travel, beliefs, study and big-picture meaning", 10: "career, reputation and public role",
  11: "friends, community and future hopes", 12: "rest, solitude, endings and the unseen",
};

const PLANET_ACTION: Record<string, string> = {
  Sun: "Put visible energy toward one thing that matters to you",
  Moon: "Check in with your feelings and meet one comfort need",
  Mercury: "Have the conversation, write it down or sort the paperwork",
  Venus: "Make room for pleasure, beauty or a kind gesture",
  Mars: "Take one bold, concrete action instead of stewing",
  Jupiter: "Say yes to one opportunity that helps you grow",
  Saturn: "Commit to one steady, realistic step and keep it",
  Uranus: "Try one small experiment or change in routine",
  Neptune: "Leave space for rest, imagination or prayer — and double-check details",
  Pluto: "Let go of one thing that no longer fits",
};

const TONE_ACTION: Record<AspectTone, string[]> = {
  Supportive: ["Use the ease — start something you've been putting off", "Ask for help; doors open more readily now"],
  Stretching: ["Slow down before reacting; pause, then choose", "Break the pressure into one small next step"],
  Intense: ["Expect strong feelings; plan extra margin in your day", "Notice who or what is mirroring you back"],
  Blending: ["Lean in fully — the two energies act as one now", "Set a clear intention so the energy has a direction"],
};

export function practicalActions(transit: string, aspect: string, house: number | null): string[] {
  const tone = aspectTone(aspect);
  const out = [PLANET_ACTION[transit] ?? "Pay attention to what this planet stirs up", ...TONE_ACTION[tone]];
  if (house && HOUSE_AREA[house]) out.push(`Focus it on ${HOUSE_AREA[house]} (house ${house})`);
  return out;
}

export function journalPrompts(transit: string, natal: string, house: number | null): string[] {
  const n = natal === "NorthNode" ? "North Node" : natal;
  return [
    `Where am I feeling ${transit}'s energy touch my ${n} this week?`,
    house ? `What is asking for attention in ${HOUSE_AREA[house]}?` : "What is asking for my attention right now?",
    "What is one gentle step I can take, and what can I let wait?",
  ];
}
