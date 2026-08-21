/**
 * Outline zoom + collapse for the planner views.
 *
 * Zooming makes one task the root: every view then shows only that task and
 * its subtree (derived from `parentTaskId`). Collapsed parents hide their
 * children. Both survive reloads.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

export interface OutlineState {
  /** Task id acting as the root, or null for the whole range. */
  zoomRoot: string | null;
  /** Task ids whose children are hidden. */
  collapsed: string[];
}

const KEY = "careflow:planner:outline";
const EMPTY: OutlineState = { zoomRoot: null, collapsed: [] };

function read(): OutlineState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const p = JSON.parse(raw) as Partial<OutlineState>;
    return { zoomRoot: p.zoomRoot ?? null, collapsed: Array.isArray(p.collapsed) ? p.collapsed : [] };
  } catch {
    return EMPTY;
  }
}

const subs = new Set<(s: OutlineState) => void>();
function publish(next: OutlineState) {
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* noop */ }
  subs.forEach(fn => fn(next));
}

export function useOutline() {
  const [outline, setOutline] = useState<OutlineState>(read);

  useEffect(() => {
    subs.add(setOutline);
    return () => { subs.delete(setOutline); };
  }, []);

  const zoomTo = useCallback((id: string | null) => publish({ ...read(), zoomRoot: id }), []);
  const toggleCollapsed = useCallback((id: string) => {
    const cur = read();
    const on = cur.collapsed.includes(id);
    publish({ ...cur, collapsed: on ? cur.collapsed.filter(x => x !== id) : [...cur.collapsed, id] });
  }, []);
  const isCollapsed = useCallback((id: string) => outline.collapsed.includes(id), [outline.collapsed]);

  return { outline, zoomRoot: outline.zoomRoot, zoomTo, toggleCollapsed, isCollapsed };
}

export interface OutlineTask { id: string; title?: string; parentTaskId?: string | null }

/** Ids of a task and everything under it. */
export function subtreeIds(tasks: OutlineTask[], rootId: string): Set<string> {
  const kids = new Map<string, string[]>();
  for (const t of tasks) {
    const p = t.parentTaskId ?? null;
    if (!p) continue;
    if (!kids.has(p)) kids.set(p, []);
    kids.get(p)!.push(t.id);
  }
  const out = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const child of kids.get(cur) ?? []) {
      if (out.has(child)) continue;
      out.add(child);
      stack.push(child);
    }
  }
  return out;
}

/** Chain from the range root down to the zoomed task, for the breadcrumb. */
export function ancestorChain(tasks: OutlineTask[], id: string): OutlineTask[] {
  const byId = new Map(tasks.map(t => [t.id, t]));
  const chain: OutlineTask[] = [];
  let cur = byId.get(id);
  const guard = new Set<string>();
  while (cur && !guard.has(cur.id)) {
    guard.add(cur.id);
    chain.unshift(cur);
    cur = cur.parentTaskId ? byId.get(cur.parentTaskId) : undefined;
  }
  return chain;
}

/** Ids hidden because one of their ancestors is collapsed. */
export function hiddenByCollapse(tasks: OutlineTask[], collapsed: string[]): Set<string> {
  if (!collapsed.length) return new Set();
  const hidden = new Set<string>();
  for (const root of collapsed) {
    for (const id of subtreeIds(tasks, root)) if (id !== root) hidden.add(id);
  }
  return hidden;
}

/** Convenience: which feed/task ids survive the current outline state. */
export function useOutlineFilter(tasks: OutlineTask[]) {
  const { zoomRoot, collapsed, toggleCollapsed, isCollapsed, zoomTo } = {
    ...useOutline(),
    collapsed: useOutline().outline.collapsed,
  };

  const allowed = useMemo(() => {
    const hidden = hiddenByCollapse(tasks, collapsed);
    const scope = zoomRoot ? subtreeIds(tasks, zoomRoot) : null;
    return (taskId: string) => {
      if (hidden.has(taskId)) return false;
      if (scope && !scope.has(taskId)) return false;
      return true;
    };
  }, [tasks, collapsed, zoomRoot]);

  const crumbs = useMemo(
    () => (zoomRoot ? ancestorChain(tasks, zoomRoot) : []),
    [tasks, zoomRoot],
  );

  const hasChildren = useMemo(() => {
    const set = new Set(tasks.map(t => t.parentTaskId).filter(Boolean) as string[]);
    return (id: string) => set.has(id);
  }, [tasks]);

  return { allowed, crumbs, zoomRoot, zoomTo, toggleCollapsed, isCollapsed, hasChildren };
}
