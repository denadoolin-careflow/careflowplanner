import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import { onOpenTaskEditor } from "@/lib/open-task-editor";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";

/** Mounted once in AppLayout so any component can request to edit a task. */
export function GlobalTaskEditor() {
  const { state } = useStore();
  const [id, setId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  useEffect(() => onOpenTaskEditor((tid) => {
    if (isMobile) navigate(`/tasks/${tid}`);
    else setId(tid);
  }), [isMobile, navigate]);
  const task = id ? state.tasks.find(t => t.id === id) ?? null : null;
  return <TaskEditor task={task} open={!!task} onOpenChange={(o) => !o && setId(null)} />;
}