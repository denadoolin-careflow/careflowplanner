import { AREAS, type Area } from "@/lib/types";

/** Keyword table: first match (longest keyword wins) decides the area. */
const KEYWORDS: Record<Area, string[]> = {
  "Appointments": ["appointment", "appt", "dentist", "doctor", "dr.", "clinic", "checkup", "check-up", "therapy", "therapist", "consult", "follow-up", "x-ray", "bloodwork", "vaccine", "vet"],
  "Caregiving": ["caregiv", "meds", "medication", "prescription", "refill", "pharmacy", "mom's", "dad's", "grandma", "grandpa", "nurse", "hospice", "aide", "wheelchair", "insurance claim", "medicaid", "medicare"],
  "Meals": ["meal", "dinner", "lunch", "breakfast", "recipe", "groceries", "grocery", "cook", "bake", "meal prep", "menu", "pantry", "snack"],
  "Home": ["laundry", "dishes", "vacuum", "clean", "tidy", "trash", "garbage", "yard", "lawn", "repair", "fix the", "plumber", "hvac", "declutter", "organize the", "mow"],
  "Kids": ["school", "homework", "daycare", "permission slip", "pickup", "drop off", "dropoff", "practice", "soccer", "recital", "playdate", "parent-teacher", "field trip"],
  "Family": ["family", "call mom", "call dad", "visit", "reunion", "in-laws", "sibling"],
  "Holidays & Birthdays": ["birthday", "anniversary", "christmas", "thanksgiving", "hanukkah", "easter", "holiday", "gift", "present for", "card for", "party"],
  "Money": ["bill", "invoice", "budget", "taxes", "tax", "payment", "pay the", "bank", "loan", "mortgage", "rent", "subscription", "refund", "savings", "paycheck"],
  "Creative Projects": ["write", "draft", "design", "paint", "sketch", "edit video", "photo", "blog", "podcast", "craft", "sew", "knit", "song"],
  "Personal": ["workout", "gym", "walk", "run", "journal", "meditate", "read", "haircut", "self-care", "stretch", "sleep"],
};

export interface AreaGuess {
  area: Area;
  /** Short human reason, e.g. `matched "dentist"`. */
  reason: string;
}

export interface AreaSignals {
  title?: string;
  notes?: string;
  tags?: string[];
  /** Area of the linked project, if any — strongest signal. */
  projectArea?: Area | null;
  /** Area of a tagged person / care recipient. */
  personArea?: Area | null;
  /** Area implied by the surface the task was created from. */
  sectionArea?: Area | null;
}

/** Best-effort area for a new task. Returns null when nothing is confident. */
export function inferArea(signals: AreaSignals): AreaGuess | null {
  if (signals.projectArea) return { area: signals.projectArea, reason: "from project" };
  if (signals.personArea) return { area: signals.personArea, reason: "from person" };

  const tagHit = (signals.tags ?? [])
    .map(t => AREAS.find(a => a.toLowerCase() === t.trim().toLowerCase()))
    .find(Boolean) as Area | undefined;
  if (tagHit) return { area: tagHit, reason: "from tag" };

  const hay = `${signals.title ?? ""} ${signals.notes ?? ""}`.toLowerCase();
  if (hay.trim()) {
    let best: { area: Area; kw: string } | null = null;
    for (const area of Object.keys(KEYWORDS) as Area[]) {
      for (const kw of KEYWORDS[area]) {
        if (hay.includes(kw) && (!best || kw.length > best.kw.length)) best = { area, kw };
      }
    }
    if (best) return { area: best.area, reason: `matched "${best.kw}"` };
  }

  if (signals.sectionArea) return { area: signals.sectionArea, reason: "from this list" };
  return null;
}
