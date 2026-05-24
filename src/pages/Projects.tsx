import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, LayoutGrid, List as ListIcon, Columns3 } from "lucide-react";
import { AREAS } from "@/lib/types";
import { toast } from "sonner";
import { AreaIconColorPicker, getAreaIcon } from "@/components/areas/AreaIconColorPicker";
import { AreaDetailDialog } from "@/components/areas/AreaDetailDialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AllTasksViews } from "@/components/tasks/AllTasksViews";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { ProjectsAISummary } from "@/components/projects/ProjectsAISummary";

type ProjectsView = "grid" | "list" | "board";
const VIEW_KEY = "projects.view";
const PROJECT_STATUSES = ["active", "paused", "someday", "done"] as const;
const STATUS_LABEL: Record<string, string> = { active: "Active", paused: "Paused", someday: "Someday", done: "Done" };

export default function Projects() {
  const { state, addProject, updateArea, updateProject } = useStore();
  const allProjects = state.projects ?? [];
  const [name, setName] = useState("");
  const [areaName, setAreaName] = useState<string>("Personal");
  const [openArea, setOpenArea] = useState<string | null>(null);
  const [tab, setTab] = useState<"projects" | "tasks">("projects");
  const [view, setView] = useState<ProjectsView>(() => {
    if (typeof window === "undefined") return "grid";
    return (localStorage.getItem(VIEW_KEY) as ProjectsView) ?? "grid";
  });
  const [showDoneProjects, setShowDoneProjects] = useState(false);

  const projects = showDoneProjects ? allProjects : allProjects.filter(p => p.status !== "done");

  const setProjectsView = (v: ProjectsView) => {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch {}
  };

  const projectStats = (pid: string) => {
    const ts = (state.tasks ?? []).filter(t => t.projectId === pid && !t.parentTaskId);
    const done = ts.filter(t => t.done).length;
    return { total: ts.length, done, open: ts.length - done, pct: ts.length ? Math.round((done / ts.length) * 100) : 0 };
  };

  const renderProjectIcon = (p: { id: string; icon?: string; color?: string; areaName?: string }) => {
    const areaRec = (state.areas ?? []).find(a => a.name === p.areaName);
    const fallbackColor = p.color ?? areaRec?.color;
    const Icon = getAreaIcon(p.icon ?? areaRec?.icon);
    return (
      <AreaIconColorPicker
        icon={p.icon ?? areaRec?.icon}
        color={p.color ?? areaRec?.color}
        onChange={(patch) => updateProject(p.id, patch)}
        trigger={
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg transition hover:scale-105"
            style={{ background: fallbackColor ? `${fallbackColor}1f` : undefined }}
            aria-label="Edit project icon and color"
          >
            <Icon className="h-4 w-4" style={fallbackColor ? { color: fallbackColor } : undefined} />
          </button>
        }
      />
    );
  };

  const grouped = AREAS.map(a => ({ area: a, items: projects.filter(p => p.areaName === a) })).filter(g => g.items.length);
  const noArea = projects.filter(p => !p.areaName);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">Group related tasks under outcomes you care about.</p>
        </div>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "projects" | "tasks")} className="space-y-4">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="tasks">All tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-6">
      <ProjectsAISummary projectCount={projects.length} />

      <div className="rounded-2xl border border-border/60 bg-card/60 p-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="New project name…"
          value={name}
          onChange={e => setName(e.target.value)}
          className="flex-1"
        />
        <Select value={areaName} onValueChange={setAreaName}>
          <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>{AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
        </Select>
        <Button
          onClick={async () => {
            if (!name.trim()) return;
            const created = await addProject({ name: name.trim(), areaName });
            if (created) toast.success(`Project "${created.name}" created`);
            setName("");
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && setProjectsView(v as ProjectsView)}
          className="rounded-lg border border-border/60 bg-card/40 p-0.5"
        >
          <ToggleGroupItem value="grid" className="h-8 gap-1.5 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <LayoutGrid className="h-3.5 w-3.5" /> Grid
          </ToggleGroupItem>
          <ToggleGroupItem value="list" className="h-8 gap-1.5 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <ListIcon className="h-3.5 w-3.5" /> List
          </ToggleGroupItem>
          <ToggleGroupItem value="board" className="h-8 gap-1.5 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <Columns3 className="h-3.5 w-3.5" /> Board
          </ToggleGroupItem>
        </ToggleGroup>
        <Button variant="ghost" size="sm" onClick={() => setShowDoneProjects(v => !v)}>
          {showDoneProjects ? "Hide done" : "Show done"}
        </Button>
      </div>

      {projects.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-10 text-center text-sm text-muted-foreground">
          No projects yet. Create one above, or use Quick Add with <code className="rounded bg-muted px-1">+ProjectName</code>.
        </div>
      )}

      {view === "grid" && grouped.map(({ area, items }) => {
        const rec = (state.areas ?? []).find(a => a.name === area);
        const AreaIcon = getAreaIcon(rec?.icon);
        return (
        <section key={area} className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            {rec ? (
              <AreaIconColorPicker
                icon={rec.icon}
                color={rec.color}
                onChange={(p) => updateArea(rec.id, p)}
                trigger={
                  <button
                    type="button"
                    className="grid h-6 w-6 place-items-center rounded hover:bg-muted"
                    aria-label="Edit area icon and color"
                  >
                    <AreaIcon className="h-3.5 w-3.5" style={rec.color ? { color: rec.color } : undefined} />
                  </button>
                }
              />
            ) : null}
            <Link
              to={`/areas/${encodeURIComponent(area)}`}
              className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-primary"
              title="Open area · all tasks by project"
            >
              {area}
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {items.map(p => (
              (() => {
                const { total, done, open, pct } = projectStats(p.id);
                return (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/70 p-3 transition hover:border-primary/40 hover:bg-card"
              >
                {renderProjectIcon(p)}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium leading-snug break-words">{p.name}</div>
                  <div className="text-xs text-muted-foreground break-words">
                      {open} open · {pct}% ·{" "}
                    {p.deadline ? `due ${p.deadline}` : p.status}
                  </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                </div>
              </Link>
                );
              })()
            ))}
          </div>
        </section>
        );
      })}

      {view === "grid" && noArea.length > 0 && (
        <section className="space-y-2">
          <div className="px-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">No area</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {noArea.map(p => (
              <Link key={p.id} to={`/projects/${p.id}`} className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/70 p-3 hover:border-primary/40">
                {renderProjectIcon(p)}
                <span className="text-sm leading-snug break-words">{p.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {view === "list" && projects.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60">
          <div className="grid grid-cols-[1fr_8rem_7rem_5rem] gap-3 border-b border-border/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <div>Project</div><div>Area</div><div>Status</div><div className="text-right">Progress</div>
          </div>
          {projects.map(p => {
            const { total, done, pct } = projectStats(p.id);
            const areaRec = (state.areas ?? []).find(a => a.name === p.areaName);
            const PIcon = getAreaIcon(p.icon ?? areaRec?.icon);
            const pColor = p.color ?? areaRec?.color;
            return (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="grid grid-cols-[1fr_8rem_7rem_5rem] items-center gap-3 border-b border-border/30 px-4 py-2.5 transition last:border-b-0 hover:bg-muted/40"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <PIcon className="h-3.5 w-3.5 shrink-0" style={pColor ? { color: pColor } : { color: "hsl(var(--primary))" }} />
                  <span className="truncate text-sm font-medium">{p.name}</span>
                </div>
                <div className="truncate text-xs text-muted-foreground">{p.areaName ?? "—"}</div>
                <div className="text-xs capitalize text-muted-foreground">{p.status}</div>
                <div className="flex items-center justify-end gap-2 text-xs tabular-nums">
                  <span className="text-muted-foreground">{done}/{total}</span>
                  <span className="w-10 text-right text-muted-foreground">{pct}%</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {view === "board" && (
        <div className="grid auto-cols-[minmax(240px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2 sm:auto-cols-[minmax(260px,1fr)]">
          {PROJECT_STATUSES.filter(s => showDoneProjects || s !== "done").map(status => {
            const items = projects.filter(p => p.status === status);
            return (
              <div key={status} className="flex min-h-[200px] flex-col rounded-2xl border border-border/60 bg-card/50">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{STATUS_LABEL[status]}</span>
                  <span className="text-[10px] text-muted-foreground/70">{items.length}</span>
                </div>
                <div className="flex flex-col gap-2 p-2 pt-0">
                  {items.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border/50 px-3 py-4 text-center text-[11px] text-muted-foreground/70">
                      Nothing here
                    </div>
                  )}
                  {items.map(p => {
                    const { total, done, pct } = projectStats(p.id);
                    const areaRec = (state.areas ?? []).find(a => a.name === p.areaName);
                    const PIcon = getAreaIcon(p.icon ?? areaRec?.icon);
                    const pColor = p.color ?? areaRec?.color;
                    return (
                      <Link
                        key={p.id}
                        to={`/projects/${p.id}`}
                        className={cn(
                          "rounded-xl border border-border/60 bg-background/60 p-2.5 transition hover:border-primary/40",
                        )}
                        style={pColor ? { boxShadow: `inset 3px 0 0 0 ${pColor}` } : undefined}
                      >
                        <div className="flex items-start gap-1.5">
                          <PIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" style={pColor ? { color: pColor } : { color: "hsl(var(--primary))" }} />
                          <div className="text-sm font-medium leading-snug break-words">{p.name}</div>
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground break-words">
                          {p.areaName ?? "No area"} · {done}/{total}
                        </div>
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <AllTasksViews />
        </TabsContent>
      </Tabs>

      {openArea && (
        <AreaDetailDialog area={openArea as any} open={!!openArea} onOpenChange={(o) => !o && setOpenArea(null)} />
      )}
    </div>
  );
}