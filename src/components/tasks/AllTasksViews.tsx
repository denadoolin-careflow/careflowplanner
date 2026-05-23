import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import { TaskRow } from "@/components/cards/TaskRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AREAS, type Task, type Priority, type TaskStatus } from "@/lib/types";
import {
  LayoutGrid, List as ListIcon, Columns3, CalendarDays, CalendarRange,
  Search, X, Flag, Folder,
} from "lucide-react";
import {
  addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth,
  parseISO, startOfMonth, startOfWeek, addDays, isPast, isToday, isTomorrow,
  isThisWeek,
} from "date-fns";

type View = "grid" | "list" | "board" | "schedule" | "calendar";
type GroupBy = "none" | "area" | "project" | "priority" | "status" | "due";
type SortBy = "manual" | "title" | "due" | "priority" | "created";

const VIEW_KEY = "tasks.view.all";
const GROUP_KEY = "tasks.group.all";
const SORT_KEY = "tasks.sort.all";

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
const STATUSES: TaskStatus[] = ["active", "this_week", "waiting", "someday", "done"];
const STATUS_LABEL: Record<TaskStatus, string> = {
  active: "Active", this_week: "This Week", waiting: "Waiting", someday: "Someday", done: "Done",
};

function priorityColor(p?: Priority) {
  return p === "high" ? "text-rose-500" : p === "medium" ? "text-amber-500" : "text-muted-foreground";
}

function dueBucket(dateStr?: string): string {
  if (!dateStr) return "No date";
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    if (isPast(d)) return "Overdue";
    if (isThisWeek(d, { weekStartsOn: 1 })) return "This Week";
    return "Later";
  } catch { return "No date"; }
}
const DUE_ORDER = ["Overdue", "Today", "Tomorrow", "This Week", "Later", "No date"];

export function AllTasksViews() {
  const { state } = useStore();
  const [view, setView] = useState<View>(() => (localStorage.getItem(VIEW_KEY) as View) ?? "list");
  const [group, setGroup] = useState<GroupBy>(() => (localStorage.getItem(GROUP_KEY) as GroupBy) ?? "area");
  const [sort, setSort] = useState<SortBy>(() => (localStorage.getItem(SORT_KEY) as SortBy) ?? "manual");
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [showDone, setShowDone] = useState(false);

  const persist = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };

  const projectsById = useMemo(
    () => Object.fromEntries((state.projects ?? []).map(p => [p.id, p])),
    [state.projects],
  );

  const tasks = useMemo(() => {
    let list = (state.tasks ?? []).filter(t => !t.parentTaskId);
    if (!showDone) list = list.filter(t => !t.done);
    if (priorityFilter !== "all") list = list.filter(t => t.priority === priorityFilter);
    if (areaFilter !== "all") list = list.filter(t => t.area === areaFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.notes ?? "").toLowerCase().includes(q),
      );
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "due") {
        const da = a.dueDate ? +parseISO(a.dueDate) : Infinity;
        const db = b.dueDate ? +parseISO(b.dueDate) : Infinity;
        return da - db;
      }
      if (sort === "priority") return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (sort === "created") return +new Date(b.createdAt) - +new Date(a.createdAt);
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });
    return sorted;
  }, [state.tasks, showDone, priorityFilter, areaFilter, query, sort]);

  const groups = useMemo(() => {
    const map = new Map<string, Task[]>();
    const push = (key: string, t: Task) => {
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    };
    for (const t of tasks) {
      let key = "All";
      if (group === "area") key = t.area || "No area";
      else if (group === "project") key = t.projectId ? (projectsById[t.projectId]?.name ?? "Unknown project") : "No project";
      else if (group === "priority") key = t.priority ? t.priority[0].toUpperCase() + t.priority.slice(1) : "None";
      else if (group === "status") key = STATUS_LABEL[t.status ?? "active"];
      else if (group === "due") key = dueBucket(t.dueDate);
      push(key, t);
    }
    const entries = Array.from(map.entries());
    if (group === "due") entries.sort((a, b) => DUE_ORDER.indexOf(a[0]) - DUE_ORDER.indexOf(b[0]));
    else if (group === "priority") entries.sort((a, b) => ["High","Medium","Low","None"].indexOf(a[0]) - ["High","Medium","Low","None"].indexOf(b[0]));
    else entries.sort((a, b) => a[0].localeCompare(b[0]));
    return entries;
  }, [tasks, group, projectsById]);

  const counts = {
    total: tasks.length,
    done: tasks.filter(t => t.done).length,
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-card/60 p-2.5">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tasks…"
            className="h-9 pl-8 pr-7"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue placeholder="Area" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All areas</SelectItem>
            {AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as any)}>
          <SelectTrigger className="h-9 w-[130px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priority</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={group} onValueChange={(v) => { setGroup(v as GroupBy); persist(GROUP_KEY, v); }}>
          <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No grouping</SelectItem>
            <SelectItem value="area">Group: Area</SelectItem>
            <SelectItem value="project">Group: Project</SelectItem>
            <SelectItem value="priority">Group: Priority</SelectItem>
            <SelectItem value="status">Group: Status</SelectItem>
            <SelectItem value="due">Group: Due date</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v) => { setSort(v as SortBy); persist(SORT_KEY, v); }}>
          <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Sort: Manual</SelectItem>
            <SelectItem value="title">Sort: Title</SelectItem>
            <SelectItem value="due">Sort: Due date</SelectItem>
            <SelectItem value="priority">Sort: Priority</SelectItem>
            <SelectItem value="created">Sort: Newest</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="ghost" size="sm" className="h-9" onClick={() => setShowDone(v => !v)}>
          {showDone ? "Hide done" : "Show done"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && (setView(v as View), persist(VIEW_KEY, v))}
          className="rounded-lg border border-border/60 bg-card/40 p-0.5"
        >
          <ToggleGroupItem value="grid" className="h-8 gap-1.5 px-2.5 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"><LayoutGrid className="h-3.5 w-3.5" /> Grid</ToggleGroupItem>
          <ToggleGroupItem value="list" className="h-8 gap-1.5 px-2.5 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"><ListIcon className="h-3.5 w-3.5" /> List</ToggleGroupItem>
          <ToggleGroupItem value="board" className="h-8 gap-1.5 px-2.5 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"><Columns3 className="h-3.5 w-3.5" /> Board</ToggleGroupItem>
          <ToggleGroupItem value="schedule" className="h-8 gap-1.5 px-2.5 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"><CalendarRange className="h-3.5 w-3.5" /> Schedule</ToggleGroupItem>
          <ToggleGroupItem value="calendar" className="h-8 gap-1.5 px-2.5 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"><CalendarDays className="h-3.5 w-3.5" /> Calendar</ToggleGroupItem>
        </ToggleGroup>
        <span className="text-xs text-muted-foreground">{counts.total} {counts.total === 1 ? "task" : "tasks"}{showDone && ` · ${counts.done} done`}</span>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-10 text-center text-sm text-muted-foreground">
          No tasks match your filters.
        </div>
      ) : view === "list" ? (
        <ListView groups={groups} group={group} />
      ) : view === "grid" ? (
        <GridView groups={groups} group={group} projectsById={projectsById} />
      ) : view === "board" ? (
        <BoardView tasks={tasks} group={group === "none" ? "status" : group} projectsById={projectsById} />
      ) : view === "schedule" ? (
        <ScheduleView tasks={tasks} />
      ) : (
        <CalendarView tasks={tasks} />
      )}
    </div>
  );
}

/* ---------- List & Grid ---------- */
function GroupHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <span className="text-[10px] text-muted-foreground/70">{count}</span>
    </div>
  );
}

function ListView({ groups, group }: { groups: [string, Task[]][]; group: GroupBy }) {
  return (
    <div className="space-y-5">
      {groups.map(([key, items]) => (
        <section key={key} className="space-y-2">
          {group !== "none" && <GroupHeader label={key} count={items.length} />}
          <div className="space-y-1.5">
            {items.map(t => <TaskRow key={t.id} task={t} showArea={group !== "area"} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

function GridCard({ task, projectName }: { task: Task; projectName?: string }) {
  const { toggleTask } = useStore();
  return (
    <div className={cn(
      "group rounded-xl border border-border/60 bg-card/70 p-3 transition hover:border-primary/40 hover:bg-card",
      task.done && "opacity-60",
    )}>
      <div className="flex items-start gap-2">
        <Checkbox checked={task.done} onCheckedChange={() => toggleTask(task.id)} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className={cn("truncate text-sm font-medium", task.done && "line-through")}>{task.title}</div>
          {task.notes && <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{task.notes}</div>}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px]">{task.area}</Badge>
            {projectName && (
              <Badge variant="outline" className="gap-1 text-[10px]"><Folder className="h-2.5 w-2.5" />{projectName}</Badge>
            )}
            {task.dueDate && (
              <Badge variant="outline" className="gap-1 text-[10px]"><CalendarDays className="h-2.5 w-2.5" />{format(parseISO(task.dueDate), "MMM d")}</Badge>
            )}
            <Flag className={cn("h-3 w-3", priorityColor(task.priority))} />
          </div>
        </div>
      </div>
    </div>
  );
}

function GridView({ groups, group, projectsById }: { groups: [string, Task[]][]; group: GroupBy; projectsById: Record<string, any> }) {
  return (
    <div className="space-y-5">
      {groups.map(([key, items]) => (
        <section key={key} className="space-y-2">
          {group !== "none" && <GroupHeader label={key} count={items.length} />}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(t => (
              <GridCard key={t.id} task={t} projectName={t.projectId ? projectsById[t.projectId]?.name : undefined} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ---------- Board ---------- */
function BoardView({ tasks, group, projectsById }: { tasks: Task[]; group: GroupBy; projectsById: Record<string, any> }) {
  const columns = useMemo(() => {
    if (group === "status") {
      return STATUSES.map(s => ({ key: s, label: STATUS_LABEL[s], items: tasks.filter(t => (t.status ?? "active") === s) }));
    }
    if (group === "priority") {
      return (["high","medium","low"] as Priority[]).map(p => ({ key: p, label: p[0].toUpperCase()+p.slice(1), items: tasks.filter(t => t.priority === p) }));
    }
    if (group === "area") {
      return AREAS.filter(a => tasks.some(t => t.area === a)).map(a => ({ key: a, label: a, items: tasks.filter(t => t.area === a) }));
    }
    if (group === "due") {
      return DUE_ORDER.map(b => ({ key: b, label: b, items: tasks.filter(t => dueBucket(t.dueDate) === b) })).filter(c => c.items.length);
    }
    // project / none -> by project
    const byProj = new Map<string, Task[]>();
    for (const t of tasks) {
      const k = t.projectId ?? "__none__";
      if (!byProj.has(k)) byProj.set(k, []);
      byProj.get(k)!.push(t);
    }
    return Array.from(byProj.entries()).map(([k, items]) => ({
      key: k, label: k === "__none__" ? "No project" : (projectsById[k]?.name ?? "Unknown"), items,
    }));
  }, [tasks, group, projectsById]);

  return (
    <div className="grid auto-cols-[minmax(240px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2 sm:auto-cols-[minmax(260px,1fr)]">
      {columns.map(col => (
        <div key={col.key} className="flex min-h-[200px] flex-col rounded-2xl border border-border/60 bg-card/50">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{col.label}</span>
            <span className="text-[10px] text-muted-foreground/70">{col.items.length}</span>
          </div>
          <div className="flex flex-col gap-1.5 p-2 pt-0">
            {col.items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/50 px-3 py-4 text-center text-[11px] text-muted-foreground/70">Nothing here</div>
            ) : col.items.map(t => <TaskRow key={t.id} task={t} dense />)}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Schedule ---------- */
function ScheduleView({ tasks }: { tasks: Task[] }) {
  const buckets = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    for (const b of DUE_ORDER) groups[b] = [];
    for (const t of tasks) groups[dueBucket(t.dueDate)].push(t);
    return DUE_ORDER.map(k => ({ key: k, items: groups[k] })).filter(g => g.items.length);
  }, [tasks]);

  return (
    <div className="space-y-5">
      {buckets.map(b => (
        <section key={b.key} className="space-y-2">
          <div className="sticky top-0 z-[1] -mx-1 flex items-center gap-2 bg-background/80 px-1 py-1 backdrop-blur">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{b.key}</span>
            <span className="h-px flex-1 bg-border/50" />
            <span className="text-[10px] text-muted-foreground/70">{b.items.length}</span>
          </div>
          <div className="space-y-1.5">
            {b.items.map(t => <TaskRow key={t.id} task={t} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ---------- Calendar ---------- */
function CalendarView({ tasks }: { tasks: Task[] }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date | null>(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    const arr: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) arr.push(d);
    return arr;
  }, [month]);

  const tasksByDate = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      if (!m.has(t.dueDate)) m.set(t.dueDate, []);
      m.get(t.dueDate)!.push(t);
    }
    return m;
  }, [tasks]);

  const selectedTasks = selected
    ? tasksByDate.get(format(selected, "yyyy-MM-dd")) ?? []
    : [];
  const noDate = tasks.filter(t => !t.dueDate);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="rounded-2xl border border-border/60 bg-card/60 p-3">
        <div className="mb-2 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setMonth(m => addMonths(m, -1))}>‹</Button>
          <div className="text-sm font-semibold">{format(month, "MMMM yyyy")}</div>
          <Button variant="ghost" size="sm" onClick={() => setMonth(m => addMonths(m, 1))}>›</Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          {["S","M","T","W","T","F","S"].map((d,i) => <div key={i} className="px-1 py-1 text-center">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map(d => {
            const key = format(d, "yyyy-MM-dd");
            const items = tasksByDate.get(key) ?? [];
            const inMonth = isSameMonth(d, month);
            const isSel = selected && isSameDay(selected, d);
            return (
              <button
                key={key}
                onClick={() => setSelected(d)}
                className={cn(
                  "flex aspect-square flex-col items-stretch rounded-lg border p-1 text-left text-[11px] transition",
                  inMonth ? "border-border/40 bg-background/40" : "border-transparent bg-transparent text-muted-foreground/50",
                  isToday(d) && "border-primary/50",
                  isSel && "border-primary bg-primary/10",
                )}
              >
                <span className={cn("text-[10px] tabular-nums", isToday(d) && "font-semibold text-primary")}>{format(d, "d")}</span>
                <div className="mt-auto flex flex-wrap gap-0.5">
                  {items.slice(0, 4).map(t => (
                    <span key={t.id} className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      t.priority === "high" ? "bg-rose-500" : t.priority === "medium" ? "bg-amber-500" : "bg-primary/70",
                      t.done && "opacity-30",
                    )} />
                  ))}
                  {items.length > 4 && <span className="text-[9px] text-muted-foreground">+{items.length - 4}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {selected ? format(selected, "EEE, MMM d") : "Select a day"}
          </div>
          {selectedTasks.length === 0 ? (
            <div className="text-xs text-muted-foreground/70">No tasks due.</div>
          ) : (
            <div className="space-y-1.5">{selectedTasks.map(t => <TaskRow key={t.id} task={t} dense />)}</div>
          )}
        </div>
        {noDate.length > 0 && (
          <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">No date · {noDate.length}</div>
            <div className="space-y-1.5">{noDate.slice(0, 8).map(t => <TaskRow key={t.id} task={t} dense />)}</div>
            {noDate.length > 8 && <div className="mt-1 text-[10px] text-muted-foreground">+{noDate.length - 8} more</div>}
          </div>
        )}
      </div>
    </div>
  );
}
