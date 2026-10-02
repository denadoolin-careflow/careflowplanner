import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { CalendarClock, CheckCircle2, Circle, Plus, Sparkles, UtensilsCrossed, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { linkNote } from "@/lib/note-links";
import { WeekMealDialog } from "@/components/planner/WeekMealDialog";
import { openTaskQuickEdit } from "@/lib/open-task-quick-edit";
import { BUCKET_DEFAULT_TIME, BUCKET_LABEL, fmt12, taskTime, type DayPlan, type TimeBucket } from "@/lib/planner/day-plan";
import { CosmicPeek, EventPeek, TaskPeek } from "./PlannerPeeks";
import { PriorityFlag } from "@/components/cards/PriorityFlag";
import { ActivityChip } from "@/components/planner/ActivityChip";
import { taskDragProps, taskDropProps } from "@/lib/notes/task-drag";
import type { Meal, Task } from "@/lib/types";
import { usePlannerDropListener, usePlannerPointerDrag } from "@/lib/planner-touch-drag";
import { CosmicEventPopover } from "@/components/planner/CosmicEventPopover";
import { copyForEvent, guidanceForEvent } from "@/lib/cosmic/transit-copy";

const AREA_TINT: Record<string, string> = {
  Family: "bg-amber-400", Kids: "bg-amber-500", Caregiving: "bg-violet-400",
  Home: "bg-emerald-400", Meals: "bg-yellow-400", Appointments: "bg-violet-400",
  Personal: "bg-sky-400", "Creative Projects": "bg-fuchsia-400", Money: "bg-lime-500",
  "Holidays & Birthdays": "bg-rose-400",
};

const MEAL_FOR: Partial<Record<TimeBucket, Meal["slot"]>> = { morning: "Breakfast", afternoon: "Lunch", evening: "Dinner" };

const BUCKET_STYLE: Record<TimeBucket, string> = {
  allDay: "border-border/60 bg-muted/20",
  morning: "border-amber-300/60 bg-amber-50/45 dark:border-amber-700/50 dark:bg-amber-950/15",
  afternoon: "border-sky-300/60 bg-sky-50/45 dark:border-sky-700/50 dark:bg-sky-950/15",
  evening: "border-violet-300/60 bg-violet-50/45 dark:border-violet-700/50 dark:bg-violet-950/15",
};

function NotebookTaskRow({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const pointer = usePlannerPointerDrag(() => ({ taskId: task.id, label: task.title }), {
    onClick: () => openTaskQuickEdit(task.id),
  });
  const time = taskTime(task);
  return (
    <TaskPeek task={task}>
      <div
        {...taskDragProps(task.id)}
        onPointerDown={pointer.onPointerDown}
        title="Drag or long-press to change time of day"
        className={cn("group flex min-h-9 cursor-grab touch-none select-none items-center gap-2 rounded-md px-1.5 py-1 text-[11.5px] hover:bg-background/75 active:cursor-grabbing", task.done && "opacity-65")}
      >
        <span className="flex w-[4.75rem] shrink-0 items-center gap-1 font-mono text-[10px] tabular-nums text-muted-foreground">
          <span>{time ? fmt12(time) : "Anytime"}</span>
          {task.estMinutes ? <span className="opacity-70">· {task.estMinutes}m</span> : null}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <button type="button" aria-label={task.done ? "Mark not done" : "Mark done"}
                  onPointerDown={e => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onToggle(); }} className="shrink-0">
            {task.done
              ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              : <Circle className="h-4 w-4 text-muted-foreground hover:text-primary" />}
          </button>
          <span className={cn("h-2 w-2 shrink-0 rounded-full", AREA_TINT[task.area] ?? "bg-muted-foreground/40")} aria-hidden />
          <PriorityFlag task={task} className="h-3 w-3" />
          <ActivityChip task={task} className="shrink-0" />
        </span>
        <button type="button" onPointerDown={e => e.stopPropagation()} onClick={() => openTaskQuickEdit(task.id)}
                className={cn("min-w-0 flex-1 truncate text-left hover:underline", task.done && "text-muted-foreground")}>
          {task.title}
        </button>
      </div>
    </TaskPeek>
  );
}

/** One day of the planner, rendered inside a note. Tasks can be added and ticked here. */
export function PeriodDayPlan({ plan, noteId }: { plan: DayPlan; noteId?: string }) {
  const { addTask, toggleTask, updateTask } = useStore();
  const [adding, setAdding] = useState<TimeBucket | null>(null);
  const [draft, setDraft] = useState("");
  const [mealEdit, setMealEdit] = useState<{ meal: Meal | null; slot: Meal["slot"] } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const submit = async (bucket: TimeBucket) => {
    const title = draft.trim();
    if (!title) { setAdding(null); return; }
    setDraft("");
    const time = BUCKET_DEFAULT_TIME[bucket];
    const id = await addTask({
      title,
      dueDate: plan.iso,
      area: "Personal",
      ...(time ? { startTime: time } : { allDay: true }),
    } as any);
    if (id && noteId) void linkNote(noteId, "task", id).catch(() => {});
    if (id) toast.success("Added to the planner", { description: title });
  };

  const handleDrop = async (taskId: string, bucket: TimeBucket) => {
    const time = BUCKET_DEFAULT_TIME[bucket];
    await updateTask(taskId, {
      dueDate: plan.iso,
      startTime: time || undefined,
      allDay: bucket === "allDay",
    } as Partial<Task>);
    toast.success(`Moved to ${BUCKET_LABEL[bucket].toLowerCase()}`);
  };

  usePlannerDropListener(d => {
    const element = document.elementFromPoint(d.clientX, d.clientY) as HTMLElement | null;
    const target = element?.closest<HTMLElement>("[data-notebook-bucket]");
    if (!target || !rootRef.current?.contains(target)) return;
    const bucket = target.dataset.notebookBucket as TimeBucket | undefined;
    const iso = target.dataset.dropdate;
    if (!bucket || iso !== plan.iso) return;
    void handleDrop(d.taskId, bucket);
  });

  const AddLine = ({ bucket }: { bucket: TimeBucket }) =>
    adding === bucket ? (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => void submit(bucket)}
        onKeyDown={e => {
          if (e.key === "Enter") { e.preventDefault(); void submit(bucket); }
          if (e.key === "Escape") { setDraft(""); setAdding(null); }
        }}
        placeholder={`Add to ${BUCKET_LABEL[bucket].toLowerCase()}…`}
        className="w-full rounded-md border border-border/60 bg-background px-2 py-1 text-[11.5px] outline-none focus:border-primary/50"
      />
    ) : (
      <button type="button" onClick={() => { setDraft(""); setAdding(bucket); }}
              className="flex items-center gap-1 rounded-md px-1 py-0.5 text-[11px] text-muted-foreground opacity-70 hover:bg-muted hover:opacity-100">
        <Plus className="h-3 w-3" /> Add to this day
      </button>
    );

  const hasAnything = plan.tasks.length || plan.events.length || plan.meals.length || plan.cosmic.length;

  return (
    <div ref={rootRef} className="space-y-2">
      {/* Cosmic Events First */}
      {plan.cosmic.map(c => (
        <CosmicEventPopover key={c.id} event={{
          id: c.id,
          glyph: c.event.glyph,
          title: c.event.title,
          when: c.event.subtitle,
          detail: copyForEvent(c.event).insight,
          landing: guidanceForEvent(c.event).whatToExpect,
          actions: [guidanceForEvent(c.event).doMore, `Go gently with: ${guidanceForEvent(c.event).doLess}`],
        }}>
          <span className="block">
            <CosmicPeek item={c}>
              <button type="button" className="flex w-full items-center gap-1.5 rounded-md border border-amber-300/45 bg-amber-50/40 px-2 py-1 text-left text-[11.5px] text-foreground hover:bg-amber-50/80 dark:border-amber-700/40 dark:bg-amber-950/15">
                <Sparkles className="h-3 w-3 shrink-0 text-amber-500" aria-hidden />
                <span className="truncate">{c.label}</span>
                <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">Details</span>
              </button>
            </CosmicPeek>
          </span>
        </CosmicEventPopover>
      ))}

      {plan.events.map((a: any) => (
        <EventPeek key={a.id} event={a}>
          <div className="flex items-center gap-1.5 text-[11.5px]">
            <CalendarClock className="h-3 w-3 shrink-0 text-violet-500" aria-hidden />
            <span className="truncate">{a.title}</span>
            {a.time && <span className="text-[10px] text-muted-foreground">{fmt12(a.time)}</span>}
          </div>
        </EventPeek>
      ))}

      {plan.groups.map(g => (
        (g.tasks.length > 0 || g.meals.length > 0 || g.bucket !== "allDay") && (
          <div
            key={g.bucket}
            {...taskDropProps(taskId => handleDrop(taskId, g.bucket))}
            data-notebook-bucket={g.bucket}
            data-dropdate={plan.iso}
            className={cn("rounded-lg border px-2 py-1.5 transition-colors data-[planner-drop-active]:border-primary data-[planner-drop-active]:ring-2 data-[planner-drop-active]:ring-primary/20", BUCKET_STYLE[g.bucket])}
          >
            <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              <span>{BUCKET_LABEL[g.bucket]}</span>
              {g.timeLeft !== undefined && g.timeLeft > 0 && (
                <span className="font-mono lowercase opacity-70">{Math.round(g.timeLeft / 60 * 10) / 10}h left</span>
              )}
            </div>
            
            <ul className="mt-0.5 space-y-0.5">
              {/* Meals under day part */}
              {g.meals.map(m => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setMealEdit({ meal: m, slot: m.slot })}
                    className="flex w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-[11.5px] hover:bg-muted/60"
                  >
                    <UtensilsCrossed className="h-3.5 w-3.5 shrink-0 text-yellow-600" aria-hidden />
                    <span className="text-muted-foreground">{m.slot}:</span>
                    <span className="truncate">{m.name}</span>
                  </button>
                </li>
              ))}

              {MEAL_FOR[g.bucket] && !g.meals.some(m => m.slot === MEAL_FOR[g.bucket]) && (
                <li>
                  <button type="button" onClick={() => { const slot = MEAL_FOR[g.bucket]; if (slot) setMealEdit({ meal: null, slot }); }}
                          className="flex w-full items-center gap-1.5 rounded-md border border-dashed border-border/60 px-1 py-0.5 text-[11px] text-muted-foreground hover:bg-muted/60">
                    <UtensilsCrossed className="h-3 w-3 shrink-0" aria-hidden /> Plan {MEAL_FOR[g.bucket]!.toLowerCase()}
                  </button>
                </li>
              )}
              {/* Tasks */}
              {g.tasks.map(t => (
                <li key={t.id}>
                  <NotebookTaskRow task={t} onToggle={() => void toggleTask(t.id)} />
                </li>
              ))}
            </ul>
            <div className="mt-0.5"><AddLine bucket={g.bucket} /></div>
          </div>
        )
      ))}

      {!hasAnything && (
        <p className="px-1 text-[11px] text-muted-foreground">Nothing on {format(new Date(`${plan.iso}T12:00:00`), "MMM d")} yet.</p>
      )}

      {mealEdit && (
        <WeekMealDialog
          open
          onOpenChange={v => { if (!v) setMealEdit(null); }}
          meal={mealEdit.meal}
          date={plan.iso}
          slot={mealEdit.slot}
        />
      )}
    </div>
  );
}
