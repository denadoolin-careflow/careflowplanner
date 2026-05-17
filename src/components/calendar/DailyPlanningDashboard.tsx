import { useEffect, useMemo, useState } from "react";
import { format, isSameDay } from "date-fns";
import { motion } from "framer-motion";
import {
  Sparkles, Star, Compass, NotebookPen, Plus, X, Sun, Utensils, Sparkle,
  Heart, Moon, CloudSun, Clock, ListChecks, ChevronUp, ChevronDown, EyeOff,
  RotateCcw, Settings2, BookHeart,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useDailyPlan } from "@/hooks/useDailyPlan";
import {
  useDailyPlanLayout, type DailyWidgetId, type DailyWidgetCfg, DEFAULT_DAILY_WIDGETS,
} from "@/hooks/useDailyPlanLayout";
import { resolveTheme, themeStyle, type WidgetTheme } from "@/lib/widget-themes";
import { WidgetThemePicker } from "@/components/dashboard/WidgetThemePicker";
import { TimeGrid } from "@/components/calendar/TimeGrid";
import { PhaseBadge } from "@/components/cycle/PhaseBadge";
import { CycleLogSheet } from "@/components/cycle/CycleLogSheet";
import { getMoonPhase } from "@/lib/moon";
import { useWeatherSnapshot } from "@/lib/weather-store";
import { supabase } from "@/integrations/supabase/client";

function ChipList({ items, onRemove }: { items: string[]; onRemove?: (i: number) => void }) {
  if (!items.length) return <p className="text-xs text-muted-foreground">None yet.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s, i) => (
        <span key={`${s}-${i}`} className="group inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-foreground">
          {s}
          {onRemove && (
            <button onClick={() => onRemove(i)} className="opacity-50 hover:opacity-100">
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
    </div>
  );
}

function AddInline({ onAdd, placeholder }: { onAdd: (v: string) => void; placeholder: string }) {
  const [v, setV] = useState("");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); const t = v.trim(); if (!t) return; onAdd(t); setV(""); }}
      className="mt-2 flex gap-1.5"
    >
      <Input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} className="h-8 text-xs" />
      <Button type="submit" size="sm" variant="ghost" className="h-8 px-2"><Plus className="h-3.5 w-3.5" /></Button>
    </form>
  );
}

function PlanWidget({
  id, title, icon: Icon, cfg, editing, onUpdate, onMove, children,
}: {
  id: DailyWidgetId; title: string; icon: any;
  cfg: DailyWidgetCfg; editing: boolean;
  onUpdate: (id: DailyWidgetId, patch: Partial<DailyWidgetCfg>) => void;
  onMove: (id: DailyWidgetId, dir: -1 | 1) => void;
  children: React.ReactNode;
}) {
  const resolved = resolveTheme(null, cfg.theme ?? null);
  const themed = resolved.preset !== "default";
  const style = themed ? themeStyle(resolved) : undefined;
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      className={cn(
        "relative flex flex-col overflow-hidden",
        themed ? "widget-surface" : "cozy-card",
        editing && "ring-1 ring-primary/40",
      )}
      style={style}
    >
      <header className="flex items-center gap-2 px-5 pt-5">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="flex-1 font-display text-base font-semibold leading-tight">{title}</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full p-1 text-muted-foreground opacity-60 hover:bg-muted hover:opacity-100">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <WidgetThemePicker
              value={cfg.theme ?? null}
              onChange={(t) => onUpdate(id, { theme: t })}
              allowClear
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Sparkle className="mr-2 h-3.5 w-3.5" /> Theme…
                </DropdownMenuItem>
              }
            />
            <DropdownMenuItem onClick={() => onMove(id, -1)}>
              <ChevronUp className="mr-2 h-3.5 w-3.5" /> Move up
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMove(id, 1)}>
              <ChevronDown className="mr-2 h-3.5 w-3.5" /> Move down
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onUpdate(id, { hidden: true })}>
              <EyeOff className="mr-2 h-3.5 w-3.5" /> Hide
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <div className="px-5 pb-5 pt-3 text-sm">{children}</div>
    </motion.section>
  );
}

export function DailyPlanningDashboard({ day }: { day: Date }) {
  const { state, toggleCleaning, toggleTask } = useStore();
  const navigate = useNavigate();
  const { intention, review, saveIntention, saveReview, dateISO } = useDailyPlan(day);
  const { widgets, update, move, reset } = useDailyPlanLayout();
  const [cycleOpen, setCycleOpen] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const weather = useWeatherSnapshot();

  // Mirrored local state for save-on-blur
  const [word, setWord] = useState(intention.word ?? "");
  const [theme, setTheme] = useState(intention.theme ?? "");
  const [intentionText, setIntentionText] = useState(intention.intention ?? "");
  const [emotionalFocus, setEmotionalFocus] = useState(intention.emotional_focus ?? "");
  const [notes, setNotes] = useState(intention.notes ?? "");
  const [weatherNote, setWeatherNote] = useState(intention.weather_note ?? "");
  const [wins, setWins] = useState(review.wins ?? "");
  const [challenges, setChallenges] = useState(review.challenges ?? "");
  const [reviewGratitude, setReviewGratitude] = useState(review.gratitude ?? "");
  const [lessons, setLessons] = useState(review.lessons ?? "");
  const [tomorrowFocus, setTomorrowFocus] = useState(review.tomorrow_focus ?? "");

  useEffect(() => { setWord(intention.word ?? ""); }, [intention.word]);
  useEffect(() => { setTheme(intention.theme ?? ""); }, [intention.theme]);
  useEffect(() => { setIntentionText(intention.intention ?? ""); }, [intention.intention]);
  useEffect(() => { setEmotionalFocus(intention.emotional_focus ?? ""); }, [intention.emotional_focus]);
  useEffect(() => { setNotes(intention.notes ?? ""); }, [intention.notes]);
  useEffect(() => { setWeatherNote(intention.weather_note ?? ""); }, [intention.weather_note]);
  useEffect(() => { setWins(review.wins ?? ""); }, [review.wins]);
  useEffect(() => { setChallenges(review.challenges ?? ""); }, [review.challenges]);
  useEffect(() => { setReviewGratitude(review.gratitude ?? ""); }, [review.gratitude]);
  useEffect(() => { setLessons(review.lessons ?? ""); }, [review.lessons]);
  useEffect(() => { setTomorrowFocus(review.tomorrow_focus ?? ""); }, [review.tomorrow_focus]);

  const dayTasks = useMemo(
    () => state.tasks.filter(t => t.dueDate === dateISO && !t.parentTaskId),
    [state.tasks, dateISO],
  );
  const dayMeals = useMemo(
    () => state.meals.filter(m => m.date === dateISO),
    [state.meals, dateISO],
  );
  const todayCleaning = useMemo(
    () => (state.cleaning ?? []).filter(c => c.cadence === "daily" || (c.cadence === "weekly" && !c.done)).slice(0, 8),
    [state.cleaning],
  );

  const addPriority = (p: string) => saveIntention({ priorities: [...intention.priorities, p].slice(0, 7) });
  const removePriority = (i: number) => saveIntention({ priorities: intention.priorities.filter((_, idx) => idx !== i) });
  const addTop3 = (p: string) => saveIntention({ top_three: [...intention.top_three, p].slice(0, 3) });
  const removeTop3 = (i: number) => saveIntention({ top_three: intention.top_three.filter((_, idx) => idx !== i) });
  const addGratitude = (g: string) => saveIntention({ gratitude: [...intention.gratitude, g].slice(0, 5) });
  const removeGratitude = (i: number) => saveIntention({ gratitude: intention.gratitude.filter((_, idx) => idx !== i) });

  const eventsOn = (k: string) => [
    ...state.appointments.filter(a => a.date === k).map(a => ({ label: a.title, time: a.time, id: a.id, kind: "appt" as const })),
    ...state.tasks.filter(t => t.dueDate === k && !t.parentTaskId).map(t => ({
      label: t.title, time: undefined as string | undefined, id: t.id, kind: "task" as const, done: t.done,
    })),
  ];

  const saveJournalCheckIn = async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) return;
    const body = [
      intention.mood ? `Mood: ${intention.mood}` : "",
      intention.energy ? `Energy: ${intention.energy}` : "",
      intention.gratitude.length ? `Grateful for: ${intention.gratitude.join(", ")}` : "",
      notes,
    ].filter(Boolean).join("\n\n");
    if (!body.trim()) { toast("Nothing to save yet."); return; }
    await supabase.from("journal_entries").upsert({
      user_id: uid, date: dateISO, type: "daily", title: `Check-in ${format(day, "MMM d")}`,
      body, mood: intention.mood || null, energy: intention.energy || null,
      gratitude_items: intention.gratitude as any,
    });
    toast("Saved to journal");
  };

  const widgetMap: Record<DailyWidgetId, { title: string; icon: any; render: () => React.ReactNode }> = {
    intention: {
      title: `Intention for ${format(day, "EEEE, MMM d")}`,
      icon: Sparkles,
      render: () => (
        <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
          <div className="space-y-3">
            <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">Word of the day</label>
            <Input
              value={word} onChange={(e) => setWord(e.target.value)}
              onBlur={() => { if (word !== (intention.word ?? "")) saveIntention({ word }); }}
              placeholder="e.g. Grounded"
              className="h-14 border-0 bg-gradient-to-br from-accent/20 to-primary/10 text-center font-display text-3xl font-semibold tracking-tight"
            />
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">Theme</label>
              <Input value={theme} onChange={(e) => setTheme(e.target.value)}
                onBlur={() => { if (theme !== (intention.theme ?? "")) saveIntention({ theme }); }}
                placeholder="e.g. Slow morning" className="mt-1" />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">Emotional focus</label>
              <Input value={emotionalFocus} onChange={(e) => setEmotionalFocus(e.target.value)}
                onBlur={() => { if (emotionalFocus !== (intention.emotional_focus ?? "")) saveIntention({ emotional_focus: emotionalFocus }); }}
                placeholder="How do you want to feel?" className="mt-1" />
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">Intention</label>
              <Textarea value={intentionText} onChange={(e) => setIntentionText(e.target.value)}
                onBlur={() => { if (intentionText !== (intention.intention ?? "")) saveIntention({ intention: intentionText }); }}
                placeholder="What do you want today to feel like?" rows={3} className="mt-1" />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                onBlur={() => { if (notes !== (intention.notes ?? "")) saveIntention({ notes }); }}
                placeholder="Anything to remember…" rows={2} className="mt-1" />
            </div>
          </div>
        </div>
      ),
    },
    topThree: {
      title: "Top 3 today", icon: Star,
      render: () => (
        <>
          <ChipList items={intention.top_three} onRemove={removeTop3} />
          <AddInline onAdd={addTop3} placeholder="Pick a high-leverage focus…" />
        </>
      ),
    },
    priorities: {
      title: "Priorities", icon: Compass,
      render: () => (
        <>
          <ChipList items={intention.priorities} onRemove={removePriority} />
          <AddInline onAdd={addPriority} placeholder="Add a priority…" />
        </>
      ),
    },
    schedule: {
      title: "Schedule", icon: Clock,
      render: () => (
        <div className="-mx-2">
          <TimeGrid days={[day]} appointmentsOn={eventsOn} />
        </div>
      ),
    },
    meals: {
      title: "Meals", icon: Utensils,
      render: () => (
        <div className="space-y-2">
          {(["Breakfast","Lunch","Dinner","Snack"] as const).map(slot => {
            const m = dayMeals.find(x => x.slot === slot);
            return (
              <div key={slot} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{slot}</div>
                  <div className="truncate text-sm">{m?.name || <span className="text-muted-foreground">—</span>}</div>
                </div>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate("/meals")}>
                  {m ? "Edit" : "Add"}
                </Button>
              </div>
            );
          })}
        </div>
      ),
    },
    homeReset: {
      title: "Home reset", icon: ListChecks,
      render: () => (
        <>
          {todayCleaning.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing scheduled. <Button variant="link" className="h-auto p-0 text-xs" onClick={() => navigate("/home-reset")}>Open home reset</Button></p>
          ) : (
            <ul className="space-y-1.5">
              {todayCleaning.map(c => (
                <li key={c.id} className="flex items-center gap-2">
                  <Checkbox checked={c.done} onCheckedChange={() => void toggleCleaning(c.id)} />
                  <span className={cn("flex-1 text-sm", c.done && "text-muted-foreground line-through")}>{c.title}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.zone}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      ),
    },
    checkIn: {
      title: "Mind & body check-in", icon: Heart,
      render: () => (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">Mood</label>
              <Input value={intention.mood ?? ""} onChange={(e) => saveIntention({ mood: e.target.value })}
                placeholder="calm, anxious, hopeful…" className="mt-1" />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">Energy</label>
              <Input value={intention.energy ?? ""} onChange={(e) => saveIntention({ energy: e.target.value })}
                placeholder="low / medium / high" className="mt-1" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">Gratitude</label>
            <ChipList items={intention.gratitude} onRemove={removeGratitude} />
            <AddInline onAdd={addGratitude} placeholder="One thing you're grateful for…" />
          </div>
          <Button size="sm" variant="outline" className="w-full" onClick={saveJournalCheckIn}>
            <BookHeart className="mr-1 h-3.5 w-3.5" /> Save to journal
          </Button>
        </div>
      ),
    },
    moonCycle: {
      title: "Moon & cycle", icon: Moon,
      render: () => (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <PhaseBadge date={day} onClick={() => navigate(`/journal?template=daily`)} />
            <span className="text-xs text-muted-foreground capitalize">{getMoonPhase(day).replace("-"," ")}</span>
          </div>
          <Button size="sm" variant="outline" className="w-full" onClick={() => setCycleOpen(true)}>
            Log cycle for {format(day, "MMM d")}
          </Button>
        </div>
      ),
    },
    weather: {
      title: "Weather check-in", icon: CloudSun,
      render: () => (
        <div className="space-y-3">
          {weather ? (
            <div className="flex items-baseline gap-3">
              <span className="font-display text-2xl font-semibold">
                {Math.round(weather.current?.tempC ?? 0)}°
              </span>
              <span className="text-sm text-muted-foreground">{weather.current?.label ?? ""}</span>
              <span className="text-xs text-muted-foreground">{weather.locationLabel ?? ""}</span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No weather snapshot yet.</p>
          )}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">How it feels</label>
            <Textarea value={weatherNote} onChange={(e) => setWeatherNote(e.target.value)}
              onBlur={() => { if (weatherNote !== (intention.weather_note ?? "")) saveIntention({ weather_note: weatherNote }); }}
              placeholder="Cozy rain, brisk walk…" rows={2} className="mt-1" />
          </div>
        </div>
      ),
    },
    reflection: {
      title: "End-of-day reflection", icon: NotebookPen,
      render: () => (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">Wins</label>
              <Textarea value={wins} onChange={(e) => setWins(e.target.value)}
                onBlur={() => { if (wins !== (review.wins ?? "")) saveReview({ wins }); }}
                rows={2} className="mt-1" />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">Challenges</label>
              <Textarea value={challenges} onChange={(e) => setChallenges(e.target.value)}
                onBlur={() => { if (challenges !== (review.challenges ?? "")) saveReview({ challenges }); }}
                rows={2} className="mt-1" />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">Gratitude</label>
              <Textarea value={reviewGratitude} onChange={(e) => setReviewGratitude(e.target.value)}
                onBlur={() => { if (reviewGratitude !== (review.gratitude ?? "")) saveReview({ gratitude: reviewGratitude }); }}
                rows={2} className="mt-1" />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">Lessons</label>
              <Textarea value={lessons} onChange={(e) => setLessons(e.target.value)}
                onBlur={() => { if (lessons !== (review.lessons ?? "")) saveReview({ lessons }); }}
                rows={2} className="mt-1" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">Tomorrow's focus</label>
            <Input value={tomorrowFocus} onChange={(e) => setTomorrowFocus(e.target.value)}
              onBlur={() => { if (tomorrowFocus !== (review.tomorrow_focus ?? "")) saveReview({ tomorrow_focus: tomorrowFocus }); }}
              placeholder="One thing to carry forward…" className="mt-1" />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">Day rating</label>
            <div className="mt-1 flex gap-1.5">
              {[1,2,3,4,5].map(n => (
                <button key={n}
                  onClick={() => saveReview({ rating: review.rating === n ? null : n })}
                  className={cn("h-8 w-8 rounded-full border text-sm transition-colors",
                    (review.rating ?? 0) >= n ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted")}
                >★</button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
  };

  const hiddenList = widgets.filter(w => w.hidden);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        {hiddenList.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setShowHidden(s => !s)}>
            {showHidden ? "Hide" : `Show ${hiddenList.length} hidden`}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => { reset(); toast("Layout reset"); }}>
          <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset layout
        </Button>
      </div>

      {showHidden && hiddenList.length > 0 && (
        <div className="cozy-card flex flex-wrap items-center gap-2 p-3">
          <span className="text-xs text-muted-foreground">Hidden:</span>
          {hiddenList.map(w => (
            <Button key={w.id} variant="outline" size="sm" className="h-7 text-xs"
              onClick={() => update(w.id, { hidden: false })}>
              <Plus className="mr-1 h-3 w-3" /> {widgetMap[w.id].title}
            </Button>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {widgets.filter(w => !w.hidden).map(w => {
          const def = widgetMap[w.id];
          const wide = w.id === "intention" || w.id === "schedule" || w.id === "reflection";
          return (
            <div key={w.id} className={cn(wide && "md:col-span-2 xl:col-span-3")}>
              <PlanWidget id={w.id} title={def.title} icon={def.icon}
                cfg={w} editing={false} onUpdate={update} onMove={move}>
                {def.render()}
              </PlanWidget>
            </div>
          );
        })}
      </div>

      <CycleLogSheet open={cycleOpen} onOpenChange={setCycleOpen} date={day} />
    </div>
  );
}