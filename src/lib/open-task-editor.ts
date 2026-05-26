/**
 * Global "open task editor" event. Any component can dispatch
 * openTaskEditor(id) and the mounted GlobalTaskEditor in AppLayout
 * will render the TaskEditor dialog for it.
 */
const EVT = "careflow:open-task-editor";

export function openTaskEditor(taskId: string) {
  window.dispatchEvent(new CustomEvent<string>(EVT, { detail: taskId }));
}

export function onOpenTaskEditor(handler: (taskId: string) => void): () => void {
  const listener = (e: Event) => {
    const id = (e as CustomEvent<string>).detail;
    if (id) handler(id);
  };
  window.addEventListener(EVT, listener);
  return () => window.removeEventListener(EVT, listener);
}