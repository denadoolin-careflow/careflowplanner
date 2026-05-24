import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addMonths, eachDayOfInterval, endOfMonth, format, isSameMonth, startOfMonth, subMonths } from "date-fns";
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Heart, ListChecks,
  Map, MapPin, Moon, Plus, Sparkles, Sprout, Trash2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/cards/SectionCard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  monthlyPlans, useMonthlyPlan, monthKey,
  type MonthlyPlan, type PriorityItem, type OutingItem, type ActivityItem,
} from "@/lib/monthly-plan";
import { useStore } from "@/lib/store";
import { useCycle } from "@/lib/cycle-store";
import { phaseForDate, PHASE_META } from "@/lib/cycle";
import { getRhythmForecast } from "@/lib/rhythm-forecast";

const SEASON_META: Record<string, { label: string; chip: string; icon: string }> = {
  spring: { label: "Spring", chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", icon: "🌱" },
  summer: { label: "Summer", chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300", icon: "☀️" },
  autumn: { label: "Autumn", chip: "bg-orange-500/15 text-orange-700 dark:text-orange-300", icon: "🍂" },
  winter: { label: "Winter", chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300", icon: "❄️" },
};

function inferSeason(d: Date): keyof typeof SEASON_META {
  const m = d.getMonth() + 1;
  return (["winter","winter","spring","spring","spring","summer","summer","summer","autumn","autumn","autumn","winter"][m-1]) as any;
}

export default function MonthOverview() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const month = useMemo(() => monthKey(cursor), [cursor]);
  const { plan, loaded, setPlan } = useMonthlyPlan(month);
  const { state, addTask, addAppointment } = useStore();
  const { settings: cycleSettings, periods: cyclePeriods } = useCycle();
  const [generating, setGenerating] = useState(false);
  const [aiContext, setAiContext] = useState("");

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Moon phases: collect new/full moons + element shifts inside the month.
  const moonHighlights = useMemo(() => {
    const out: { date: Date; iso: string; label: string; glyph: string; element: string }[] = [];
    let prevPhase: string | null = null;
    for (const d of monthDays) {
      const f = getRhythmForecast(d);
      const isFullOrNew = f.phaseLabel === "Full Moon" || f.phaseLabel === "New Moon";
      const justChanged = prevPhase && prevPhase !== f.phaseLabel && (f.phaseLabel === "First Quarter" || f.phaseLabel === "Last Quarter");
      if (isFullOrNew || justChanged) {
        out.push({
          date: d, iso: d.toISOString().slice(0,10),
          label: f.phaseLabel, glyph: f.glyph, element: f.element,
        });
      }
      prevPhase = f.phaseLabel;
    }
    return out;
  }, [monthDays]);

  // Cycle phase summary across month
  const cycleSummary = useMemo(() => {
    if (!cycleSettings.enabled) return null;
    const phaseDays: Record<string, number> = {};
    for (const d of monthDays) {
      const p = phaseForDate(d, cyclePeriods, cycleSettings);
      if (!p) continue;
      phaseDays[p] = (phaseDays[p] ?? 0) + 1;
    }
    return Object.entries(phaseDays).sort((a, b) => b[1] - a[1]);
  }, [cycleSettings, cyclePeriods, monthDays]);

  const monthAppts = useMemo(
    () => state.appointments
      .filter(a => a.date >= format(monthStart, "yyyy-MM-dd") && a.date <= format(monthEnd, "yyyy-MM-dd"))
      .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? ""))),
    [state.appointments, monthStart, monthEnd],
  );

  const season = plan?.season ?? inferSeason(cursor);
  const seasonMeta = SEASON_META[season] ?? SEASON_META.spring;

  const patch = async (p: Partial<MonthlyPlan>) => {
    const next = await monthlyPlans.upsert(month, p as any);
    if (next) setPlan(next);
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const next = await monthlyPlans.generate(month, aiContext);
      if (next) setPlan(next);
      toast.success("Monthly plan generated.");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't generate plan");
    } finally {
      setGenerating(false);
    }
  };

  // Priority helpers
  const addPriority = (title: string) => {
    if (!title.trim()) return;
    const next = [...(plan?.priorities ?? []), { id: monthlyPlans.newItemId(), title: title.trim(), done: false }];
    void patch({ priorities: next });
  };
  const togglePriority = (id: string) => {
    const next = (plan?.priorities ?? []).map(p => p.id === id ? { ...p, done: !p.done } : p);
    void patch({ priorities: next });
  };
  const removePriority = (id: string) => {
    void patch({ priorities: (plan?.priorities ?? []).filter(p => p.id !== id) });
  };
  const sendPriorityToTasks = async (p: PriorityItem) => {
    await addTask({
      title: p.title, area: "Personal", priority: "high",
      dueDate: format(monthStart, "yyyy-MM-dd"),
    });
    toast.success(`Added “${p.title}” to tasks`);
    const next = (plan?.priorities ?? []).map(x => x.id === p.id ? { ...x, linked_task_id: "linked" } : x);
    await patch({ priorities: next });
  };

  // Outings (with optional date → can push to calendar as appointment)
  const addOuting = (title: string) => {
    if (!title.trim()) return;
    void patch({ outings: [...(plan?.outings ?? []), { id: monthlyPlans.newItemId(), title: title.trim() }] });
  };
  const updateOuting = (id: string, p: Partial<OutingItem>) => {
    void patch({ outings: (plan?.outings ?? []).map(o => o.id === id ? { ...o, ...p } : o) });
  };
  const removeOuting = (id: string) => {
    void patch({ outings: (plan?.outings ?? []).filter(o => o.id !== id) });
  };
  const sendOutingToCalendar = async (o: OutingItem) => {
    const date = o.date || format(monthStart, "yyyy-MM-dd");
    await addAppointment({ title: o.title, date, notes: o.notes ?? undefined, type: "outing", icon: "📍" });
    toast.success(`Added “${o.title}” to calendar`);
    updateOuting(o.id, { linked_appt_id: "linked", date });
  };

  // Activities
  const addActivity = (title: string) => {
    if (!title.trim()) return;
    void patch({ activities: [...(plan?.activities ?? []), { id: monthlyPlans.newItemId(), title: title.trim(), done: false }] });
  };
  const toggleActivity = (id: string) => {
    void patch({ activities: (plan?.activities ?? []).map(a => a.id === id ? { ...a, done: !a.done } : a) });
  };
  const removeActivity = (id: string) => {
    void patch({ activities: (plan?.activities ?? []).filter(a => a.id !== id) });
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <header className="cozy-card gradient-warm flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Monthly Overview</p>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">{format(cursor, "MMMM yyyy")}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs", seasonMeta.chip)}>
              <span>{seasonMeta.icon}</span> {seasonMeta.label}
            </span>
            <Link to="/month" className="text-xs text-muted-foreground underline-offset-2 hover:underline">
              <CalendarIcon className="mr-1 inline h-3 w-3" /> Calendar view
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setCursor(subMonths(cursor, 1))} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" className="h-8 px-3 text-xs" onClick={() => setCursor(startOfMonth(new Date()))}>This month</Button>
          <Button variant="ghost" size="icon" onClick={() => setCursor(addMonths(cursor, 1))} aria-label="Next month"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </header>

      {/* AI generator */}
      <SectionCard title="Seasonal AI planner" accent="calm" action={
        <Button size="sm" onClick={generate} disabled={generating} className="rounded-full">
          <Sparkles className={cn("mr-1.5 h-3.5 w-3.5", generating && "animate-pulse")} />
          {plan?.ai_generated_at ? "Regenerate" : "Generate plan"}
        </Button>
      }>
        <div className="grid gap-3 sm:grid-cols-[1fr,auto] sm:items-end">
          <div>
            <label className="text-xs text-muted-foreground">Optional context (focus, family load, mood)</label>
            <Input
              value={aiContext}
              onChange={(e) => setAiContext(e.target.value)}
              placeholder="e.g. school break, postpartum recovery, hosting in-laws…"
              className="mt-1 h-9 text-sm"
            />
          </div>
          {plan?.ai_generated_at && (
            <p className="text-[11px] text-muted-foreground">Updated {format(new Date(plan.ai_generated_at), "MMM d, h:mm a")}</p>
          )}
        </div>
        {!loaded && <p className="mt-3 text-sm text-muted-foreground">Loading…</p>}
      </SectionCard>

      {/* Word + theme + intention */}
      <div className="grid gap-4 md:grid-cols-3">
        <SectionCard title="Word of the month" accent="calm">
          <Input
            value={plan?.word ?? ""}
            onChange={(e) => setPlan(p => p ? { ...p, word: e.target.value } : p)}
            onBlur={(e) => void patch({ word: e.target.value })}
            placeholder="e.g. Bloom"
            className="h-12 text-center font-display text-2xl"
          />
        </SectionCard>
        <SectionCard title="Theme">
          <Input
            value={plan?.theme ?? ""}
            onChange={(e) => setPlan(p => p ? { ...p, theme: e.target.value } : p)}
            onBlur={(e) => void patch({ theme: e.target.value })}
            placeholder="A short, evocative theme"
            className="text-sm"
          />
        </SectionCard>
        <SectionCard title="Intention">
          <Textarea
            value={plan?.intention ?? ""}
            onChange={(e) => setPlan(p => p ? { ...p, intention: e.target.value } : p)}
            onBlur={(e) => void patch({ intention: e.target.value })}
            placeholder="One sentence of intention for the month"
            rows={2}
            className="text-sm"
          />
        </SectionCard>
      </div>

      {/* Season notes */}
      <SectionCard title="Seasonal notes" accent="calm" action={<Sprout className="h-4 w-4 text-muted-foreground" />}>
        <Textarea
          value={plan?.season_notes ?? ""}
          onChange={(e) => setPlan(p => p ? { ...p, season_notes: e.target.value } : p)}
          onBlur={(e) => void patch({ season_notes: e.target.value })}
          placeholder="Weather, light, produce, family rhythms…"
          rows={3}
          className="text-sm"
        />
      </SectionCard>

      {/* Priorities */}
      <SectionCard title="Top priorities" accent="warm" action={<ListChecks className="h-4 w-4 text-muted-foreground" />}>
        <PriorityList
          items={plan?.priorities ?? []}
          onAdd={addPriority}
          onToggle={togglePriority}
          onRemove={removePriority}
          onSendToTasks={sendPriorityToTasks}
        />
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Moon */}
        <SectionCard title="Moon phases" accent="calm" action={<Moon className="h-4 w-4 text-muted-foreground" />}>
          {moonHighlights.length === 0 ? (
            <p className="text-xs text-muted-foreground">No major phases this month.</p>
          ) : (
            <ul className="space-y-1.5">
              {moonHighlights.map(m => (
                <li key={m.iso} className="flex items-center gap-2 rounded-md bg-muted/30 px-2 py-1.5 text-xs">
                  <span aria-hidden className="text-base">{m.glyph}</span>
                  <span className="font-medium">{m.label}</span>
                  <Badge variant="outline" className="rounded-full px-1.5 py-0 text-[10px] capitalize">{m.element}</Badge>
                  <span className="ml-auto text-muted-foreground">{format(m.date, "EEE, MMM d")}</span>
                </li>
              ))}
            </ul>
          )}
          <Textarea
            value={plan?.moon_notes ?? ""}
            onChange={(e) => setPlan(p => p ? { ...p, moon_notes: e.target.value } : p)}
            onBlur={(e) => void patch({ moon_notes: e.target.value })}
            placeholder="Rituals or intentions tied to the moon…"
            rows={2}
            className="mt-2 text-xs"
          />
        </SectionCard>

        {/* Cycle */}
        <SectionCard title="Cycle check-in" accent="warm" action={<Heart className="h-4 w-4 text-muted-foreground" />}>
          {!cycleSettings.enabled ? (
            <p className="text-xs text-muted-foreground">
              Cycle tracking is off.{" "}
              <Link to="/settings" className="underline">Enable it</Link> to see phases this month.
            </p>
          ) : cycleSummary && cycleSummary.length > 0 ? (
            <ul className="space-y-1">
              {cycleSummary.map(([phase, count]) => {
                const meta = PHASE_META[phase as keyof typeof PHASE_META];
                return (
                  <li key={phase} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: `hsl(var(${meta.tokenVar}))` }}
                    />
                    <span className="font-medium">{meta.label}</span>
                    <span className="ml-auto text-muted-foreground">{count}d</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No phase data yet for this month.</p>
          )}
          <Textarea
            value={plan?.cycle_notes ?? ""}
            onChange={(e) => setPlan(p => p ? { ...p, cycle_notes: e.target.value } : p)}
            onBlur={(e) => void patch({ cycle_notes: e.target.value })}
            placeholder="How you want to honor your cycle this month…"
            rows={2}
            className="mt-2 text-xs"
          />
        </SectionCard>
      </div>

      {/* Appointments */}
      <SectionCard title="Appointments & events" accent="calm" action={
        <Link to="/month" className="text-xs text-muted-foreground underline-offset-2 hover:underline">
          Open calendar
        </Link>
      }>
        {monthAppts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No appointments this month yet.</p>
        ) : (
          <ul className="divide-y divide-border/40">
            {monthAppts.map(a => (
              <li key={a.id} className="flex items-center gap-2 py-1.5 text-sm">
                <span className="w-16 shrink-0 text-xs text-muted-foreground">{format(new Date(a.date + "T00:00:00"), "MMM d")}</span>
                {a.time && <span className="w-14 shrink-0 text-xs text-muted-foreground tabular-nums">{a.time}</span>}
                <span className="min-w-0 flex-1 truncate">{a.icon ? `${a.icon} ` : ""}{a.title}</span>
                {a.location && <span className="hidden truncate text-xs text-muted-foreground sm:block">{a.location}</span>}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* Outings */}
      <SectionCard title="Outings" accent="warm" action={<Map className="h-4 w-4 text-muted-foreground" />}>
        <OutingList
          items={plan?.outings ?? []}
          onAdd={addOuting}
          onUpdate={updateOuting}
          onRemove={removeOuting}
          onSendToCalendar={sendOutingToCalendar}
          monthIso={format(monthStart, "yyyy-MM-dd")}
        />
      </SectionCard>

      {/* Activities */}
      <SectionCard title="Activities" accent="calm">
        <ActivityList
          items={plan?.activities ?? []}
          onAdd={addActivity}
          onToggle={toggleActivity}
          onRemove={removeActivity}
        />
      </SectionCard>
    </div>
  );
}

function PriorityList({
  items, onAdd, onToggle, onRemove, onSendToTasks,
}: {
  items: PriorityItem[];
  onAdd: (t: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onSendToTasks: (p: PriorityItem) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="space-y-1.5">
      {items.length === 0 && <p className="text-xs italic text-muted-foreground">Add 3–5 priorities for the month.</p>}
      {items.map(p => (
        <div key={p.id} className="group flex items-center gap-2 rounded-md bg-muted/30 px-2 py-1.5 text-sm">
          <Checkbox checked={p.done} onCheckedChange={() => onToggle(p.id)} />
          <span className={cn("flex-1 truncate", p.done && "line-through text-muted-foreground")}>{p.title}</span>
          {!p.linked_task_id ? (
            <button
              onClick={() => onSendToTasks(p)}
              className="rounded-full px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-primary/10 hover:text-primary"
              title="Send to tasks"
            >→ Tasks</button>
          ) : (
            <Badge variant="outline" className="rounded-full px-1.5 py-0 text-[10px]">In tasks</Badge>
          )}
          <button onClick={() => onRemove(p.id)} className="opacity-0 group-hover:opacity-60 hover:opacity-100" aria-label="Remove">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <form
        onSubmit={(e) => { e.preventDefault(); onAdd(draft); setDraft(""); }}
        className="flex items-center gap-1 rounded-md border border-dashed border-border bg-card/30 px-2 py-1"
      >
        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a priority…"
          className="h-7 flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
        />
      </form>
    </div>
  );
}

function OutingList({
  items, onAdd, onUpdate, onRemove, onSendToCalendar, monthIso,
}: {
  items: OutingItem[];
  onAdd: (t: string) => void;
  onUpdate: (id: string, p: Partial<OutingItem>) => void;
  onRemove: (id: string) => void;
  onSendToCalendar: (o: OutingItem) => void;
  monthIso: string;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="space-y-1.5">
      {items.length === 0 && <p className="text-xs italic text-muted-foreground">No outings yet — try the AI planner or add your own.</p>}
      {items.map(o => (
        <div key={o.id} className="group rounded-md bg-muted/30 px-2 py-1.5">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={o.title}
              onChange={(e) => onUpdate(o.id, { title: e.target.value })}
              className="h-7 flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            />
            <Input
              type="date"
              value={o.date ?? ""}
              min={monthIso}
              onChange={(e) => onUpdate(o.id, { date: e.target.value || null })}
              className="h-7 w-[140px] text-xs"
            />
            {!o.linked_appt_id ? (
              <button
                onClick={() => onSendToCalendar(o)}
                className="rounded-full px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-primary/10 hover:text-primary"
                title="Add to calendar"
              >→ Calendar</button>
            ) : (
              <Badge variant="outline" className="rounded-full px-1.5 py-0 text-[10px]">On calendar</Badge>
            )}
            <button onClick={() => onRemove(o.id)} className="opacity-0 group-hover:opacity-60 hover:opacity-100" aria-label="Remove">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          {o.notes && (
            <p className="ml-5 mt-1 text-[11px] text-muted-foreground">{o.notes}</p>
          )}
        </div>
      ))}
      <form
        onSubmit={(e) => { e.preventDefault(); onAdd(draft); setDraft(""); }}
        className="flex items-center gap-1 rounded-md border border-dashed border-border bg-card/30 px-2 py-1"
      >
        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add an outing…"
          className="h-7 flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
        />
      </form>
    </div>
  );
}

function ActivityList({
  items, onAdd, onToggle, onRemove,
}: {
  items: ActivityItem[];
  onAdd: (t: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="space-y-1.5">
      {items.length === 0 && <p className="text-xs italic text-muted-foreground">Ideas for cozy or creative activities.</p>}
      {items.map(a => (
        <div key={a.id} className="group flex items-center gap-2 rounded-md bg-muted/30 px-2 py-1.5 text-sm">
          <Checkbox checked={!!a.done} onCheckedChange={() => onToggle(a.id)} />
          <span className={cn("flex-1 truncate", a.done && "line-through text-muted-foreground")}>{a.title}</span>
          <button onClick={() => onRemove(a.id)} className="opacity-0 group-hover:opacity-60 hover:opacity-100" aria-label="Remove">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <form
        onSubmit={(e) => { e.preventDefault(); onAdd(draft); setDraft(""); }}
        className="flex items-center gap-1 rounded-md border border-dashed border-border bg-card/30 px-2 py-1"
      >
        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add an activity…"
          className="h-7 flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
        />
      </form>
    </div>
  );
}