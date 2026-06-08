/**
 * Today's-sky mood lookup. Combines moon element + moon phase into Mood,
 * Good-for, and Avoid chips for the TodaySkySidebar. Warm, invitational
 * copy — no fear-based phrasing.
 */
import type { Element } from "@/lib/cosmic/glyphs";
import type { MoonPhase } from "@/lib/moon";

export interface SkyMood {
  mood: string[];
  goodFor: string[];
  avoid: string[];
}

const BY_ELEMENT: Record<Element, SkyMood> = {
  Fire:  { mood: ["Spark", "Courage", "Momentum"],     goodFor: ["Starting one thing", "Movement", "Honest asks"],   avoid: ["Doom-scrolling", "Holding it all in"] },
  Earth: { mood: ["Steady", "Tending", "Grounded"],    goodFor: ["Home tasks", "Slow meals", "Tidying one drawer"], avoid: ["Over-planning", "Rushing decisions"] },
  Air:   { mood: ["Innovation", "Freedom", "Perspective"], goodFor: ["Brainstorming", "Journaling", "Socializing"],    avoid: ["Micromanaging", "Overcommitting"] },
  Water: { mood: ["Tender", "Intuitive", "Reflective"], goodFor: ["Reflection", "Caring conversations", "Rest"],     avoid: ["Hard confrontations", "Pushing through tears"] },
};

const PHASE_HINT: Partial<Record<MoonPhase, { add?: string[]; avoid?: string[] }>> = {
  "new":              { add: ["Naming an intention"],   avoid: ["Big launches"] },
  "waxing-crescent":  { add: ["First drafts"],          avoid: ["Second-guessing"] },
  "first-quarter":    { add: ["One decision"],          avoid: ["Perfectionism"] },
  "waxing-gibbous":   { add: ["Finishing one thing"],   avoid: ["Adding new commitments"] },
  "full":             { add: ["Celebrating a small win"], avoid: ["Confrontations"] },
  "waning-gibbous":   { add: ["Sharing what you learned"], avoid: ["Taking on more"] },
  "last-quarter":     { add: ["Letting one thing go"],  avoid: ["Starting over"] },
  "waning-crescent":  { add: ["Sleep"],                 avoid: ["Pushing through"] },
};

export function getSkyMood(element: Element, phase: MoonPhase): SkyMood {
  const base = BY_ELEMENT[element];
  const hint = PHASE_HINT[phase] ?? {};
  return {
    mood: base.mood,
    goodFor: [...(hint.add ?? []), ...base.goodFor].slice(0, 4),
    avoid:   [...(hint.avoid ?? []), ...base.avoid].slice(0, 3),
  };
}