import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "@/lib/store";
import { TaskRow } from "@/components/cards/TaskRow";
import { getAreaIcon } from "@/components/areas/AreaIconColorPicker";
import { FolderOpen, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Task } from "@/lib/types";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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

export default function AreaPage() {
  const { name = "" } = useParams();
  const areaName = decodeURIComponent(name);
  const { state } = useStore();
  const [sortKey, setSortKey] = useState<SortKey>("due");
  const [scope, setScope] = useState<"open" | "all">("open");

  const areaRec = (state.areas ?? []).find(a => a.name === areaName);
  const AreaIcon = getAreaIcon(areaRec?.icon);

  const projects = useMemo(
    () => (state.projects ?? []).filter(p => p.areaName === areaName && p.status !== "done"),
    [state.projects, areaName]
  );

  const tasks = useMemo(
    () => (state.tasks ?? []).filter(t => t.area === areaName && !t.parentTaskId && (scope === "all" || !t.done)),
    [state.tasks, areaName, scope]
  );

  const grouped = projects.map(p => ({
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

      {total === 0 && projects.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-10 text-center text-sm text-muted-foreground">
          Nothing in {areaName} yet.
        </div>
      )}

      {grouped.map(({ project, items }) => (
        <section key={project.id} className="space-y-2">
          <div className="flex items-center justify-between gap-2 px-1">
            <Link to={`/projects/${project.id}`} className="flex items-center gap-2 group">
              <FolderOpen className="h-3.5 w-3.5 text-primary" style={project.color ? { color: project.color } : undefined} />
              <span className="text-sm font-medium group-hover:text-primary transition-colors">{project.name}</span>
              <span className="text-[10px] text-muted-foreground/70">{items.length}</span>
            </Link>
          </div>
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/40 bg-card/30 px-3 py-2 text-xs italic text-muted-foreground">
              {scope === "open" ? "No open tasks" : "No tasks"}
            </div>
          ) : (
            <div className="space-y-1.5">
              {items.map(t => <TaskRow key={t.id} task={t} showArea={false} />)}
            </div>
          )}
        </section>
      ))}

      {noProject.length > 0 && (
        <section className="space-y-2">
          <div className="px-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">No project</div>
          <div className="space-y-1.5">
            {noProject.map(t => <TaskRow key={t.id} task={t} showArea={false} />)}
          </div>
        </section>
      )}
    </div>
  );
}
