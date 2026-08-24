/**
 * Drag payload for items that aren't tasks yet (cleaning chores, caretaking
 * chores). The planner grid creates a real task at the drop time so a chore can
 * be time-blocked without first being converted by hand.
 */
export const NEW_TASK_DRAG_MIME = "application/x-careflow-newtask";

export interface NewTaskDragPayload {
  title: string;
  area?: string;
  estMinutes?: number;
  tags?: string[];
  /** Where it came from, so the grid can show a friendly toast. */
  origin?: "cleaning" | "caretaking" | "other";
}

export function setNewTaskDrag(e: React.DragEvent, payload: NewTaskDragPayload) {
  e.dataTransfer.setData(NEW_TASK_DRAG_MIME, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "copy";
}

export function readNewTaskDrag(e: React.DragEvent): NewTaskDragPayload | null {
  const raw = e.dataTransfer.getData(NEW_TASK_DRAG_MIME);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (p && typeof p.title === "string" && p.title.trim()) return p as NewTaskDragPayload;
  } catch { /* ignore */ }
  return null;
}
