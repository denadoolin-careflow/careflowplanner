import { useMemo, useState } from "react";
import { useStore, todayISO } from "@/lib/store";
import { KanbanCard, type KanbanColorBy } from "@/components/tasks/KanbanBoard";
import type { Task, ProjectSection, Priority, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { addDays, format, parseISO, isPast, isToday, isTomorrow, isThisWeek } from "date-fns";
import { haptics } from "@/lib/haptics";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type ProjectKanbanGroup =
  | "section" | "status" | "priority" | "due" | "tag" | "energy";

type Col = {
  key: string;
  label: string;
  accent: string;
  match: (t: Task) => boolean;
  /** Patch applied when a task is dropped into this column. */
  onDrop: (t: Task) => Partial<Task>;
  /** Defaults to apply when quick-adding a task into this column. */
  defaults: () => Partial<Task>;
};

const NO = "__none__";

function dueKey(d?: string): string {
  if (!d) return "no_date";
  try {
    const dt = parseISO(d);
    if (isToday(dt)) return "today";
    if (isTomorrow(dt)) return "tomorrow";
    if (isPast(dt)) return "overdue";
    if (isThisWeek(dt, { weekStartsOn: 1 })) return "week";
    return "later";
  } catch { return "no_date"; }
}

const DUE_COLS: { key: string; label: string; accent: string; date: () => string | undefined }[] = [
  { key: "overdue",  label: "Overdue",   accent: "bg-destructive/15", date: () => todayISO() },
  { key: "today",    label: "Today",     accent: "bg-primary/10",     date: () => todayISO() },
  { key: "tomorrow", label: "Tomorrow",  accent: "bg-accent/15",      date: () => format(addDays(new Date(), 1), "yyyy-MM-dd") },
  { key: "week",     label: "This Week", accent: "bg-secondary-soft", date: () => format(addDays(new Date(), 3), "yyyy-MM-dd") },
  { key: "later",    label: "Later",     accent: "bg-muted/60",       date: () => format(addDays(new Date(), 7), "yyyy-MM-dd") },
  { key: "no_date",  label: "No date",   accent: "bg-muted/40",       date: () => undefined },
];

const STATUS_COLS: { key: TaskStatus; label: string; accent: string }[] = [
  { key: "active",    label: "Active",    accent: "bg-primary/10" },
  { key: "this_week", label: "This Week", accent: "bg-accent/15" },
  { key: "waiting",   label: "Waiting",   accent: "bg-secondary-soft" },
  { key: "someday",   label: "Someday",   accent: "bg-muted/60" },
  { key: "done",      label: "Done",      accent: "bg-warm-soft" },
];

const PRIORITY_COLS: { key: Priority | "none"; label: string; accent: string }[] = [
  { key: "high",   label: "High",   accent: "bg-destructive/15" },
  { key: "medium", label: "Medium", accent: "bg-accent/15" },
  { key: "low",    label: "Low",    accent: "bg-secondary-soft" },
  { key: "none",   label: "None",   accent: "bg-muted/60" },
];

const ENERGY_COLS: { key: "high" | "medium" | "low" | "none"; label: string; accent: string }[] = [
  { key: "high",   label: "High energy",   accent: "bg-primary/10" },
  { key: "medium", label: "Medium energy", accent: "bg-accent/15" },
  { key: "low",    label: "Low energy",    accent: "bg-secondary-soft" },
  { key: "none",   label: "No energy",     accent: "bg-muted/60" },
];

function buildColumns(
  group: ProjectKanbanGroup,
  tasks: Task[],
  sections: ProjectSection[],
  sectionId: string,
): Col[] {
  if (group === "section") {
    const cols: Col[] = sections.map(s => ({
      key: s.id,
      label: s.name,
      accent: "bg-card/50",
      match: t => t.sectionId === s.id,
      onDrop: () => ({ sectionId: s.id }),
      defaults: () => ({ sectionId: s.id }),
    }));
    cols.unshift({
      key: NO,
      label: "No section",
      accent: "bg-muted/40",
      match: t => !t.sectionId,
      onDrop: () => ({ sectionId: undefined as any }),
      defaults: () => ({ sectionId: undefined as any }),
    });
    return cols;
  }
  if (group === "status") {
    return STATUS_COLS.map(s => ({
      key: s.key,
      label: s.label,
      accent: s.accent,
      match: t => (t.status ?? "active") === s.key && (s.key === "done" ? t.done : !t.done),
      onDrop: () => ({ status: s.key, done: s.key === "done", lastCompletedAt: s.key === "done" ? new Date().toISOString() : undefined }),
      defaults: () => ({ status: s.key, done: s.key === "done" }),
    }));
  }
  if (group === "priority") {
    return PRIORITY_COLS.map(p => ({
      key: p.key,
      label: p.label,
      accent: p.accent,
      match: t => (t.priority ?? "medium") === (p.key === "none" ? "medium" : p.key) && (p.key === "none" ? !t.priority : true),
      onDrop: () => ({ priority: p.key === "none" ? undefined as any : (p.key as Priority) }),
      defaults: () => ({ priority: p.key === "none" ? undefined as any : (p.key as Priority) }),
    }));
  }
  if (group === "due") {
    return DUE_COLS.map(d => ({
      key: d.key,
      label: d.label,
      accent: d.accent,
      match: t => dueKey(t.dueDate) === d.key,
      onDrop: () => ({ dueDate: d.date() }),
      defaults: () => ({ dueDate: d.date() }),
    }));
  }
  if (group === "energy") {
    return ENERGY_COLS.map(e => ({
      key: e.key,
      label: e.label,
      accent: e.accent,
      match: t => (t.energy ?? "none") === e.key,
      onDrop: () => ({ energy: e.key === "none" ? undefined as any : (e.key as any) }),
      defaults: () => ({ energy: e.key === "none" ? undefined as any : (e.key as any) }),
    }));
  }
  // tag
  const set = new Set<string>();
  for (const t of tasks) (t.tags ?? []).forEach(tg => set.add(tg));
  const cols: Col[] = Array.from(set).sort().map(tg => ({
    key: `tag:${tg}`,
    label: `#${tg}`,
    accent: "bg-card/50",
    match: t => (t.tags ?? []).includes(tg),
    onDrop: t => ({ tags: Array.from(new Set([...(t.tags ?? []), tg])) }),
    defaults: () => ({ tags: [tg] }),
  }));
  cols.push({
    key: NO,
    label: "No tag",
    accent: "bg-muted/40",
    match: t => !(t.tags ?? []).length,
    onDrop: () => ({ tags: [] }),
    defaults: () => ({ tags: [] }),
  });
  return cols;
}

const GROUP_LABEL: Record<ProjectKanbanGroup, string> = {
  section: "Section", status: "Status", priority: "Priority",
  due: "Due date", tag: "Tag", energy: "Energy",
};

export function ProjectKanbanGroupSelect({
  value, onChange,
}: { value: ProjectKanbanGroup; onChange: (v: ProjectKanbanGroup) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ProjectKanbanGroup)}>
      <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        {(["section","status","priority","due","tag","energy"] as ProjectKanbanGroup[]).map(g => (
          <SelectItem key={g} value={g}>Group: {GROUP_LABEL[g]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ProjectKanbanBoard({
  tasks, projectId, group, colorBy = "area",
}: {
  tasks: Task[];
  projectId: string;
  group: ProjectKanbanGroup;
  colorBy?: KanbanColorBy;
}) {
  const { state, updateTask, addTask } = useStore();
  const [hover, setHover] = useState<string | null>(null);

  const sections = useMemo(
    () => (state.projectSections ?? [])
      .filter(s => s.projectId === projectId)
      .sort((a, b) => a.sortOrder - b.sortOrder),
    [state.projectSections, projectId],
  );

  const columns = useMemo(() => {
    const cols = buildColumns(group, tasks, sections, projectId);
    return cols.map(c => ({ ...c, items: tasks.filter(c.match) }));
  }, [group, tasks, sections, projectId]);

  const project = state.projects?.find(p => p.id === projectId);

  const onDrop = async (e: React.DragEvent, col: Col) => {
    e.preventDefault();
    setHover(null);
    const id = e.dataTransfer.getData("application/x-careflow-task");
    if (!id) return;
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    haptics.snap?.();
    await updateTask(id, col.onDrop(t));
    toast(`Moved to ${col.label}`);
  };

  if (columns.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-10 text-center text-sm text-muted-foreground">
        {group === "tag" ? "No tags yet. Add tags to tasks to populate the board." :
         group === "section" ? "No sections yet. Add one to start grouping." :
         "No columns to display."}
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
      {columns.map(col => (
        <div
          key={col.key}
          onDragOver={(e) => {
            if (!Array.from(e.dataTransfer.types).includes("application/x-careflow-task")) return;
            e.preventDefault(); e.dataTransfer.dropEffect = "move"; setHover(col.key);
          }}
          onDragLeave={() => setHover(p => p === col.key ? null : p)}
          onDrop={(e) => onDrop(e, col)}
          className={cn(
            "flex w-72 shrink-0 flex-col rounded-2xl border border-border/60 bg-card/60 p-2 snap-start transition-colors",
            hover === col.key && "ring-2 ring-primary bg-primary/5",
          )}
        >
          <div className={cn("mb-2 flex items-center justify-between rounded-lg px-2 py-1.5", col.accent)}>
            <span className="text-xs font-semibold uppercase tracking-wider truncate">{col.label}</span>
            <span className="text-[11px] text-muted-foreground">{col.items.length}</span>
          </div>
          <div className="flex-1 space-y-1 min-h-32">
            {col.items.map(t => <KanbanCard key={t.id} task={t} colorBy={colorBy} />)}
          </div>
          <QuickAdd
            label={col.label}
            onAdd={async (title) => {
              await addTask({
                title,
                area: (project?.areaName as any) ?? "Personal",
                projectId,
                ...col.defaults(),
              } as any);
            }}
          />
        </div>
      ))}
    </div>
  );
}

function QuickAdd({ label, onAdd }: { label: string; onAdd: (title: string) => Promise<void> }) {
  const [v, setV] = useState("");
  return (
    <div className="mt-2 flex items-center gap-1 rounded-lg border border-dashed border-border/60 px-2 py-1.5">
      <Plus className="h-3.5 w-3.5 text-muted-foreground" />
      <input
        value={v}
        onChange={e => setV(e.target.value)}
        onKeyDown={async (e) => { if (e.key === "Enter" && v.trim()) { await onAdd(v.trim()); setV(""); } }}
        placeholder={`Add to ${label.toLowerCase()}…`}
        className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
      />
    </div>
  );
}