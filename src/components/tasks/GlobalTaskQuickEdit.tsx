import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { QuickTaskInlineEditor } from "@/components/tasks/QuickTaskInlineEditor";
import { onOpenTaskQuickEdit } from "@/lib/open-task-quick-edit";
import { openTaskEditor } from "@/lib/open-task-editor";
import { useIsMobile } from "@/hooks/use-mobile";
import { Pencil } from "lucide-react";

/** Mounted once in AppLayout: compact quick-edit for a task. */
export function GlobalTaskQuickEdit() {
  const { state } = useStore();
  const [id, setId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  useEffect(() => onOpenTaskQuickEdit((tid) => setId(tid)), []);
  const task = id ? state.tasks.find(t => t.id === id) ?? null : null;

  const body = (
    <>
      {task && <QuickTaskInlineEditor taskId={task.id} onClose={() => setId(null)} />}
      <Button
        variant="ghost"
        size={isMobile ? "default" : "sm"}
        className="w-full gap-1.5 text-xs text-muted-foreground"
        onClick={() => { const tid = id; setId(null); if (tid) openTaskEditor(tid); }}
      >
        <Pencil className="h-3.5 w-3.5" /> Open full editor
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={!!task} onOpenChange={(o) => !o && setId(null)}>
        <SheetContent side="bottom" className="max-h-[88svh] overflow-y-auto rounded-t-3xl pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SheetHeader className="text-left">
            <SheetTitle className="text-base">Quick edit</SheetTitle>
          </SheetHeader>
          <div className="mt-2 space-y-3">{body}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && setId(null)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Quick edit</DialogTitle>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}
