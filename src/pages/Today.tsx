import { useState } from "react";
import { useStore, todayISO } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { TaskRow } from "@/components/cards/TaskRow";
import { EnergyCheckIn } from "@/components/cards/EnergyCheckIn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Coffee, Sun, Moon, MoonStar, Sparkles, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { DndContext, DragEndEvent, PointerSensor, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { DayPart, Meal } from "@/lib/types";
import { MealEditor } from "@/components/meals/MealEditor";
import { WeatherWidget } from "@/components/widgets/WeatherWidget";
import { MoonPhaseWidget } from "@/components/widgets/MoonPhaseWidget";
import { TaskProgressBar } from "@/components/cards/TaskProgressBar";
import { dayPartSuggestion, useWeatherSnapshot } from "@/lib/weather-store";

const PARTS = [
  { key: "Morning", icon: Coffee },
  { key: "Afternoon", icon: Sun },
  { key: "Evening", icon: Moon },
  { key: "Late Night", icon: MoonStar },
] as const;

function PartDropZone({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return <div ref={setNodeRef} className={cn("space-y-1 rounded-xl border border-dashed border-border/60 p-2 transition-colors", isOver && "border-primary/40 bg-primary/10")}>{children}</div>;
}

export default function Today() {
  const { state, addTask, addJournal, updateTask } = useStore();
  const T = todayISO();
  const weather = useWeatherSnapshot();
  const [quick, setQuick] = useState("");
  const [reflection, setReflection] = useState("");
  const [mealOpen, setMealOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [mealSlot, setMealSlot] = useState<Meal["slot"]>("Dinner");

  const openNewMeal = (slot: Meal["slot"] = "Dinner") => { setEditingMeal(null); setMealSlot(slot); setMealOpen(true); };
  const openEditMeal = (m: Meal) => { setEditingMeal(m); setMealOpen(true); };

  const quickAddTask = (extra: Partial<{ dayPart: DayPart; area: string }>) => {
    const title = prompt(extra.dayPart ? `Add a task for ${extra.dayPart}:` : extra.area ? `Add a ${extra.area.toLowerCase()} task:` : "Add a flexible task:");
    if (title?.trim()) addTask({ title: title.trim(), dueDate: T, ...extra } as any);
  };

  const tasksToday = state.tasks.filter(t => t.dueDate === T || t.isTopThree);
  const top3 = state.tasks.filter(t => !t.done && t.isTopThree).slice(0, 3);
  const flexible = state.tasks.filter(t => !t.done && !t.dayPart && t.dueDate === T && !t.isTopThree);
  const family = state.tasks.filter(t => !t.done && (t.area === "Kids" || t.area === "Family" || t.area === "Caregiving"));
  const meals = state.meals.filter(m => m.date === T);
  const appts = state.appointments.filter(a => a.date === T).sort((a,b) => (a.time ?? "").localeCompare(b.time ?? ""));

  const lowMode = state.settings.lowEnergyMode;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over) return;
    const id = String(e.active.id);
    const dropId = String(e.over.id);
    const t = state.tasks.find(x => x.id === id);
    if (!t) return;
    if (dropId === "today-flexible") {
      if (t.dayPart || t.dueDate !== T) await updateTask(id, { dayPart: undefined, dueDate: T });
    } else if (dropId.startsWith("part-")) {
      const part = dropId.replace("part-", "") as DayPart;
      if (t.dayPart !== part || t.dueDate !== T) await updateTask(id, { dayPart: part, dueDate: T });
    } else return;
    toast.success("Moved gently.");
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
    <div className="space-y-6">
      <div className="cozy-card overflow-hidden">
        <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between gradient-calm">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{format(new Date(), "EEEE")}</p>
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">{format(new Date(), "MMMM d, yyyy")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{lowMode ? "Low-energy mode: only the essentials." : "What does today actually need?"}</p>
          </div>
          <EnergyCheckIn />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2"><WeatherWidget /></div>
        <MoonPhaseWidget />
      </div>

      <TaskProgressBar scope="today" />

      <SectionCard title="Top three" subtitle="The shape of a real day." accent="calm">
        {top3.length === 0
          ? <p className="text-sm text-muted-foreground">Pick three small things below and mark them as your top three.</p>
          : <div className="space-y-1">{top3.map(t => <TaskRow key={t.id} task={t} draggable />)}</div>}
        <form className="mt-3 flex gap-2" onSubmit={e => { e.preventDefault(); if (!quick.trim()) return; addTask({ title: quick, dueDate: T, isTopThree: top3.length < 3 }); setQuick(""); }}>
          <Input placeholder={top3.length < 3 ? "Add to top three…" : "Add a task for today…"} value={quick} onChange={e => setQuick(e.target.value)} />
          <Button type="submit">Add</Button>
        </form>
      </SectionCard>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="Time blocks" subtitle="Drag energy through the day." accent="warm">
          <div className="space-y-4">
            {PARTS.map(({ key, icon: Icon }) => {
              const items = tasksToday.filter(t => t.dayPart === key);
              const dp = weather?.dayParts.find(p => p.part === key);
              const tip = dayPartSuggestion(dp);
              return (
                <div key={key}>
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" /> {key}
                    </span>
                    {dp && dp.conditionLabel !== "—" && (
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        · {dp.avgTempC}° {dp.conditionLabel.toLowerCase()}
                        {dp.precipChance >= 30 && <> · 💧 {dp.precipChance}%</>}
                      </span>
                    )}
                  </div>
                  {tip && (
                    <p className="mb-1.5 text-[11.5px] italic text-foreground/70">{tip}</p>
                  )}
                  <PartDropZone id={`part-${key}`}>
                    {items.length === 0
                      ? <p className="px-2 py-1 text-xs text-muted-foreground">— open block — drop a task here</p>
                      : items.map(t => <TaskRow key={t.id} task={t} dense showArea={false} draggable />)}
                    <Button variant="ghost" size="sm" className="mt-1 w-full justify-start text-xs text-muted-foreground" onClick={() => quickAddTask({ dayPart: key })}><Plus className="mr-1 h-3 w-3" />add to {key.toLowerCase()}</Button>
                  </PartDropZone>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <div className="space-y-5">
          <SectionCard title="Flexible list" subtitle="Whenever there's a pocket of time." accent="sage">
            <PartDropZoneFlexible>
              {flexible.length === 0
                ? <p className="px-2 py-1 text-sm text-muted-foreground">Nothing flexible right now. Breathe.</p>
                : <div className="space-y-1">{flexible.map(t => <TaskRow key={t.id} task={t} dense draggable />)}</div>}
            </PartDropZoneFlexible>
            <Button variant="ghost" size="sm" className="mt-2 w-full justify-start text-xs text-muted-foreground" onClick={() => quickAddTask({})}><Plus className="mr-1 h-3 w-3" />add a flexible task</Button>
          </SectionCard>

          {!lowMode && (
            <SectionCard title="Family & caregiving" accent="warm">
              {family.length === 0
                ? <p className="text-sm text-muted-foreground">No outstanding people-tasks.</p>
                : <div className="space-y-1">{family.slice(0, 6).map(t => <TaskRow key={t.id} task={t} dense draggable />)}</div>}
              <div className="mt-2 flex flex-wrap gap-1">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => quickAddTask({ area: "Family" as any })}><Plus className="mr-1 h-3 w-3" />family</Button>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => quickAddTask({ area: "Kids" as any })}><Plus className="mr-1 h-3 w-3" />kids</Button>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => quickAddTask({ area: "Caregiving" as any })}><Plus className="mr-1 h-3 w-3" />caregiving</Button>
              </div>
            </SectionCard>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <SectionCard title="Meals" accent="warm" action={<button onClick={() => openNewMeal()} className="text-xs text-primary hover:underline">+ add</button>}>
              {meals.length === 0
                ? <p className="text-sm text-muted-foreground">Nothing planned. Cereal counts.</p>
                : <ul className="space-y-1.5 text-sm">{meals.map(m => (
                    <li key={m.id}>
                      <button onClick={() => openEditMeal(m)} className="w-full rounded-lg bg-muted/40 px-3 py-1.5 text-left transition-colors hover:bg-muted/70">
                        <span className="text-xs uppercase tracking-wider text-muted-foreground">{m.slot}{m.kidSafe ? " · kid-safe" : ""}</span>
                        <div>{m.name}</div>
                      </button>
                    </li>
                  ))}</ul>}
            </SectionCard>
            <SectionCard title="Appointments" accent="calm">
              {appts.length === 0
                ? <p className="text-sm text-muted-foreground">A free day.</p>
                : <ul className="space-y-1.5 text-sm">{appts.map(a => <li key={a.id} className="rounded-lg bg-muted/40 px-3 py-1.5"><span className="text-xs text-muted-foreground">{a.time ?? "—"}</span><div>{a.title}</div></li>)}</ul>}
            </SectionCard>
          </div>
        </div>
      </div>

      <SectionCard title="End-of-day reflection" subtitle="Soft, honest, brief." accent="warm">
        <Textarea rows={4} placeholder="What worked? What was hard? What can wait? What I'm grateful for…" value={reflection} onChange={e => setReflection(e.target.value)} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => { if (!reflection.trim()) return; addJournal({ body: reflection, type: "daily", title: "Reflection" }); setReflection(""); toast.success("Saved to journal."); }}>Save reflection</Button>
          <Button variant="outline" onClick={() => { addJournal({ body: "Resetting after a hard day. Drink water. Clear one surface. One note. Choose tomorrow's top task.", type: "daily", title: "Hard-day reset" }); toast("A small reset. Be gentle."); }}><Sparkles className="mr-2 h-4 w-4" />Reset after hard day</Button>
        </div>
      </SectionCard>

      <SectionCard title="What can wait?" subtitle="Defer without guilt." accent="sage">
        <div className="space-y-1">
          {state.tasks.filter(t => !t.done && t.priority !== "high").slice(0, 5).map(t => (
            <div key={t.id} className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm">
              <span>{t.title}</span>
              <Button size="sm" variant="ghost" className="rounded-full" onClick={() => { const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1); updateTask(t.id, { dueDate: tomorrow.toISOString().slice(0,10) }); toast("Moved to tomorrow."); }}>
                Tomorrow <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
    <MealEditor open={mealOpen} onOpenChange={setMealOpen} meal={editingMeal} defaultDate={T} defaultSlot={mealSlot} />
    </DndContext>
  );
}

function PartDropZoneFlexible({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "today-flexible" });
  return <div ref={setNodeRef} className={cn("rounded-xl transition-colors", isOver && "bg-primary/10 ring-2 ring-primary/30")}>{children}</div>;
}
