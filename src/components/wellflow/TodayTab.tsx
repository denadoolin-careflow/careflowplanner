import { TrendStrip } from "@/components/wellflow/TrendStrip";
import { GoalBars } from "@/components/wellflow/GoalBars";
import { CyclePhaseStrip } from "@/components/wellflow/CyclePhaseStrip";
import { useMemo } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/cards/SectionCard";
import { EmptyState } from "@/components/cards/EmptyState";
import { ProgressRing } from "./ProgressRing";
import { CheckInFields } from "./QuickSheets";
import { Droplets, Plus, Scale, Syringe, Trash2, UtensilsCrossed, Target } from "lucide-react";
import { toast } from "sonner";
import {
  deleteFoodEntry, deleteWater, daysBetween, nextInjectionDate, sumEntries,
  useFoodEntries, useGlp1Profile, useGoals, useInjections, useWaterEntries, useWeights,
} from "@/lib/wellflow/data";
import { MEAL_TYPES, todayISO } from "@/lib/wellflow/types";

function encouragement(t: { calories: number; protein: number }, goals: { calories: number | null; protein: number | null }) {
  if (goals.protein && t.protein >= goals.protein) return "Protein is looking strong today.";
  if (goals.protein && t.protein >= goals.protein * 0.7) return "You're close on protein — a small snack would finish it.";
  if (t.calories === 0) return "Nothing logged yet. Start whenever you're ready.";
  return "You're making progress. Log what you can, skip the rest.";
}

const mealLabel = (k: string) => MEAL_TYPES.find(m => m.key === k)?.label ?? "Other";
const timeOf = (iso: string) => { try { return format(new Date(iso), "h:mm a"); } catch { return ""; } };

export function TodayTab({
  date = todayISO(), onLogFood, onWater, onWeight, onInjection, onGoals,
}: {
  date?: string;
  onLogFood: () => void;
  onWater: () => void;
  onWeight: () => void;
  onInjection: () => void;
  onGoals: () => void;
}) {
  const { goals } = useGoals();
  const { entries, loading } = useFoodEntries(date);
  const { entries: water, total: waterTotal } = useWaterEntries(date);
  const { entries: weights, latest } = useWeights();
  const { profile } = useGlp1Profile();
  const { injections, last } = useInjections();

  const totals = useMemo(() => sumEntries(entries), [entries]);
  const next = nextInjectionDate(last?.date ?? null, profile.frequency);
  const sinceLast = last ? daysBetween(last.date, date) : null;
  const startWeight = goals.starting_weight ?? weights[0]?.weight_lb ?? null;
  const change = latest && startWeight != null ? latest.weight_lb - startWeight : null;

  const timeline = useMemo(() => {
    const rows = [
      ...entries.map(e => ({
        key: `f-${e.id}`, at: e.logged_at, icon: UtensilsCrossed,
        title: `${mealLabel(e.meal_type)} · ${e.food_name}`,
        detail: `${Math.round(e.calories)} cal • ${Math.round(e.protein)}g protein`,
        remove: async () => { await deleteFoodEntry(e.id); toast.success("Entry removed"); },
      })),
      ...water.map(w => ({
        key: `w-${w.id}`, at: w.logged_at, icon: Droplets,
        title: "Water", detail: `${Math.round(w.ounces)} oz`,
        remove: async () => { await deleteWater(w.id); toast.success("Entry removed"); },
      })),
      ...injections.filter(i => i.date === date).map(i => ({
        key: `i-${i.id}`, at: `${date}T09:00:00`, icon: Syringe,
        title: "GLP-1 injection",
        detail: [i.dose, i.injection_site].filter(Boolean).join(" • ") || "Logged",
        remove: null as null | (() => Promise<void>),
      })),
    ];
    return rows.sort((a, b) => (a.at ?? "").localeCompare(b.at ?? ""));
  }, [entries, water, injections, date]);

  return (
    <div className="space-y-4">
      <SectionCard
        title="Today"
        subtitle={format(new Date(`${date}T12:00:00`), "EEEE, MMMM d")}
        accent="sage"
        action={
          <Button variant="ghost" size="sm" onClick={onGoals} className="gap-1.5">
            <Target className="h-4 w-4" /> Goals
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ProgressRing label="Calories" value={totals.calories} goal={goals.calories} onTap={onLogFood} />
          <ProgressRing label="Protein" value={totals.protein} goal={goals.protein} unit="g" onTap={onLogFood} />
          <ProgressRing label="Fiber" value={totals.fiber} goal={goals.fiber} unit="g" onTap={onLogFood} />
          <ProgressRing label="Water" value={waterTotal} goal={goals.water_oz} unit="oz"
                        variant="water" onTap={onWater} />
        </div>

        <GoalBars
          className="mt-4"
          items={[
            { label: "Calories", value: totals.calories, goal: goals.calories },
            { label: "Protein", value: totals.protein, goal: goals.protein, unit: "g" },
            { label: "Carbs", value: totals.carbs, goal: goals.carbs, unit: "g" },
            { label: "Fat", value: totals.fat, goal: goals.fat, unit: "g" },
          ]}
        />

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {encouragement(totals, goals)}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          <Stat label="Meals logged" value={String(totals.meals)} />
          <Stat label="Current weight" value={latest ? `${latest.weight_lb} lb` : "—"} />
          <Stat
            label="Change"
            value={change == null ? "—" : `${change > 0 ? "+" : ""}${Math.round(change * 10) / 10} lb`}
          />
          <Stat
            label="Next injection"
            value={next ? format(new Date(`${next}T12:00:00`), "MMM d") : "—"}
            hint={sinceLast != null ? `${sinceLast}d since last` : undefined}
          />
        </div>

        <div className="mt-4">
          <TrendStrip />
        </div>

        <CyclePhaseStrip className="mt-4" />





        <Button className="mt-4 w-full gap-2 rounded-2xl py-6 text-base" onClick={onLogFood}>
          <Plus className="h-5 w-5" /> Log food
        </Button>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={onWater}>
            <Droplets className="h-4 w-4" /> Water
          </Button>
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={onWeight}>
            <Scale className="h-4 w-4" /> Weight
          </Button>
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={onInjection}>
            <Syringe className="h-4 w-4" /> Injection
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="How are you feeling today?" subtitle="Optional, saves as you tap" collapsibleId="wellflow-checkin">
        <CheckInFields date={date} />
      </SectionCard>

      <SectionCard title="Today's timeline" subtitle="Everything you've logged, in order">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map(i => <div key={i} className="h-12 animate-pulse rounded-xl bg-muted/50" />)}
          </div>
        ) : timeline.length === 0 ? (
          <EmptyState
            title="Nothing logged yet"
            hint="Log a meal or a glass of water and it will show up here."
          >
            <Button size="sm" className="mt-2" onClick={onLogFood}>Log food</Button>
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {timeline.map(row => {
              const Icon = row.icon;
              return (
                <li key={row.key}
                    className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card/50 px-3 py-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.detail}</p>
                  </div>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{timeOf(row.at)}</span>
                  {row.remove && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                            aria-label="Delete entry" onClick={() => row.remove?.()}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-muted/30 p-3 text-xs sm:grid-cols-4">
          <TotalLine label="Calories" v={totals.calories} g={goals.calories} />
          <TotalLine label="Protein" v={totals.protein} g={goals.protein} unit="g" />
          <TotalLine label="Fiber" v={totals.fiber} g={goals.fiber} unit="g" />
          <TotalLine label="Water" v={waterTotal} g={goals.water_oz} unit="oz" />
        </div>
      </SectionCard>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-muted/30 px-2 py-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function TotalLine({ label, v, g, unit = "" }: { label: string; v: number; g: number | null; unit?: string }) {
  return (
    <p className="tabular-nums">
      <span className="text-muted-foreground">{label}: </span>
      {Math.round(v)}{unit}{g ? ` / ${Math.round(g)}${unit}` : ""}
    </p>
  );
}
