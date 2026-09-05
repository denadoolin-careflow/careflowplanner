/**
 * Food calendar — a month (or compact week on mobile) of what you logged,
 * with a day detail sheet. Private to your account, descriptive only.
 */
import { useEffect, useMemo, useState } from "react";
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth,
  startOfMonth, startOfWeek, subMonths,
} from "date-fns";
import {
  ChevronLeft, ChevronRight, Clock, Droplets, HeartPulse, Moon, Pencil, Plus, Scale, Sun,
  Sunrise, Syringe, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SectionCard } from "@/components/cards/SectionCard";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useFoodEntries, sumEntries, updateFoodEntry, deleteFoodEntry } from "@/lib/wellflow/data";
import { EditFoodDialog } from "@/components/wellflow/EditFoodDialog";
import { FoodFeelSheet } from "@/components/wellflow/FoodFeelSheet";
import { InlineAddFood } from "@/components/wellflow/InlineAddFood";
import { HealthJournalCard } from "@/components/wellflow/HealthJournalCard";
import { LogFoodSheet } from "@/components/wellflow/LogFoodSheet";
import { useJournalDates } from "@/lib/wellflow/journal";
import { MEAL_TYPES, todayISO, type FoodEntry, type MealType } from "@/lib/wellflow/types";

interface DayCell {
  calories: number;
  protein: number;
  meals: number;
  water: number;
  injection: boolean;
  weight: number | null;
}

const iso = (d: Date) => format(d, "yyyy-MM-dd");

function useMonthData(anchor: Date) {
  const [map, setMap] = useState<Record<string, DayCell>>({});
  const [loading, setLoading] = useState(true);
  const from = iso(startOfWeek(startOfMonth(anchor)));
  const to = iso(endOfWeek(endOfMonth(anchor)));

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const [food, water, inj, weights] = await Promise.all([
        supabase.from("food_entries").select("date,calories,protein").gte("date", from).lte("date", to),
        supabase.from("water_entries").select("date,ounces").gte("date", from).lte("date", to),
        supabase.from("glp1_injections").select("date").gte("date", from).lte("date", to),
        supabase.from("weight_logs").select("date,weight_lb").gte("date", from).lte("date", to),
      ]);
      if (cancel) return;
      const next: Record<string, DayCell> = {};
      const cell = (d: string) => (next[d] ??= { calories: 0, protein: 0, meals: 0, water: 0, injection: false, weight: null });
      (food.data ?? []).forEach((r: any) => {
        const c = cell(r.date);
        c.calories += Number(r.calories) || 0;
        c.protein += Number(r.protein) || 0;
        c.meals += 1;
      });
      (water.data ?? []).forEach((r: any) => { cell(r.date).water += Number(r.ounces) || 0; });
      (inj.data ?? []).forEach((r: any) => { cell(r.date).injection = true; });
      (weights.data ?? []).forEach((r: any) => { cell(r.date).weight = Number(r.weight_lb) || null; });
      setMap(next);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [from, to]);

  return { map, loading, from, to };
}

export function FoodCalendar() {
  const [anchor, setAnchor] = useState(new Date());
  const [selected, setSelected] = useState<string | null>(null);
  const { map, loading, from, to } = useMonthData(anchor);
  const journalDates = useJournalDates(from, to);

  const days = useMemo(
    () => eachDayOfInterval({
      start: startOfWeek(startOfMonth(anchor)),
      end: endOfWeek(endOfMonth(anchor)),
    }),
    [anchor],
  );

  return (
    <div className="space-y-4">
      <SectionCard
        title="Food calendar"
        subtitle="What you logged, day by day"
        accent="sage"
        action={
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Previous month"
                    onClick={() => setAnchor(a => subMonths(a, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[7rem] text-center text-sm font-medium">{format(anchor, "MMMM yyyy")}</span>
            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Next month"
                    onClick={() => setAnchor(a => addMonths(a, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      >
        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-muted-foreground">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i}>{d}</span>)}
        </div>
        <div className={cn("grid grid-cols-7 gap-1", loading && "opacity-60")}>
          {days.map(d => {
            const key = iso(d);
            const cell = map[key];
            const inMonth = isSameMonth(d, anchor);
            const isToday = key === todayISO();
            return (
              <button
                key={key} type="button" onClick={() => setSelected(key)}
                aria-label={`${format(d, "MMMM d")}${cell ? `, ${Math.round(cell.calories)} calories` : ", nothing logged"}${journalDates.has(key) ? ", journal entry" : ""} — tap to log food`}
                className={cn(
                  "flex min-h-[3.5rem] flex-col items-center gap-0.5 rounded-xl border px-1 py-1 text-[10px] transition-colors",
                  inMonth ? "border-border/40 bg-card/50" : "border-transparent text-muted-foreground/50",
                  isToday && "border-primary/60 bg-primary/10",
                )}
              >
                <span className="font-medium">{format(d, "d")}</span>
                {cell?.calories ? (
                  <span className="tabular-nums text-[10px] font-semibold">{Math.round(cell.calories)}</span>
                ) : null}
                <span className="flex gap-0.5">
                  {cell?.meals ? <Dot className="bg-primary" /> : null}
                  {cell?.water ? <Dot className="bg-sky-400" /> : null}
                  {cell?.injection ? <Dot className="bg-accent" /> : null}
                  {cell?.weight != null ? <Dot className="bg-muted-foreground" /> : null}
                  {journalDates.has(key) ? <Dot className="bg-violet-400" /> : null}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
          <Legend className="bg-primary" label="Food" />
          <Legend className="bg-sky-400" label="Water" />
          <Legend className="bg-accent" label="Injection" />
          <Legend className="bg-muted-foreground" label="Weight" />
          <Legend className="bg-violet-400" label="Journal" />
        </div>

        <div className="mt-3">
          <Button size="sm" variant="secondary" onClick={() => { setAnchor(new Date()); setSelected(todayISO()); }}>
            Jump to today
          </Button>
        </div>
      </SectionCard>

      <DaySheet date={selected} onClose={() => setSelected(null)} summary={selected ? map[selected] : undefined} />
    </div>
  );
}

function Dot({ className }: { className: string }) {
  return <span className={cn("inline-block h-1.5 w-1.5 rounded-full", className)} />;
}

function Legend({ className, label }: { className: string; label: string }) {
  return <span className="flex items-center gap-1"><Dot className={className} /> {label}</span>;
}

type PartKey = "morning" | "afternoon" | "evening" | "untimed";

const PART_LABEL: Record<PartKey, string> = {
  morning: "Morning", afternoon: "Afternoon", evening: "Evening", untimed: "No time set",
};
const PART_ICON: Record<PartKey, typeof Sunrise> = {
  morning: Sunrise, afternoon: Sun, evening: Moon, untimed: Clock,
};
/** Sensible default clock time when adding into a section (editable after). */
const PART_TIME: Record<PartKey, string | null> = {
  morning: "08:00", afternoon: "13:00", evening: "18:30", untimed: null,
};
const PART_MEAL: Record<PartKey, MealType> = {
  morning: "breakfast", afternoon: "lunch", evening: "dinner", untimed: "snack",
};

/** Local hour from a logged_at timestamp, or null when it isn't usable. */
function hourOf(loggedAt?: string | null): number | null {
  if (!loggedAt) return null;
  const d = new Date(loggedAt);
  return Number.isNaN(d.getTime()) ? null : d.getHours();
}

function partOf(loggedAt?: string | null): PartKey {
  const h = hourOf(loggedAt);
  if (h == null) return "untimed";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

const timeValue = (loggedAt?: string | null) => {
  if (!loggedAt) return "";
  const d = new Date(loggedAt);
  return Number.isNaN(d.getTime()) ? "" : format(d, "HH:mm");
};

function DaySheet({
  date, summary, onClose,
}: { date: string | null; summary?: DayCell; onClose: () => void }) {
  const day = date ?? todayISO();
  const { entries, loading } = useFoodEntries(day);
  const totals = useMemo(() => sumEntries(entries), [entries]);
  const [editing, setEditing] = useState<FoodEntry | null>(null);
  const [feelFor, setFeelFor] = useState<FoodEntry | null>(null);
  const [logFor, setLogFor] = useState<{ time: string | null; meal: MealType } | null>(null);

  const grouped = useMemo(() => {
    const buckets: Record<PartKey, FoodEntry[]> = { morning: [], afternoon: [], evening: [], untimed: [] };
    for (const e of entries) buckets[partOf(e.logged_at)].push(e);
    for (const k of Object.keys(buckets) as PartKey[]) {
      buckets[k].sort((a, b) => (a.logged_at ?? "").localeCompare(b.logged_at ?? ""));
    }
    return buckets;
  }, [entries]);

  const setTime = async (e: FoodEntry, hhmm: string) => {
    if (!hhmm) return;
    const next = new Date(`${e.date}T${hhmm}:00`);
    if (Number.isNaN(next.getTime())) return;
    await updateFoodEntry(e.id, { logged_at: next.toISOString() });
  };

  const setMeal = async (e: FoodEntry, meal: MealType) => {
    await updateFoodEntry(e.id, { meal_type: meal });
  };

  const remove = async (e: FoodEntry) => {
    await deleteFoodEntry(e.id);
    toast.success("Removed");
  };

  return (
    <Sheet open={!!date} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display">
            {date ? format(new Date(`${date}T12:00:00`), "EEEE, MMMM d") : ""}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <Stat label="Calories" value={Math.round(totals.calories)} />
          <Stat label="Protein" value={`${Math.round(totals.protein)}g`} />
          <Stat label="Water" value={`${Math.round(summary?.water ?? 0)} oz`} />
        </div>

        {(summary?.injection || summary?.weight != null) && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {summary?.injection && (
              <span className="flex items-center gap-1 rounded-full bg-muted/40 px-2.5 py-1">
                <Syringe className="h-3 w-3" /> Injection logged
              </span>
            )}
            {summary?.weight != null && (
              <span className="flex items-center gap-1 rounded-full bg-muted/40 px-2.5 py-1">
                <Scale className="h-3 w-3" /> {summary.weight} lb
              </span>
            )}
            {!!summary?.water && (
              <span className="flex items-center gap-1 rounded-full bg-muted/40 px-2.5 py-1">
                <Droplets className="h-3 w-3" /> {Math.round(summary.water)} oz
              </span>
            )}
          </div>
        )}

        <div className="mt-3 space-y-2">
          <Button size="sm" className="w-full gap-1.5"
                  onClick={() => setLogFor({ time: null, meal: "snack" })}>
            <Plus className="h-4 w-4" /> Log food on this day
          </Button>
          <InlineAddFood
            date={day}
            time={null}
            defaultMeal="snack"
            label="Quick add to this day"
            onMore={() => setLogFor({ time: null, meal: "snack" })}
          />
        </div>

        <div className="mt-4 space-y-4 pb-6">
          {loading ? (
            <div className="h-16 animate-pulse rounded-xl bg-muted/50" />
          ) : (["morning", "afternoon", "evening", "untimed"] as PartKey[]).map(pk => {
            const rows = grouped[pk];
            const Icon = PART_ICON[pk];
            const cals = rows.reduce((s, r) => s + r.calories, 0);
            return (
              <section key={pk}>
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {PART_LABEL[pk]}
                  <span className="font-normal opacity-70 tabular-nums">· {Math.round(cals)} cal</span>
                </p>
                <ul className="space-y-1.5">
                  {rows.length === 0 && (
                    <li className="px-1 text-xs text-muted-foreground">Nothing logged yet.</li>
                  )}
                  {rows.map(e => (
                    <li key={e.id} className="rounded-2xl border border-border/40 bg-card/50 px-3 py-2">
                      <p className="truncate text-sm font-medium">{e.food_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {Math.round(e.calories)} cal • {Math.round(e.protein)}g P • {Math.round(e.carbs)}g C • {Math.round(e.fat)}g F
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <input
                          type="time" aria-label={`Time for ${e.food_name}`}
                          defaultValue={timeValue(e.logged_at)}
                          onChange={ev => void setTime(e, ev.target.value)}
                          className="h-9 rounded-lg border border-border/60 bg-background px-2 text-xs"
                        />
                        <select
                          aria-label={`Meal for ${e.food_name}`}
                          value={e.meal_type}
                          onChange={ev => void setMeal(e, ev.target.value as MealType)}
                          className="h-9 rounded-lg border border-border/60 bg-background px-2 text-xs capitalize"
                        >
                          {MEAL_TYPES.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                        </select>
                        <Button size="sm" variant="ghost" className="h-9 gap-1 px-2 text-xs"
                                onClick={() => setEditing(e)}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="h-9 gap-1 px-2 text-xs"
                                onClick={() => setFeelFor(e)}>
                          <HeartPulse className="h-3.5 w-3.5" /> Feel
                        </Button>
                        <Button size="sm" variant="ghost" className="h-9 gap-1 px-2 text-xs text-destructive"
                                onClick={() => void remove(e)} aria-label={`Delete ${e.food_name}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                <InlineAddFood
                  className="mt-2"
                  date={day}
                  time={PART_TIME[pk]}
                  defaultMeal={PART_MEAL[pk]}
                  label={`Add food to ${PART_LABEL[pk].toLowerCase()}`}
                  onMore={() => setLogFor({ time: PART_TIME[pk], meal: PART_MEAL[pk] })}
                />
              </section>
            );
          })}

          <HealthJournalCard date={day} />
        </div>

        <EditFoodDialog
          open={!!editing}
          onOpenChange={v => { if (!v) setEditing(null); }}
          title="Edit logged food"
          withServings
          value={editing ? {
            name: editing.food_name,
            serving_size: editing.serving_size,
            calories: editing.calories,
            protein: editing.protein,
            carbs: editing.carbs,
            fat: editing.fat,
            fiber: editing.fiber,
            servings: editing.servings,
          } : null}
          onSave={async next => {
            if (!editing) return;
            await updateFoodEntry(editing.id, {
              food_name: next.name,
              serving_size: next.serving_size,
              servings: next.servings ?? editing.servings,
              calories: next.calories,
              protein: next.protein,
              carbs: next.carbs,
              fat: next.fat,
              fiber: next.fiber,
            });
            setEditing(null);
          }}
        />

        <LogFoodSheet
          open={!!logFor}
          onOpenChange={v => { if (!v) setLogFor(null); }}
          date={day}
          defaultTime={logFor?.time ?? null}
          defaultMeal={logFor?.meal}
        />

        <FoodFeelSheet
          open={!!feelFor}
          onOpenChange={v => { if (!v) setFeelFor(null); }}
          foodName={feelFor?.food_name ?? ""}
          entryId={feelFor?.id}
          date={date ?? undefined}
        />
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-muted/30 px-2 py-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
