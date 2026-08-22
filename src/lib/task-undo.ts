/**
 * Undo / redo toasts for task edits.
 *
 * Any edit that changes a field a human cares about (date, time, duration,
 * priority, energy, area, title, done) raises a single toast with an Undo
 * action that restores the previous values. Taking the undo swaps the toast
 * for a Redo one that re-applies the edit, so a change can be flipped back and
 * forth. One toast id is reused so a burst of edits never stacks up — the
 * newest change is always the revertible one.
 */
import { toast } from "sonner";

const TOAST_ID = "task-edit-undo";

/** Fields worth offering an undo for, in label-priority order. */
const WATCHED: { key: string; label: string }[] = [
  { key: "dueDate", label: "Rescheduled" },
  { key: "startTime", label: "Moved" },
  { key: "endTime", label: "Resized" },
  { key: "estMinutes", label: "Duration changed" },
  { key: "priority", label: "Priority changed" },
  { key: "energy", label: "Energy changed" },
  { key: "area", label: "Area changed" },
  { key: "projectId", label: "Moved to project" },
  { key: "title", label: "Renamed" },
  { key: "done", label: "Updated" },
  { key: "tags", label: "Tags changed" },
  { key: "inbox", label: "Updated" },
];

const same = (a: unknown, b: unknown) =>
  a === b || (Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]));

export interface UndoPlan {
  label: string;
  before: Record<string, unknown>;
  /** The values this edit applied — used to re-apply after an undo. */
  after: Record<string, unknown>;
}

/** Which watched fields actually changed, and a human label for the edit. */
export function planTaskUndo(
  prev: Record<string, unknown> | undefined,
  patch: Record<string, unknown>,
): UndoPlan | null {
  if (!prev) return null;
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  let label = "";
  for (const w of WATCHED) {
    if (!(w.key in patch)) continue;
    if (same(prev[w.key], patch[w.key])) continue;
    before[w.key] = prev[w.key] ?? null;
    after[w.key] = patch[w.key] ?? null;
    if (!label) label = w.label;
  }
  if (!Object.keys(before).length) return null;
  const changed = Object.keys(before).length;
  return { label: changed > 1 ? "Task updated" : label, before, after };
}

/**
 * Show the revert toast. `apply` receives the values to write — it is called
 * with the previous values on Undo and with the edit's values on Redo, so the
 * change can be flipped back and forth until a newer edit replaces the toast.
 */
export function showTaskUndoToast(
  plan: UndoPlan,
  title: string | undefined,
  apply: (values: Record<string, unknown>) => void | Promise<void>,
) {
  const suffix = title ? ` · ${title}` : "";

  const showRedo = () => {
    toast(`Change reverted${suffix}`, {
      id: TOAST_ID,
      duration: 7000,
      action: {
        label: "Redo",
        onClick: () => { void Promise.resolve(apply(plan.after)).then(showUndo); },
      },
    });
  };

  const showUndo = () => {
    toast(`${plan.label}${suffix}`, {
      id: TOAST_ID,
      duration: 7000,
      action: {
        label: "Undo",
        onClick: () => { void Promise.resolve(apply(plan.before)).then(showRedo); },
      },
    });
  };

  showUndo();
}

/**
 * Bulk edits get one summary toast instead of one per task. Passing `reapply`
 * adds a Redo step after the revert, matching the single-task behaviour.
 */
export function showBulkUndoToast(
  count: number,
  what: string,
  revert: () => void | Promise<void>,
  reapply?: () => void | Promise<void>,
) {
  const plural = `${count} task${count === 1 ? "" : "s"}`;

  const showRedo = () => {
    toast(`Undid ${plural}`, {
      id: TOAST_ID,
      duration: 8000,
      action: reapply
        ? { label: "Redo", onClick: () => { void Promise.resolve(reapply()).then(showUndo); } }
        : undefined,
    });
  };

  const showUndo = () => {
    toast(`${what} · ${plural}`, {
      id: TOAST_ID,
      duration: 8000,
      action: { label: "Undo", onClick: () => { void Promise.resolve(revert()).then(showRedo); } },
    });
  };

  showUndo();
}
