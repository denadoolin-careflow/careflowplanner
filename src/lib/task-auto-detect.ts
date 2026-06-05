import type { Area, AreaRecord, CareRecipient, Project } from "./types";
import { AREAS } from "./types";

/** Aliases mirror nlp-task.ts so plain words also match an Area. */
const AREA_ALIASES: Record<string, Area> = {
  home: "Home", house: "Home", chore: "Home", chores: "Home", laundry: "Home", clean: "Home",
  family: "Family", spouse: "Family", partner: "Family", husband: "Family", wife: "Family",
  kid: "Kids", kids: "Kids", child: "Kids", children: "Kids", school: "Kids", daycare: "Kids",
  care: "Caregiving", caregiving: "Caregiving", parent: "Caregiving", mom: "Caregiving",
  dad: "Caregiving", grandma: "Caregiving", grandpa: "Caregiving", nana: "Caregiving",
  meal: "Meals", meals: "Meals", food: "Meals", dinner: "Meals", lunch: "Meals",
  breakfast: "Meals", grocery: "Meals", groceries: "Meals", cook: "Meals", recipe: "Meals",
  appt: "Appointments", appointment: "Appointments", appointments: "Appointments",
  doctor: "Appointments", dentist: "Appointments", clinic: "Appointments",
  personal: "Personal", self: "Personal", me: "Personal", journal: "Personal",
  creative: "Creative Projects", art: "Creative Projects", write: "Creative Projects",
  writing: "Creative Projects", design: "Creative Projects", music: "Creative Projects",
  money: "Money", finance: "Money", bill: "Money", bills: "Money", pay: "Money",
  budget: "Money", invoice: "Money", tax: "Money", taxes: "Money",
  bday: "Holidays & Birthdays", birthday: "Holidays & Birthdays",
  holiday: "Holidays & Birthdays", holidays: "Holidays & Birthdays", gift: "Holidays & Birthdays",
};

/** Verb / action lexicon — used as a weak signal when nothing stronger matched. */
const VERB_AREA: Record<string, Area> = {
  // Kids
  bath: "Kids", bathe: "Kids", diaper: "Kids", pickup: "Kids", dropoff: "Kids",
  homework: "Kids", playdate: "Kids", nap: "Kids", stroller: "Kids", bottle: "Kids",
  // Caregiving
  refill: "Caregiving", pharmacy: "Caregiving", meds: "Caregiving", medication: "Caregiving",
  prescription: "Caregiving", checkup: "Caregiving", visit: "Caregiving",
  // Meals
  cook: "Meals", prep: "Meals", defrost: "Meals", marinate: "Meals", bake: "Meals",
  snack: "Meals", brunch: "Meals",
  // Money
  transfer: "Money", deposit: "Money", refund: "Money", statement: "Money", reimburse: "Money",
  // Appointments
  therapy: "Appointments", vet: "Appointments",
  // Holidays & Birthdays
  card: "Holidays & Birthdays", wrap: "Holidays & Birthdays", party: "Holidays & Birthdays",
  // Home
  dishes: "Home", vacuum: "Home", mop: "Home", trash: "Home", mow: "Home", declutter: "Home",
};

function tokenize(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s&-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export interface DetectInput {
  title: string;
  notes?: string;
  areas?: AreaRecord[];
  projects?: Project[];
  recipients?: CareRecipient[];
}

export interface DetectResult {
  area?: string;
  projectId?: string;
  projectName?: string;
  recipientId?: string;
  matchedOn: string[];
}

/**
 * Infer an Area and Project from a task title + notes by matching project
 * names first (most specific), then area aliases / area names.
 */
export function detectAreaAndProject({ title, notes, areas, projects, recipients }: DetectInput): DetectResult {
  const haystack = `${title} ${notes ?? ""}`.toLowerCase();
  const tokens = new Set(tokenize(haystack));
  const result: DetectResult = { matchedOn: [] };

  // 1) Project — match by full name (case-insensitive substring) or any
  // word ≥ 4 chars from the project name appearing in the text.
  const activeProjects = (projects ?? []).filter(p => p.status !== "done");
  let bestProject: Project | undefined;
  let bestScore = 0;
  for (const p of activeProjects) {
    const name = (p.name || "").toLowerCase().trim();
    if (!name) continue;
    let score = 0;
    if (name.length >= 3 && haystack.includes(name)) score += 10;
    for (const word of name.split(/\s+/)) {
      if (word.length >= 4 && tokens.has(word)) score += 2;
    }
    if (score > bestScore) { bestScore = score; bestProject = p; }
  }
  if (bestProject) {
    result.projectId = bestProject.id;
    result.projectName = bestProject.name;
    result.matchedOn.push(`project:${bestProject.name}`);
    if (bestProject.areaName) {
      result.area = bestProject.areaName;
      result.matchedOn.push(`area-from-project:${bestProject.areaName}`);
    }
  }

  // 2) Care recipient — match by first name. Maps recipient.kind → Area.
  const KIND_AREA: Record<CareRecipient["kind"], Area> = {
    child: "Kids",
    elder: "Caregiving",
    pet: "Caregiving",
    partner: "Family",
    self: "Personal",
  };
  for (const r of recipients ?? []) {
    const full = (r.name || "").toLowerCase().trim();
    if (!full) continue;
    const first = full.split(/\s+/)[0];
    if (first.length < 2) continue;
    if (tokens.has(first) || (full.length >= 3 && haystack.includes(full))) {
      result.recipientId = r.id;
      result.matchedOn.push(`recipient:${r.name}`);
      if (!result.area) {
        const a = KIND_AREA[r.kind];
        if (a) { result.area = a; result.matchedOn.push(`area-from-recipient:${a}`); }
      }
      break;
    }
  }

  // 3) Area — only set if not already pulled from a project or recipient.
  if (!result.area) {
    // Custom user-defined area names first.
    for (const a of areas ?? []) {
      const n = (a.name || "").toLowerCase().trim();
      if (n.length >= 3 && haystack.includes(n)) {
        result.area = a.name;
        result.matchedOn.push(`area:${a.name}`);
        break;
      }
    }
  }
  if (!result.area) {
    // Built-in Area names.
    for (const a of AREAS) {
      const n = a.toLowerCase();
      if (haystack.includes(n)) {
        result.area = a;
        result.matchedOn.push(`area:${a}`);
        break;
      }
    }
  }
  if (!result.area) {
    for (const tok of tokens) {
      const a = AREA_ALIASES[tok];
      if (a) { result.area = a; result.matchedOn.push(`alias:${tok}→${a}`); break; }
    }
  }
  if (!result.area) {
    for (const tok of tokens) {
      const a = VERB_AREA[tok];
      if (a) { result.area = a; result.matchedOn.push(`verb:${tok}→${a}`); break; }
    }
  }

  return result;
}