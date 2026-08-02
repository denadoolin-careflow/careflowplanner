import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QuickTaskInlineEditor } from "@/components/tasks/QuickTaskInlineEditor";
import { onOpenTaskQuickEdit } from "@/lib/open-task-quick-edit";
import { openTaskEditor } from "@/lib/open-task-editor";
import { Pencil } from "lucide-react";

/** Mounted once in AppLayout: compact quick-edit for a task. */
export function GlobalTaskQuickEdit() {
  const { state } = useStore();
  const [id, setId] = useState<string | null>(null);
  useEffect(() => onOpenTaskQuickEdit((tid) => setId(tid)), []);
  const task = id ? state.tasks.find(t => t.id === id) ?? null : null;

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && setId(null)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Quick edit</DialogTitle>
        </DialogHeader>
        {task && <QuickTaskInlineEditor taskId={task.id} onClose={() => setId(null)} />}
        <Button
          variant="ghost"
          size="sm"
          className="w-full gap-1.5 text-xs text-muted-foreground"
          onClick={() => { const tid = id; setId(null); if (tid) openTaskEditor(tid); }}
        >
          <Pencil className="h-3.5 w-3.5" /> Open full editor
        </Button>
      </DialogContent>
    </Dialog>
  );
}