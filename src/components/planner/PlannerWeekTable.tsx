import { useMemo, useState } from "react";
import { addDays, format, isSameDay } from "date-fns";
import { Columns3, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStore } from "@/lib/store";
import { usePlannerFeed, type PlannerFeedItem } from "@/lib/planner/feed";
import { usePlannerItemOpener } from "./PlannerItemOpener";
import { ScheduleConflictDialog } from "./ScheduleConflictDialog";
import { KIND_LABEL } from "@/lib/calendar-colors";
import { useWeekFilters, filterFeedItems } from "@/lib/planner/week-filters";
import {
  useTableConfig, COLUMN_LABEL, ALL_COLUMNS, type TableColumnId, type TableScope,
} from "@/lib/planner/table-columns";
import { PlannerBulkBar } from "./PlannerBulkBar";
import { Checkbox } from "@/components/ui/checkbox";
import { useScheduleDrop, readDraggedItem, PLANNER_ITEM_MIME } from "@/lib/planner/use-schedule-drop";
import { cn } from "@/lib/utils";

const PRIO_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
const ENERGY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

const COL_CLASS: Partial<Record<TableColumnId, string>> = {
  when: "w-32", kind: "w-28", status: "w-24", priority: "w-24",
  area: "w-32", energy: "w-24", duration: "w-24", project: "w-32",
};

function sortValue(it: PlannerFeedItem, col: TableColumnId): string | number {
  switch (col) {
    case "item": return it.title.toLowerCase();
    case "kind": return it.kind;
    case "status": return Number(!!it.done);
    case "priority": return PRIO_RANK[it.priority ?? ""] ?? 9;
    case "area": return (it.area ?? "zzz").toLowerCase();
    case "energy": return ENERGY_RANK[it.energy ?? ""] ?? 9;
    case "duration": return it.estMinutes ?? 99999;
    case "project": return (it.projectId ?? "zzz").toLowerCase();
    case "tags": return (it.tags?.join(",") ?? "zzz").toLowerCase();
    default: return `${it.date} ${it.time ?? "zz"}`;
  }
}

/** Week as a configurable, sortable table — dense, scannable, good for review. */
export function PlannerWeekTable({ weekStart, days = 7, onOpenItem, scope = "week" }: {
  weekStart: Date;
  days?: number;
  onOpenItem?: (item: PlannerFeedItem) => void;
  /** Column layout + sort are remembered separately per range. */
  scope?: TableScope;
}) {
  const { state, updateTask } = useStore() as any;
  const { items } = usePlannerFeed(weekStart, days);
  const { filters } = useWeekFilters();
  const { open: openItem, dialogs } = usePlannerItemOpener();
  const handleOpen = onOpenItem ?? openItem;
  const { config, columns, toggleColumn, moveColumn, setSort, reset } = useTableConfig(scope);
  const { schedule, scheduleMany, pending, setPending, resolve } = useScheduleDrop();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleSel = (id: string) =>
    setSelected(cur => { const n = new Set(cur); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const [dragCol, setDragCol] = useState<TableColumnId | null>(null);
  const [dropRow, setDropRow] = useState<string | null>(null);
  const today = new Date();
  const windowEnd = addDays(weekStart, days - 1);

  const projectName = (id?: string) =>
    (state.projects ?? []).find((p: any) => p.id === id)?.name ?? "";

  const rows = useMemo(() => {
    const list = filterFeedItems(items, filters);
    const dir = config.asc ? 1 : -1;
    return list.sort((a, b) => {
      const av = sortValue(a, config.sort);
      const bv = sortValue(b, config.sort);
      if (av === bv) return a.date.localeCompare(b.date) || (a.time ?? "zz").localeCompare(b.time ?? "zz");
      return dir * (typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv)));
    });
  }, [items, filters, config.sort, config.asc]);

  const taskRows = useMemo(() => rows.filter(r => r.sourceRef.type === "task"), [rows]);

  const cell = (it: PlannerFeedItem, col: TableColumnId) => {
    switch (col) {
      case "when": {
        const d = new Date(`${it.date}T12:00:00`);
        return (
          <>
            <span className={cn(isSameDay(d, today) && "font-semibold text-primary")}>{format(d, "EEE d")}</span>
            <span className="ml-1.5 font-mono text-[11px] tabular-nums">
              {it.allDay ? "all day" : (it.time?.slice(0, 5) ?? "")}
            </span>
          </>
        );
      }
      case "item":
        return (
          <span className="flex items-start gap-2">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: it.color }} aria-hidden />
            <span className={cn("[overflow-wrap:anywhere] whitespace-normal break-words", it.done && "line-through")}>{it.title}</span>
          </span>
        );
      case "kind": return KIND_LABEL[it.kind];
      case "status":
        return it.sourceRef.type === "task" ? (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); updateTask(it.sourceRef.id, { done: !it.done }); }}
            className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] hover:bg-muted"
          >
            {it.done ? "Done" : "Open"}
          </button>
        ) : <span className="text-[11px] text-muted-foreground">—</span>;
      case "priority": return it.priority ? <span className="capitalize">{it.priority}</span> : "—";
      case "area": return it.area ?? "—";
      case "energy": return it.energy ? <span className="capitalize">{it.energy}</span> : "—";
      case "duration": return it.estMinutes ? `${it.estMinutes}m` : "—";
      case "project": return projectName(it.projectId) || "—";
      case "tags": return it.tags?.length ? it.tags.join(", ") : "—";
      default: return null;
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <span className="text-sm font-semibold">Table</span>
        <span className="text-[11px] text-muted-foreground">
          {format(weekStart, "MMM d")} – {format(windowEnd, "MMM d")} · {rows.length} items
        </span>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="ml-auto h-7 rounded-full text-[11px]" aria-label="Choose table columns">
              <Columns3 className="mr-1.5 h-3.5 w-3.5" /> Columns
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-2">
            <div className="mb-1 flex items-center justify-between px-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Show columns</span>
              <button type="button" className="text-[11px] text-primary hover:underline" onClick={reset}>Reset</button>
            </div>
            <div className="space-y-0.5">
              {config.order.filter(c => ALL_COLUMNS.includes(c)).map(c => {
                const on = config.visible.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    role="switch"
                    aria-checked={on}
                    onClick={() => toggleColumn(c)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/60",
                      !on && "opacity-45",
                    )}
                  >
                    <span className="flex-1">{COLUMN_LABEL[c]}</span>
                    {on && <span className="text-[10px] text-muted-foreground">on</span>}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">Drag a header to reorder columns.</p>
          </PopoverContent>
        </Popover>
      </div>
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full text-[12.5px]">
          <thead className="sticky top-0 z-10 bg-card/95 text-[10px] uppercase tracking-[0.14em] text-muted-foreground backdrop-blur">
            <tr>
              <th scope="col" className="w-9 px-2 py-2">
                <Checkbox
                  aria-label="Select all tasks"
                  checked={taskRows.length > 0 && selected.size === taskRows.length}
                  onCheckedChange={on =>
                    setSelected(on ? new Set(taskRows.map(r => r.sourceRef.id)) : new Set())}
                />
              </th>
              {columns.map(col => (
                <th
                  key={col}
                  scope="col"
                  draggable
                  onDragStart={e => { setDragCol(col); e.dataTransfer.effectAllowed = "move"; }}
                  onDragOver={e => { if (dragCol) e.preventDefault(); }}
                  onDrop={e => { e.preventDefault(); if (dragCol) moveColumn(dragCol, col); setDragCol(null); }}
                  onDragEnd={() => setDragCol(null)}
                  className={cn("px-3 py-2 text-left font-semibold", COL_CLASS[col], dragCol === col && "opacity-50")}
                >
                  <button
                    type="button"
                    onClick={() => setSort(col)}
                    aria-sort={config.sort === col ? (config.asc ? "ascending" : "descending") : "none"}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <GripVertical className="h-3 w-3 cursor-grab opacity-40" aria-hidden />
                    {COLUMN_LABEL[col]}
                    {config.sort === col && <span aria-hidden>{config.asc ? "▲" : "▼"}</span>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {rows.length === 0 && (
              <tr><td colSpan={columns.length + 1} className="px-3 py-6 text-center text-muted-foreground">Nothing matches here.</td></tr>
            )}
            {rows.map(it => (
              <tr
                key={it.id}
                draggable={it.sourceRef.type === "task" || it.sourceRef.type === "appointment"}
                onDragStart={e => {
                  e.dataTransfer.setData(PLANNER_ITEM_MIME, `${it.sourceRef.type}:${it.sourceRef.id}`);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={e => {
                  if (Array.from(e.dataTransfer.types).includes(PLANNER_ITEM_MIME)) { e.preventDefault(); setDropRow(it.id); }
                }}
                onDragLeave={() => setDropRow(cur => (cur === it.id ? null : cur))}
                onDrop={e => {
                  e.preventDefault();
                  setDropRow(null);
                  const dragged = readDraggedItem(e);
                  if (dragged) schedule(dragged, it.date);
                }}
                onClick={() => handleOpen(it)}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-muted/50",
                  it.done && "opacity-55",
                  dropRow === it.id && "bg-primary/5 outline outline-1 outline-primary/40",
                )}
              >
                <td className="w-9 px-2 py-2" onClick={e => e.stopPropagation()}>
                  {it.sourceRef.type === "task" && (
                    <Checkbox
                      aria-label={`Select ${it.title}`}
                      checked={selected.has(it.sourceRef.id)}
                      onCheckedChange={() => toggleSel(it.sourceRef.id)}
                    />
                  )}
                </td>
                {columns.map(col => (
                  <td key={col} className={cn("px-3 py-2", col === "when" && "whitespace-nowrap text-muted-foreground", (col === "kind" || col === "area" || col === "project" || col === "tags") && "text-muted-foreground")}>
                    {cell(it, col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PlannerBulkBar
        ids={Array.from(selected)}
        anchorDate={weekStart}
        onClear={() => setSelected(new Set())}
        onScheduleMany={scheduleMany}
      />
      <ScheduleConflictDialog pending={pending} onCancel={() => setPending(null)} onResolve={resolve} />
      {dialogs}
    </div>
  );
}
