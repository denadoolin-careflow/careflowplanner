import { useStore, todayISO } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { TaskRow } from "@/components/cards/TaskRow";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { startOfWeek, addDays, format, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wand2, CalendarHeart, Soup } from "lucide-react";
import { DndContext, DragEndEvent, PointerSensor, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { WeeklyWeather } from "@/components/widgets/WeeklyWeather";
import { Input } from "@/components/ui/input";
import { DayWeatherMoon } from "@/components/widgets/DayWeatherMoon";
import { gcalFetchEvents, type GCalEvent } from "@/lib/google-calendar";

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
  const { state, addJournal, toggleCleaning, addTask, updateTask, regenerateWeeklyReset, resetThisWeek } = useStore();
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const [reflection, setReflection] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [gEvents, setGEvents] = useState<GCalEvent[]>([]);
  useEffect(() => {
    gcalFetchEvents().then(r => setGEvents(r.events ?? [])).catch(() => { /* not connected, silent */ });
  }, []);

  const tasksFor = (d: Date) => state.tasks.filter(t => t.dueDate === d.toISOString().slice(0, 10));
  const eventsFor = (iso: string) => [
    ...state.appointments.filter(a => a.date === iso).map(a => ({ id: a.id, title: a.title, time: a.time ?? null, kind: "appt" as const })),
    ...gEvents.filter(g => g.date === iso).map(g => ({ id: g.id, title: g.title, time: g.time ?? null, kind: "gcal" as const })),
  ].sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  const mealsFor = (iso: string) => state.meals.filter(m => m.date === iso);
  const reset = state.cleaning.filter(c => c.cadence === "weekly");

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
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={async () => { await resetThisWeek(); toast.success("Fresh week, ready when you are."); }}>
            Reset this week
          </Button>
          <Button onClick={async () => { await regenerateWeeklyReset(); toast.success("Your weekly rhythm is set."); }}>
            <Wand2 className="mr-2 h-4 w-4" />Generate this week's reset
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
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
      </DndContext>

      <WeeklyWeather />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="Weekly reset checklist" accent="warm">
          {reset.length === 0 ? (
            <p className="text-sm text-muted-foreground">Your weekly reset will appear here. Tap “Generate this week's reset” to begin.</p>
          ) : (
            <ul className="space-y-1.5">
              {reset.map(c => (
                <li key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-muted/40">
                  <Checkbox checked={c.done} onCheckedChange={() => toggleCleaning(c.id)} />
                  <span className={c.done ? "text-muted-foreground line-through" : ""}>{c.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{c.zone}</span>
                </li>
              ))}
            </ul>
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

        <SectionCard title="Cleaning zones this week" accent="sage">
          <div className="grid grid-cols-2 gap-2">
            {Array.from(new Set(reset.map(r => r.zone))).map(zone => (
              <div key={zone} className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{zone}</div>
                <div className="mt-1 text-sm">{reset.filter(r => r.zone === zone && r.done).length} / {reset.filter(r => r.zone === zone).length} done</div>
              </div>
            ))}
          </div>
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
