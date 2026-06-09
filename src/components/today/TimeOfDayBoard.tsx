import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Sunrise, Sun, Moon, ListChecks, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { useStore } from "@/lib/store";
import { MealSlotCard } from "@/components/today/MealSlotCard";
import { SlotWeather } from "@/components/today/rhythm/SlotWeather";
import { TASK_DRAG_MIME } from "@/components/calendar/UnscheduledTasksRail";
import { toast } from "sonner";

type Slot = "morning" | "afternoon" | "evening";
type DayPart = "Morning" | "Afternoon" | "Evening" | "Anytime";

const SLOTS: { slot: Slot; label: string; icon: typeof Sunrise; meal: "Breakfast" | "Lunch" | "Dinner"; dayPart: DayPart; tint: string }[] = [
  { slot: "morning",   label: "Morning",   icon: Sunrise, meal: "Breakfast", dayPart: "Morning",   tint: "from-amber-100/70 to-transparent" },
  { slot: "afternoon", label: "Afternoon", icon: Sun,     meal: "Lunch",     dayPart: "Afternoon", tint: "from-sky-100/60 to-transparent" },
  { slot: "evening",   label: "Evening",   icon: Moon,    meal: "Dinner",    dayPart: "Evening",   tint: "from-violet-100/60 to-transparent" },
];

/** Restored side-by-side time-of-day planner with meals + tasks below. */
export function TimeOfDayBoard({ date, onTaskClick }: { date: Date; onTaskClick?: (id: string) => void }) {
  const { state, toggleTask, updateTask, addTask } = useStore();
  const iso = format(date, "yyyy-MM-dd");

  const todayTasks = useMemo(
    () => state.tasks.filter(t => t.dueDate === iso && !t.parentTaskId && t.status !== "parked"),
    [state.tasks, iso],
  );

  const tasksByPart = useMemo(() => {
    const buckets: Record<DayPart, typeof todayTasks> = { Morning: [], Afternoon: [], Evening: [], Anytime: [] };
    for (const t of todayTasks) {
      const dp = (t.dayPart ?? "").toLowerCase();
      if (dp === "morning") buckets.Morning.push(t);
      else if (dp === "afternoon") buckets.Afternoon.push(t);
      else if (dp === "evening") buckets.Evening.push(t);
      else buckets.Anytime.push(t);
    }
    return buckets;
  }, [todayTasks]);

  return (
    <section className="cozy-card overflow-hidden">
      <div className="grid gap-3 p-3 sm:p-4 md:grid-cols-3">
        {SLOTS.map(s => {
          const Icon = s.icon;
          const tasks = tasksByPart[s.dayPart];
          return (
            <div key={s.slot} className={cn("rounded-2xl border border-border/40 bg-gradient-to-br p-3 flex flex-col", s.tint)}>
              <div className="mb-2 flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-card/70 text-primary shadow-soft">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="font-display text-base font-semibold text-foreground">{s.label}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {tasks.length} task{tasks.length === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
              <SlotWeather slot={s.slot} />
              <div className="mt-2 rounded-xl border border-border/40 bg-background/60 p-2">
                <MealSlotCard date={date} slot={s.meal} />
              </div>
              <div className="mt-3 flex-1">
                <TaskGroup
                  label={s.dayPart}
                  date={date}
                  dayPart={s.dayPart}
                  tasks={tasks}
                  onToggle={toggleTask}
                  onTaskClick={onTaskClick}
                  onDrop={async (id) => {
                    const t = state.tasks.find(x => x.id === id);
                    if (!t) return;
                    await updateTask(id, { dueDate: iso, dayPart: s.dayPart, inbox: false });
                    toast.success(`Scheduled "${t.title}" → ${s.dayPart}`);
                  }}
                  onAdd={async (title) => {
                    await addTask({ title, dueDate: iso, dayPart: s.dayPart });
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Anytime tasks — full width below the three columns */}
      {tasksByPart.Anytime.length > 0 && (
        <div className="border-t border-border/40 p-3 sm:p-4">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <ListChecks className="h-3.5 w-3.5 text-primary" />
            Anytime
            <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] tabular-nums text-primary">
              {tasksByPart.Anytime.length}
            </span>
          </div>
          <TaskGroup
            label="Anytime"
            date={date}
            tasks={tasksByPart.Anytime}
            onToggle={toggleTask}
            onTaskClick={onTaskClick}
            onDrop={async (id) => {
              const t = state.tasks.find(x => x.id === id);
              if (!t) return;
              await updateTask(id, { dueDate: iso, dayPart: undefined, inbox: false });
              toast.success(`Scheduled "${t.title}" → Anytime`);
            }}
            onAdd={async (title) => {
              await addTask({ title, dueDate: iso });
            }}
          />
        </div>
      )}
    </section>
  );
}

function TaskGroup({
  label, tasks, onToggle, onTaskClick, onDrop, onAdd,
}: {
  label: string;
  date: Date;
  dayPart?: "Morning" | "Afternoon" | "Evening";
  tasks: { id: string; title: string; done: boolean; estMinutes?: number | null }[];
  onToggle: (id: string) => void | Promise<void>;
  onTaskClick?: (id: string) => void;
  onDrop: (id: string) => Promise<void>;
  onAdd: (title: string) => Promise<void>;
}) {
  const [hover, setHover] = useState(false);
  const [draft, setDraft] = useState("");
  return (
    <div
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(TASK_DRAG_MIME)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setHover(true);
        }
      }}
      onDragLeave={() => setHover(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setHover(false);
        const id = e.dataTransfer.getData(TASK_DRAG_MIME);
        if (id) await onDrop(id);
      }}
      className={cn(
        "rounded-2xl border bg-background/60 p-3 transition-all",
        hover ? "border-primary/70 bg-primary/10 ring-2 ring-primary/40" : "border-border/40",
      )}
    >
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
        <span className="ml-1 text-muted-foreground/60">· {tasks.length}</span>
      </div>
      {tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/50 px-2 py-3 text-center text-xs text-muted-foreground">
          Nothing yet.
        </p>
      ) : (
        <ul className="space-y-1">
          {tasks.map(t => (
            <li key={t.id} className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-muted/40">
              <Checkbox checked={t.done} onCheckedChange={() => void onToggle(t.id)} />
              <button
                type="button"
                onClick={() => onTaskClick?.(t.id)}
                className={cn(
                  "min-w-0 flex-1 whitespace-normal break-words text-left text-sm leading-snug",
                  t.done && "text-muted-foreground line-through",
                )}
                style={{ overflowWrap: "anywhere" }}
              >
                {t.title}
              </button>
              {t.estMinutes ? <span className="text-[10px] text-muted-foreground">{t.estMinutes}m</span> : null}
            </li>
          ))}
        </ul>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const title = draft.trim();
          if (!title) return;
          await onAdd(title);
          setDraft("");
        }}
        className="mt-2 flex items-center gap-1 rounded-lg border border-dashed border-border/60 bg-background/50 px-2 py-1"
      >
        <Plus className="h-3 w-3 shrink-0 text-muted-foreground" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a task…"
          className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/70"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary disabled:opacity-40"
        >
          Add
        </button>
      </form>
    </div>
  );
}