/**
 * Full-page nutrition goal settings. Your targets, your choice — WellFlow
 * never prescribes numbers, diagnoses, or promises outcomes.
 */
import { useEffect, useState } from "react";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useGoals } from "@/lib/wellflow/data";
import type { Goals } from "@/lib/wellflow/types";

const NUTRITION: { key: keyof Goals; label: string; unit: string }[] = [
  { key: "calories", label: "Calories", unit: "cal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
  { key: "fiber", label: "Fiber", unit: "g" },
  { key: "water_oz", label: "Water", unit: "oz" },
];

const WEIGHT: { key: keyof Goals; label: string; unit: string }[] = [
  { key: "starting_weight", label: "Starting weight", unit: "lb" },
  { key: "goal_weight", label: "Goal weight", unit: "lb" },
];

/** Starting points you can adjust — not recommendations. */
const PRESETS: { label: string; hint: string; values: Partial<Goals> }[] = [
  { label: "Gentle", hint: "1,400 cal · 90g protein", values: { calories: 1400, protein: 90, carbs: 130, fat: 50, fiber: 25, water_oz: 64 } },
  { label: "Balanced", hint: "1,800 cal · 110g protein", values: { calories: 1800, protein: 110, carbs: 170, fat: 65, fiber: 30, water_oz: 80 } },
  { label: "Higher protein", hint: "1,800 cal · 140g protein", values: { calories: 1800, protein: 140, carbs: 140, fat: 60, fiber: 30, water_oz: 90 } },
];

export function GoalsScreen() {
  const { goals, save } = useGoals();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const d: Record<string, string> = {};
    [...NUTRITION, ...WEIGHT].forEach(f => {
      const v = goals[f.key];
      d[f.key as string] = v == null ? "" : String(v);
    });
    setDraft(d);
  }, [goals]);

  const validate = (raw: string) => {
    const v = raw.trim();
    if (v === "") return "";
    const num = Number(v);
    if (!Number.isFinite(num) || num < 0) return "Enter a number of 0 or more";
    if (num > 100_000) return "That looks too high";
    return "";
  };

  const commit = async (key: keyof Goals, raw: string) => {
    const err = validate(raw);
    setErrors(p => ({ ...p, [key as string]: err }));
    if (err) return;
    const next = raw.trim() === "" ? null : Number(raw);
    if ((goals[key] ?? null) === next) return;
    try {
      await save({ [key]: next } as Partial<Goals>);
    } catch {
      toast.error("Could not save that goal");
    }
  };

  const applyPreset = async (values: Partial<Goals>) => {
    try {
      await save(values);
      toast.success("Preset applied — tweak anything you like");
    } catch {
      toast.error("Could not apply that preset");
    }
  };

  const field = (f: { key: keyof Goals; label: string; unit: string }) => {
    const id = `goals-${String(f.key)}`;
    const err = errors[f.key as string];
    return (
      <div key={String(f.key)}>
        <Label htmlFor={id}>{f.label} <span className="text-muted-foreground">({f.unit})</span></Label>
        <Input
          id={id} inputMode="decimal" placeholder="—"
          aria-invalid={!!err}
          aria-describedby={err ? `${id}-err` : undefined}
          className={err ? "border-destructive" : undefined}
          value={draft[f.key as string] ?? ""}
          onChange={e => {
            const v = e.target.value;
            setDraft(p => ({ ...p, [f.key as string]: v }));
            setErrors(p => ({ ...p, [f.key as string]: validate(v) }));
          }}
          onBlur={e => void commit(f.key, e.target.value)}
        />
        {err && <p id={`${id}-err`} className="mt-1 text-[11px] text-destructive">{err}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Daily nutrition goals" accent="sage"
                   subtitle="Set the targets your rings and goal bars use. Leave anything blank to skip it — changes save as you type.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{NUTRITION.map(field)}</div>
      </SectionCard>

      <SectionCard title="Starting points" subtitle="Optional presets you can adjust — not recommendations">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <Button key={p.label} variant="secondary" size="sm" className="h-auto flex-col items-start gap-0.5 px-3 py-2"
                    onClick={() => void applyPreset(p.values)}>
              <span className="text-xs font-semibold">{p.label}</span>
              <span className="text-[10px] font-normal text-muted-foreground">{p.hint}</span>
            </Button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Weight targets" subtitle="Used for the goal bar on Progress">
        <div className="grid grid-cols-2 gap-3">{WEIGHT.map(field)}</div>
      </SectionCard>

      <p className="px-1 text-xs text-muted-foreground">
        These are your own targets, private to your account. WellFlow doesn't diagnose, set medication
        doses, or promise results — check anything health-related with your care team.
      </p>
    </div>
  );
}
