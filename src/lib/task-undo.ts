/**
 * Undo toasts for task edits.
 *
 * Any edit that changes a field a human cares about (date, time, duration,
 * priority, energy, area, title, done) raises a single toast with an Undo
 * action that restores the previous values. One toast id is reused so a burst
 * of edits never stacks up — the newest change is always the revertible one.
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
}

/** Which watched fields actually changed, and a human label for the edit. */
export function planTaskUndo(
  prev: Record<string, unknown> | undefined,
  patch: Record<string, unknown>,
): UndoPlan | null {
  if (!prev) return null;
  const before: Record<string, unknown> = {};
  let label = "";
  for (const w of WATCHED) {
    if (!(w.key in patch)) continue;
    if (same(prev[w.key], patch[w.key])) continue;
    before[w.key] = prev[w.key] ?? null;
    if (!label) label = w.label;
  }
  if (!Object.keys(before).length) return null;
  const changed = Object.keys(before).length;
  return { label: changed > 1 ? "Task updated" : label, before };
}

/** Show the revert toast. `revert` re-applies the captured previous values. */
export function showTaskUndoToast(
  plan: UndoPlan,
  title: string | undefined,
  revert: () => void | Promise<void>,
) {
  toast(title ? `${plan.label} · ${title}` : plan.label, {
    id: TOAST_ID,
    duration: 7000,
    action: {
      label: "Undo",
      onClick: () => { void revert(); },
    },
  });
}

/** Bulk edits get one summary toast instead of one per task. */
export function showBulkUndoToast(count: number, what: string, revert: () => void | Promise<void>) {
  toast(`${what} · ${count} task${count === 1 ? "" : "s"}`, {
    id: TOAST_ID,
    duration: 8000,
    action: { label: "Undo", onClick: () => { void revert(); } },
  });
}
