import type { ProjectSection, Task } from "@/lib/types";

export const GARDEN_PHASES = ["Plan", "Grow", "Care", "Let go"] as const;
export type GardenPhase = (typeof GARDEN_PHASES)[number];

/** Matches a project section to a rhythm phase by its name (case-insensitive). */
export function phaseOfSection(name?: string): GardenPhase | null {
  const n = (name ?? "").trim().toLowerCase();
  return GARDEN_PHASES.find(p => p.toLowerCase() === n) ?? null;
}

/** Groups a project's open tasks into phases; tasks outside phase sections sit in Plan. */
export function groupTasksByPhase(tasks: Task[], sections: ProjectSection[]): Record<GardenPhase, Task[]> {
  const out = { Plan: [], Grow: [], Care: [], "Let go": [] } as Record<GardenPhase, Task[]>;
  const byId = new Map(sections.map(s => [s.id, phaseOfSection(s.name)]));
  for (const t of tasks) out[(t.sectionId && byId.get(t.sectionId)) || "Plan"].push(t);
  return out;
}
