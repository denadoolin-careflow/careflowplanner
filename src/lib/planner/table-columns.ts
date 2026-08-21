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

const KEY = "careflow:planner:table-columns";

function read(): TableConfig {
  try {
    const raw = localStorage.getItem(KEY);
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

const subs = new Set<(c: TableConfig) => void>();
function publish(next: TableConfig) {
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* noop */ }
  subs.forEach(fn => fn(next));
}

export function useTableConfig() {
  const [config, setConfig] = useState<TableConfig>(read);

  useEffect(() => {
    subs.add(setConfig);
    return () => { subs.delete(setConfig); };
  }, []);

  const toggleColumn = useCallback((id: TableColumnId) => {
    const cur = read();
    const on = cur.visible.includes(id);
    // Keep at least one column on screen.
    if (on && cur.visible.length === 1) return;
    publish({ ...cur, visible: on ? cur.visible.filter(c => c !== id) : [...cur.visible, id] });
  }, []);

  const moveColumn = useCallback((from: TableColumnId, to: TableColumnId) => {
    const cur = read();
    if (from === to) return;
    const order = [...cur.order];
    const fi = order.indexOf(from);
    const ti = order.indexOf(to);
    if (fi < 0 || ti < 0) return;
    order.splice(fi, 1);
    order.splice(ti, 0, from);
    publish({ ...cur, order });
  }, []);

  const setSort = useCallback((id: TableColumnId) => {
    const cur = read();
    publish(cur.sort === id ? { ...cur, asc: !cur.asc } : { ...cur, sort: id, asc: true });
  }, []);

  const reset = useCallback(() => publish(DEFAULT_CONFIG), []);

  /** Visible columns in the user's saved order. */
  const columns = config.order.filter(c => config.visible.includes(c));

  return { config, columns, toggleColumn, moveColumn, setSort, reset };
}
