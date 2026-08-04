import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  NotebookPen, Inbox, X, Plus, Trash2, ListPlus, GripVertical, Pin,
  CalendarClock, Sparkles, ListChecks, Move, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { tray, useTray, TRAY_TABS, type TrayTab } from "@/lib/tray-store";
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
import { BlockCheckbox } from "@/components/planner/BlockCheckbox";
import { createNote } from "@/lib/notes";
import { routines as routinesApi, useRoutines, SLOT_LABEL } from "@/lib/routines";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";

const TAB_ICON: Record<TrayTab, typeof Inbox> = {
  notepad: NotebookPen,
  tray: Inbox,
  schedule: CalendarClock,
  habits: Sparkles,
  routines: ListChecks,
};

function fmtTime(t?: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return "";
  const period = h >= 12 ? "p" : "a";
  const h12 = ((h + 11) % 12) + 1;
  return m ? `${h12}:${String(m).padStart(2, "0")}${period}` : `${h12}${period}`;
}

/** Small "when" summary shown on tray rows. */
function ScheduleChip({ task }: { task: any }) {
  const bits: string[] = [];
  if (task.startTime) bits.push(fmtTime(task.startTime));
  if (task.dueDate) {
    const today = format(new Date(), "yyyy-MM-dd");
    bits.push(task.dueDate === today ? "Today" : format(new Date(`${task.dueDate}T00:00:00`), "EEE d"));
  }
  if (task.estMinutes) bits.push(`${task.estMinutes}m`);
  if (!bits.length) return null;
  return (
    <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
      {bits.join(" · ")}
    </span>
  );
}

function TrayRow({
  task, onRemove, onPark, onDragActive, onToggle,
}: { task: any; onRemove?: () => void; onPark?: () => void; onDragActive?: (v: boolean) => void; onToggle: () => void }) {
  const id = task.id as string;
  const title = task.title as string;
  const pointer = usePlannerPointerDrag(
    () => ({ taskId: id, label: title }),
    {
      onClick: () => openTaskQuickEdit(id),
      onDragStart: () => onDragActive?.(true),
      onDragEnd: () => onDragActive?.(false),
    },
  );
  return (
    <li
      draggable
      onDragStart={(e) => { e.dataTransfer.setData(TASK_DRAG_MIME, id); e.dataTransfer.effectAllowed = "copyMove"; haptics.pickup(); onDragActive?.(true); }}
      onDragEnd={() => onDragActive?.(false)}
      onPointerDown={pointer.onPointerDown}
      style={{ minHeight: ROW_PX }}
      className="group flex touch-none items-start gap-2 rounded-lg border border-border/50 bg-card/70 px-2 py-1.5 text-[12.5px]"
    >
      <BlockCheckbox done={!!task.done} title={title} onToggle={onToggle} className="mt-1" />
      <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
      <span className={cn("min-w-0 flex-1 [overflow-wrap:anywhere] whitespace-normal break-words", task.done && "line-through opacity-60")}>
        {title}
      </span>
      <ScheduleChip task={task} />
      {onPark && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onPark(); }}
          aria-label={`Park ${title} in the tray`}
          className="shrink-0 rounded p-1 text-muted-foreground hover:text-primary"
        >
          <Pin className="h-3.5 w-3.5" />
        </button>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          aria-label={`Remove ${title} from tray`}
          className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </li>
  );
}

/**
 * ClickUp-style dockable Notepad + Task tray, available on every page.
 * Notes auto-save locally; tray items can be dragged onto the planner grid.
 */
export function TrayDock() {
  const { open, tab, notes, taskIds, pos } = useTray();
  const { state, addTask, toggleTask, toggleHabit } = useStore();
  const { routines: routineList } = useRoutines();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [quick, setQuick] = useState("");
  const [dragOver, setDragOver] = useState(false);
  // While a task is being dragged out of the tray, fade the panel back so the
  // planner grid underneath stays visible and droppable.
  const [dragging, setDragging] = useState(false);
  // Panel repositioning (desktop only).
  const panelRef = useRef<HTMLElement | null>(null);
  const moveRef = useRef<{ dx: number; dy: number } | null>(null);
  const [moving, setMoving] = useState(false);

  const todayIso = format(new Date(), "yyyy-MM-dd");

  const trayTasks = useMemo(
    () => taskIds.map(id => state.tasks.find(t => t.id === id)).filter(Boolean),
    [taskIds, state.tasks],
  );

  // Live inbox: open, unscheduled capture items, mirrored (never duplicated) so
  // they can be dragged straight onto the planner grid from the tray.
  const inboxTasks = useMemo(
    () => state.tasks.filter((t: any) =>
      !t.done && !t.parentTaskId && t.status !== "parked" &&
      !t.startTime && (t.inbox === true || !t.dueDate) &&
      !taskIds.includes(t.id)
    ).slice(0, 50),
    [state.tasks, taskIds],
  );

  // Today's scheduled tasks, ordered by start time — read-only overview + quick complete.
  const scheduled = useMemo(
    () => state.tasks
      .filter((t: any) => !t.parentTaskId && t.startTime && (!t.dueDate || t.dueDate === todayIso))
      .sort((a: any, b: any) => (a.startTime ?? "").localeCompare(b.startTime ?? ""))
      .slice(0, 40),
    [state.tasks, todayIso],
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

  const noteToNote = async (id: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const [first, ...rest] = trimmed.split("\n");
    const note = await createNote({ title: first.slice(0, 120) || "Quick note", body: rest.join("\n") || trimmed });
    tray.removeNote(id);
    haptics.success();
    toast.success("Saved to Notes", { action: { label: "Open", onClick: () => navigate(`/notes/${note.id}`) } });
  };

  const startMove = (e: React.PointerEvent) => {
    if (isMobile) return;
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    moveRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    setMoving(true);
    const onMove = (ev: PointerEvent) => {
      if (!moveRef.current) return;
      const w = panelRef.current?.offsetWidth ?? 360;
      const h = panelRef.current?.offsetHeight ?? 320;
      tray.setPos({
        x: Math.max(8, Math.min(window.innerWidth - w - 8, ev.clientX - moveRef.current.dx)),
        y: Math.max(8, Math.min(window.innerHeight - h - 8, ev.clientY - moveRef.current.dy)),
      });
    };
    const onUp = () => {
      moveRef.current = null;
      setMoving(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // The launcher lives in the quick-add FAB menu — nothing is rendered when closed.
  if (!open) return null;

  const floating = !isMobile && pos;

  return (
    <section
      ref={panelRef as any}
      aria-label="Notepad and task tray"
      style={floating ? { left: pos!.x, top: pos!.y, right: "auto", bottom: "auto" } : undefined}
      className={cn(
        "fixed bottom-20 left-2 right-2 z-40 flex max-h-[42vh] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-2xl backdrop-blur-xl transition-all duration-200 sm:left-auto sm:right-4 sm:max-h-[62vh] sm:w-[360px] lg:bottom-6",
        dragging && "pointer-events-none max-h-[22vh] opacity-25",
        moving && "select-none transition-none",
      )}
    >
      <header className="flex items-center gap-1 border-b border-border/50 p-2">
        <button
          type="button"
          onPointerDown={startMove}
          aria-label="Move tray panel"
          className="hidden shrink-0 cursor-grab rounded-full p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing sm:inline-flex"
        >
          <Move className="h-3.5 w-3.5" />
        </button>
        <div
          role="tablist"
          aria-label="Tray sections"
          className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {TRAY_TABS.map(t => {
            const Icon = TAB_ICON[t];
            return (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              type="button"
              onClick={() => tray.setTab(t)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] capitalize transition-colors",
                tab === t ? "bg-primary/15 font-medium text-primary" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className={cn(tab !== t && "sr-only sm:not-sr-only")}>{t}</span>
              {t === "tray" && (taskIds.length + inboxTasks.length) > 0 && (
                <span className="rounded-full bg-primary/15 px-1.5 text-[10px]">{taskIds.length + inboxTasks.length}</span>
              )}
            </button>
          );})}
        </div>
        <button
          type="button"
          onClick={() => tray.setOpen(false)}
          aria-label="Close notepad and task tray"
          className="ml-auto shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {tab === "notepad" && (
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
                  onClick={() => void noteToNote(n.id, n.text)}>
                  <FileText className="h-3.5 w-3.5" /> Save note
                </Button>
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
      )}

      {tab === "tray" && (
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
            <p className="px-1 py-3 text-center text-[12px] text-muted-foreground">
              Drag tasks here to park them, then drag them onto the planner grid.
            </p>
          ) : (
            <>
              <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Parked · {trayTasks.length}
              </p>
              <ul className="space-y-1.5">
                {trayTasks.map((t: any) => (
                  <TrayRow key={t.id} task={t} onToggle={() => void toggleTask(t.id)}
                    onRemove={() => tray.removeTask(t.id)} onDragActive={setDragging} />
                ))}
              </ul>
              <Button size="sm" variant="ghost" className="w-full text-[11px] text-muted-foreground"
                onClick={() => tray.clearTasks()}>
                Clear parked
              </Button>
            </>
          )}

          {inboxTasks.length > 0 && (
            <>
              <p className="px-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Inbox · {inboxTasks.length}
              </p>
              <ul className="space-y-1.5">
                {inboxTasks.map((t: any) => (
                  <TrayRow key={t.id} task={t} onToggle={() => void toggleTask(t.id)}
                    onPark={() => tray.addTask(t.id)} onDragActive={setDragging} />
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {tab === "schedule" && (
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain p-2 [-webkit-overflow-scrolling:touch]">
          <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Today · {scheduled.length}
          </p>
          {scheduled.length === 0 ? (
            <p className="px-1 py-3 text-center text-[12px] text-muted-foreground">Nothing scheduled yet today.</p>
          ) : scheduled.map((t: any) => (
            <div key={t.id} className="flex items-start gap-2 rounded-lg border border-border/50 bg-card/70 px-2 py-1.5 text-[12.5px]">
              <BlockCheckbox done={!!t.done} title={t.title} onToggle={() => void toggleTask(t.id)} className="mt-1" />
              <button type="button" onClick={() => openTaskQuickEdit(t.id)}
                className={cn("min-w-0 flex-1 text-left [overflow-wrap:anywhere]", t.done && "line-through opacity-60")}>
                {t.title}
              </button>
              <ScheduleChip task={t} />
            </div>
          ))}
        </div>
      )}

      {tab === "habits" && (
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain p-2 [-webkit-overflow-scrolling:touch]">
          {state.habits.length === 0 ? (
            <p className="px-1 py-3 text-center text-[12px] text-muted-foreground">No habits yet.</p>
          ) : state.habits.map((h: any) => {
            const done = !!h.log?.[todayIso];
            return (
              <div key={h.id} className="flex items-start gap-2 rounded-lg border border-border/50 bg-card/70 px-2 py-1.5 text-[12.5px]">
                <BlockCheckbox done={done} title={h.name ?? h.title ?? "Habit"} onToggle={() => void toggleHabit(h.id)} className="mt-1" />
                <span className={cn("min-w-0 flex-1 [overflow-wrap:anywhere]", done && "line-through opacity-60")}>
                  {h.name ?? h.title}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {tab === "routines" && (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-2 [-webkit-overflow-scrolling:touch]">
          {routineList.length === 0 ? (
            <p className="px-1 py-3 text-center text-[12px] text-muted-foreground">No routines yet.</p>
          ) : routineList.map(r => (
            <div key={r.id} className="space-y-1">
              <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {r.person_name} · {SLOT_LABEL[r.slot]}
              </p>
              {r.items.map(item => (
                <div key={item.id} className="flex items-start gap-2 rounded-lg border border-border/50 bg-card/70 px-2 py-1.5 text-[12.5px]">
                  <BlockCheckbox done={!!item.done} title={item.text}
                    onToggle={() => void routinesApi.toggleItem(r.person_name, r.slot, item.id)} className="mt-1" />
                  <span className={cn("min-w-0 flex-1 [overflow-wrap:anywhere]", item.done && "line-through opacity-60")}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}