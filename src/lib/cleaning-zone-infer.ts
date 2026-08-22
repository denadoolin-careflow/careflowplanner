/**
 * Keyword → cleaning zone inference.
 *
 * Typing "unload dishwasher" should land in the Kitchen zone without the user
 * picking it. Matching is deliberately conservative: a task only gets a
 * suggestion when a keyword clearly belongs to one zone, and the caller always
 * shows the guess as an editable suggestion rather than a silent assignment.
 */
export type CleaningZone =
  | "Kitchen" | "Bathroom" | "Bedrooms" | "Living"
  | "Laundry" | "Entryway" | "Outdoor" | "Whole home";

export const CLEANING_ZONES: CleaningZone[] = [
  "Kitchen", "Bathroom", "Bedrooms", "Living", "Laundry", "Entryway", "Outdoor", "Whole home",
];

const KEYWORDS: Array<[CleaningZone, string[]]> = [
  ["Kitchen", [
    "dishwasher", "dishes", "dish", "sink", "counter", "countertop", "fridge", "refrigerator",
    "freezer", "oven", "stove", "microwave", "pantry", "kitchen", "trash", "garbage", "recycl",
    "meal prep", "coffee maker", "cabinet", "cutting board", "toaster",
  ]],
  ["Bathroom", [
    "bathroom", "toilet", "shower", "tub", "bathtub", "mirror", "vanity", "towels",
    "grout", "shower curtain", "restroom", "sink scrub",
  ]],
  ["Bedrooms", [
    "bed", "bedroom", "sheets", "linens", "pillow", "duvet", "comforter", "nightstand",
    "closet", "dresser", "wardrobe", "mattress",
  ]],
  ["Living", [
    "living room", "couch", "sofa", "coffee table", "tv", "remote", "bookshelf", "rug",
    "cushions", "family room", "den", "lounge",
  ]],
  ["Laundry", [
    "laundry", "washer", "dryer", "fold", "folding", "lint", "detergent", "ironing", "iron ",
    "wash clothes", "hamper",
  ]],
  ["Entryway", [
    "entryway", "entry", "foyer", "mudroom", "shoes", "coat", "doormat", "front door", "mail",
  ]],
  ["Outdoor", [
    "yard", "lawn", "mow", "garden", "patio", "deck", "porch", "garage", "driveway",
    "gutter", "leaves", "snow", "shovel", "grill", "weeds", "trash bins",
  ]],
  ["Whole home", [
    "vacuum whole", "whole home", "everywhere", "all rooms", "declutter home", "deep clean",
    "dust everything", "reset the house",
  ]],
];

/**
 * Best-guess zone for a free-typed cleaning task title.
 * Returns null when nothing matches confidently.
 */
export function inferCleaningZone(title: string): CleaningZone | null {
  const t = String(title ?? "").toLowerCase();
  if (t.trim().length < 3) return null;

  let best: { zone: CleaningZone; score: number } | null = null;
  for (const [zone, words] of KEYWORDS) {
    for (const w of words) {
      if (!t.includes(w)) continue;
      // Longer keyword matches win — "shower curtain" beats "shower".
      const score = w.length;
      if (!best || score > best.score) best = { zone, score };
    }
  }
  return best?.zone ?? null;
}

/** Convenience: infer, falling back to a supplied default. */
export function inferCleaningZoneOr(title: string, fallback: CleaningZone): CleaningZone {
  return inferCleaningZone(title) ?? fallback;
}
