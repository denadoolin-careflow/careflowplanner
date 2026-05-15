import type { Task, Priority, Project } from "./types";
import { todayISO } from "./store";

export type GroupMode = "none" | "project" | "area" | "priority" | "date" | "energy" | "status";
export type SortMode = "manual" | "date" | "priority" | "title" | "created" | "energy" | "estMinutes";
export type FilterState = {
  areas?: string[];
  projectIds?: string[];
  priorities?: Priority[];
  tags?: string[];
  goalIds?: string[];
  dueRange?: "any" | "overdue" | "today" | "week" | "month" | "none";
};

const PRIO: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
const ENERGY: Record<string, number> = { high: 0, medium: 1, low: 2 };

export function applyFilters(list: Task[], f: FilterState): Task[] {
  if (!f) return list;
  const today = todayISO();
  return list.filter(t => {
    if (f.areas?.length && !f.areas.includes(t.area)) return false;
    if (f.projectIds?.length && !(t.projectId && f.projectIds.includes(t.projectId))) return false;
    if (f.priorities?.length && !f.priorities.includes(t.priority)) return false;
    if (f.goalIds?.length && !(t.goalId && f.goalIds.includes(t.goalId))) return false;
    if (f.tags?.length && !(t.tags?.some(tag => f.tags!.includes(tag)))) return false;
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

export function sortTasks(list: Task[], mode: SortMode): Task[] {
  const arr = [...list];
  switch (mode) {
    case "date":
      return arr.sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
    case "priority":
      return arr.sort((a, b) => (PRIO[a.priority] ?? 9) - (PRIO[b.priority] ?? 9));
    case "title":
      return arr.sort((a, b) => a.title.localeCompare(b.title));
    case "energy":
      return arr.sort((a, b) => (ENERGY[a.energy ?? "z"] ?? 9) - (ENERGY[b.energy ?? "z"] ?? 9));
    case "estMinutes":
      return arr.sort((a, b) => (a.estMinutes ?? 9999) - (b.estMinutes ?? 9999));
    case "manual":
      return arr.sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
    case "created":
    default:
      return arr.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }
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
      push(t.dueDate ?? "_none", t.dueDate ?? "No date", t);
    } else if (mode === "energy") {
      push(t.energy ?? "_none", t.energy ?? "No energy", t);
    } else if (mode === "status") {
      push(t.status ?? "active", (t.status ?? "active").replace("_", " "), t);
    }
  }
  const order = mode === "priority"
    ? ["high","medium","low"]
    : mode === "energy"
    ? ["high","medium","low","_none"]
    : null;
  const entries = Array.from(map.entries());
  if (order) entries.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  else entries.sort((a, b) => a[1].label.localeCompare(b[1].label));
  return entries.map(([key, v]) => ({ key, label: v.label, tasks: v.tasks }));
}

export type TaskListPrefs = { group: GroupMode; sort: SortMode; filter: FilterState };

const DEFAULT_PREFS: TaskListPrefs = { group: "none", sort: "created", filter: {} };

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