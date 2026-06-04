/**
 * Narrative library for Cosmic Flow — compassionate, never fear-based.
 * Used as fallback when the AI gateway is unavailable, and to seed AI prompts.
 */
import type { Planet, Sign } from "@/lib/transits";

export const PLANET_THEMES: Record<Planet, string> = {
  Sun:     "vitality, identity, what wants to be seen",
  Mercury: "thinking, errands, conversations, learning",
  Venus:   "relationships, beauty, values, money",
  Mars:    "drive, courage, healthy assertion",
  Jupiter: "growth, generosity, room to breathe",
  Saturn:  "structure, boundaries, slow good work",
};

export const SIGN_THEMES: Record<Sign, string> = {
  Aries:       "fresh starts, brave first steps",
  Taurus:      "comfort, steadiness, slow tending",
  Gemini:      "ideas, messages, quick connections",
  Cancer:      "home, family, soft care",
  Leo:         "warmth, play, visible joy",
  Virgo:       "lists, cleanup, gentle precision",
  Libra:       "balance, conversations, fairness",
  Scorpio:     "depth, honesty, protect your energy",
  Sagittarius: "perspective, one hopeful step",
  Capricorn:   "pacing, steady ordinary work",
  Aquarius:    "thinking, planning, reaching out",
  Pisces:      "rest, reflection, soften the to-do",
};

export const PHASE_TITLES = {
  "new": "New Moon — Seed",
  "first-quarter": "First Quarter — Build",
  "full": "Full Moon — Reveal",
  "last-quarter": "Last Quarter — Release",
} as const;

export const PHASE_GUIDANCE = {
  "new": "Plant one quiet intention. Don't try to map the whole cycle.",
  "first-quarter": "Friction is the path — choose one thing and commit to it.",
  "full": "Everything is lit. Reflect, celebrate, and feel without fixing.",
  "last-quarter": "Edit gently. Archive what's done, release what doesn't fit.",
} as const;

export const PHASE_PROMPT = {
  "new": "What is one small wish you're allowed to begin?",
  "first-quarter": "Where is friction showing me what matters most?",
  "full": "What is shining now that I want to honor?",
  "last-quarter": "What am I ready to release with kindness?",
} as const;

export const RETROGRADE_GUIDANCE: Record<string, string> = {
  Mercury: "Mercury retrograde is a review season — re-read, repair, re-route. Soften your messages and double-check the basics.",
  Venus: "Venus retrograde invites you to revisit values, finances, and old relationships before naming anything new.",
  Mars: "Mars retrograde slows your drive. Conserve effort and let rest be strategy.",
  Jupiter: "Jupiter retrograde turns expansion inward — reflect on growth rather than launching it.",
  Saturn: "Saturn retrograde wants you to review structures and commitments. Repair what's wobbly.",
};

export const VOC_GUIDANCE =
  "Void-of-course moon — drift is allowed. Don't start anything you need to land. Save the big asks for later.";

export const ECLIPSE_GUIDANCE =
  "Eclipses are unusually loud cosmic moments. Don't rush important decisions — give them a week.";

/** Suggested life areas for each transit kind. */
export function lifeAreasFor(planet?: string, sign?: string): string[] {
  const areas = new Set<string>();
  if (planet === "Venus") { areas.add("Relationships"); areas.add("Home"); areas.add("Finances"); }
  if (planet === "Mars") { areas.add("Health"); areas.add("Projects"); }
  if (planet === "Mercury") { areas.add("Tasks"); areas.add("Journal"); }
  if (planet === "Saturn") { areas.add("Routines"); areas.add("Goals"); }
  if (planet === "Jupiter") { areas.add("Goals"); areas.add("Ideas"); }
  if (sign === "Cancer" || sign === "Taurus") areas.add("Home");
  if (sign === "Virgo" || sign === "Capricorn") areas.add("Routines");
  if (sign === "Libra" || sign === "Pisces") areas.add("Mental Load");
  if (!areas.size) areas.add("Today");
  return Array.from(areas);
}