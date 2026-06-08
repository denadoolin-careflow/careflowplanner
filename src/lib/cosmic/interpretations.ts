/**
 * Warm, invitational interpretations for planet-in-sign and active aspects.
 * Each entry returns a one-line meaning + 2–3 focus chips so the dashboard
 * shows insight instead of raw degrees.
 */
import type { Sign, Planet } from "@/lib/transits";
import type { AspectKind } from "@/lib/cosmic/active-aspects";

export interface Interpretation {
  meaning: string;
  focus: string[];
}

const PLANET_VIBE: Record<string, string> = {
  Sun:     "creative spirit",
  Moon:    "emotional landscape",
  Mercury: "voice and thinking",
  Venus:   "love and what you value",
  Mars:    "drive and protective energy",
  Jupiter: "growth and meaning",
  Saturn:  "structure and patience",
  Uranus:  "freedom and surprise",
  Neptune: "imagination and softness",
  Pluto:   "deep change",
};

const SIGN_FLAVOR: Record<Sign, string> = {
  Aries:       "sparked, ready to begin",
  Taurus:      "rooted in comfort and care",
  Gemini:      "curious and chatty",
  Cancer:      "tender, home-leaning",
  Leo:         "warm, generous, visible",
  Virgo:       "tidy, practical, helpful",
  Libra:       "balancing, partnering",
  Scorpio:     "deep, honest, intimate",
  Sagittarius: "expansive, hopeful, wide",
  Capricorn:   "steady, structured, patient",
  Aquarius:    "inventive, social, future-leaning",
  Pisces:      "dreamy, gentle, intuitive",
};

const SIGN_FOCUS: Record<Sign, string[]> = {
  Aries:       ["Begin one thing", "Move your body", "Brave ask"],
  Taurus:      ["Slow meal", "Tend the home", "Sensory rest"],
  Gemini:      ["Send the message", "Short walk + ideas", "Tiny errand"],
  Cancer:      ["Family check-in", "Soft boundary", "Cook something cozy"],
  Leo:         ["Visible kindness", "Creative play", "Celebrate someone"],
  Virgo:       ["Tidy one drawer", "Plan + checklist", "Care for the body"],
  Libra:       ["Ask for help", "Soft conversation", "Beautify a space"],
  Scorpio:     ["Honest journaling", "Protect your energy", "Let one thing go"],
  Sagittarius: ["Hopeful step", "Learn something", "Plan a future joy"],
  Capricorn:   ["Block 20 min of real work", "Edit the to-do list", "Set one limit"],
  Aquarius:    ["Brain dump", "Reach a friend", "Try a new angle"],
  Pisces:      ["Rest without guilt", "Creative play", "Quiet reflection"],
};

/** Planet-in-sign card for the Current Transits section. */
export function interpretPlanetInSign(planet: Planet, sign: Sign): Interpretation {
  const vibe = PLANET_VIBE[planet] ?? planet.toLowerCase();
  const flavor = SIGN_FLAVOR[sign];
  return {
    meaning: `Your ${vibe} is ${flavor}.`,
    focus: SIGN_FOCUS[sign].slice(0, 3),
  };
}

const ASPECT_TONE: Record<AspectKind, "harmonic" | "tension" | "neutral"> = {
  trine: "harmonic", sextile: "harmonic",
  square: "tension", opposition: "tension",
  conjunction: "neutral",
};

export function aspectTone(aspect: AspectKind): "harmonic" | "tension" | "neutral" {
  return ASPECT_TONE[aspect];
}

const ASPECT_SHORT: Record<AspectKind, string> = {
  conjunction: "blending of energies",
  sextile:     "soft opportunity",
  square:      "growth invitation",
  trine:       "easy flow",
  opposition:  "balance to find",
};

/** One-line meaning for an aspect, used in the Aspect Matrix. */
export function shortAspectMeaning(aspect: AspectKind): string {
  return ASPECT_SHORT[aspect];
}

/** Pick the most charged tension aspect for the reflection prompt. */
const REFLECTION_PROMPTS: Record<AspectKind, string> = {
  square:      "Where am I being asked to mature or simplify?",
  opposition:  "What two things am I trying to hold — and where is the middle?",
  conjunction: "What new theme is asking for my attention today?",
  trine:       "Where can I receive ease without rushing past it?",
  sextile:     "What small opening am I being invited to walk through?",
};

export function reflectionPromptFor(aspect: AspectKind): string {
  return REFLECTION_PROMPTS[aspect];
}