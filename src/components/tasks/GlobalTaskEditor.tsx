import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import { onOpenTaskEditor } from "@/lib/open-task-editor";

/** Mounted once in AppLayout so any component can request to edit a task. */
export function GlobalTaskEditor() {
  const { state } = useStore();
  const [id, setId] = useState<string | null>(null);
  useEffect(() => onOpenTaskEditor(setId), []);
  const task = id ? state.tasks.find(t => t.id === id) ?? null : null;
  return <TaskEditor task={task} open={!!task} onOpenChange={(o) => !o && setId(null)} />;
}