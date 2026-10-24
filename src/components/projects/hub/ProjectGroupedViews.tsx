import type { ReactNode } from "react";
import { Sprout, Leaf, Heart, Wind } from "lucide-react";
import type { Project } from "@/lib/types";
import { stageOf } from "./studio-tokens";

/** Map a project's stage/status to a CareFlow rhythm phase (presentation only). */
export function projectPhase(p: Project): "Plan" | "Grow" | "Care" | "Let go" {
  const status = (p as any).status as string | undefined;
  if (status === "paused" || status === "archived" || status === "someday") return "Let go";
  const s = stageOf(p.stage);
  if (s === "idea" || s === "planning") return "Plan";
  if (s === "building" || s === "launching") return "Grow";
  return "Care";
}

const PHASES = [
  { k: "Plan", icon: Sprout, hint: "Ideas & planning" },
  { k: "Grow", icon: Leaf, hint: "Building momentum" },
  { k: "Care", icon: Heart, hint: "Tending & maintaining" },
  { k: "Let go", icon: Wind, hint: "Paused or resting" },
] as const;

export function ProjectsGardenView({ projects, renderCard }: { projects: Project[]; renderCard: (p: Project) => ReactNode }) {
  return (
    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-4">
      {PHASES.map(({ k, icon: I, hint }) => {
        const list = projects.filter((p) => projectPhase(p) === k);
        return (
          <section key={k} className="w-[88%] shrink-0 snap-center space-y-3 rounded-2xl border border-border bg-card/70 p-3 md:w-auto">
            <header className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                <I className="h-3.5 w-3.5" /> {k}
              </span>
              <span className="text-[11px] text-muted-foreground">{list.length} · {hint}</span>
            </header>
            {list.length ? list.map((p) => <div key={p.id}>{renderCard(p)}</div>)
              : <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Nothing in {k} yet</p>}
          </section>
        );
      })}
    </div>
  );
}

export function ProjectsAreaView({ projects, renderGroup }: { projects: Project[]; renderGroup: (ps: Project[]) => ReactNode }) {
  const groups = new Map<string, Project[]>();
  projects.forEach((p) => {
    const a = p.areaName || "No area";
    groups.set(a, [...(groups.get(a) ?? []), p]);
  });
  return (
    <div className="space-y-5">
      {[...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([area, ps]) => (
        <section key={area} className="space-y-2">
          <h3 className="flex items-baseline gap-2 font-display text-xl text-foreground">
            {area} <span className="font-sans text-xs text-muted-foreground">{ps.length}</span>
          </h3>
          {renderGroup(ps)}
        </section>
      ))}
    </div>
  );
}
