/**
 * Runs a saved view (or an ad-hoc filter) against live data and renders the
 * matching rows. Used by the planner and by `/query` blocks embedded in notes —
 * results stay current because they read the live stores, never a snapshot.
 *
 * Three sources are supported: regular tasks, cleaning tasks, and caregiving
 * chores. Every row is editable in place: titles edit inline, due dates open a
 * calendar, area/priority/energy/zone/cadence open choice dropdowns, and
 * supertag typed fields render with the same controls as the planner table.
 *
 * Layouts: list, table, and board (grouped columns).
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Check, ListFilter } from "lucide-react";
import { useStore } from "@/lib/store";
import { matchesTaskFilter, EMPTY_WEEK_FILTERS, type WeekFilterState } from "@/lib/planner/week-filters";
import { AREA_ICONS } from "@/lib/area-icons";
import { useTags } from "@/hooks/use-tags";
import { matchTags } from "@/lib/supertag";
import { listTagFields, useItemFieldValues, type TagField } from "@/lib/tag-fields";
import { caregivingChores, useCaregivingChores, CHORE_CADENCES } from "@/lib/caregiving-chores";
import { FieldCell } from "@/components/planner/FieldCell";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type RunnerLayout = "list" | "table" | "board";
export type RunnerSort = "due" | "created" | "priority" | "title" | "area";
export type RunnerSource = "tasks" | "cleaning" | "caregiving";

export const RUNNER_SOURCES = ["tasks", "cleaning", "caregiving"] as const;
export const RUNNER_SOURCE_LABEL: Record<RunnerSource, string> = {
  tasks: "Tasks",
  cleaning: "Cleaning tasks",
  caregiving: "Caretaking tasks",
};

export const RUNNER_COLUMNS = ["due", "area", "priority", "energy", "zone", "cadence", "tags", "fields"] as const;
export type RunnerColumn = typeof RUNNER_COLUMNS[number];

export const RUNNER_COLUMN_LABEL: Record<RunnerColumn, string> = {
  due: "Due", area: "Area", priority: "Priority", energy: "Energy",
  zone: "Zone", cadence: "Cadence", tags: "Tags", fields: "Tag fields",
};

export const RUNNER_SORT_LABEL: Record<RunnerSort, string> = {
  due: "Due date", created: "Newest", priority: "Priority", title: "Title", area: "Area",
};

export type RunnerGroup = "none" | "area" | "priority" | "energy" | "zone" | "cadence" | "status";
export const RUNNER_GROUPS = ["none", "area", "priority", "energy", "zone", "cadence", "status"] as const;
export const RUNNER_GROUP_LABEL: Record<RunnerGroup, string> = {
  none: "No grouping", area: "Area", priority: "Priority", energy: "Energy",
  zone: "Zone", cadence: "Cadence", status: "Status",
};

export const DEFAULT_RUNNER_COLUMNS: RunnerColumn[] = ["due", "area", "priority"];

/** Columns that make sense for each source (settings UIs can use this). */
export function columnsForSource(source: RunnerSource): RunnerColumn[] {
  if (source === "cleaning") return ["zone", "cadence"];
  if (source === "caregiving") return ["zone", "cadence", "area"];
  return ["due", "area", "priority", "energy", "tags", "fields"];
}

const AREAS = Object.keys(AREA_ICONS) as string[];
const PRIORITIES = ["high", "medium", "low"];
const ENERGIES = ["high", "medium", "low"];
const CLEANING_ZONES = ["Kitchen", "Bathroom", "Bedrooms", "Living", "Laundry", "Entryway", "Outdoor", "Whole home"];
const CLEANING_CADENCES = ["daily", "weekly", "monthly", "seasonal"];
const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/** One normalized, editable row regardless of where it came from. */
interface RunnerRow {
  id: string;
  kind: RunnerSource;
  title: string;
  done: boolean;
  dueDate?: string;
  area?: string;
  priority?: string;
  energy?: string;
  zone?: string;
  cadence?: string;
  tags: string[];
  createdAt?: string;
  href?: string;
  onToggle: () => void;
  onPatch: (patch: Record<string, unknown>) => void;
}

export function SavedViewRunner({
  filters,
  layout = "list",
  limit = 25,
  sort = "due",
  columns = DEFAULT_RUNNER_COLUMNS,
  source = "tasks",
  group = "none",
  emptyLabel = "Nothing matches this view.",
}: {
  filters: Partial<WeekFilterState>;
  layout?: RunnerLayout;
  limit?: number;
  sort?: RunnerSort;
  columns?: RunnerColumn[];
  source?: RunnerSource;
  group?: RunnerGroup;
  emptyLabel?: string;
}) {
  const { state, updateTask, updateCleaning, toggleCleaning } = useStore() as any;
  const chores = useCaregivingChores();
  const f: WeekFilterState = useMemo(() => ({ ...EMPTY_WEEK_FILTERS, ...filters }), [filters]);

  const rows = useMemo<RunnerRow[]>(() => {
    let list: RunnerRow[] = [];
    const search = (f.search ?? "").trim().toLowerCase();
    const hideDone = f.hideDone !== false;

    if (source === "tasks") {
      list = (state.tasks ?? [])
        .filter((t: any) => !t.deletedAt && matchesTaskFilter(t, f))
        .map((t: any): RunnerRow => ({
          id: t.id,
          kind: "tasks",
          title: t.title,
          done: !!t.done,
          dueDate: t.dueDate,
          area: t.area,
          priority: t.priority,
          energy: t.energy,
          tags: t.tags ?? [],
          createdAt: t.createdAt,
          href: `/anytime?task=${t.id}`,
          onToggle: () => updateTask(t.id, { done: !t.done }),
          onPatch: patch => updateTask(t.id, patch),
        }));
    } else if (source === "cleaning") {
      list = (state.cleaning ?? [])
        .filter((c: any) => (!hideDone || !c.done) && (!search || c.title.toLowerCase().includes(search)))
        .map((c: any): RunnerRow => ({
          id: c.id,
          kind: "cleaning",
          title: c.title,
          done: !!c.done,
          zone: c.zone,
          cadence: c.cadence,
          area: "Home",
          tags: [],
          href: "/home-areas",
          onToggle: () => void toggleCleaning?.(c.id),
          onPatch: patch => void updateCleaning?.(c.id, patch),
        }));
    } else {
      list = chores
        .filter(c => (!hideDone || !c.done) && (!search || c.title.toLowerCase().includes(search)))
        .map((c): RunnerRow => ({
          id: c.id,
          kind: "caregiving",
          title: c.title,
          done: c.done,
          zone: c.zone ?? undefined,
          cadence: c.cadence,
          area: c.area ?? "Caregiving",
          tags: [],
          href: "/care-rhythm",
          onToggle: () => void caregivingChores.toggle(c.id),
          onPatch: patch => void caregivingChores.update(c.id, patch as any),
        }));
    }

    const cmp = (a: RunnerRow, b: RunnerRow) => {
      switch (sort) {
        case "created": return String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""));
        case "priority": return (PRIORITY_RANK[a.priority ?? ""] ?? 3) - (PRIORITY_RANK[b.priority ?? ""] ?? 3);
        case "title": return a.title.localeCompare(b.title);
        case "area": return String(a.area ?? "").localeCompare(String(b.area ?? ""));
        default: return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
      }
    };
    return list.slice().sort(cmp).slice(0, limit);
  }, [state.tasks, state.cleaning, chores, f, limit, sort, source, updateTask, updateCleaning, toggleCleaning]);

  if (rows.length === 0) {
    return <p className="px-3 py-4 text-[12px] text-muted-foreground">{emptyLabel}</p>;
  }

  const has = (c: RunnerColumn) => columns.includes(c);

  const cellFor = (row: RunnerRow, c: RunnerColumn) => {
    switch (c) {
      case "due":
        return row.kind === "tasks"
          ? <DueCell value={row.dueDate} onSave={v => row.onPatch({ dueDate: v ?? undefined })} />
          : <span className="text-muted-foreground">—</span>;
      case "area":
        return <ChoiceCell value={row.area} options={AREAS} onSave={v => row.onPatch({ area: v })} label="area" />;
      case "priority":
        return row.kind === "tasks"
          ? <ChoiceCell value={row.priority} options={PRIORITIES} onSave={v => row.onPatch({ priority: v })} label="priority" />
          : <span className="text-muted-foreground">—</span>;
      case "energy":
        return row.kind === "tasks"
          ? <ChoiceCell value={row.energy} options={ENERGIES} onSave={v => row.onPatch({ energy: v ?? undefined })} label="energy" clearable />
          : <span className="text-muted-foreground">—</span>;
      case "zone":
        return row.kind === "tasks"
          ? <span className="text-muted-foreground">—</span>
          : <ChoiceCell value={row.zone} options={CLEANING_ZONES} onSave={v => row.onPatch({ zone: v })} label="zone" clearable={row.kind === "caregiving"} />;
      case "cadence":
        return row.kind === "tasks"
          ? <span className="text-muted-foreground">—</span>
          : <ChoiceCell
              value={row.cadence}
              options={row.kind === "cleaning" ? CLEANING_CADENCES : (CHORE_CADENCES as unknown as string[])}
              onSave={v => row.onPatch({ cadence: v })}
              label="cadence"
            />;
      case "tags":
        return <span className="text-[11px] text-muted-foreground">{row.tags.length ? row.tags.join(", ") : "—"}</span>;
      case "fields":
        return row.kind === "tasks"
          ? <TaskFieldCells taskId={row.id} tags={row.tags} />
          : <span className="text-muted-foreground">—</span>;
      default:
        return null;
    }
  };

  /* ---------------- Board ---------------- */
  if (layout === "board") {
    const key = (r: RunnerRow) => {
      switch (group) {
        case "area": return r.area || "No area";
        case "priority": return r.priority || "No priority";
        case "energy": return r.energy || "No energy";
        case "zone": return r.zone || "No zone";
        case "cadence": return r.cadence || "No cadence";
        case "status": return r.done ? "Done" : "Open";
        default: return r.kind === "tasks" ? (r.area || "No area") : (r.zone || "No zone");
      }
    };
    const groups = new Map<string, RunnerRow[]>();
    for (const r of rows) {
      const k = key(r);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(r);
    }
    return (
      <div className="flex gap-3 overflow-x-auto p-3">
        {[...groups.entries()].map(([name, items]) => (
          <div key={name} className="min-w-[13rem] max-w-[15rem] flex-1 rounded-xl border border-border/50 bg-muted/20 p-2">
            <div className="mb-2 flex items-center gap-2 px-1">
              <span className="truncate text-[11px] font-semibold capitalize">{name}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">{items.length}</span>
            </div>
            <ul className="space-y-1.5">
              {items.map(r => (
                <li key={r.id} className={cn("rounded-lg border border-border/50 bg-card p-2", r.done && "opacity-55")}>
                  <RowTitle row={r} />
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                    {columns.filter(c => c !== "fields").map(c => (
                      <span key={c} className="min-w-0 max-w-full">{cellFor(r, c)}</span>
                    ))}
                  </div>
                  {has("fields") && r.kind === "tasks" && (
                    <div className="mt-1"><TaskFieldCells taskId={r.id} tags={r.tags} /></div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  /* ---------------- Table ---------------- */
  if (layout === "table") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-1.5 text-left">Task</th>
              {columns.map(c => (
                <th key={c} scope="col" className="px-3 py-1.5 text-left">{RUNNER_COLUMN_LABEL[c]}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {rows.map(r => (
              <tr key={r.id} className={cn(r.done && "opacity-55")}>
                <td className="px-3 py-1.5"><RowTitle row={r} /></td>
                {columns.map(c => (
                  <td key={c} className="px-3 py-1.5">{cellFor(r, c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  /* ---------------- List ---------------- */
  return (
    <ul className="divide-y divide-border/30">
      {rows.map(r => (
        <li key={r.id} className={cn("flex flex-wrap items-center gap-2 px-3 py-1.5 text-[13px]", r.done && "opacity-55")}>
          <RowTitle row={r} />
          <span className="ml-auto flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
            {columns.filter(c => c !== "fields" && c !== "tags").map(c => (
              <span key={c} className="min-w-0">{cellFor(r, c)}</span>
            ))}
          </span>
          {has("fields") && r.kind === "tasks" && (
            <span className="w-full pl-6"><TaskFieldCells taskId={r.id} tags={r.tags} /></span>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/*  Editable cells                                                     */
/* ------------------------------------------------------------------ */

const CELL =
  "-mx-1 flex max-w-full items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50";

function ChoiceCell({ value, options, onSave, label, clearable }: {
  value?: string;
  options: string[];
  onSave: (v: string | null) => void;
  label: string;
  clearable?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Choose ${label}`}
          onClick={e => e.stopPropagation()}
          className={cn(CELL, !value && "text-muted-foreground")}
        >
          <span className="truncate capitalize">{value || "—"}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44" onClick={e => e.stopPropagation()}>
        {options.map(o => (
          <DropdownMenuItem key={o} onClick={() => onSave(o)} className="text-xs capitalize">
            <Check className={cn("mr-2 h-3 w-3", value === o ? "opacity-100" : "opacity-0")} />
            {o}
          </DropdownMenuItem>
        ))}
        {clearable && value && (
          <DropdownMenuItem onClick={() => onSave(null)} className="text-xs text-muted-foreground">Clear</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DueCell({ value, onSave }: { value?: string; onSave: (iso: string | null) => void }) {
  const pretty = value ? format(new Date(`${value}T12:00:00`), "MMM d") : "—";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Pick due date"
          onClick={e => e.stopPropagation()}
          className={cn(CELL, !value && "text-muted-foreground")}
        >
          <span className="truncate">{pretty}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0" onClick={e => e.stopPropagation()}>
        <Calendar
          mode="single"
          selected={value ? new Date(`${value}T12:00:00`) : undefined}
          onSelect={d => onSave(d ? format(d, "yyyy-MM-dd") : null)}
          initialFocus
        />
        {value && (
          <button
            type="button"
            onClick={() => onSave(null)}
            className="w-full border-t border-border/60 px-3 py-2 text-left text-[11px] text-muted-foreground hover:bg-muted/60"
          >
            Clear date
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Typed supertag fields for one task, editable inline. */
function TaskFieldCells({ taskId, tags }: { taskId: string; tags: string[] }) {
  const { tags: allTags } = useTags();
  const [fields, setFields] = useState<TagField[]>([]);
  const { values, save } = useItemFieldValues("task", taskId);

  const matched = useMemo(() => matchTags(allTags, tags), [allTags, tags]);
  const tagIds = useMemo(() => matched.map(t => t.id).sort().join(","), [matched]);

  useEffect(() => {
    let alive = true;
    if (!tagIds) { setFields([]); return; }
    void listTagFields(tagIds.split(","))
      .then(f => { if (alive) setFields(f); })
      .catch(() => { if (alive) setFields([]); });
    return () => { alive = false; };
  }, [tagIds]);

  if (!fields.length) return <span className="text-[11px] text-muted-foreground">—</span>;

  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {fields.map(f => (
        <span key={f.id} className="flex min-w-[7rem] items-center gap-1 text-[11px]">
          <span className="shrink-0 text-muted-foreground">{f.label}</span>
          <FieldCell
            field={f}
            value={values[`${f.tagId}:${f.key}`]}
            onSave={v => void save(f.tagId, f.key, v)}
          />
        </span>
      ))}
    </span>
  );
}

/** Checkbox + inline-editable title. */
function RowTitle({ row }: { row: RunnerRow }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(row.title);

  useEffect(() => { setDraft(row.title); }, [row.title]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== row.title) row.onPatch({ title: next });
    else setDraft(row.title);
  };

  return (
    <span className="flex min-w-0 items-center gap-2">
      <button
        type="button"
        role="checkbox"
        aria-checked={row.done}
        aria-label={row.done ? `Mark ${row.title} not done` : `Complete ${row.title}`}
        onClick={row.onToggle}
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border",
          row.done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40 hover:border-muted-foreground/70",
        )}
      >
        {row.done && <Check className="h-3 w-3" />}
      </button>

      {editing ? (
        <input
          autoFocus
          aria-label="Edit title"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            e.stopPropagation();
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setDraft(row.title); setEditing(false); }
          }}
          className="min-w-0 flex-1 rounded border border-border/60 bg-background px-1 py-0.5 text-[12.5px]"
        />
      ) : (
        <span className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Rename ${row.title}`}
            className={cn("min-w-0 truncate text-left hover:underline", row.done && "line-through")}
          >
            {row.title}
          </button>
          {row.href && (
            <Link
              to={row.href}
              aria-label={`Open ${row.title}`}
              className="shrink-0 text-[10px] text-muted-foreground hover:text-foreground"
            >
              ↗
            </Link>
          )}
        </span>
      )}
    </span>
  );
}

/** Small header describing what a runner is showing. */
export function RunnerHeader({ name, count, right }: { name: string; count?: number; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b border-border/60 px-3 py-1.5">
      <ListFilter className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      <span className="text-[12px] font-semibold">{name}</span>
      {count !== undefined && <span className="text-[11px] text-muted-foreground">{count}</span>}
      <span className="ml-auto flex items-center gap-1">{right}</span>
    </div>
  );
}
