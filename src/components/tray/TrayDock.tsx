import { useEffect, useMemo, useState } from "react";
import { NotebookPen, Inbox, X, Plus, Trash2, ListPlus, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { tray, useTray } from "@/lib/tray-store";
import { useStore } from "@/lib/store";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";
import { TASK_DRAG_MIME } from "@/components/calendar/UnscheduledTasksRail";
import { usePlannerPointerDrag } from "@/lib/planner-touch-drag";
import { openTaskQuickEdit } from "@/lib/open-task-quick-edit";
import { ROW_PX } from "@/lib/planner-metrics";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

function TrayRow({ id, title, onRemove }: { id: string; title: string; onRemove: () => void }) {
  const pointer = usePlannerPointerDrag(
    () => ({ taskId: id, label: title }),
    { onClick: () => openTaskQuickEdit(id) },
  );
  return (
    <li
      draggable
      onDragStart={(e) => { e.dataTransfer.setData(TASK_DRAG_MIME, id); e.dataTransfer.effectAllowed = "copyMove"; haptics.pickup(); }}
      onPointerDown={pointer.onPointerDown}
      style={{ minHeight: ROW_PX }}
      className="group flex touch-none items-center gap-2 rounded-lg border border-border/50 bg-card/70 px-2 py-1.5 text-[12.5px]"
    >
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{title}</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        aria-label={`Remove ${title} from tray`}
        className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

/**
 * ClickUp-style dockable Notepad + Task tray, available on every page.
 * Notes auto-save locally; tray items can be dragged onto the planner grid.
 */
export function TrayDock() {
  const { open, tab, notes, taskIds } = useTray();
  const { state, addTask } = useStore();
  const [quick, setQuick] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const trayTasks = useMemo(
    () => taskIds.map(id => state.tasks.find(t => t.id === id)).filter(Boolean),
    [taskIds, state.tasks],
  );

  // Prune ids for tasks that no longer exist.
  useEffect(() => {
    if (!state.tasks.length || !taskIds.length) return;
    for (const id of taskIds) if (!state.tasks.some(t => t.id === id)) tray.removeTask(id);
  }, [state.tasks, taskIds]);

  const noteToTask = async (id: string, text: string) => {
    const title = text.trim().split("\n")[0].slice(0, 200);
    if (!title) return;
    await addTask({ title, area: "Personal", priority: "medium", done: false, inbox: true } as any);
    tray.removeNote(id);
    haptics.success();
    toast.success("Added to inbox");
  };

  const quickAddToTray = async () => {
    const title = quick.trim();
    if (!title) return;
    const createdId = await addTask({ title, area: "Personal", priority: "medium", done: false, inbox: true } as any);
    if (createdId) tray.addTask(createdId);
    setQuick("");
    haptics.success();
  };

  // The launcher lives in the quick-add FAB menu — nothing is rendered when closed.
  if (!open) return null;

  return (
    <section
      aria-label="Notepad and task tray"
      className="fixed bottom-20 left-2 right-2 z-40 flex max-h-[62vh] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-2xl backdrop-blur-xl sm:left-auto sm:right-4 sm:w-[360px] lg:bottom-6"
    >
      <header className="flex items-center gap-1 border-b border-border/50 p-2">
        <div role="tablist" aria-label="Tray sections" className="flex gap-1">
          {(["notepad", "tray"] as const).map(t => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              type="button"
              onClick={() => tray.setTab(t)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] capitalize transition-colors",
                tab === t ? "bg-primary/15 font-medium text-primary" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t === "notepad" ? <NotebookPen className="h-3.5 w-3.5" /> : <Inbox className="h-3.5 w-3.5" />}
              {t}
              {t === "tray" && taskIds.length > 0 && (
                <span className="rounded-full bg-primary/15 px-1.5 text-[10px]">{taskIds.length}</span>
              )}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => tray.setOpen(false)}
          aria-label="Close notepad and task tray"
          className="ml-auto rounded-full p-1.5 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {tab === "notepad" ? (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-2 [-webkit-overflow-scrolling:touch]">
          <Button size="sm" variant="outline" className="w-full gap-1.5 rounded-xl" onClick={() => tray.addNote("")}>
            <Plus className="h-3.5 w-3.5" /> New note
          </Button>
          {notes.length === 0 && (
            <p className="px-1 py-4 text-center text-[12px] text-muted-foreground">
              Jot anything here — it saves as you type.
            </p>
          )}
          {notes.map(n => (
            <div key={n.id} className="rounded-xl border border-border/50 bg-background/60 p-2">
              <Textarea
                value={n.text}
                onChange={(e) => tray.updateNote(n.id, e.target.value)}
                placeholder="Quick note…"
                aria-label="Quick note"
                className="min-h-[64px] resize-y border-0 bg-transparent p-0 text-[12.5px] focus-visible:ring-0"
              />
              <div className="mt-1 flex items-center justify-end gap-1">
                <Button size="sm" variant="ghost" className="h-7 gap-1 rounded-full px-2 text-[11px]"
                  onClick={() => void noteToTask(n.id, n.text)}>
                  <ListPlus className="h-3.5 w-3.5" /> To task
                </Button>
                <Button size="sm" variant="ghost" aria-label="Delete note"
                  className="h-7 w-7 rounded-full p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => tray.removeNote(n.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const id = e.dataTransfer.getData(TASK_DRAG_MIME);
            if (id) { tray.addTask(id); haptics.drop(); }
          }}
          className={cn(
            "min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-2 transition-colors [-webkit-overflow-scrolling:touch]",
            dragOver && "bg-primary/5",
          )}
        >
          <div className="flex gap-1.5">
            <Input
              value={quick}
              onChange={(e) => setQuick(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void quickAddToTray(); } }}
              placeholder="Park a new task…"
              aria-label="Add a task to the tray"
              className="h-8 text-[12.5px]"
            />
            <Button size="sm" className="h-8 shrink-0 rounded-lg" onClick={() => void quickAddToTray()}>Add</Button>
          </div>
          {trayTasks.length === 0 ? (
            <p className="px-1 py-4 text-center text-[12px] text-muted-foreground">
              Drag tasks here to park them, then drag them onto the planner grid.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {trayTasks.map((t: any) => (
                <TrayRow key={t.id} id={t.id} title={t.title} onRemove={() => tray.removeTask(t.id)} />
              ))}
            </ul>
          )}
          {trayTasks.length > 0 && (
            <Button size="sm" variant="ghost" className="w-full text-[11px] text-muted-foreground"
              onClick={() => tray.clearTasks()}>
              Clear tray
            </Button>
          )}
        </div>
      )}
    </section>
  );
}