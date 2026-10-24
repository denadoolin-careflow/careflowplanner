import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, FileText } from "lucide-react";
import type { Project } from "@/lib/types";
import { useStore } from "@/lib/store";
import { useConnections } from "@/lib/connections";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { MilestonesCard } from "@/components/projects/MilestonesCard";
import { ProjectProgressTimeline } from "@/components/projects/ProjectProgressTimeline";
import { ProjectJournalPanel } from "@/components/journal/ProjectJournalPanel";
import { projectPhase } from "./ProjectGroupedViews";
import { cn } from "@/lib/utils";

const ACTIVE_KEY = "projects.hub.journal.active";

/** Journal view: pick one project and see its milestones, timeline, notes and library items. */
export function ProjectsJournalView({ projects }: { projects: Project[] }) {
  const { state } = useStore();
  const { linksFor } = useConnections();
  const [activeId, setActiveId] = useState<string | null>(() => {
    try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; }
  });
  const pick = (id: string) => { setActiveId(id); try { localStorage.setItem(ACTIVE_KEY, id); } catch {} };

  const sorted = useMemo(() => [...projects].sort((a, b) =>
    ((b as any).updatedAt ?? "").localeCompare((a as any).updatedAt ?? "")), [projects]);
  const active = sorted.find((p) => p.id === activeId) ?? sorted[0];
  if (!active) return null;

  const tasks = (state.tasks ?? []).filter((t) => t.projectId === active.id);
  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const linked = linksFor("project", active.id).map((l) => l.other);
  const notes = linked.filter((o) => o.type === "note");
  const library = linked.filter((o) => o.type === "library");

  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
      <nav aria-label="Choose project" className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-col md:overflow-visible md:px-0">
        {sorted.map((p) => (
          <button key={p.id} type="button" onClick={() => pick(p.id)} aria-pressed={p.id === active.id}
            className={cn("min-h-11 shrink-0 snap-start rounded-xl border px-3 text-left text-sm transition md:w-full",
              p.id === active.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card/70 hover:bg-muted")}>
            <span className="line-clamp-1">{p.name}</span>
          </button>
        ))}
      </nav>

      <div className="min-w-0 space-y-4">
        <section className="rounded-2xl bg-primary p-5 text-primary-foreground">
          <p className="text-[11px] uppercase tracking-widest opacity-80">Project journal · {projectPhase(active)}</p>
          <h3 className="font-display text-2xl leading-tight break-words">{active.name}</h3>
          {active.areaName && <p className="text-sm opacity-90">{active.areaName}</p>}
          <div className="mt-3 flex items-center gap-3">
            <Progress value={pct} className="h-1.5 flex-1 bg-primary-foreground/25" />
            <span className="text-xs tabular-nums">{done}/{tasks.length}</span>
          </div>
          <Button asChild size="sm" variant="secondary" className="mt-3 min-h-10 rounded-full">
            <Link to={`/projects/${active.id}`}>Open project <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
          </Button>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <MilestonesCard project={active} />
          <ProjectProgressTimeline projectId={active.id} />
        </div>

        <section className="rounded-2xl border border-border/60 bg-card/60 p-4">
          <h3 className="mb-2 font-display text-sm">Linked notes · {notes.length}</h3>
          {notes.length ? <ul className="flex flex-wrap gap-2">{notes.map((n) => (
            <li key={n.id}><Link to={n.href} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-muted px-3 text-xs"><FileText className="h-3 w-3" />{n.title}</Link></li>
          ))}</ul> : <p className="text-xs text-muted-foreground">No notes linked yet.</p>}
          <h3 className="mb-2 mt-4 font-display text-sm">Library · {library.length}</h3>
          {library.length ? <ul className="flex flex-wrap gap-2">{library.map((n) => (
            <li key={n.id}><Link to={n.href} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-muted px-3 text-xs"><BookOpen className="h-3 w-3" />{n.title}</Link></li>
          ))}</ul> : <p className="text-xs text-muted-foreground">No library items linked. Use Connections on the project to add some.</p>}
        </section>

        <ProjectJournalPanel projectId={active.id} projectName={active.name} />
      </div>
    </div>
  );
}
