import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  ArrowUpDown, Filter, Layers, X, ArrowUp, ArrowDown,
  Folder, Flag, CalendarDays, Tag as TagIcon, Slash, CircleDot,
  Zap as EnergyIcon, Map, Clock as ClockIcon, Type, FilePlus, RefreshCcw,
  ArrowUpAZ, ListChecks, Sun, Star, Hash,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { AREAS } from "@/lib/types";
import type { Priority } from "@/lib/types";
import { loadPrefs, savePrefs, type TaskListPrefs, type GroupMode, type SortMode, type FilterState } from "@/lib/task-grouping";
import { useDayEnergy } from "@/lib/energy-store";
import { format } from "date-fns";
import { Zap } from "lucide-react";

const GROUP_LABEL: Record<GroupMode, string> = {
  none: "None", project: "Project", area: "Area", priority: "Priority", date: "Date", energy: "Energy", status: "Status", tag: "Tag", dayPart: "Time of day",
};
const GROUP_ICON: Record<GroupMode, typeof Layers> = {
  none: Slash, project: Folder, area: Map, priority: Flag, date: CalendarDays,
  energy: EnergyIcon, status: ListChecks, tag: TagIcon, dayPart: Sun,
};
const SORT_LABEL: Record<SortMode, string> = {
  manual: "Manual", date: "Date", priority: "Priority", title: "Title", created: "Created", updated: "Updated", energy: "Energy", estMinutes: "Time", project: "Project",
};
const SORT_ICON: Record<SortMode, typeof Layers> = {
  manual: Hash, date: CalendarDays, priority: Flag, title: Type,
  created: FilePlus, updated: RefreshCcw, energy: EnergyIcon,
  estMinutes: ClockIcon, project: Folder,
};
const DUE_LABEL: Record<string, string> = { any: "Any", overdue: "Overdue", today: "Today", week: "This week", month: "This month", none: "No date" };
const DUE_ICON: Record<string, typeof Layers> = {
  any: Slash, overdue: CircleDot, today: Sun, week: CalendarDays, month: CalendarDays, none: Slash,
};
const PRIORITY_ICON: Record<string, typeof Layers> = {
  high: Flag, medium: Flag, low: Flag,
};

export function useTaskListPrefs(pageId: string): [TaskListPrefs, (p: Partial<TaskListPrefs>) => void] {
  const [prefs, setPrefs] = useState<TaskListPrefs>(() => loadPrefs(pageId));
  useEffect(() => { setPrefs(loadPrefs(pageId)); }, [pageId]);
  const update = (p: Partial<TaskListPrefs>) => {
    setPrefs(prev => {
      const next = { ...prev, ...p, filter: { ...prev.filter, ...(p.filter ?? {}) } };
      savePrefs(pageId, next);
      return next;
    });
  };
  return [prefs, update];
}

export function TaskListControls({ prefs, onChange }: { prefs: TaskListPrefs; onChange: (p: Partial<TaskListPrefs>) => void }) {
  const { state } = useStore();
  const projects = state.projects ?? [];
  const f = prefs.filter;
  const todayISO = format(new Date(), "yyyy-MM-dd");
  const [energy] = useDayEnergy(todayISO);
  const matchOn = !!f.matchEnergy;
  const activeFilters =
    (f.areas?.length ?? 0) +
    (f.projectIds?.length ?? 0) +
    (f.priorities?.length ?? 0) +
    (f.tags?.length ?? 0) +
    (f.dueRange && f.dueRange !== "any" ? 1 : 0);

  const toggle = <T,>(arr: T[] | undefined, v: T): T[] => {
    const s = new Set(arr ?? []);
    s.has(v) ? s.delete(v) : s.add(v);
    return Array.from(s);
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Button
        variant={matchOn ? "default" : "ghost"}
        size="sm"
        className="gap-1.5 text-xs"
        onClick={() => onChange({ filter: { matchEnergy: !matchOn } })}
        title={matchOn ? `Showing tasks that match your ${energy} energy` : "Match my energy"}
      >
        <Zap className="h-3.5 w-3.5" />
        {matchOn ? `Match: ${energy}` : "Match energy"}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            <Layers className="h-3.5 w-3.5" /> Group: {GROUP_LABEL[prefs.group]}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel>Group by</DropdownMenuLabel>
          {(Object.keys(GROUP_LABEL) as GroupMode[]).map(k => (
            <DropdownMenuCheckboxItem key={k} checked={prefs.group === k} onCheckedChange={() => onChange({ group: k })}>
              {GROUP_LABEL[k]}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs relative">
            <Filter className="h-3.5 w-3.5" /> Filter
            {activeFilters > 0 && <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{activeFilters}</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 max-h-[70vh] overflow-y-auto">
          <DropdownMenuLabel>Due</DropdownMenuLabel>
          {(Object.keys(DUE_LABEL) as FilterState["dueRange"][]).map(k => (
            <DropdownMenuCheckboxItem
              key={k}
              checked={(f.dueRange ?? "any") === k}
              onCheckedChange={() => onChange({ filter: { dueRange: k } })}
            >
              {DUE_LABEL[k!]}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Priority</DropdownMenuLabel>
          {(["high","medium","low"] as Priority[]).map(p => (
            <DropdownMenuCheckboxItem key={p} checked={f.priorities?.includes(p) ?? false}
              onCheckedChange={() => onChange({ filter: { priorities: toggle(f.priorities, p) } })}>
              {p[0].toUpperCase() + p.slice(1)}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Area</DropdownMenuLabel>
          {AREAS.map(a => (
            <DropdownMenuCheckboxItem key={a} checked={f.areas?.includes(a) ?? false}
              onCheckedChange={() => onChange({ filter: { areas: toggle(f.areas, a) } })}>
              {a}
            </DropdownMenuCheckboxItem>
          ))}
          {projects.length > 0 && <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Project</DropdownMenuLabel>
            {projects.map(p => (
              <DropdownMenuCheckboxItem key={p.id} checked={f.projectIds?.includes(p.id) ?? false}
                onCheckedChange={() => onChange({ filter: { projectIds: toggle(f.projectIds, p.id) } })}>
                {p.name}
              </DropdownMenuCheckboxItem>
            ))}
          </>}
          {activeFilters > 0 && <>
            <DropdownMenuSeparator />
            <button
              onClick={() => onChange({ filter: { areas: [], projectIds: [], priorities: [], tags: [], goalIds: [], dueRange: "any" } })}
              className="flex w-full items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" /> Clear all
            </button>
          </>}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            <ArrowUpDown className="h-3.5 w-3.5" /> Sort: {SORT_LABEL[prefs.sort]}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          {(Object.keys(SORT_LABEL) as SortMode[]).map(k => (
            <DropdownMenuCheckboxItem key={k} checked={prefs.sort === k} onCheckedChange={() => onChange({ sort: k })}>
              {SORT_LABEL[k]}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Direction</DropdownMenuLabel>
          <DropdownMenuCheckboxItem checked={(prefs.sortDir ?? "asc") === "asc"} onCheckedChange={() => onChange({ sortDir: "asc" })}>
            <ArrowUp className="mr-1 h-3 w-3" /> Ascending
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={prefs.sortDir === "desc"} onCheckedChange={() => onChange({ sortDir: "desc" })}>
            <ArrowDown className="mr-1 h-3 w-3" /> Descending
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}