/** Dragging planner tasks between days/weeks inside notes. */
export const TASK_DRAG_TYPE = "application/x-careflow-task";

export function taskDragProps(taskId: string) {
  return {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData(TASK_DRAG_TYPE, taskId);
      e.dataTransfer.setData("text/plain", taskId);
      e.dataTransfer.effectAllowed = "move";
    },
  };
}

export function readDraggedTaskId(e: React.DragEvent): string | null {
  return e.dataTransfer.getData(TASK_DRAG_TYPE) || e.dataTransfer.getData("text/plain") || null;
}
