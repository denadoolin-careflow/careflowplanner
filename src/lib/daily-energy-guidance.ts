import { getMoonPhase, getMoonAgeDays, type MoonPhase } from "./moon";
import { getMoonSign } from "./zodiac";
import { getPhaseInfo } from "./cycle";
import type { CyclePhase } from "./cycle";

export type Element = "Fire" | "Earth" | "Air" | "Water";

export interface DailyEnergyGuidance {
  headline: string;
  focus: string[];
  reflection: string;
  moonPhase: MoonPhase;
  moonDay: number;
  cyclePhase: CyclePhase | null;
  element: Element;
}

interface PhaseTheme {
  headline: string;
  focus: string[];
  reflection: string;
}

const PHASE_THEMES: Record<MoonPhase, PhaseTheme> = {
  "new":              { headline: "Start small. Trust beginnings that feel meaningful.",  focus: ["Plant", "Imagine", "Initiate"],   reflection: "What quiet intention wants to take root today?" },
  "waxing-crescent":  { headline: "Take one step toward what is calling you.",            focus: ["Explore", "Build", "Learn"],      reflection: "What small step would feel good to take today?" },
  "first-quarter":    { headline: "Progress grows through consistent action.",            focus: ["Act", "Commit", "Adapt"],         reflection: "Where can you choose courage over comfort today?" },
  "waxing-gibbous":   { headline: "Small improvements create meaningful results.",        focus: ["Refine", "Organize", "Prepare"],  reflection: "What deserves a little extra care before it's ready?" },
  "full":             { headline: "Pause to recognize what has grown.",                   focus: ["Notice", "Celebrate", "Express"], reflection: "What feels worth honoring in your life right now?" },
  "waning-gibbous":   { headline: "Reflect on lessons and carry forward what matters.",   focus: ["Reflect", "Share", "Appreciate"], reflection: "What gratitude is quietly waiting to be named?" },
  "last-quarter":     { headline: "Let go of what no longer supports your path.",         focus: ["Release", "Simplify", "Realign"], reflection: "What would feel lighter to set down today?" },
  "waning-crescent":  { headline: "Create space for renewal and quiet wisdom.",           focus: ["Rest", "Restore", "Surrender"],   reflection: "How can you offer yourself a softer pace today?" },
};

const CYCLE_THEMES: Record<CyclePhase, PhaseTheme> = {
  menstrual:  { headline: "Your energy may be asking for rest and reflection.", focus: ["Rest", "Listen", "Restore"],          reflection: "What does your body most need to feel held today?" },
  follicular: { headline: "Curiosity and creativity may feel easier to access.", focus: ["Explore", "Create", "Begin"],         reflection: "What's calling to be explored or started?" },
  ovulatory:  { headline: "Connection and expression are highlighted.",          focus: ["Connect", "Share", "Shine"],          reflection: "Who or what would feel nourishing to reach toward today?" },
  luteal:     { headline: "Protect your energy and prioritize what matters most.", focus: ["Simplify", "Organize", "Complete"], reflection: "What can you release or finish to feel more supported?" },
};

const ELEMENT_HINT: Record<Element, string> = {
  Fire:  "Move with warmth — let action come from joy, not pressure.",
  Earth: "Stay close to the body — small, grounded choices add up.",
  Air:   "Make room for ideas and conversation — clarity loves space.",
  Water: "Honor what you feel — emotions are useful information today.",
};

/** 30 lunar-day archetypes (1..30). */
const MOON_DAY_THEMES: Record<number, PhaseTheme> = {
  1:  { headline: "The Seed — honor small beginnings.",            focus: ["Begin", "Dream", "Trust"],        reflection: "What gentle beginning is asking for your attention?" },
  2:  { headline: "The Spark — tend a flicker of curiosity.",      focus: ["Notice", "Tend", "Hope"],         reflection: "What feels quietly interesting today?" },
  3:  { headline: "The Threshold — cross with intention.",         focus: ["Decide", "Step", "Trust"],        reflection: "Where are you being invited forward?" },
  4:  { headline: "The Root — strengthen your foundation.",        focus: ["Ground", "Steady", "Anchor"],     reflection: "What helps you feel most rooted?" },
  5:  { headline: "The Pathfinder — choose a direction.",          focus: ["Clarify", "Choose", "Begin"],     reflection: "Which path feels most honest right now?" },
  6:  { headline: "The Open Hand — receive what's offered.",       focus: ["Receive", "Soften", "Allow"],     reflection: "What support could you let in today?" },
  7:  { headline: "The Mirror — pause and look kindly inward.",    focus: ["Reflect", "Notice", "Honor"],     reflection: "What is your inner voice asking you to see?" },
  8:  { headline: "The Bridge — connect ideas and people.",        focus: ["Connect", "Share", "Listen"],     reflection: "Who or what wants to be brought together?" },
  9:  { headline: "The Quiet Forest — slow down to hear yourself.", focus: ["Pause", "Breathe", "Listen"],    reflection: "What becomes clearer when you slow down?" },
  10: { headline: "The Builder — focus on what deserves your energy.", focus: ["Commit", "Build", "Sustain"], reflection: "Where is your effort best invested today?" },
  11: { headline: "The Steady Flame — sustain rather than start.", focus: ["Maintain", "Care", "Continue"],   reflection: "What's quietly working that you can keep tending?" },
  12: { headline: "The Open Sky — make room for new ideas.",       focus: ["Imagine", "Wonder", "Sketch"],    reflection: "What possibility feels worth holding lightly?" },
  13: { headline: "The Crossroads — pause before deciding.",       focus: ["Pause", "Weigh", "Listen"],       reflection: "What does each option ask of you?" },
  14: { headline: "The Rising Tide — energy is gathering.",        focus: ["Prepare", "Align", "Steady"],     reflection: "What wants to come into the light soon?" },
  15: { headline: "The Full Lantern — illuminate without judging.", focus: ["See", "Honor", "Feel"],          reflection: "What is being revealed that you can meet with kindness?" },
  16: { headline: "The Gentle Witness — feel without fixing.",     focus: ["Allow", "Soften", "Stay"],        reflection: "What feeling needs space rather than solving?" },
  17: { headline: "The Open Heart — let warmth move outward.",     focus: ["Connect", "Express", "Share"],    reflection: "Who would benefit from your warmth today?" },
  18: { headline: "The Harvester — gather what is ready.",         focus: ["Collect", "Save", "Honor"],       reflection: "What's quietly ready to be acknowledged?" },
  19: { headline: "The Weaver — bring threads together.",          focus: ["Integrate", "Tend", "Simplify"],  reflection: "What pieces are asking to be woven together?" },
  20: { headline: "The Gatherer — wrap up loose ends and create breathing room.", focus: ["Finish", "Simplify", "Restore"], reflection: "What can you complete or release today to feel more supported?" },
  21: { headline: "The Wise Friend — be gentle with yourself.",    focus: ["Soothe", "Care", "Forgive"],      reflection: "What would the kindest version of you say right now?" },
  22: { headline: "The Lantern Bearer — offer light to others.",   focus: ["Support", "Listen", "Encourage"], reflection: "Who could use a little of your light today?" },
  23: { headline: "The Releaser — let what's heavy fall away.",    focus: ["Release", "Exhale", "Forgive"],   reflection: "What are you ready to put down?" },
  24: { headline: "The Healer — tend something tender.",           focus: ["Mend", "Soften", "Rest"],         reflection: "What inside you is asking for gentle care?" },
  25: { headline: "The Quiet Pool — let stillness restore you.",   focus: ["Still", "Rest", "Reflect"],       reflection: "What feels possible when you simply pause?" },
  26: { headline: "The Composter — let endings nourish new ground.", focus: ["Release", "Trust", "Renew"],    reflection: "What ending is quietly making space for something new?" },
  27: { headline: "The Listener — honor your inner knowing.",      focus: ["Hear", "Trust", "Soften"],        reflection: "What does your intuition keep whispering?" },
  28: { headline: "The Threshold Keeper — close one chapter kindly.", focus: ["Complete", "Honor", "Release"], reflection: "What chapter wants a gentle ending?" },
  29: { headline: "The Lantern at Dusk — soften toward rest.",     focus: ["Slow", "Tend", "Restore"],        reflection: "How can you honor the quiet of this moment?" },
  30: { headline: "The Empty Cup — release expectations and welcome possibility.", focus: ["Surrender", "Reflect", "Renew"], reflection: "What might arrive if you make room for nothing in particular?" },
};

export function getMoonDay(date: Date = new Date()): number {
  const age = getMoonAgeDays(date);
  // Lunar days: 1..30
  return Math.min(30, Math.max(1, Math.floor(age) + 1));
}

function pickFocus(...sources: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of sources) {
    for (const item of list) {
      const key = item.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
      if (out.length === 3) return out;
    }
  }
  return out;
}

export function getDailyEnergyGuidance(
  date: Date,
  cyclePeriods: Parameters<typeof getPhaseInfo>[1] = [],
  cycleSettings?: Parameters<typeof getPhaseInfo>[2],
): DailyEnergyGuidance {
  const moonPhase = getMoonPhase(date);
  const moonDay = getMoonDay(date);
  const sign = getMoonSign(date);
  const element = sign.element as Element;

  let cyclePhase: CyclePhase | null = null;
  try {
    if (cycleSettings) {
      const info = getPhaseInfo(date, cyclePeriods, cycleSettings);
      cyclePhase = info?.phase ?? null;
    }
  } catch { /* no cycle data */ }

  const phaseTheme = PHASE_THEMES[moonPhase];
  const dayTheme = MOON_DAY_THEMES[moonDay] ?? PHASE_THEMES[moonPhase];
  const cycleTheme = cyclePhase ? CYCLE_THEMES[cyclePhase] : null;

  // Blend: cycle (if present) leads the headline tone, then moon-day archetype voice,
  // closing with elemental hint as a gentle qualifier.
  const headline = cycleTheme
    ? `${dayTheme.headline} ${cycleTheme.headline}`
    : `${dayTheme.headline} ${phaseTheme.headline}`;

  const focus = pickFocus(
    dayTheme.focus,
    cycleTheme?.focus ?? [],
    phaseTheme.focus,
  );

  // Prefer the cycle reflection when present (most embodied), else moon-day, else phase.
  const reflection = cycleTheme?.reflection ?? dayTheme.reflection ?? phaseTheme.reflection;

  return {
    headline: `${headline} ${ELEMENT_HINT[element]}`.trim(),
    focus,
    reflection,
    moonPhase,
    moonDay,
    cyclePhase,
    element,
  };
}

export { PHASE_THEMES as MOON_PHASE_THEMES, MOON_DAY_THEMES, CYCLE_THEMES, ELEMENT_HINT };