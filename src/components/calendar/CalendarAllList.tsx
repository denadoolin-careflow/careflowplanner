import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ChevronDown, ChevronRight, Pencil, Trash2, CalendarIcon, CheckSquare, CalendarClock, Filter, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Task, Appointment } from "@/lib/types";
import { toast } from "sonner";

type Kind = "task" | "appt";
type Row = {
  id: string;
  kind: Kind;
  title: string;
  date?: string;
  time?: string;
  area?: string;
  projectId?: string;
  projectName?: string;
  done?: boolean;
  raw: Task | Appointment;
};

type GroupBy = "area" | "project" | "date" | "none";

const GROUP_KEY = "calendar-all-groupby";

interface Props {
  onEditTask: (id: string) => void;
  onEditAppointment: (id: string) => void;
}

/**
 * Full unified list of every task + appointment across all time.
 * Supports multi-select, inline actions, quick reschedule, and
 * collapsible grouping by Area / Project / Date.
 */
export function CalendarAllList({ onEditTask, onEditAppointment }: Props) {
  const { state, deleteTask, deleteAppointment, updateTask, updateAppointment } = useStore();

  const [groupBy, setGroupBy] = useState<GroupBy>(() => {
    if (typeof localStorage === "undefined") return "date";
    return ((localStorage.getItem(GROUP_KEY) as GroupBy) ?? "date");
  });
  const changeGroup = (g: GroupBy) => {
    setGroupBy(g);
    try { localStorage.setItem(GROUP_KEY, g); } catch {}
  };

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<{ kind: "single" | "bulk"; row?: Row } | null>(null);
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  const rows = useMemo<Row[]>(() => {
    const projById = new Map((state.projects ?? []).map(p => [p.id, p.name]));
    const tasks: Row[] = (state.tasks ?? [])
      .filter(t => !t.parentTaskId)
      .map(t => ({
        id: `task:${t.id}`,
        kind: "task",
        title: t.title,
        date: t.dueDate,
        time: t.startTime,
        area: t.area,
        projectId: t.projectId,
        projectName: t.projectId ? projById.get(t.projectId) : undefined,
        done: t.done,
        raw: t,
      }));
    const appts: Row[] = (state.appointments ?? []).map(a => ({
      id: `appt:${a.id}`,
      kind: "appt",
      title: a.title,
      date: a.date,
      time: a.time,
      area: a.areaName,
      projectId: a.projectId,
      projectName: a.projectId ? projById.get(a.projectId) : undefined,
      raw: a,
    }));
    return [...tasks, ...appts];
  }, [state.tasks, state.appointments, state.projects]);

  const areaOptions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach(r => r.area && s.add(r.area));
    return Array.from(s).sort();
  }, [rows]);
  const projectOptions = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach(r => { if (r.projectId && r.projectName) m.set(r.projectId, r.projectName); });
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filteredRows = useMemo(() => rows.filter(r => {
    if (areaFilter !== "all" && (r.area ?? "") !== areaFilter) return false;
    if (projectFilter !== "all" && (r.projectId ?? "") !== projectFilter) return false;
    return true;
  }), [rows, areaFilter, projectFilter]);

  const groups = useMemo(() => {
    const map = new Map<string, Row[]>();
    const keyFor = (r: Row): string => {
      if (groupBy === "area") return r.area ?? "No area";
      if (groupBy === "project") return r.projectName ?? "No project";
      if (groupBy === "date") return r.date ?? "No date";
      return "All";
    };
    for (const r of filteredRows) {
      const k = keyFor(r);
      const arr = map.get(k) ?? [];
      arr.push(r);
      map.set(k, arr);
    }
    // Sort rows within each group by date+time
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999") || (a.time ?? "").localeCompare(b.time ?? ""));
    }
    // Sort groups
    const entries = Array.from(map.entries());
    if (groupBy === "date") {
      entries.sort(([a], [b]) => a.localeCompare(b));
    } else {
      entries.sort(([a], [b]) => a.localeCompare(b));
    }
    return entries;
  }, [filteredRows, groupBy]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleGroupSelect = (rows: Row[]) => {
    setSelected(prev => {
      const next = new Set(prev);
      const allIn = rows.every(r => next.has(r.id));
      for (const r of rows) allIn ? next.delete(r.id) : next.add(r.id);
      return next;
    });
  };
  const toggleCollapse = (k: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  };

  const reschedule = async (row: Row, iso: string) => {
    if (row.kind === "task") await updateTask((row.raw as Task).id, { dueDate: iso } as any);
    else await updateAppointment((row.raw as Appointment).id, { date: iso } as any);
    toast.success(`Rescheduled to ${format(parseISO(iso), "MMM d")}`);
  };

  const doDelete = async (row: Row) => {
    if (row.kind === "task") await deleteTask((row.raw as Task).id);
    else await deleteAppointment((row.raw as Appointment).id);
    setSelected(prev => { const n = new Set(prev); n.delete(row.id); return n; });
  };

  const doBulkDelete = async () => {
    const targets = rows.filter(r => selected.has(r.id));
    for (const r of targets) await doDelete(r);
    toast.success(`Deleted ${targets.length}`);
    setSelected(new Set());
  };

  const openEditor = (row: Row) => {
    if (row.kind === "task") onEditTask((row.raw as Task).id);
    else onEditAppointment((row.raw as Appointment).id);
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-full bg-muted/60 p-0.5 text-xs">
            <span className="px-2 text-muted-foreground">Group by</span>
            {(["area", "project", "date", "none"] as GroupBy[]).map(g => (
              <button
                key={g}
                type="button"
                onClick={() => changeGroup(g)}
                className={cn(
                  "rounded-full px-2.5 py-1 font-medium capitalize transition-colors",
                  groupBy === g ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="h-7 w-[130px] text-xs"><SelectValue placeholder="Area" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All areas</SelectItem>
                {areaOptions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="h-7 w-[150px] text-xs"><SelectValue placeholder="Project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projectOptions.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
            {(areaFilter !== "all" || projectFilter !== "all") && (
              <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={() => { setAreaFilter("all"); setProjectFilter("all"); }}>
                <X className="h-3 w-3" /> Clear
              </Button>
            )}
          </div>
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">{selected.size} selected</span>
            <Button size="sm" variant="outline" className="h-7" onClick={() => setSelected(new Set())}>Clear</Button>
            <Button size="sm" variant="destructive" className="h-7 gap-1.5" onClick={() => setConfirm({ kind: "bulk" })}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        )}
      </div>

      {/* Groups */}
      <div className="space-y-3">
        {groups.length === 0 && (
          <p className="rounded-lg border border-dashed border-border/60 py-6 text-center text-sm text-muted-foreground">
            No tasks or appointments yet.
          </p>
        )}
        {groups.map(([key, list]) => {
          const isCollapsed = collapsed.has(key);
          const allSelected = list.length > 0 && list.every(r => selected.has(r.id));
          const label = groupBy === "date" && key !== "No date"
            ? format(parseISO(key), "EEE, MMM d, yyyy")
            : key;
          return (
            <div key={key} className="overflow-hidden rounded-xl border border-border/50 bg-card/40">
              <button
                type="button"
                onClick={() => toggleCollapse(key)}
                className="flex w-full items-center gap-2 border-b border-border/40 bg-muted/30 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/50"
              >
                {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                <span onClick={(e) => { e.stopPropagation(); toggleGroupSelect(list); }} className="mr-1 inline-flex">
                  <Checkbox checked={allSelected} aria-label={`Select all in ${label}`} />
                </span>
                <span className="flex-1 truncate normal-case tracking-normal text-foreground">{label}</span>
                <span className="text-[10px] text-muted-foreground">{list.length}</span>
              </button>
              {!isCollapsed && (
                <ul className="divide-y divide-border/40">
                  {list.map(row => (
                    <RowItem
                      key={row.id}
                      row={row}
                      selected={selected.has(row.id)}
                      onToggleSelect={() => toggleSelect(row.id)}
                      onEdit={() => openEditor(row)}
                      onDelete={() => setConfirm({ kind: "single", row })}
                      onReschedule={(iso) => reschedule(row, iso)}
                    />
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "bulk"
                ? `Delete ${selected.size} item${selected.size === 1 ? "" : "s"}?`
                : `Delete "${confirm?.row?.title}"?`}
            </AlertDialogTitle>
            <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirm?.kind === "bulk") await doBulkDelete();
                else if (confirm?.row) { await doDelete(confirm.row); toast.success("Deleted"); }
                setConfirm(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RowItem({
  row, selected, onToggleSelect, onEdit, onDelete, onReschedule,
}: {
  row: Row;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReschedule: (iso: string) => void;
}) {
  const [dateOpen, setDateOpen] = useState(false);
  const Icon = row.kind === "task" ? CheckSquare : CalendarClock;
  return (
    <li
      className={cn(
        "group flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted/40",
        selected && "bg-primary/5",
      )}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={onToggleSelect}
        aria-label={`Select ${row.title}`}
        className="shrink-0"
      />
      <Icon className={cn("h-3.5 w-3.5 shrink-0", row.kind === "task" ? "text-emerald-600" : "text-sky-600")} />
      <button
        type="button"
        onClick={onEdit}
        className={cn(
          "min-w-0 flex-1 truncate text-left",
          row.done && "text-muted-foreground line-through",
        )}
      >
        {row.title}
      </button>
      <div className="hidden shrink-0 items-center gap-2 text-xs text-muted-foreground sm:flex">
        {row.date && <span className="tabular-nums">{format(parseISO(row.date), "MMM d")}{row.time ? ` · ${row.time.slice(0, 5)}` : ""}</span>}
        {row.area && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{row.area}</span>}
        {row.projectName && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{row.projectName}</span>}
      </div>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7" title="Reschedule">
              <CalendarIcon className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={row.date ? parseISO(row.date) : undefined}
              onSelect={(d) => {
                if (d) { onReschedule(format(d, "yyyy-MM-dd")); setDateOpen(false); }
              }}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit} title="Edit">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onDelete} title="Delete">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}