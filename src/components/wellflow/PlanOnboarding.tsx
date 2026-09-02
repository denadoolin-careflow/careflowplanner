/**
 * Diet-choice onboarding — pick a style, confirm weight and pace, review the
 * suggested targets, apply. Every number stays editable afterwards.
 */
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useGoals } from "@/lib/wellflow/data";
import {
  DIET_STYLES, savePlan, styleByKey, suggestTargets, targetsAsGoals,
  type PlanPace, type PlanStyle, type PlanTargets,
} from "@/lib/wellflow/diet-plans";

const FIELDS: { key: keyof PlanTargets; label: string; suffix: string }[] = [
  { key: "calories", label: "Calories", suffix: "cal" },
  { key: "protein", label: "Protein", suffix: "g" },
  { key: "carbs", label: "Carbs", suffix: "g" },
  { key: "fat", label: "Fat", suffix: "g" },
  { key: "fiber", label: "Fiber", suffix: "g" },
  { key: "water_oz", label: "Water", suffix: "oz" },
];

export function PlanOnboarding({
  open, onOpenChange, currentWeight, planId, onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentWeight: number | null;
  planId?: string;
  onDone?: () => void;
}) {
  const { goals, save: saveGoals } = useGoals();
  const [step, setStep] = useState(0);
  const [style, setStyle] = useState<PlanStyle>("balanced");
  const [pace, setPace] = useState<PlanPace>("steady");
  const [weight, setWeight] = useState<string>(currentWeight ? String(currentWeight) : "");
  const [goalWeight, setGoalWeight] = useState<string>(goals.goal_weight ? String(goals.goal_weight) : "");
  const [movementDays, setMovementDays] = useState(3);
  const [targets, setTargets] = useState<PlanTargets>(() => suggestTargets("balanced", "steady", currentWeight, goals.goal_weight));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(0);
      setWeight(currentWeight ? String(currentWeight) : "");
      setGoalWeight(goals.goal_weight ? String(goals.goal_weight) : "");
    }
  }, [open, currentWeight, goals.goal_weight]);

  const w = Number(weight) || currentWeight;
  const gw = Number(goalWeight) || goals.goal_weight;

  const suggested = useMemo(
    () => suggestTargets(style, pace, w ?? null, gw ?? null),
    [style, pace, w, gw],
  );

  useEffect(() => { if (style !== "custom") setTargets(suggested); }, [suggested, style]);

  const def = styleByKey(style);

  const finish = async () => {
    if (targets.calories > 0 && targets.calories < 1000) {
      toast("That calorie target is very low — please check it with your clinician.");
    }
    setSaving(true);
    try {
      await savePlan({ id: planId, style, pace, targets, movement_days: movementDays });
      await saveGoals({
        ...targetsAsGoals(targets),
        ...(w ? { starting_weight: w } : {}),
        ...(gw ? { goal_weight: gw } : {}),
      });
      toast.success("Plan set — your rings and bars now follow it");
      onDone?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save that");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {step === 0 ? "Pick your eating style" : step === 1 ? "Where you're starting" : "Your suggested targets"}
          </DialogTitle>
          <DialogDescription>
            {step === 0
              ? "This shapes your daily targets and meal suggestions. You can change it any time."
              : step === 1
                ? "Used to size the suggestions. Both are optional."
                : "Suggestions only — edit anything that doesn't fit."}
          </DialogDescription>
        </DialogHeader>

        {step === 0 && (
          <div className="grid grid-cols-2 gap-2">
            {DIET_STYLES.map(s => (
              <button
                key={s.key} type="button" onClick={() => setStyle(s.key)} aria-pressed={style === s.key}
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
        )}

        {step === 1 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ob-weight">Current weight (lb)</Label>
                <Input id="ob-weight" type="number" inputMode="decimal" className="h-11"
                       value={weight} onChange={e => setWeight(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ob-goal">Goal weight (lb)</Label>
                <Input id="ob-goal" type="number" inputMode="decimal" className="h-11"
                       value={goalWeight} onChange={e => setGoalWeight(e.target.value)} />
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pace</p>
              <div className="flex gap-2">
                {(["gentle", "steady"] as PlanPace[]).map(p => (
                  <button key={p} type="button" onClick={() => setPace(p)} aria-pressed={pace === p}
                          className={cn("min-h-[2.75rem] flex-1 rounded-2xl border text-sm capitalize",
                            pace === p ? "border-primary bg-primary/10 font-medium" : "border-border/50 bg-card/50 text-muted-foreground")}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/30 px-3 py-2">
              <Label htmlFor="ob-move" className="text-sm">Movement days a week</Label>
              <Input id="ob-move" type="number" min="0" max="7" className="h-11 w-20" value={movementDays}
                     onChange={e => setMovementDays(Math.min(Math.max(Number(e.target.value) || 0, 0), 7))} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="rounded-2xl bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              {def.label} · {def.blurb}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {FIELDS.map(f => (
                <div key={f.key}>
                  <Label htmlFor={`ob-${f.key}`}>{f.label} ({f.suffix})</Label>
                  <Input
                    id={`ob-${f.key}`} type="number" inputMode="numeric" min="0" className="h-11"
                    value={targets[f.key]}
                    onChange={e => setTargets(t => ({ ...t, [f.key]: Math.max(0, Number(e.target.value) || 0) }))}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              These are estimates, not prescriptions. If you take a GLP-1 or any other medication, check bigger
              changes with your clinician first. Nothing here promises a result.
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {step > 0 && (
            <Button variant="ghost" className="min-h-[2.75rem]" onClick={() => setStep(s => s - 1)}>Back</Button>
          )}
          {step < 2 ? (
            <Button className="min-h-[2.75rem] flex-1" onClick={() => setStep(s => s + 1)}>Continue</Button>
          ) : (
            <Button className="min-h-[2.75rem] flex-1" onClick={finish} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Apply plan
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
