import type { ProjectSection, Task } from "@/lib/types";

export const GARDEN_PHASES = ["Plan", "Grow", "Care", "Let go"] as const;
export type GardenPhase = (typeof GARDEN_PHASES)[number];
export type LetGoKind = "released" | "later";

/** Stored in tasks.garden — phase is kept separate from completion (`done`). */
export interface TaskGarden {
  phase?: GardenPhase;
  letGo?: LetGoKind;
  letGoReason?: string;
  reviewDate?: string;
}

/** Stored in projects.details. */
export interface ProjectDetailsData {
  whyItMatters?: string;
  enoughForNow?: string;
  energy?: "Gentle" | "Moderate" | "Focused";
  nextStepTaskId?: string | null;
}

/** Matches a project section to a rhythm phase by its name (case-insensitive). */
export function phaseOfSection(name?: string): GardenPhase | null {
  const n = (name ?? "").trim().toLowerCase();
  return GARDEN_PHASES.find(p => p.toLowerCase() === n) ?? null;
}

/** Explicit garden phase, else section name match, else Plan (display-only fallback). */
export function phaseOfTask(t: Task, sections: ProjectSection[] = []): GardenPhase {
  if (t.garden?.letGo) return "Let go";
  const g = t.garden?.phase;
  if (g && g !== "Let go") return g;
  const sec = t.sectionId ? sections.find(s => s.id === t.sectionId) : undefined;
  const sp = phaseOfSection(sec?.name);
  if (sp === "Let go") return t.garden?.phase ? "Plan" : "Let go";
  return sp ?? "Plan";
}

/** Groups a project's (not completed) tasks into phases. */
export function groupTasksByPhase(tasks: Task[], sections: ProjectSection[]): Record<GardenPhase, Task[]> {
  const out = { Plan: [], Grow: [], Care: [], "Let go": [] } as Record<GardenPhase, Task[]>;
  for (const t of tasks) out[phaseOfTask(t, sections)].push(t);
  return out;
}

/** True when a task is open actionable work (not done, not let go). */
export const isActionable = (t: Task, sections: ProjectSection[] = []) => !t.done && phaseOfTask(t, sections) !== "Let go";

/** Returns the next-step task id only if it still points at actionable work. */
export function validNextStep(id: string | null | undefined, tasks: Task[], sections: ProjectSection[] = []): string | null {
  if (!id) return null;
  const t = tasks.find(x => x.id === id);
  return t && isActionable(t, sections) ? id : null;
}

/** Garden patch for moving a task to a phase; restoring out of Let go clears its disposition. */
export function moveGarden(cur: TaskGarden | undefined, to: GardenPhase, letGo?: { kind: LetGoKind; reason?: string; reviewDate?: string }): TaskGarden {
  if (to === "Let go") return { ...cur, phase: "Let go", letGo: letGo?.kind ?? "released", letGoReason: letGo?.reason || undefined, reviewDate: letGo?.kind === "later" ? letGo.reviewDate || undefined : undefined };
  return { phase: to };
}
