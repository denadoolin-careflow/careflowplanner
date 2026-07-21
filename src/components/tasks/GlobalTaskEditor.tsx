import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import { MobileTaskSheet } from "@/components/tasks/mobile/MobileTaskSheet";
import { onOpenTaskEditor } from "@/lib/open-task-editor";
import { useIsMobile } from "@/hooks/use-mobile";

/** Mounted once in AppLayout so any component can request to edit a task. */
export function GlobalTaskEditor() {
  const { state } = useStore();
  const [id, setId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  useEffect(() => onOpenTaskEditor((tid) => setId(tid)), []);
  const task = id ? state.tasks.find(t => t.id === id) ?? null : null;
  if (isMobile) {
    return (
      <MobileTaskSheet
        task={task ?? ({ id: "", title: "", priority: "medium", area: "Personal", done: false } as any)}
        open={!!task}
        onOpenChange={(o) => !o && setId(null)}
      />
    );
  }
  return <TaskEditor task={task} open={!!task} onOpenChange={(o) => !o && setId(null)} />;
}