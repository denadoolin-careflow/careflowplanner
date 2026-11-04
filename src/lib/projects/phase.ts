import type { Project, ProjectStage, Task } from "@/lib/types";
import type { RhythmPhase } from "@/lib/planner/rhythm-phase";

/**
 * Projects hub grouping: how a project's stage/health/status maps onto the
 * four CareFlow phases. Display-only — the stage field stays the source of truth.
 */
export function projectPhase(p: Pick<Project, "stage" | "health" | "status">): RhythmPhase {
  if (p.status === "paused" || p.status === "done" || p.health === "waiting" || p.health === "blocked") return "letgo";
  switch (p.stage) {
    case "idea": return "plan";
    case "planning": case "building": return "grow";
    case "launching": case "maintaining": return "care";
    default: return "plan";
  }
}

/** Patch to apply when a project is dropped into a phase column. */
export function patchForPhase(phase: RhythmPhase, current?: ProjectStage): Partial<Project> {
  const clear = { health: "active" as const, status: "active" as const };
  if (phase === "plan") return { ...clear, stage: "idea" };
  if (phase === "grow") return { ...clear, stage: current === "planning" ? "planning" : "building" };
  if (phase === "care") return { ...clear, stage: current === "maintaining" ? "maintaining" : "launching" };
  return { health: "waiting" };
}

export const PHASE_ROLE: Record<RhythmPhase, string> = {
  plan: "Ideas and planning", grow: "Building now", care: "Launching and tending", letgo: "Waiting, paused or wrapping up",
};

export interface ProjectProgress { done: number; total: number; pct: number; next?: Task }
export function projectProgress(projectId: string, tasks: Task[]): ProjectProgress {
  const ts = tasks.filter(t => t.projectId === projectId && !t.parentTaskId);
  const done = ts.filter(t => t.done).length;
  const open = ts.filter(t => !t.done).sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return { done, total: ts.length, pct: ts.length ? Math.round((done / ts.length) * 100) : 0, next: open[0] };
}

export const projectDue = (p: Project) => p.endDate ?? p.targetDate ?? p.deadline;
