import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Sunrise, Sun, Moon, ChevronDown, Plus, UtensilsCrossed, ListChecks, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useStore } from "@/lib/store";
import { useRoutines, routines as routinesApi, type RoutineSlot } from "@/lib/routines";
import { MealSlotCard } from "@/components/today/MealSlotCard";
import { RoutineItemRow } from "@/components/routines/RoutineItemRow";
import { Link } from "react-router-dom";
import type { Task } from "@/lib/types";
import { SlotWeather } from "./SlotWeather";
import { TASK_DRAG_MIME } from "@/components/calendar/UnscheduledTasksRail";
import { toast } from "sonner";
import { Plus as PlusIcon } from "lucide-react";

type Slot = "morning" | "afternoon" | "evening";

const SLOT_META: Record<Slot, {
  label: string;
  subtitle: string;
  icon: typeof Sunrise;
  dayPart: "Morning" | "Afternoon" | "Evening";
  mealSlot: "Breakfast" | "Lunch" | "Dinner";
  routineLabel: string;
  tint: string;
}> = {
  morning:   { label: "Morning",   subtitle: "Set the tone for a peaceful day",   icon: Sunrise, dayPart: "Morning",   mealSlot: "Breakfast", routineLabel: "Morning Reset",    tint: "from-amber-100/70 to-transparent" },
  afternoon: { label: "Afternoon", subtitle: "Keep momentum with intention",      icon: Sun,     dayPart: "Afternoon", mealSlot: "Lunch",     routineLabel: "Midday Reset",     tint: "from-sky-100/60 to-transparent" },
  evening:   { label: "Evening",   subtitle: "Wind down and reflect",             icon: Moon,    dayPart: "Evening",   mealSlot: "Dinner",    routineLabel: "Evening Wind Down", tint: "from-violet-100/60 to-transparent" },
};

const PERSON_KEY = "careflow:dayextras:person:v1";
function readPerson(): string {
  if (typeof localStorage === "undefined") return "";
  return localStorage.getItem(PERSON_KEY) ?? "";
}

interface Props {
  slot: Slot;
  date: Date;
  defaultOpen?: boolean;
  onTaskClick?: (id: string) => void;
  showWeather?: boolean;
}

export function RhythmSection({ slot, date, defaultOpen = true, onTaskClick, showWeather = false }: Props) {
  const meta = SLOT_META[slot];
  const Icon = meta.icon;
  const [open, setOpen] = useState(defaultOpen);
  const [dropHover, setDropHover] = useState(false);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  const { state, toggleTask, updateTask, addTask } = useStore();
  const iso = format(date, "yyyy-MM-dd");

  const tasks = useMemo(
    () => state.tasks.filter(t =>
      t.dueDate === iso &&
      !t.parentTaskId &&
      t.status !== "parked" &&
      (t.dayPart ?? "").toLowerCase() === meta.dayPart.toLowerCase(),
    ),
    [state.tasks, iso, meta.dayPart],
  );

  const meal = useMemo(
    () => state.meals.find(m => m.date === iso && m.slot === meta.mealSlot),
    [state.meals, iso, meta.mealSlot],
  );

  // Routine for selected person + this slot
  const { routines: allRoutines } = useRoutines();
  const person = readPerson() || allRoutines[0]?.person_name || "";
  const routine = useMemo(
    () => allRoutines.find(r => r.person_name === person && r.slot === (slot as RoutineSlot)),
    [allRoutines, person, slot],
  );

  const routineDone = routine ? routine.items.filter(i => i.done).length : 0;
  const routineTotal = routine ? routine.items.length : 0;

  const onTaskDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDropHover(false);
    const id = e.dataTransfer.getData(TASK_DRAG_MIME);
    if (!id) return;
    const t = state.tasks.find(x => x.id === id);
    if (!t) return;
    await updateTask(id, { dueDate: iso, dayPart: meta.dayPart, inbox: false });
    toast.success(`Scheduled “${t.title}” → ${meta.label}`);
  };

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    setAdding(true);
    try {
      await addTask({ title, dueDate: iso, dayPart: meta.dayPart });
      setDraft("");
    } finally { setAdding(false); }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section className={cn("cozy-card overflow-hidden")}>
        <div className={cn("relative bg-gradient-to-br px-4 py-3 sm:px-5", meta.tint)}>
          <CollapsibleTrigger className="flex w-full items-center gap-3 text-left">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-card/70 text-primary shadow-soft">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-display text-lg font-semibold leading-tight text-foreground">
                {meta.label}
              </div>
              <div className="truncate text-xs text-muted-foreground">{meta.subtitle}</div>
            </div>
            <div className="hidden items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground sm:flex">
              <span>{tasks.length} task{tasks.length === 1 ? "" : "s"}</span>
              <span>·</span>
              <span>{meal ? "1 meal" : "0 meals"}</span>
              <span>·</span>
              <span>{routineTotal > 0 ? `${routineDone}/${routineTotal} routine` : "0 routine"}</span>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          {showWeather && <SlotWeather slot={slot} />}
          <div className="grid gap-3 p-4 sm:p-5 md:grid-cols-3">
            {/* Tasks column */}
            <div
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes(TASK_DRAG_MIME)) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDropHover(true);
                }
              }}
              onDragLeave={() => setDropHover(false)}
              onDrop={onTaskDrop}
              className={cn(
                "rounded-2xl border bg-background/60 p-3 transition-all",
                dropHover
                  ? "border-primary/70 bg-primary/10 ring-2 ring-primary/40"
                  : "border-border/40",
              )}
            >
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <ListChecks className="h-3 w-3 text-primary" /> Tasks
                <span className="ml-auto text-[10px] normal-case tracking-normal text-muted-foreground/70">
                  Drop here
                </span>
              </div>
              {tasks.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border/50 px-2 py-3 text-center text-xs text-muted-foreground">
                  Nothing planned for {meta.label.toLowerCase()}.
                </p>
              ) : (
                <ul className="space-y-1">
                  {tasks.map(t => (
                    <li key={t.id} className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-muted/40">
                      <Checkbox
                        checked={t.done}
                        onCheckedChange={() => void toggleTask(t.id)}
                      />
                      <button
                        type="button"
                        onClick={() => onTaskClick?.(t.id)}
                        className={cn(
                          "min-w-0 flex-1 truncate text-left text-sm",
                          t.done && "text-muted-foreground line-through",
                        )}
                      >
                        {t.title}
                      </button>
                      {t.estMinutes ? (
                        <span className="text-[10px] text-muted-foreground">{t.estMinutes}m</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              <form
                onSubmit={submitAdd}
                className="mt-2 flex items-center gap-1 rounded-lg border border-dashed border-border/60 bg-background/50 px-2 py-1"
              >
                <PlusIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Add a ${meta.label.toLowerCase()} task…`}
                  className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/70"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || adding}
                  className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary disabled:opacity-40"
                >
                  Add
                </button>
              </form>
            </div>

            {/* Meal column */}
            <div className="rounded-2xl border border-border/40 bg-background/60 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <UtensilsCrossed className="h-3 w-3 text-accent" /> {meta.mealSlot}
                </div>
                <Link
                  to="/meals"
                  className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  Plan
                </Link>
              </div>
              {meal ? (
                <div className="space-y-1.5">
                  <div className="font-display text-base font-medium text-foreground">{meal.name}</div>
                  {meal.notes && (
                    <p className="line-clamp-3 text-xs text-muted-foreground">{meal.notes}</p>
                  )}
                  {meal.prepMinutes ? (
                    <p className="text-[11px] text-muted-foreground">{meal.prepMinutes} min prep</p>
                  ) : null}
                  {meal.ingredients && meal.ingredients.length > 0 && (
                    <ul className="text-[11px] text-muted-foreground">
                      {meal.ingredients.slice(0, 3).map((ing, i) => (
                        <li key={i}>• {ing}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-border/50 px-2 py-3 text-center text-xs text-muted-foreground">
                  No {meta.mealSlot.toLowerCase()} planned.
                </p>
              )}
              {/* Quick selector reusing existing component */}
              <MealSlotCard date={date} slot={meta.mealSlot} />
            </div>

            {/* Routine column */}
            <div className="rounded-2xl border border-border/40 bg-background/60 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Sunrise className="h-3 w-3 text-primary" /> {meta.routineLabel}
                </div>
                <Link
                  to="/routines"
                  className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  Edit
                </Link>
              </div>
              {!routine || routine.items.length === 0 ? (
                <div className="space-y-2">
                  <p className="rounded-lg border border-dashed border-border/50 px-2 py-3 text-center text-xs text-muted-foreground">
                    No {meta.label.toLowerCase()} routine yet.
                  </p>
                  <Button asChild variant="ghost" size="sm" className="w-full text-xs">
                    <Link to="/routines"><Plus className="mr-1 h-3 w-3" /> Add routine</Link>
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                    <div
                      className="h-full rounded-full bg-primary/70 transition-all"
                      style={{ width: `${routineTotal === 0 ? 0 : (routineDone / routineTotal) * 100}%` }}
                    />
                  </div>
                  <div className="mb-2 text-[11px] text-muted-foreground">
                    {routineDone}/{routineTotal} complete
                  </div>
                  <ul className="space-y-1">
                    {routine.items.slice(0, 6).map(item => (
                      <li key={item.id}>
                        <RoutineItemRow
                          item={item}
                          person={person}
                          slot={slot as RoutineSlot}
                          compact
                        />
                      </li>
                    ))}
                  </ul>
                  {routine.items.length > 6 && (
                    <Button asChild variant="ghost" size="sm" className="mt-1 w-full text-xs text-muted-foreground">
                      <Link to="/routines">View routine <ArrowRight className="ml-1 h-3 w-3" /></Link>
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}