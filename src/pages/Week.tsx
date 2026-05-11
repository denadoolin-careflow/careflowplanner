import { useStore, todayISO } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { TaskRow } from "@/components/cards/TaskRow";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { startOfWeek, addDays, format, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wand2, CalendarHeart, Soup, LayoutGrid, Columns3 } from "lucide-react";
import { DndContext, DragEndEvent, PointerSensor, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { WeeklyWeather } from "@/components/widgets/WeeklyWeather";
import { Input } from "@/components/ui/input";
import { DayWeatherMoon } from "@/components/widgets/DayWeatherMoon";
import { gcalFetchEvents, type GCalEvent } from "@/lib/google-calendar";
import { HabitProgressBar } from "@/components/widgets/HabitProgressBar";
import type { DayPart, Task } from "@/lib/types";
import { WeekNavigator } from "@/components/week/WeekNavigator";
import { useResetChecklists } from "@/lib/reset-checklists";
import { ChecklistTree } from "@/components/reset/ChecklistTree";
import { AIGenerateMenu } from "@/components/reset/AIGenerateMenu";
import { motion, AnimatePresence } from "framer-motion";

function DayDropZone({ id, children, isToday }: { id: string; children: React.ReactNode; isToday: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={cn("min-h-[60px] rounded-xl transition-colors", isOver && "bg-primary/10 ring-2 ring-primary/30", !isOver && isToday && "bg-primary/5")}>
      {children}
    </div>
  );
}

function InlineAddTask({ onAdd, label }: { onAdd: (title: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 w-full justify-start text-xs text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        + add task
      </Button>
    );
  }
  const submit = () => {
    const t = value.trim();
    if (t) onAdd(t);
    setValue("");
    setOpen(false);
  };
  return (
    <form
      className="mt-2 flex gap-1"
      onSubmit={(e) => { e.preventDefault(); submit(); }}
    >
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={submit}
        onKeyDown={(e) => { if (e.key === "Escape") { setValue(""); setOpen(false); } }}
        placeholder={label}
        className="h-7 text-xs"
      />
    </form>
  );
}

export default function Week() {
  const { state, addJournal, addTask, updateTask, resetThisWeek } = useStore();
  const [start, setStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const [reflection, setReflection] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [gEvents, setGEvents] = useState<GCalEvent[]>([]);
  const [view, setView] = useState<"cards" | "kanban">(() =>
    (typeof localStorage !== "undefined" && (localStorage.getItem("careflow:week-view") as any)) || "cards"
  );
  useEffect(() => { try { localStorage.setItem("careflow:week-view", view); } catch { /* noop */ } }, [view]);
  useEffect(() => {
    gcalFetchEvents().then(r => setGEvents(r.events ?? [])).catch(() => { /* not connected, silent */ });
  }, []);

  const weekStartISO = start.toISOString().slice(0, 10);
  const reset = useResetChecklists({ weekStart: weekStartISO });

  const tasksFor = (d: Date) => state.tasks.filter(t => t.dueDate === d.toISOString().slice(0, 10));
  const eventsFor = (iso: string) => [
    ...state.appointments.filter(a => a.date === iso).map(a => ({ id: a.id, title: a.title, time: a.time ?? null, kind: "appt" as const })),
    ...gEvents.filter(g => g.date === iso).map(g => ({ id: g.id, title: g.title, time: g.time ?? null, kind: "gcal" as const })),
  ].sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  const mealsFor = (iso: string) => state.meals.filter(m => m.date === iso);

  const KANBAN_PARTS: DayPart[] = ["Morning", "Afternoon", "Evening"];
  const tasksByPart = (d: Date) => {
    const ts = tasksFor(d);
    const buckets: Record<DayPart | "Unassigned", Task[]> = {
      Morning: [], Afternoon: [], Evening: [], "Late Night": [], Unassigned: [],
    };
    for (const t of ts) {
      if (t.dayPart && buckets[t.dayPart]) buckets[t.dayPart].push(t);
      else buckets.Unassigned.push(t);
    }
    return buckets;
  };

  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over) return;
    const taskId = String(e.active.id);
    const newDate = String(e.over.id);
    const t = state.tasks.find(x => x.id === taskId);
    if (!t || t.dueDate === newDate) return;
    await updateTask(taskId, { dueDate: newDate });
    toast.success("Moved gently.");
  };

  return (
    <div className="space-y-6">
      <div className="cozy-card gradient-sage flex flex-col gap-3 p-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Week of</p>
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">{format(start, "MMMM d")} – {format(addDays(start, 6), "MMMM d")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">A weekly command center, gently held.</p>
          <div className="mt-3"><WeekNavigator weekStart={start} onChange={setStart} /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-full border border-border bg-card p-0.5">
            <button
              onClick={() => setView("cards")}
              className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs",
                view === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <LayoutGrid className="h-3 w-3" /> Cards
            </button>
            <button
              onClick={() => setView("kanban")}
              className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs",
                view === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <Columns3 className="h-3 w-3" /> Kanban
            </button>
          </div>
          <Button variant="outline" onClick={async () => { await resetThisWeek(); toast.success("Fresh week, ready when you are."); }}>
            Reset this week
          </Button>
          <AIGenerateMenu onGenerated={reset.refresh} weekStart={weekStartISO} />
        </div>
      </div>

      <AnimatePresence mode="wait">
      <motion.div key={weekStartISO} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      {view === "cards" ? (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {days.map(d => {
          const isToday = d.toISOString().slice(0,10) === todayISO();
          const ts = tasksFor(d);
          const iso = d.toISOString().slice(0,10);
          return (
            <SectionCard
              key={d.toISOString()}
              title={<span className={isToday ? "text-primary" : ""}>{format(d, "EEEE")}</span>}
              subtitle={format(d, "MMM d")}
              accent={isToday ? "calm" : "none"}
            >
              <HabitProgressBar dateISO={iso} />
              <DayWeatherMoon date={d} className="mb-2" />
              <DayDropZone id={iso} isToday={isToday}>
                {ts.length === 0
                  ? <p className="px-2 py-3 text-xs text-muted-foreground">Drag a task here when you're ready.</p>
                  : <div className="space-y-1">{ts.slice(0,8).map(t => <TaskRow key={t.id} task={t} dense showArea={false} draggable />)}</div>}
              </DayDropZone>
              <InlineAddTask
                label={`Task for ${format(d, "EEEE")}`}
                onAdd={(title) => addTask({ title, dueDate: iso })}
              />
              {(() => {
                const evs = eventsFor(iso);
                const meals = mealsFor(iso);
                if (evs.length === 0 && meals.length === 0) return null;
                return (
                  <div className="mt-3 space-y-2 border-t border-border/50 pt-2">
                    {evs.length > 0 && (
                      <div>
                        <div className="mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          <CalendarHeart className="h-3 w-3" /> Events
                        </div>
                        <ul className="space-y-0.5">
                          {evs.slice(0, 4).map(e => (
                            <li key={`${e.kind}-${e.id}`} className={cn(
                              "flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] transition-colors hover:bg-muted/60",
                              e.kind === "gcal" ? "bg-muted/40" : "bg-secondary-soft/60 text-secondary-foreground"
                            )}>
                              {e.time && <span className="font-medium tabular-nums opacity-70">{e.time.slice(0,5)}</span>}
                              <span className="truncate">{e.title}</span>
                            </li>
                          ))}
                          {evs.length > 4 && <li className="px-1.5 text-[10px] text-muted-foreground">+{evs.length - 4} more</li>}
                        </ul>
                      </div>
                    )}
                    {meals.length > 0 && (
                      <div>
                        <div className="mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          <Soup className="h-3 w-3" /> Meals
                        </div>
                        <ul className="space-y-0.5">
                          {meals.map(m => (
                            <li key={m.id} className="flex items-center gap-1.5 rounded-md bg-warm-soft/60 px-1.5 py-0.5 text-[11px] text-warm-foreground">
                              <span className="text-[9px] uppercase tracking-wider opacity-70">{m.slot.slice(0,3)}</span>
                              <span className="truncate">{m.name}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })()}
            </SectionCard>
          );
        })}
      </div>
      ) : (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
        {days.map(d => {
          const iso = d.toISOString().slice(0,10);
          const isToday = iso === todayISO();
          const buckets = tasksByPart(d);
          return (
            <div key={iso} className={cn("flex min-h-[260px] flex-col rounded-2xl border bg-card/60 p-3", isToday ? "border-primary/60" : "border-border/60")}>
              <div className="mb-2 flex items-baseline justify-between">
                <div>
                  <p className={cn("font-display text-sm font-semibold leading-tight", isToday && "text-primary")}>{format(d, "EEE")}</p>
                  <p className="text-[10px] text-muted-foreground">{format(d, "MMM d")}</p>
                </div>
              </div>
              <HabitProgressBar dateISO={iso} />
              {KANBAN_PARTS.map(part => (
                <div key={part} className="mb-2">
                  <div className="mb-1 flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    <span>{part}</span>
                    <span className="tabular-nums">{buckets[part].length}</span>
                  </div>
                  <div className="space-y-1 rounded-lg bg-muted/30 p-1 min-h-[36px]">
                    {buckets[part].length === 0 ? (
                      <p className="px-2 py-1 text-[10px] italic text-muted-foreground/70">—</p>
                    ) : buckets[part].map(t => (
                      <div key={t.id} className="group flex items-center gap-1 rounded-md bg-background/70 px-1.5 py-1 text-[11px]">
                        <input type="checkbox" checked={t.done} onChange={() => updateTask(t.id, { done: !t.done })} className="h-3 w-3 accent-primary" />
                        <span className={cn("flex-1 truncate", t.done && "text-muted-foreground line-through")}>{t.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {buckets.Unassigned.length > 0 && (
                <div className="mb-1">
                  <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Unassigned</div>
                  <div className="space-y-1 rounded-lg bg-muted/20 p-1">
                    {buckets.Unassigned.map(t => (
                      <div key={t.id} className="flex items-center gap-1 rounded-md bg-background/70 px-1.5 py-1 text-[11px]">
                        <input type="checkbox" checked={t.done} onChange={() => updateTask(t.id, { done: !t.done })} className="h-3 w-3 accent-primary" />
                        <span className={cn("flex-1 truncate", t.done && "text-muted-foreground line-through")}>{t.title}</span>
                        <select
                          value=""
                          onChange={(e) => updateTask(t.id, { dayPart: e.target.value as DayPart })}
                          className="rounded bg-transparent text-[9px] text-muted-foreground hover:text-foreground"
                        >
                          <option value="">→</option>
                          {KANBAN_PARTS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <InlineAddTask label={`Task for ${format(d, "EEE")}`} onAdd={(title) => addTask({ title, dueDate: iso })} />
            </div>
          );
        })}
      </div>
      )}
      </DndContext>
      </motion.div>
      </AnimatePresence>

      <WeeklyWeather />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard
          title="Weekly reset"
          subtitle="Editable, draggable, schedulable. Double-click to rename."
          accent="warm"
          className="lg:col-span-2"
        >
          {reset.lists.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">No checklists yet. Generate one with AI or create your own.</p>
              <div className="flex flex-wrap gap-2">
                <AIGenerateMenu onGenerated={reset.refresh} weekStart={weekStartISO} />
                <Button variant="outline" onClick={async () => {
                  const id = await reset.createList({ name: "My weekly reset", kind: "weekly", week_start: weekStartISO });
                  if (id) toast.success("Checklist created");
                }}>
                  + New checklist
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {reset.lists.map(list => (
                <ChecklistTree
                  key={list.id}
                  list={list}
                  onAdd={(item) => reset.addItem(list.id, item)}
                  onUpdate={reset.updateItem}
                  onDelete={reset.deleteItem}
                  onDuplicate={reset.duplicateItem}
                  onReorder={(parentId, ordered) => reset.reorderItems(list.id, parentId, ordered)}
                  onRenameList={(name) => reset.renameList(list.id, name)}
                  onDeleteList={() => reset.deleteList(list.id)}
                  onSaveTemplate={() => { void reset.saveAsTemplate(list.id); toast.success("Saved as template"); }}
                />
              ))}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={async () => {
                  const id = await reset.createList({ name: "New checklist", kind: "custom", week_start: weekStartISO });
                  if (id) toast.success("Created");
                }}>+ New checklist</Button>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="This week's meal plan" accent="sage">
          <div className="space-y-2">
            {days.map(d => {
              const m = state.meals.filter(x => x.date === d.toISOString().slice(0,10) && x.slot === "Dinner");
              return (
                <div key={d.toISOString()} className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2">
                  <span className="w-12 text-xs uppercase text-muted-foreground">{format(d, "EEE")}</span>
                  <span className="text-sm">{m[0]?.name ?? "—"}</span>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Appointment overview" accent="calm">
          {state.appointments.filter(a => parseISO(a.date) >= start && parseISO(a.date) < addDays(start, 7)).map(a => (
            <div key={a.id} className="mb-1.5 flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
              <span>{a.title}</span>
              <span className="text-xs text-muted-foreground">{format(parseISO(a.date), "EEE")} {a.time ?? ""}</span>
            </div>
          ))}
        </SectionCard>

        <SectionCard title="Family & caregiving" accent="warm">
          <div className="space-y-1">
            {state.tasks.filter(t => !t.done && (t.area === "Family" || t.area === "Kids" || t.area === "Caregiving")).slice(0, 6).map(t => (
              <TaskRow key={t.id} task={t} dense />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Weekly goals" accent="calm">
          <ul className="space-y-1.5 text-sm">
            {state.goals.filter(g => g.status === "active").slice(0, 4).map(g => (
              <li key={g.id} className="rounded-lg bg-muted/40 px-3 py-2">{g.title}</li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Weekly reflection" accent="warm">
        <Textarea rows={4} placeholder="What worked? What can I let go of next week?" value={reflection} onChange={e => setReflection(e.target.value)} />
        <Button className="mt-3" onClick={() => { if (!reflection.trim()) return; addJournal({ body: reflection, type: "weekly", title: "Weekly reflection" }); setReflection(""); toast.success("Saved."); }}>Save reflection</Button>
      </SectionCard>
    </div>
  );
}
