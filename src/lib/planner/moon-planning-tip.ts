/**
 * A one-line, plain-language planning tip for the day, derived from the moon
 * phase and softened by the moon sign's element. Pure data — no side effects.
 */
import { getMoonPhase, type MoonPhase } from "@/lib/moon";
import { getMoonSign, type ZodiacInfo } from "@/lib/zodiac";

const PHASE_TIP: Record<MoonPhase, string> = {
  "new": "Plan light. Leave room for one new start.",
  "waxing-crescent": "Two or three real tasks. Protect the momentum.",
  "first-quarter": "Expect friction — schedule the hard thing early.",
  "waxing-gibbous": "Finish before you add. No new commitments today.",
  "full": "Full day energy, low patience. Buffer between blocks.",
  "waning-gibbous": "Good day for handoffs, errands and follow-ups.",
  "last-quarter": "Clear the backlog. Cancel one thing guilt-free.",
  "waning-crescent": "Under-plan on purpose. Rest is on the schedule.",
};

const ELEMENT_SUFFIX: Record<ZodiacInfo["element"], string> = {
  Fire: "Front-load the day.",
  Earth: "Batch similar tasks.",
  Air: "Cluster calls and messages.",
  Water: "Leave slack between blocks.",
};

export interface MoonPlanningTip {
  phase: MoonPhase;
  element: ZodiacInfo["element"];
  /** Phase guidance only. */
  base: string;
  /** Phase guidance + element suffix — the line shown on the planner. */
  text: string;
}

export function moonPlanningTip(date: Date = new Date()): MoonPlanningTip {
  const phase = getMoonPhase(date);
  const element = getMoonSign(date).element;
  const base = PHASE_TIP[phase];
  return { phase, element, base, text: `${base} ${ELEMENT_SUFFIX[element]}` };
}
