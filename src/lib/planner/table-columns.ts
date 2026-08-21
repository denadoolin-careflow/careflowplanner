/**
 * Column configuration for the weekly Table view — which columns show, in
 * what order, and how rows sort. Persisted so the layout survives reloads.
 */
import { useCallback, useEffect, useState } from "react";

export type TableColumnId =
  | "when" | "item" | "kind" | "status"
  | "priority" | "area" | "energy" | "duration" | "project" | "tags";

export const COLUMN_LABEL: Record<TableColumnId, string> = {
  when: "When",
  item: "Item",
  kind: "Type",
  status: "Status",
  priority: "Priority",
  area: "Area",
  energy: "Energy",
  duration: "Duration",
  project: "Project",
  tags: "Tags",
};

export const ALL_COLUMNS: TableColumnId[] = [
  "when", "item", "kind", "status", "priority", "area", "energy", "duration", "project", "tags",
];

export interface TableConfig {
  order: TableColumnId[];
  visible: TableColumnId[];
  sort: TableColumnId;
  asc: boolean;
}

const DEFAULT_CONFIG: TableConfig = {
  order: ALL_COLUMNS,
  visible: ["when", "item", "kind", "status"],
  sort: "when",
  asc: true,
};

/** Layouts are remembered separately for each planner range. */
export type TableScope = "day" | "week" | "month" | "year";

const LEGACY_KEY = "careflow:planner:table-columns";
const keyFor = (scope: TableScope) => `${LEGACY_KEY}:${scope}`;

function read(scope: TableScope): TableConfig {
  try {
    // Migration: the very first version stored one shared layout — treat it as the week layout.
    const raw = localStorage.getItem(keyFor(scope))
      ?? (scope === "week" ? localStorage.getItem(LEGACY_KEY) : null);
    if (!raw) return DEFAULT_CONFIG;
    const p = JSON.parse(raw) as Partial<TableConfig>;
    const order = [
      ...(p.order ?? []).filter(c => ALL_COLUMNS.includes(c)),
      ...ALL_COLUMNS.filter(c => !(p.order ?? []).includes(c)),
    ];
    const visible = (p.visible ?? DEFAULT_CONFIG.visible).filter(c => ALL_COLUMNS.includes(c));
    return {
      order,
      visible: visible.length ? visible : DEFAULT_CONFIG.visible,
      sort: ALL_COLUMNS.includes(p.sort as TableColumnId) ? (p.sort as TableColumnId) : "when",
      asc: p.asc ?? true,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

const subs = new Map<TableScope, Set<(c: TableConfig) => void>>();
function publish(scope: TableScope, next: TableConfig) {
  try { localStorage.setItem(keyFor(scope), JSON.stringify(next)); } catch { /* noop */ }
  subs.get(scope)?.forEach(fn => fn(next));
}

export function useTableConfig(scope: TableScope = "week") {
  const [config, setConfig] = useState<TableConfig>(() => read(scope));

  useEffect(() => {
    setConfig(read(scope));
    if (!subs.has(scope)) subs.set(scope, new Set());
    const set = subs.get(scope)!;
    set.add(setConfig);
    return () => { set.delete(setConfig); };
  }, [scope]);

  const toggleColumn = useCallback((id: TableColumnId) => {
    const cur = read(scope);
    const on = cur.visible.includes(id);
    // Keep at least one column on screen.
    if (on && cur.visible.length === 1) return;
    publish(scope, { ...cur, visible: on ? cur.visible.filter(c => c !== id) : [...cur.visible, id] });
  }, [scope]);

  const moveColumn = useCallback((from: TableColumnId, to: TableColumnId) => {
    const cur = read(scope);
    if (from === to) return;
    const order = [...cur.order];
    const fi = order.indexOf(from);
    const ti = order.indexOf(to);
    if (fi < 0 || ti < 0) return;
    order.splice(fi, 1);
    order.splice(ti, 0, from);
    publish(scope, { ...cur, order });
  }, [scope]);

  const setSort = useCallback((id: TableColumnId) => {
    const cur = read(scope);
    publish(scope, cur.sort === id ? { ...cur, asc: !cur.asc } : { ...cur, sort: id, asc: true });
  }, [scope]);

  const reset = useCallback(() => publish(scope, DEFAULT_CONFIG), [scope]);

  /** Visible columns in the user's saved order. */
  const columns = config.order.filter(c => config.visible.includes(c));

  return { config, columns, toggleColumn, moveColumn, setSort, reset };
}
