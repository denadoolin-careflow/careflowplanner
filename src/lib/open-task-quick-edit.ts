/**
 * Global "quick edit task" event. Opens a compact popover-style editor
 * (title, due date, notes) instead of the full task dialog.
 */
const EVT = "careflow:quick-edit-task";

export function openTaskQuickEdit(taskId: string) {
  window.dispatchEvent(new CustomEvent<string>(EVT, { detail: taskId }));
}

export function onOpenTaskQuickEdit(handler: (taskId: string) => void): () => void {
  const listener = (e: Event) => {
    const id = (e as CustomEvent<string>).detail;
    if (id) handler(id);
  };
  window.addEventListener(EVT, listener);
  return () => window.removeEventListener(EVT, listener);
}