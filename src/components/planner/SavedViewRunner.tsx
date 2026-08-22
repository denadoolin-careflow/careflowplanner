/**
 * Runs a saved view (or an ad-hoc filter) against the live task store and
 * renders the matching tasks. Used by the planner and by `/query` blocks
 * embedded in notes — the results stay current because they read the store,
 * never a snapshot.
 *
 * Cells are editable in place: due dates open a calendar, area/priority/energy
 * open choice dropdowns, and supertag typed fields render with the same
 * controls as the planner table.
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
import { FieldCell } from "@/components/planner/FieldCell";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type RunnerLayout = "list" | "table";
export type RunnerSort = "due" | "created" | "priority" | "title" | "area";

export const RUNNER_COLUMNS = ["due", "area", "priority", "energy", "tags", "fields"] as const;
export type RunnerColumn = typeof RUNNER_COLUMNS[number];

export const RUNNER_COLUMN_LABEL: Record<RunnerColumn, string> = {
  due: "Due", area: "Area", priority: "Priority", energy: "Energy", tags: "Tags", fields: "Tag fields",
};

export const RUNNER_SORT_LABEL: Record<RunnerSort, string> = {
  due: "Due date", created: "Newest", priority: "Priority", title: "Title", area: "Area",
};

export const DEFAULT_RUNNER_COLUMNS: RunnerColumn[] = ["due", "area", "priority"];

const AREAS = Object.keys(AREA_ICONS) as string[];
const PRIORITIES = ["high", "medium", "low"];
const ENERGIES = ["high", "medium", "low"];
const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

export function SavedViewRunner({
  filters,
  layout = "list",
  limit = 25,
  sort = "due",
  columns = DEFAULT_RUNNER_COLUMNS,
  emptyLabel = "Nothing matches this view.",
}: {
  filters: Partial<WeekFilterState>;
  layout?: RunnerLayout;
  limit?: number;
  sort?: RunnerSort;
  columns?: RunnerColumn[];
  emptyLabel?: string;
}) {
  const { state, updateTask } = useStore() as any;
  const f: WeekFilterState = useMemo(() => ({ ...EMPTY_WEEK_FILTERS, ...filters }), [filters]);

  const rows = useMemo(() => {
    const list = (state.tasks ?? []).filter((t: any) => !t.deletedAt && matchesTaskFilter(t, f));
    const cmp = (a: any, b: any) => {
      switch (sort) {
        case "created": return String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""));
        case "priority": return (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3);
        case "title": return String(a.title ?? "").localeCompare(String(b.title ?? ""));
        case "area": return String(a.area ?? "").localeCompare(String(b.area ?? ""));
        default:
          return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
            (a.startTime ?? "zz").localeCompare(b.startTime ?? "zz");
      }
    };
    return list.slice().sort(cmp).slice(0, limit);
  }, [state.tasks, f, limit, sort]);

  if (rows.length === 0) {
    return <p className="px-3 py-4 text-[12px] text-muted-foreground">{emptyLabel}</p>;
  }

  const has = (c: RunnerColumn) => columns.includes(c);

  if (layout === "table") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-1.5 text-left">Task</th>
              {has("due") && <th scope="col" className="w-28 px-3 py-1.5 text-left">Due</th>}
              {has("area") && <th scope="col" className="w-28 px-3 py-1.5 text-left">Area</th>}
              {has("priority") && <th scope="col" className="w-24 px-3 py-1.5 text-left">Priority</th>}
              {has("energy") && <th scope="col" className="w-24 px-3 py-1.5 text-left">Energy</th>}
              {has("tags") && <th scope="col" className="w-32 px-3 py-1.5 text-left">Tags</th>}
              {has("fields") && <th scope="col" className="px-3 py-1.5 text-left">Fields</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {rows.map((t: any) => (
              <tr key={t.id} className={cn(t.done && "opacity-55")}>
                <td className="px-3 py-1.5">
                  <TaskToggle task={t} onToggle={() => updateTask(t.id, { done: !t.done })} />
                </td>
                {has("due") && (
                  <td className="px-3 py-1.5">
                    <DueCell task={t} onSave={v => updateTask(t.id, { dueDate: v ?? undefined })} />
                  </td>
                )}
                {has("area") && (
                  <td className="px-3 py-1.5">
                    <ChoiceCell value={t.area} options={AREAS} onSave={v => updateTask(t.id, { area: v })} label="area" />
                  </td>
                )}
                {has("priority") && (
                  <td className="px-3 py-1.5">
                    <ChoiceCell value={t.priority} options={PRIORITIES} onSave={v => updateTask(t.id, { priority: v })} label="priority" />
                  </td>
                )}
                {has("energy") && (
                  <td className="px-3 py-1.5">
                    <ChoiceCell value={t.energy} options={ENERGIES} onSave={v => updateTask(t.id, { energy: v ?? undefined })} label="energy" clearable />
                  </td>
                )}
                {has("tags") && (
                  <td className="px-3 py-1.5 text-[11px] text-muted-foreground">
                    {(t.tags ?? []).length ? (t.tags as string[]).join(", ") : "—"}
                  </td>
                )}
                {has("fields") && (
                  <td className="px-3 py-1.5">
                    <TaskFieldCells task={t} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border/30">
      {rows.map((t: any) => (
        <li key={t.id} className={cn("flex flex-wrap items-center gap-2 px-3 py-1.5 text-[13px]", t.done && "opacity-55")}>
          <TaskToggle task={t} onToggle={() => updateTask(t.id, { done: !t.done })} />
          <span className="ml-auto flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
            {has("area") && (
              <ChoiceCell value={t.area} options={AREAS} onSave={v => updateTask(t.id, { area: v })} label="area" />
            )}
            {has("priority") && (
              <ChoiceCell value={t.priority} options={PRIORITIES} onSave={v => updateTask(t.id, { priority: v })} label="priority" />
            )}
            {has("due") && (
              <DueCell task={t} onSave={v => updateTask(t.id, { dueDate: v ?? undefined })} />
            )}
          </span>
          {has("fields") && (
            <span className="w-full pl-6"><TaskFieldCells task={t} /></span>
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
  value?: string | null;
  options: string[];
  onSave: (v: any) => void;
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

function DueCell({ task, onSave }: { task: any; onSave: (iso: string | null) => void }) {
  const pretty = task.dueDate ? format(new Date(`${task.dueDate}T12:00:00`), "MMM d") : "—";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Pick due date"
          onClick={e => e.stopPropagation()}
          className={cn(CELL, !task.dueDate && "text-muted-foreground")}
        >
          <span className="truncate">{pretty}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0" onClick={e => e.stopPropagation()}>
        <Calendar
          mode="single"
          selected={task.dueDate ? new Date(`${task.dueDate}T12:00:00`) : undefined}
          onSelect={d => onSave(d ? format(d, "yyyy-MM-dd") : null)}
          initialFocus
        />
        {task.dueDate && (
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
function TaskFieldCells({ task }: { task: any }) {
  const { tags: allTags } = useTags();
  const [fields, setFields] = useState<TagField[]>([]);
  const { values, save } = useItemFieldValues("task", task.id);

  const matched = useMemo(() => matchTags(allTags, task.tags), [allTags, task.tags]);
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

function TaskToggle({ task, onToggle }: { task: any; onToggle: () => void }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <button
        type="button"
        role="checkbox"
        aria-checked={!!task.done}
        aria-label={task.done ? `Mark ${task.title} not done` : `Complete ${task.title}`}
        onClick={onToggle}
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border",
          task.done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40 hover:border-muted-foreground/70",
        )}
      >
        {task.done && <Check className="h-3 w-3" />}
      </button>
      <Link
        to={`/anytime?task=${task.id}`}
        className={cn("min-w-0 truncate hover:underline", task.done && "line-through")}
      >
        {task.title}
      </Link>
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
