import type { Sign } from "@/lib/transits";

export const PLANET_THEME: Record<string, string> = {
  Sun: "your sense of self", Moon: "your feelings and needs", Mercury: "your thinking and conversations",
  Venus: "love, comfort and what you value", Mars: "your drive and energy", Jupiter: "growth and luck",
  Saturn: "structure, duty and limits", Uranus: "change and surprises", Neptune: "dreams and intuition",
  Pluto: "deep change and power", Chiron: "old hurts and healing", NorthNode: "your growth path",
  SouthNode: "old habits", Ascendant: "how you show up", Midheaven: "your public path and career",
};

export const SIGN_MOOD: Record<Sign, string> = {
  Aries: "bold and quick", Taurus: "steady and comfort-seeking", Gemini: "curious and chatty",
  Cancer: "tender and home-focused", Leo: "warm and expressive", Virgo: "practical and detail-minded",
  Libra: "fair and relationship-minded", Scorpio: "deep and private", Sagittarius: "hopeful and adventurous",
  Capricorn: "serious and goal-minded", Aquarius: "original and community-minded", Pisces: "dreamy and soft",
};

export type AspectTone = "Blending" | "Supportive" | "Stretching" | "Intense";

const ASPECT_INFO: Record<string, { tone: AspectTone; verb: string; feel: string }> = {
  conjunction: { tone: "Blending", verb: "is merging with", feel: "the two themes blend and feel louder" },
  sextile: { tone: "Supportive", verb: "is opening a door for", feel: "a small, easy opportunity if you act on it" },
  trine: { tone: "Supportive", verb: "is flowing with", feel: "things come more naturally right now" },
  square: { tone: "Stretching", verb: "is pushing on", feel: "some friction that pushes you to adjust" },
  opposition: { tone: "Intense", verb: "is pulling against", feel: "a tug-of-war that asks for balance" },
  quincunx: { tone: "Stretching", verb: "is rubbing awkwardly with", feel: "small adjustments help more than force" },
};

export const ASPECT_TONE_HINT: Record<AspectTone, string> = {
  Blending: "Two energies act as one.",
  Supportive: "Helpful, easy energy.",
  Stretching: "Friction that leads to growth.",
  Intense: "Strong pull between two sides.",
};

export function aspectTone(aspect: string): AspectTone {
  return ASPECT_INFO[aspect.toLowerCase()]?.tone ?? "Blending";
}

const name = (b: string) => (b === "NorthNode" ? "North Node" : b === "SouthNode" ? "South Node" : b);

/** "Mars is pushing on your Sun" + plain meaning. */
export function describeTransit(transiting: string, aspect: string, natal: string) {
  const info = ASPECT_INFO[aspect.toLowerCase()] ?? ASPECT_INFO.conjunction;
  const title = `${name(transiting)} ${info.verb} your ${name(natal)}`;
  const meaning = `${cap(PLANET_THEME[transiting] ?? name(transiting))} meets ${PLANET_THEME[natal] ?? `your ${name(natal)}`}: ${info.feel}.`;
  return { title, meaning, tone: info.tone };
}

export function timingLabel(orb: number, applying?: boolean | null): string {
  if (orb <= 0.3) return "Peaking now";
  if (applying === true) return "Building";
  if (applying === false) return "Easing";
  return "Active";
}

export function describeSkyPlacement(body: string, sign: Sign, retrograde?: boolean): string {
  const theme = PLANET_THEME[body] ?? name(body);
  const base = `${name(body)} in ${sign}: ${theme} feel ${SIGN_MOOD[sign]}.`;
  return retrograde ? `${base} Retrograde — review time for ${theme}, not a fresh start.` : base;
}

export function describeIngress(body: string, sign: Sign, when: Date, now = new Date()): string {
  const days = Math.round((startOfDay(when) - startOfDay(now)) / 86400000);
  const whenText = days <= 0 ? (when.getHours() >= 17 ? "tonight" : "today") : days === 1 ? "tomorrow" : `in ${days} days`;
  return `${name(body)} moves into ${sign} ${whenText}`;
}

export const TERM_HELP: Record<string, string> = {
  orb: "How close the angle is to exact. Smaller = stronger.",
  applying: "Building: the angle is getting closer to exact.",
  separating: "Easing: the angle has passed exact and is fading.",
  retrograde: "The planet looks like it moves backward — a time to review.",
};

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); }
