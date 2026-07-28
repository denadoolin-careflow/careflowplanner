import { useCallback, useEffect, useRef, useState } from "react";

export interface TaskSnapshot {
  taskId: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}
export interface BlockSnapshot {
  blockId: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}
export interface HistoryEntry {
  label: string;
  tasks: TaskSnapshot[];
  blocks?: BlockSnapshot[];
}

const MAX = 30;
const VERSION = 1;
const TTL_MS = 24 * 60 * 60 * 1000;
const storeKey = (scope: string) => `careflow:planner:history:v${VERSION}:${scope}`;

interface PersistedHistory {
  savedAt: number;
  undo: HistoryEntry[];
  redo: HistoryEntry[];
}

function loadHistory(scope: string): PersistedHistory | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storeKey(scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedHistory;
    if (!parsed || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > TTL_MS) {
      window.localStorage.removeItem(storeKey(scope));
      return null;
    }
    return {
      savedAt: parsed.savedAt,
      undo: Array.isArray(parsed.undo) ? parsed.undo : [],
      redo: Array.isArray(parsed.redo) ? parsed.redo : [],
    };
  } catch { return null; }
}

function saveHistory(scope: string, undo: HistoryEntry[], redo: HistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    if (!undo.length && !redo.length) { window.localStorage.removeItem(storeKey(scope)); return; }
    window.localStorage.setItem(storeKey(scope), JSON.stringify({ savedAt: Date.now(), undo, redo }));
  } catch { /* noop */ }
}

export interface PlannerHistoryApi {
  push: (entry: HistoryEntry) => void;
  undo: () => Promise<HistoryEntry | null>;
  redo: () => Promise<HistoryEntry | null>;
  reset: () => void;
  canUndo: boolean;
  canRedo: boolean;
  nextUndoLabel?: string;
  nextRedoLabel?: string;
}

type Applier = (
  tasks: { id: string; patch: Record<string, unknown> }[],
  blocks: { id: string; patch: Record<string, unknown> }[],
) => Promise<void>;

/** Optional guard so we never replay onto rows that no longer exist. */
type ExistsCheck = { task?: (id: string) => boolean; block?: (id: string) => boolean };

/**
 * Undo/redo stack for planner schedule mutations, persisted per scope (day)
 * in localStorage for 24h so a reload keeps the ability to revert mistakes.
 */
export function usePlannerHistory(apply: Applier, scope = "global", exists?: ExistsCheck): PlannerHistoryApi {
  const undoStack = useRef<HistoryEntry[]>([]);
  const redoStack = useRef<HistoryEntry[]>([]);
  const [, bump] = useState(0);
  const rerender = () => bump(n => n + 1);
  const scopeRef = useRef(scope);
  const existsRef = useRef(exists);
  existsRef.current = exists;

  // Load the persisted stack whenever the scope (day) changes.
  useEffect(() => {
    scopeRef.current = scope;
    const loaded = loadHistory(scope);
    undoStack.current = loaded?.undo ?? [];
    redoStack.current = loaded?.redo ?? [];
    rerender();
  }, [scope]);

  const persist = useCallback(() => {
    saveHistory(scopeRef.current, undoStack.current, redoStack.current);
  }, []);

  const push = useCallback((entry: HistoryEntry) => {
    if (!entry.tasks.length && !entry.blocks?.length) return;
    undoStack.current = [...undoStack.current, entry].slice(-MAX);
    redoStack.current = [];
    persist();
    rerender();
  }, [persist]);

  const filterEntry = (entry: HistoryEntry) => {
    const e = existsRef.current;
    return {
      tasks: entry.tasks.filter(t => (e?.task ? e.task(t.taskId) : true)),
      blocks: (entry.blocks ?? []).filter(b => (e?.block ? e.block(b.blockId) : true)),
    };
  };

  const undo = useCallback(async () => {
    const entry = undoStack.current[undoStack.current.length - 1];
    if (!entry) return null;
    undoStack.current = undoStack.current.slice(0, -1);
    redoStack.current = [...redoStack.current, entry].slice(-MAX);
    persist();
    rerender();
    const valid = filterEntry(entry);
    await apply(
      valid.tasks.map(t => ({ id: t.taskId, patch: t.before })),
      valid.blocks.map(b => ({ id: b.blockId, patch: b.before })),
    );
    return entry;
  }, [apply, persist]);

  const redo = useCallback(async () => {
    const entry = redoStack.current[redoStack.current.length - 1];
    if (!entry) return null;
    redoStack.current = redoStack.current.slice(0, -1);
    undoStack.current = [...undoStack.current, entry].slice(-MAX);
    persist();
    rerender();
    const valid = filterEntry(entry);
    await apply(
      valid.tasks.map(t => ({ id: t.taskId, patch: t.after })),
      valid.blocks.map(b => ({ id: b.blockId, patch: b.after })),
    );
    return entry;
  }, [apply, persist]);

  const reset = useCallback(() => {
    undoStack.current = [];
    redoStack.current = [];
    persist();
    rerender();
  }, [persist]);

  return {
    push, undo, redo, reset,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    nextUndoLabel: undoStack.current[undoStack.current.length - 1]?.label,
    nextRedoLabel: redoStack.current[redoStack.current.length - 1]?.label,
  };
}
