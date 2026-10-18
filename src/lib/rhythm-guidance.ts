/** Plain-language rhythm guidance: cycle capacity, moon translations, nourishment. Pure. */
import type { CyclePhase } from "./cycle";
import type { MoonPhase } from "./moon";

/** Share of a usual day's capacity that fits each cycle phase. */
export const CYCLE_CAPACITY_FACTOR: Record<CyclePhase, number> = {
  menstrual: 0.6, follicular: 1, ovulatory: 1, luteal: 0.85,
};

export function recommendedHours(usualHours: number, phase: CyclePhase | null | undefined): number {
  const f = phase ? CYCLE_CAPACITY_FACTOR[phase] : 1;
  return Math.round(usualHours * f * 2) / 2;
}

export const CAPACITY_NOTE: Record<CyclePhase, string> = {
  menstrual: "Menstrual phase: plan a gentler day — fewer, smaller tasks.",
  follicular: "Follicular phase: good day to start fresh things.",
  ovulatory: "Ovulatory phase: a fuller day can feel easy.",
  luteal: "Luteal phase: finish and tidy rather than start new.",
};

/** What the moon means for an ordinary day, in plain words. */
export const MOON_PLAIN: Record<MoonPhase, string> = {
  new: "A quiet start. Pick one small intention and keep the day light.",
  "waxing-crescent": "Take small first steps on what you started.",
  "first-quarter": "Make a decision you've been putting off.",
  "waxing-gibbous": "Fine-tune plans; check the details.",
  full: "Feelings can run high. Pause before replying and rest tonight.",
  "waning-gibbous": "Share what you know; thank someone who helped.",
  "last-quarter": "Clear out one thing that no longer fits.",
  "waning-crescent": "Rest, tidy, and keep your evening easy.",
};

export const VOC_ADVICE =
  "Void-of-course moon: good for routine chores and rest. Wait to sign, buy big, or launch something new.";

/** Grocery staples that suit each cycle phase, with list categories. */
export const PHASE_GROCERIES: Record<CyclePhase, { name: string; category: string }[]> = {
  menstrual: [
    { name: "Spinach", category: "Produce" }, { name: "Lentils", category: "Pantry" },
    { name: "Bone broth", category: "Pantry" }, { name: "Dark chocolate", category: "Snacks" },
    { name: "Fresh ginger", category: "Produce" },
  ],
  follicular: [
    { name: "Mixed salad greens", category: "Produce" }, { name: "Sauerkraut", category: "Refrigerated" },
    { name: "Eggs", category: "Dairy & Eggs" }, { name: "Lemons", category: "Produce" },
  ],
  ovulatory: [
    { name: "Berries", category: "Produce" }, { name: "Bell peppers", category: "Produce" },
    { name: "Salmon", category: "Meat & Seafood" }, { name: "Quinoa", category: "Pantry" },
  ],
  luteal: [
    { name: "Sweet potatoes", category: "Produce" }, { name: "Brown rice", category: "Pantry" },
    { name: "Pumpkin seeds", category: "Pantry" }, { name: "Bananas", category: "Produce" },
    { name: "Cinnamon", category: "Pantry" },
  ],
};

/** Items not already on the list (case-insensitive). */
export function missingGroceries(phase: CyclePhase, existing: string[]) {
  const have = new Set(existing.map(n => n.trim().toLowerCase()));
  return PHASE_GROCERIES[phase].filter(g => !have.has(g.name.toLowerCase()));
}
