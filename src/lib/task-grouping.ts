import type { Task, Priority, Project } from "./types";
import { todayISO } from "./store";
import { formatRelativeDate } from "./date-format";
import { getEnergyFor, ENERGY_RANK, type Energy } from "./energy-store";

export type GroupMode = "none" | "project" | "area" | "priority" | "date" | "energy" | "status" | "tag" | "dayPart";
export type SortMode = "manual" | "date" | "priority" | "title" | "created" | "updated" | "energy" | "estMinutes" | "project";
export type SortDir = "asc" | "desc";
export type FilterState = {
  areas?: string[];
  projectIds?: string[];
  priorities?: Priority[];
  tags?: string[];
  goalIds?: string[];
  dueRange?: "any" | "overdue" | "today" | "week" | "month" | "none";
  /** When true, hide tasks heavier than the user's reported energy for today. */
  matchEnergy?: boolean;
};

const PRIO: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
const ENERGY: Record<string, number> = { high: 0, medium: 1, low: 2 };

export function applyFilters(list: Task[], f: FilterState): Task[] {
  if (!f) return list;
  const today = todayISO();
  const energy: Energy | null = f.matchEnergy ? (getEnergyFor(today) ?? "medium") : null;
  const energyCap = energy ? ENERGY_RANK[energy] : 0;
  const heavyMinutes = energy === "low" ? 30 : energy === "medium" ? 60 : Infinity;
  return list.filter(t => {
    if (f.areas?.length && !f.areas.includes(t.area)) return false;
    if (f.projectIds?.length && !(t.projectId && f.projectIds.includes(t.projectId))) return false;
    if (f.priorities?.length && !f.priorities.includes(t.priority)) return false;
    if (f.goalIds?.length && !(t.goalId && f.goalIds.includes(t.goalId))) return false;
    if (f.tags?.length && !(t.tags?.some(tag => f.tags!.includes(tag)))) return false;
    if (energy) {
      // Hide tasks tagged with a heavier energy than today's level.
      if (t.energy && ENERGY_RANK[t.energy as Energy] > energyCap) return false;
      // Hide long tasks when energy is limited.
      if ((t.estMinutes ?? 0) > heavyMinutes) return false;
    }
    if (f.dueRange && f.dueRange !== "any") {
      const d = t.dueDate;
      if (f.dueRange === "none" && d) return false;
      if (f.dueRange !== "none") {
        if (!d) return false;
        if (f.dueRange === "overdue" && !(d < today)) return false;
        if (f.dueRange === "today" && d !== today) return false;
        if (f.dueRange === "week") {
          const end = new Date(); end.setDate(end.getDate() + 7);
          if (d > end.toISOString().slice(0,10)) return false;
        }
        if (f.dueRange === "month") {
          const end = new Date(); end.setDate(end.getDate() + 30);
          if (d > end.toISOString().slice(0,10)) return false;
        }
      }
    }
    return true;
  });
}

export function sortTasks(list: Task[], mode: SortMode, dir: SortDir = "asc"): Task[] {
  const arr = [...list];
  const cmp = (a: Task, b: Task): number => {
    switch (mode) {
      case "date":
        return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
      case "priority":
        return (PRIO[a.priority] ?? 9) - (PRIO[b.priority] ?? 9);
      case "title":
        return a.title.localeCompare(b.title);
      case "energy":
        return (ENERGY[a.energy ?? "z"] ?? 9) - (ENERGY[b.energy ?? "z"] ?? 9);
      case "estMinutes":
        return (a.estMinutes ?? 9999) - (b.estMinutes ?? 9999);
      case "project":
        return (a.projectId ?? "~").localeCompare(b.projectId ?? "~");
      case "updated":
        return ((a as any).updatedAt ?? a.createdAt ?? "").localeCompare(((b as any).updatedAt ?? b.createdAt ?? ""));
      case "manual":
        return (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999);
      case "created":
      default:
        return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
    }
  };
  arr.sort(cmp);
  // Defaults: "created" naturally newest-first when desc; expose dir for all.
  if (dir === "desc") arr.reverse();
  return arr;
}

export function groupTasks(list: Task[], mode: GroupMode, projects: Project[] = []): { key: string; label: string; tasks: Task[] }[] {
  if (mode === "none") return [{ key: "all", label: "", tasks: list }];
  const map = new Map<string, { label: string; tasks: Task[] }>();
  const push = (key: string, label: string, t: Task) => {
    const e = map.get(key) ?? { label, tasks: [] };
    e.tasks.push(t); map.set(key, e);
  };
  for (const t of list) {
    if (mode === "project") {
      const p = projects.find(p => p.id === t.projectId);
      push(t.projectId ?? "_none", p?.name ?? "No project", t);
    } else if (mode === "area") {
      push(t.area, t.area, t);
    } else if (mode === "priority") {
      push(t.priority, t.priority[0].toUpperCase() + t.priority.slice(1), t);
    } else if (mode === "date") {
      const key = t.dueDate ?? "_none";
      const label = t.dueDate ? formatRelativeDate(t.dueDate) : "No date";
      push(key, label, t);
    } else if (mode === "energy") {
      push(t.energy ?? "_none", t.energy ?? "No energy", t);
    } else if (mode === "status") {
      push(t.status ?? "active", (t.status ?? "active").replace("_", " "), t);
    } else if (mode === "tag") {
      const tags = t.tags ?? [];
      if (tags.length === 0) push("_none", "No tag", t);
      else for (const tag of tags) push(`#${tag}`, `#${tag}`, t);
    } else if (mode === "dayPart") {
      const dp = t.dayPart ?? "_none";
      const labelMap: Record<string, string> = {
        Morning: "🌅 Morning", Afternoon: "☀️ Afternoon", Evening: "🌙 Evening", "Late Night": "✨ Late Night",
      };
      push(dp, t.dayPart ? (labelMap[t.dayPart] ?? t.dayPart) : "Anytime", t);
    }
  }
  const order = mode === "priority"
    ? ["high","medium","low"]
    : mode === "energy"
    ? ["high","medium","low","_none"]
    : mode === "dayPart"
    ? ["Morning","Afternoon","Evening","Late Night","_none"]
    : null;
  const entries = Array.from(map.entries());
  if (order) entries.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  else if (mode === "date") {
    entries.sort((a, b) => {
      if (a[0] === "_none") return 1;
      if (b[0] === "_none") return -1;
      return a[0].localeCompare(b[0]);
    });
  }
  else entries.sort((a, b) => a[1].label.localeCompare(b[1].label));
  return entries.map(([key, v]) => ({ key, label: v.label, tasks: v.tasks }));
}

export type TaskListPrefs = { group: GroupMode; sort: SortMode; sortDir?: SortDir; filter: FilterState };

const DEFAULT_PREFS: TaskListPrefs = { group: "none", sort: "created", sortDir: "desc", filter: {} };

export function loadPrefs(pageId: string): TaskListPrefs {
  try {
    const raw = localStorage.getItem(`careflow:list:${pageId}`);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch { return DEFAULT_PREFS; }
}

export function savePrefs(pageId: string, prefs: TaskListPrefs) {
  try { localStorage.setItem(`careflow:list:${pageId}`, JSON.stringify(prefs)); } catch {}
}