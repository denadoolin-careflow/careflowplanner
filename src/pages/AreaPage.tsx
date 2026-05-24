import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "@/lib/store";
import { TaskRow } from "@/components/cards/TaskRow";
import { getAreaIcon } from "@/components/areas/AreaIconColorPicker";
import { FolderOpen, ArrowLeft, ChevronRight, ChevronsDownUp, ChevronsUpDown, GripVertical, LayoutGrid, List as ListIcon, Columns3, Filter, ArrowUpDown, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Task } from "@/lib/types";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { InlineTaskComposer } from "@/components/tasks/InlineTaskComposer";
import type { Area, Project } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AreaHub } from "@/components/areas/AreaHub";
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type SortKey = "manual" | "due" | "created" | "priority" | "title";
const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

function sortTasks(tasks: Task[], key: SortKey): Task[] {
  const arr = [...tasks];
  switch (key) {
    case "due":
      return arr.sort((a, b) => {
        const av = a.dueDate ?? "9999-12-31";
        const bv = b.dueDate ?? "9999-12-31";
        return av.localeCompare(bv);
      });
    case "created":
      return arr.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    case "priority":
      return arr.sort((a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9));
    case "title":
      return arr.sort((a, b) => a.title.localeCompare(b.title));
    case "manual":
    default:
      return arr.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
}

type ProjectView = "list" | "grid" | "board";
type ProjectSort = "manual" | "name" | "deadline" | "updated";
type ProjectGroup = "none" | "status" | "deadline";

function sortProjects(arr: Project[], key: ProjectSort): Project[] {
  const out = [...arr];
  switch (key) {
    case "name":     return out.sort((a, b) => a.name.localeCompare(b.name));
    case "deadline": return out.sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"));
    case "updated":  return out.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    default:         return out.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
}

function projectStats(state: any, pid: string) {
  const ts = (state.tasks ?? []).filter((t: Task) => t.projectId === pid && !t.parentTaskId);
  const done = ts.filter((t: Task) => t.done).length;
  return { total: ts.length, done, open: ts.length - done, pct: ts.length ? Math.round((done / ts.length) * 100) : 0 };
}

function SortableProjectCard({ project, view, stats }: { project: Project; view: ProjectView; stats: ReturnType<typeof projectStats>; }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  if (view === "list") {
    return (
      <div ref={setNodeRef} style={style} className="group flex items-center gap-2 rounded-xl border border-border/60 bg-card/70 px-3 py-2 hover:border-primary/40">
        <button {...listeners} {...attributes} className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground" aria-label="Drag">
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <FolderOpen className="h-4 w-4 text-primary" style={project.color ? { color: project.color } : undefined} />
        <Link to={`/projects/${project.id}`} className="flex-1 truncate text-sm font-medium hover:text-primary">{project.name}</Link>
        <span className="text-[11px] text-muted-foreground tabular-nums">{stats.done}/{stats.total}</span>
        <span className="w-10 text-right text-[11px] text-muted-foreground tabular-nums">{stats.pct}%</span>
      </div>
    );
  }
  // grid card
  return (
    <div ref={setNodeRef} style={style} className="group overflow-hidden rounded-xl border border-border/60 bg-card/70 hover:border-primary/40">
      {project.coverUrl && (
        <div className="aspect-[16/7] overflow-hidden bg-muted">
          <img src={project.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="flex items-center gap-2 p-3">
        <button {...listeners} {...attributes} className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground" aria-label="Drag">
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary" style={project.color ? { backgroundColor: `${project.color}22`, color: project.color } : undefined}>
          <FolderOpen className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <Link to={`/projects/${project.id}`} className="block truncate text-sm font-medium hover:text-primary">{project.name}</Link>
          <div className="truncate text-[11px] text-muted-foreground">{stats.open} open · {stats.pct}% · {project.deadline ? `due ${project.deadline}` : project.status}</div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary" style={{ width: `${stats.pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectsView({ areaName, projects: incoming }: { areaName: string; projects: Project[] }) {
  const { state, updateProject } = useStore();
  const storageKey = `area-view:${areaName}`;
  const [view, setView] = useState<ProjectView>(() => (localStorage.getItem(`${storageKey}:view`) as ProjectView) || "grid");
  const [sortKey, setSortKey] = useState<ProjectSort>(() => (localStorage.getItem(`${storageKey}:sort`) as ProjectSort) || "manual");
  const [groupKey, setGroupKey] = useState<ProjectGroup>(() => (localStorage.getItem(`${storageKey}:group`) as ProjectGroup) || "none");
  const [statusFilter, setStatusFilter] = useState<string>(() => localStorage.getItem(`${storageKey}:status`) || "all");
  const [favOnly, setFavOnly] = useState<boolean>(() => localStorage.getItem(`${storageKey}:fav`) === "1");

  const persist = (k: string, v: string) => { try { localStorage.setItem(`${storageKey}:${k}`, v); } catch {} };

  const filtered = incoming
    .filter(p => statusFilter === "all" || p.status === statusFilter)
    .filter(p => !favOnly || p.isFavorite);

  const sorted = sortProjects(filtered, sortKey);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = sorted.map(p => p.id);
    const oldIdx = ids.indexOf(String(active.id));
    const newIdx = ids.indexOf(String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    const next = arrayMove(sorted, oldIdx, newIdx);
    // Switch to manual sort once user drags
    if (sortKey !== "manual") { setSortKey("manual"); persist("sort", "manual"); }
    // Persist new sortOrder for affected items
    await Promise.all(next.map((p, i) => p.sortOrder === i ? Promise.resolve() : updateProject(p.id, { sortOrder: i })));
  };

  // Grouping
  const groups: { label: string; items: Project[] }[] = (() => {
    if (groupKey === "status") {
      const buckets: Record<string, Project[]> = {};
      for (const p of sorted) (buckets[p.status] ||= []).push(p);
      return Object.entries(buckets).map(([label, items]) => ({ label, items }));
    }
    if (groupKey === "deadline") {
      const today = new Date().toISOString().slice(0, 10);
      const weekEnd = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);
      const monthEnd = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);
      const buckets: Record<string, Project[]> = { Overdue: [], "This week": [], "This month": [], Later: [], "No deadline": [] };
      for (const p of sorted) {
        if (!p.deadline) buckets["No deadline"].push(p);
        else if (p.deadline < today) buckets.Overdue.push(p);
        else if (p.deadline <= weekEnd) buckets["This week"].push(p);
        else if (p.deadline <= monthEnd) buckets["This month"].push(p);
        else buckets.Later.push(p);
      }
      return Object.entries(buckets).filter(([, v]) => v.length).map(([label, items]) => ({ label, items }));
    }
    return [{ label: "", items: sorted }];
  })();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && (setView(v as ProjectView), persist("view", v))}
          className="rounded-lg border border-border/60 bg-card/40 p-0.5"
        >
          <ToggleGroupItem value="grid" className="h-7 gap-1.5 px-2.5 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"><LayoutGrid className="h-3.5 w-3.5" /> Grid</ToggleGroupItem>
          <ToggleGroupItem value="list" className="h-7 gap-1.5 px-2.5 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"><ListIcon className="h-3.5 w-3.5" /> List</ToggleGroupItem>
          <ToggleGroupItem value="board" className="h-7 gap-1.5 px-2.5 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"><Columns3 className="h-3.5 w-3.5" /> Board</ToggleGroupItem>
        </ToggleGroup>

        <div className="flex items-center gap-1.5">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs"><ArrowUpDown className="h-3 w-3" /> Sort</Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="end">
              <Select value={sortKey} onValueChange={(v) => { setSortKey(v as ProjectSort); persist("sort", v); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual (drag)</SelectItem>
                  <SelectItem value="name">Name (A–Z)</SelectItem>
                  <SelectItem value="deadline">Deadline</SelectItem>
                  <SelectItem value="updated">Recently added</SelectItem>
                </SelectContent>
              </Select>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs"><Layers className="h-3 w-3" /> Group</Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="end">
              <Select value={groupKey} onValueChange={(v) => { setGroupKey(v as ProjectGroup); persist("group", v); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No grouping</SelectItem>
                  <SelectItem value="status">By status</SelectItem>
                  <SelectItem value="deadline">By deadline</SelectItem>
                </SelectContent>
              </Select>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs"><Filter className="h-3 w-3" /> Filter</Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 space-y-2 p-3" align="end">
              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Status</Label>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); persist("status", v); }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="someday">Someday</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Favorites only</Label>
                <Switch checked={favOnly} onCheckedChange={(v) => { setFavOnly(!!v); persist("fav", v ? "1" : "0"); }} />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-8 text-center text-xs text-muted-foreground">
          No projects match this view.
        </div>
      ) : view === "board" ? (
        <BoardView projects={sorted} state={state} />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          {groups.map(group => (
            <div key={group.label || "g"} className="space-y-2">
              {group.label && <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{group.label}</div>}
              <SortableContext items={group.items.map(p => p.id)} strategy={verticalListSortingStrategy}>
                <div className={cn(view === "grid" ? "grid gap-2 sm:grid-cols-2" : "space-y-1.5")}>
                  {group.items.map(p => <SortableProjectCard key={p.id} project={p} view={view} stats={projectStats(state, p.id)} />)}
                </div>
              </SortableContext>
            </div>
          ))}
        </DndContext>
      )}
    </div>
  );
}

function BoardView({ projects, state }: { projects: Project[]; state: any }) {
  const STATUSES = ["active", "paused", "someday", "done"];
  const LABEL: Record<string, string> = { active: "Active", paused: "Paused", someday: "Someday", done: "Done" };
  return (
    <div className="grid auto-cols-[minmax(220px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2">
      {STATUSES.map(status => {
        const items = projects.filter(p => p.status === status);
        return (
          <div key={status} className="flex min-h-[180px] flex-col rounded-2xl border border-border/60 bg-card/50">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{LABEL[status]}</span>
              <span className="text-[10px] text-muted-foreground/70">{items.length}</span>
            </div>
            <div className="flex flex-col gap-2 p-2 pt-0">
              {items.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/50 px-3 py-4 text-center text-[11px] text-muted-foreground/70">Nothing here</div>
              ) : items.map(p => {
                const s = projectStats(state, p.id);
                return (
                  <Link key={p.id} to={`/projects/${p.id}`} className="overflow-hidden rounded-xl border border-border/60 bg-background/60 transition hover:border-primary/40">
                    {p.coverUrl && <div className="aspect-[16/8] overflow-hidden bg-muted"><img src={p.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" /></div>}
                    <div className="p-2.5">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{s.done}/{s.total} · {s.pct}%</div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${s.pct}%` }} /></div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AreaPage() {
  const { name = "" } = useParams();
  const areaName = decodeURIComponent(name);
  const { state } = useStore();
  const [sortKey, setSortKey] = useState<SortKey>("due");
  const [scope, setScope] = useState<"open" | "all">("open");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"tasks" | "projects" | "hub">("tasks");
  const toggleCollapsed = (id: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const areaRec = (state.areas ?? []).find(a => a.name === areaName);
  const AreaIcon = getAreaIcon(areaRec?.icon);

  const projects = useMemo(
    () => (state.projects ?? []).filter(p => p.areaName === areaName),
    [state.projects, areaName]
  );
  const openProjects = useMemo(() => projects.filter(p => p.status !== "done"), [projects]);

  const tasks = useMemo(
    () => (state.tasks ?? []).filter(t => t.area === areaName && !t.parentTaskId && (scope === "all" || !t.done)),
    [state.tasks, areaName, scope]
  );

  const grouped = openProjects.map(p => ({
    project: p,
    items: sortTasks(tasks.filter(t => t.projectId === p.id), sortKey),
  }));
  const noProject = sortTasks(tasks.filter(t => !t.projectId), sortKey);

  const total = tasks.length;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button asChild variant="ghost" size="icon" className="shrink-0">
            <Link to="/projects" aria-label="Back to projects"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
            style={areaRec?.color ? { backgroundColor: `${areaRec.color}22`, color: areaRec.color } : { backgroundColor: "hsl(var(--primary) / 0.1)" }}
          >
            <AreaIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{areaName}</h1>
            <p className="text-sm text-muted-foreground">
              {total} {scope === "open" ? "open " : ""}{total === 1 ? "task" : "tasks"} · {projects.length} {projects.length === 1 ? "project" : "projects"}
            </p>
          </div>
        </div>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="hub">Hub</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <ToggleGroup
          type="single"
          value={scope}
          onValueChange={(v) => v && setScope(v as "open" | "all")}
          className="rounded-lg border border-border/60 bg-card/40 p-0.5"
        >
          <ToggleGroupItem value="open" className="h-7 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            Open only
          </ToggleGroupItem>
          <ToggleGroupItem value="all" className="h-7 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            Include done
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              const allIds = [...openProjects.map(p => p.id), "__no_project__"];
              const anyOpen = allIds.some(id => !collapsed.has(id));
              setCollapsed(anyOpen ? new Set(allIds) : new Set());
            }}
          >
            {openProjects.every(p => collapsed.has(p.id)) && collapsed.has("__no_project__")
              ? <><ChevronsUpDown className="mr-1 h-3.5 w-3.5" /> Expand all</>
              : <><ChevronsDownUp className="mr-1 h-3.5 w-3.5" /> Collapse all</>}
          </Button>
          <span className="text-xs text-muted-foreground">Sort by</span>
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="due">Due date</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="created">Created (newest)</SelectItem>
              <SelectItem value="title">Title (A–Z)</SelectItem>
              <SelectItem value="manual">Manual order</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {total === 0 && openProjects.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-10 text-center text-sm text-muted-foreground">
          Nothing in {areaName} yet.
        </div>
      )}

      {grouped.map(({ project, items }) => {
        const isCollapsed = collapsed.has(project.id);
        return (
          <section key={project.id} className="space-y-2">
            <div className="flex items-center justify-between gap-2 px-1">
              <button
                type="button"
                onClick={() => toggleCollapsed(project.id)}
                className="flex items-center gap-1.5 text-left group"
                aria-expanded={!isCollapsed}
              >
                <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isCollapsed ? "" : "rotate-90"}`} />
                <FolderOpen className="h-3.5 w-3.5 text-primary" style={project.color ? { color: project.color } : undefined} />
                <span className="text-sm font-medium group-hover:text-primary transition-colors">{project.name}</span>
                <span className="text-[10px] text-muted-foreground/70">{items.length}</span>
              </button>
              <Link to={`/projects/${project.id}`} className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary">
                Open
              </Link>
            </div>
            {!isCollapsed && (
              items.length === 0 ? (
                <>
                  <div className="rounded-xl border border-dashed border-border/40 bg-card/30 px-3 py-2 text-xs italic text-muted-foreground">
                    {scope === "open" ? "No open tasks" : "No tasks"}
                  </div>
                  <InlineTaskComposer
                    defaults={{ area: areaName as Area, projectId: project.id }}
                    nlp={false}
                    placeholder={`Add a task to ${project.name}…`}
                  />
                </>
              ) : (
                <div className="space-y-1.5">
                  {items.map(t => <TaskRow key={t.id} task={t} showArea={false} />)}
                  <InlineTaskComposer
                    defaults={{ area: areaName as Area, projectId: project.id }}
                    nlp={false}
                    placeholder={`Add a task to ${project.name}…`}
                  />
                </div>
              )
            )}
          </section>
        );
      })}

      {(() => {
        const isCollapsed = collapsed.has("__no_project__");
        return (
          <section className="space-y-2">
            <button
              type="button"
              onClick={() => toggleCollapsed("__no_project__")}
              className="flex items-center gap-1.5 px-1 text-left"
              aria-expanded={!isCollapsed}
            >
              <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isCollapsed ? "" : "rotate-90"}`} />
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">No project</span>
              <span className="text-[10px] text-muted-foreground/70">{noProject.length}</span>
            </button>
            {!isCollapsed && (
              <div className="space-y-1.5">
                {noProject.map(t => <TaskRow key={t.id} task={t} showArea={false} />)}
                <InlineTaskComposer
                  defaults={{ area: areaName as Area }}
                  nlp={false}
                  placeholder={`Add a task in ${areaName}…`}
                />
              </div>
            )}
          </section>
        );
      })()}
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <ProjectsView areaName={areaName} projects={projects} />
        </TabsContent>

        <TabsContent value="hub" className="space-y-4">
          <AreaHub areaName={areaName} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
