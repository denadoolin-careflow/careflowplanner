/**
 * Global "open the mobile block editor" bus.
 *
 * Planner surfaces (day timeline, week grid, all-day rows) dispatch a task id
 * with a mode; the host mounted in AppLayout renders either the compact editor
 * sheet (tap) or the quick-action menu (long-press).
 */
export type MobileBlockMode = "sheet" | "quick";

const EVT = "careflow:open-mobile-block-editor";

export function openMobileBlockEditor(taskId: string, mode: MobileBlockMode = "sheet") {
  window.dispatchEvent(new CustomEvent<{ taskId: string; mode: MobileBlockMode }>(EVT, { detail: { taskId, mode } }));
}

export function onOpenMobileBlockEditor(
  handler: (taskId: string, mode: MobileBlockMode) => void,
): () => void {
  const listener = (e: Event) => {
    const d = (e as CustomEvent<{ taskId: string; mode: MobileBlockMode }>).detail;
    if (d?.taskId) handler(d.taskId, d.mode ?? "sheet");
  };
  window.addEventListener(EVT, listener);
  return () => window.removeEventListener(EVT, listener);
}
