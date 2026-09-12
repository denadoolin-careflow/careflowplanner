import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { CalendarClock, CheckCircle2, Circle, Plus, Sparkles, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { linkNote } from "@/lib/note-links";
import { WeekMealDialog } from "@/components/planner/WeekMealDialog";
import { BUCKET_DEFAULT_TIME, BUCKET_LABEL, fmt12, taskTime, type DayPlan, type TimeBucket } from "@/lib/planner/day-plan";
import { CosmicPeek, EventPeek, TaskPeek } from "./PlannerPeeks";
import type { Meal } from "@/lib/types";

const AREA_TINT: Record<string, string> = {
  Family: "bg-amber-400", Kids: "bg-amber-500", Caregiving: "bg-violet-400",
  Home: "bg-emerald-400", Meals: "bg-yellow-400", Appointments: "bg-violet-400",
  Personal: "bg-sky-400", "Creative Projects": "bg-fuchsia-400", Money: "bg-lime-500",
  "Holidays & Birthdays": "bg-rose-400",
};

/** One day of the planner, rendered inside a note. Tasks can be added and ticked here. */
export function PeriodDayPlan({ plan, noteId }: { plan: DayPlan; noteId?: string }) {
  const { addTask, toggleTask } = useStore();
  const [adding, setAdding] = useState<TimeBucket | null>(null);
  const [draft, setDraft] = useState("");
  const [mealEdit, setMealEdit] = useState<{ meal: Meal | null; slot: Meal["slot"] } | null>(null);

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
    <div className="space-y-1.5">
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
        (g.tasks.length > 0 || g.bucket !== "allDay") && (
          <div key={g.bucket} className="rounded-lg px-1 py-0.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">{BUCKET_LABEL[g.bucket]}</div>
            <ul className="mt-0.5 space-y-0.5">
              {g.tasks.map(t => (
                <li key={t.id}>
                  <TaskPeek task={t}>
                    <div className="group flex items-center gap-1.5 rounded-md px-1 py-0.5 text-[11.5px] hover:bg-muted/60">
                      <button type="button" aria-label={t.done ? "Mark not done" : "Mark done"}
                              onClick={() => void toggleTask(t.id)} className="shrink-0">
                        {t.done
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          : <Circle className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />}
                      </button>
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", AREA_TINT[t.area] ?? "bg-muted-foreground/40")} aria-hidden />
                      <Link to={`/tasks/${t.id}`} className={cn("min-w-0 flex-1 truncate hover:underline", t.done && "text-muted-foreground line-through")}>
                        {t.title}
                      </Link>
                      {taskTime(t) && <span className="shrink-0 text-[10px] text-muted-foreground">{fmt12(taskTime(t))}</span>}
                    </div>
                  </TaskPeek>
                </li>
              ))}
            </ul>
            <div className="mt-0.5"><AddLine bucket={g.bucket} /></div>
          </div>
        )
      ))}

      {plan.meals.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-1 text-[11.5px]">
          <UtensilsCrossed className="h-3 w-3 shrink-0 text-yellow-600" aria-hidden />
          {plan.meals.map(m => (
            <button key={m.id} type="button" onClick={() => setMealEdit({ meal: m, slot: m.slot })}
                    className="rounded-full border border-border/60 px-2 py-0.5 hover:bg-muted">
              <span className="text-muted-foreground">{m.slot}:</span> {m.name}
            </button>
          ))}
        </div>
      )}

      {plan.cosmic.map(c => (
        <CosmicPeek key={c.id} item={c}>
          <div className="flex items-center gap-1.5 px-1 text-[11.5px] text-muted-foreground">
            <Sparkles className="h-3 w-3 shrink-0 text-amber-500" aria-hidden />
            <span className="truncate">{c.label}</span>
          </div>
        </CosmicPeek>
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
