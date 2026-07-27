import { useCallback, useRef, useState } from "react";

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

/**
 * Session-only undo/redo stack for planner schedule mutations.
 * Not persisted — a reload starts fresh so we never replay stale state.
 */
export function usePlannerHistory(apply: Applier): PlannerHistoryApi {
  const undoStack = useRef<HistoryEntry[]>([]);
  const redoStack = useRef<HistoryEntry[]>([]);
  const [, bump] = useState(0);
  const rerender = () => bump(n => n + 1);

  const push = useCallback((entry: HistoryEntry) => {
    if (!entry.tasks.length && !entry.blocks?.length) return;
    undoStack.current = [...undoStack.current, entry].slice(-MAX);
    redoStack.current = [];
    rerender();
  }, []);

  const undo = useCallback(async () => {
    const entry = undoStack.current[undoStack.current.length - 1];
    if (!entry) return null;
    undoStack.current = undoStack.current.slice(0, -1);
    redoStack.current = [...redoStack.current, entry].slice(-MAX);
    rerender();
    await apply(
      entry.tasks.map(t => ({ id: t.taskId, patch: t.before })),
      (entry.blocks ?? []).map(b => ({ id: b.blockId, patch: b.before })),
    );
    return entry;
  }, [apply]);

  const redo = useCallback(async () => {
    const entry = redoStack.current[redoStack.current.length - 1];
    if (!entry) return null;
    redoStack.current = redoStack.current.slice(0, -1);
    undoStack.current = [...undoStack.current, entry].slice(-MAX);
    rerender();
    await apply(
      entry.tasks.map(t => ({ id: t.taskId, patch: t.after })),
      (entry.blocks ?? []).map(b => ({ id: b.blockId, patch: b.after })),
    );
    return entry;
  }, [apply]);

  const reset = useCallback(() => {
    undoStack.current = [];
    redoStack.current = [];
    rerender();
  }, []);

  return {
    push, undo, redo, reset,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    nextUndoLabel: undoStack.current[undoStack.current.length - 1]?.label,
    nextRedoLabel: redoStack.current[redoStack.current.length - 1]?.label,
  };
}
