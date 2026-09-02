/**
 * Eating plan — pick a style, review suggested daily targets, edit anything,
 * and see how the last stretch compares.
 *
 * Everything here is a suggestion you control. WellFlow does not diagnose,
 * change any medication, or promise a weight-loss result.
 */
import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Dumbbell, Loader2, Utensils } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useGoals, useWeights } from "@/lib/wellflow/data";
import {
  DIET_STYLES, computeAdherence, endPlan, savePlan, styleByKey, suggestTargets,
  targetsAsGoals, useWellflowPlan, type PlanPace, type PlanStyle, type PlanTargets,
} from "@/lib/wellflow/diet-plans";
import type { FoodEntry } from "@/lib/wellflow/types";
import { PlanOnboarding } from "@/components/wellflow/PlanOnboarding";
import { MovementCard } from "@/components/wellflow/MovementCard";
import { MovementSuggestions } from "@/components/wellflow/MovementSuggestions";
import { MovementSheet } from "@/components/wellflow/MovementSheet";

const FIELDS: { key: keyof PlanTargets; label: string; suffix: string; max: number }[] = [
  { key: "calories", label: "Calories", suffix: "cal", max: 6000 },
  { key: "protein", label: "Protein", suffix: "g", max: 400 },
  { key: "carbs", label: "Carbs", suffix: "g", max: 800 },
  { key: "fat", label: "Fat", suffix: "g", max: 400 },
  { key: "fiber", label: "Fiber", suffix: "g", max: 100 },
  { key: "water_oz", label: "Water", suffix: "oz", max: 300 },
];

/** Recent daily totals, used for the adherence card. */
function useRecentEntries(days = 30) {
  const [rows, setRows] = useState<Pick<FoodEntry, "date" | "calories" | "protein" | "carbs">[]>([]);
  useEffect(() => {
    let cancel = false;
    (async () => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
      const { data } = await supabase.from("food_entries")
        .select("date,calories,protein,carbs").gte("date", since);
      if (cancel) return;
      setRows((data ?? []).map((r: any) => ({
        date: r.date, calories: Number(r.calories) || 0,
        protein: Number(r.protein) || 0, carbs: Number(r.carbs) || 0,
      })));
    })();
    return () => { cancel = true; };
  }, [days]);
  return rows;
}

export function PlanScreen() {
  const { plan, loading } = useWellflowPlan();
  const { goals, save: saveGoals } = useGoals();
  const { latest } = useWeights();
  const entries = useRecentEntries(30);

  const [style, setStyle] = useState<PlanStyle>("balanced");
  const [pace, setPace] = useState<PlanPace>("steady");
  const [movementDays, setMovementDays] = useState(3);
  const [targets, setTargets] = useState<PlanTargets>(() => suggestTargets("balanced", "steady", null, null));
  const [applyGoals, setApplyGoals] = useState(true);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [askedOnce, setAskedOnce] = useState(false);

  const currentWeight = latest?.weight_lb ?? goals.starting_weight ?? null;

  /* Load the saved plan once it arrives. */
  useEffect(() => {
    if (!plan) return;
    setStyle(plan.style);
    setPace(plan.pace);
    setMovementDays(plan.movement_days);
    setTargets({
      calories: plan.target_calories ?? 0, protein: plan.target_protein ?? 0,
      carbs: plan.target_carbs ?? 0, fat: plan.target_fat ?? 0,
      fiber: plan.target_fiber ?? 0, water_oz: plan.target_water_oz ?? 0,
    });
  }, [plan]);

  /* First visit with no plan yet — offer the guided setup. */
  useEffect(() => {
    if (loading || plan || askedOnce) return;
    setAskedOnce(true);
    setOnboarding(true);
  }, [loading, plan, askedOnce]);

  const def = styleByKey(style);

  const pickStyle = (key: PlanStyle) => {
    setStyle(key);
    setTouched(true);
    if (key !== "custom") setTargets(suggestTargets(key, pace, currentWeight, goals.goal_weight));
  };

  const pickPace = (p: PlanPace) => {
    setPace(p);
    setTouched(true);
    if (style !== "custom") setTargets(suggestTargets(style, p, currentWeight, goals.goal_weight));
  };

  const setField = (key: keyof PlanTargets, raw: string, max: number) => {
    const v = Number(raw);
    setTargets(t => ({ ...t, [key]: Number.isFinite(v) ? Math.min(Math.max(Math.round(v), 0), max) : 0 }));
    setTouched(true);
  };

  const commit = async () => {
    if (targets.calories > 0 && targets.calories < 1000) {
      toast("That calorie target is very low. Please double-check it with your clinician first.");
    }
    setSaving(true);
    try {
      await savePlan({ id: plan?.id, style, pace, targets, movement_days: movementDays });
      if (applyGoals) await saveGoals(targetsAsGoals(targets));
      toast.success("Plan saved");
      setTouched(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save that");
    } finally { setSaving(false); }
  };

  const week = useMemo(() => computeAdherence(entries, { calories: targets.calories || null, protein: targets.protein || null }, 7), [entries, targets]);
  const month = useMemo(() => computeAdherence(entries, { calories: targets.calories || null, protein: targets.protein || null }, 30), [entries, targets]);

  return (
    <div className="space-y-4">
      <SectionCard
        title="Your eating plan"
        subtitle="Pick a style, then make every number your own"
        accent="sage"
        action={
          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => setOnboarding(true)}>
            {plan ? "Change plan" : "Guided setup"}
          </Button>
        }
      >
        {loading ? (
          <div className="h-24 animate-pulse rounded-xl bg-muted/40" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DIET_STYLES.map(s => (
                <button
                  key={s.key} type="button" onClick={() => pickStyle(s.key)}
                  aria-pressed={style === s.key}
                  className={cn(
                    "min-h-[4.5rem] rounded-2xl border px-3 py-2 text-left transition-colors active:scale-[0.98]",
                    style === s.key ? "border-primary bg-primary/10" : "border-border/50 bg-card/50",
                  )}
                >
                  <span className="flex items-center gap-1 text-sm font-semibold">
                    {s.label}
                    {style === s.key && <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden />}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{s.blurb}</span>
                </button>
              ))}
            </div>

            {style !== "custom" && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Pace</span>
                {(["gentle", "steady"] as PlanPace[]).map(p => (
                  <button
                    key={p} type="button" onClick={() => pickPace(p)} aria-pressed={pace === p}
                    className={cn(
                      "min-h-[2.25rem] rounded-full border px-3 text-xs capitalize transition-colors",
                      pace === p ? "border-primary bg-primary/15 font-medium" : "border-border/60 bg-card/50 text-muted-foreground",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </SectionCard>

      <SectionCard title="Daily targets" subtitle="Suggested from your weight and pace — edit anything">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {FIELDS.map(f => (
            <div key={f.key}>
              <Label htmlFor={`plan-${f.key}`}>{f.label} ({f.suffix})</Label>
              <Input
                id={`plan-${f.key}`} type="number" inputMode="numeric" min="0" max={f.max}
                className="h-11"
                value={targets[f.key]}
                onChange={e => setField(f.key, e.target.value, f.max)}
              />
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-muted/30 px-3 py-2">
          <Label htmlFor="plan-movement" className="text-sm">Movement days a week</Label>
          <Input id="plan-movement" type="number" min="0" max="7" className="h-11 w-20"
                 value={movementDays}
                 onChange={e => { setMovementDays(Math.min(Math.max(Number(e.target.value) || 0, 0), 7)); setTouched(true); }} />
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={applyGoals} onChange={e => setApplyGoals(e.target.checked)}
                 className="h-4 w-4 rounded border-border" />
          Use these as my goals, so the rings and bars follow the plan
        </label>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={commit} disabled={saving} className="min-h-[2.75rem]">
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            {plan ? "Update plan" : "Start plan"}
          </Button>
          {plan && (
            <Button variant="ghost" className="min-h-[2.75rem]"
                    onClick={async () => { await endPlan(plan.id); toast("Plan ended"); }}>
              End plan
            </Button>
          )}
          {touched && <span className="self-center text-xs text-muted-foreground">Unsaved changes</span>}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          These targets are estimates, not prescriptions. If you take a GLP-1 or any other medication,
          check big changes with your clinician first. No plan here guarantees a result.
        </p>
      </SectionCard>

      <MovementSuggestions
        onAccept={async v => {
          setMovementDays(v.days.length);
          await savePlan({
            id: plan?.id, style, pace, targets, movement_days: v.days.length,
            movement_prefs: { activity: v.activity, minutes: v.minutes, days: v.days },
          });
        }}
      />

      {def.dayShape.length > 0 && (
        <SectionCard title={`A ${def.label.toLowerCase()} day`} subtitle="Meal shapes, not rules" accent="warm">
          <ul className="space-y-1.5">
            {def.dayShape.map(d => (
              <li key={d.slot} className="flex gap-2 rounded-2xl border border-border/40 bg-card/50 px-3 py-2">
                <Utensils className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="text-sm"><span className="font-medium">{d.slot}:</span> {d.idea}</span>
              </li>
            ))}
          </ul>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Lean on</p>
              <div className="flex flex-wrap gap-1.5">
                {def.leanOn.map(x => <span key={x} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs">{x}</span>)}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tends to fight it</p>
              <div className="flex flex-wrap gap-1.5">
                {def.goesAgainst.map(x => <span key={x} className="rounded-full bg-muted/40 px-2.5 py-1 text-xs">{x}</span>)}
              </div>
            </div>
          </div>

          {def.movement.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Dumbbell className="h-3 w-3" /> Movement rhythm
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {def.movement.map(m => <li key={m}>· {m}</li>)}
              </ul>
            </div>
          )}
        </SectionCard>
      )}

      <SectionCard title="How it's going" subtitle="Descriptive only — no judgement attached">
        <div className="grid grid-cols-2 gap-2">
          {[["Last 7 days", week], ["Last 30 days", month]].map(([label, a]) => {
            const ad = a as typeof week;
            return (
              <div key={label as string} className="rounded-2xl bg-muted/30 px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label as string}</p>
                <p className="text-sm font-semibold tabular-nums">{ad.onTargetDays}/{ad.loggedDays} days on target</p>
                <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                  {ad.avgCalories} cal · {ad.avgProtein}g protein · {ad.avgCarbs}g carbs avg
                </p>
              </div>
            );
          })}
        </div>
        {week.loggedDays === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">Log a few days and this fills in on its own.</p>
        )}
      </SectionCard>

      <MovementCard targetDays={movementDays} onLog={() => setMoveOpen(true)} />

      <PlanOnboarding
        open={onboarding}
        onOpenChange={setOnboarding}
        currentWeight={currentWeight}
        planId={plan?.id}
      />
      <MovementSheet open={moveOpen} onOpenChange={setMoveOpen} />
    </div>
  );
}
