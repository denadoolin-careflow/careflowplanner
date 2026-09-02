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
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const d: Record<string, string> = {};
    FIELDS.forEach(f => { const v = goals[f.key]; d[f.key as string] = v == null ? "" : String(v); });
    setDraft(d);
  }, [open, goals]);

  const submit = async () => {
    const patch: Partial<Goals> = {};
    for (const f of FIELDS) {
      const raw = (draft[f.key as string] ?? "").trim();
      if (raw === "") { (patch as any)[f.key] = null; continue; }
      const num = Number(raw);
      if (!Number.isFinite(num) || num < 0) { toast.error(`${f.label} needs to be a number`); return; }
      (patch as any)[f.key] = num;
    }
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
            Leave anything blank to skip it.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {FIELDS.map(f => (
            <div key={f.key as string}>
              <Label htmlFor={`goal-${String(f.key)}`}>{f.label} <span className="text-muted-foreground">({f.unit})</span></Label>
              <Input
                id={`goal-${String(f.key)}`} inputMode="decimal"
                value={draft[f.key as string] ?? ""}
                onChange={e => setDraft(p => ({ ...p, [f.key as string]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <Button className="w-full" disabled={busy} onClick={submit}>Save goals</Button>
      </DialogContent>
    </Dialog>
  );
}
