import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useGoals } from "@/lib/wellflow/data";
import type { Goals } from "@/lib/wellflow/types";

const FIELDS: { key: keyof Goals; label: string; unit: string }[] = [
  { key: "calories", label: "Calories", unit: "cal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "fiber", label: "Fiber", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
  { key: "water_oz", label: "Water", unit: "oz" },
  { key: "starting_weight", label: "Starting weight", unit: "lb" },
  { key: "goal_weight", label: "Goal weight", unit: "lb" },
];

export function GoalsEditor({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { goals, save } = useGoals();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const d: Record<string, string> = {};
    FIELDS.forEach(f => { const v = goals[f.key]; d[f.key as string] = v == null ? "" : String(v); });
    setDraft(d);
    setErrors({});
  }, [open, goals]);

  const validate = (key: string, raw: string) => {
    const v = raw.trim();
    if (v === "") return "";
    const num = Number(v);
    if (!Number.isFinite(num) || num < 0) return "Enter a number of 0 or more";
    return "";
  };

  /** Save a single field as soon as it's valid, so rings and bars update live. */
  const commit = async (key: keyof Goals, raw: string) => {
    const err = validate(key as string, raw);
    setErrors(p => ({ ...p, [key as string]: err }));
    if (err) return;
    const v = raw.trim();
    const next = v === "" ? null : Number(v);
    if ((goals[key] ?? null) === next) return;
    try {
      await save({ [key]: next } as Partial<Goals>);
    } catch {
      toast.error("Could not save that goal");
    }
  };

  const submit = async () => {
    const patch: Partial<Goals> = {};
    const errs: Record<string, string> = {};
    for (const f of FIELDS) {
      const raw = (draft[f.key as string] ?? "").trim();
      const err = validate(f.key as string, raw);
      if (err) { errs[f.key as string] = err; continue; }
      (patch as any)[f.key] = raw === "" ? null : Number(raw);
    }
    if (Object.keys(errs).length) { setErrors(errs); toast.error("Check the highlighted fields"); return; }
    setBusy(true);
    try {
      await save(patch);
      toast.success("Goals saved");
      onOpenChange(false);
    } catch {
      toast.error("Could not save your goals");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Set my goals</DialogTitle>
          <DialogDescription>
            These are your own targets — set them yourself or with your healthcare professional.
            Leave anything blank to skip it. Changes save as you go.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {FIELDS.map(f => {
            const err = errors[f.key as string];
            return (
              <div key={f.key as string}>
                <Label htmlFor={`goal-${String(f.key)}`}>{f.label} <span className="text-muted-foreground">({f.unit})</span></Label>
                <Input
                  id={`goal-${String(f.key)}`} inputMode="decimal"
                  aria-invalid={!!err}
                  aria-describedby={err ? `goal-${String(f.key)}-err` : undefined}
                  className={err ? "border-destructive" : undefined}
                  value={draft[f.key as string] ?? ""}
                  onChange={e => {
                    const v = e.target.value;
                    setDraft(p => ({ ...p, [f.key as string]: v }));
                    setErrors(p => ({ ...p, [f.key as string]: validate(f.key as string, v) }));
                  }}
                  onBlur={e => void commit(f.key, e.target.value)}
                />
                {err && (
                  <p id={`goal-${String(f.key)}-err`} className="mt-1 text-[11px] text-destructive">{err}</p>
                )}
              </div>
            );
          })}
        </div>
        <Button className="w-full" disabled={busy} onClick={submit}>Save goals</Button>
      </DialogContent>
    </Dialog>
  );
}

