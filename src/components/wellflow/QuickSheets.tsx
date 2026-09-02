import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  logWater, logWeight, logInjection, useCheckIn, useGlp1Profile, useGoals,
} from "@/lib/wellflow/data";
import {
  CHECKIN_FIELDS, INJECTION_SITES, SYMPTOM_OPTIONS, todayISO,
  type WellnessCheckIn,
} from "@/lib/wellflow/types";

type SheetProps = { open: boolean; onOpenChange: (v: boolean) => void; date?: string };

const QUICK_OZ = [8, 12, 16, 20, 24, 32];

/* ------------------------------------------------------------------ water */

export function WaterSheet({ open, onOpenChange, date = todayISO() }: SheetProps) {
  const [amount, setAmount] = useState("16");
  const [busy, setBusy] = useState(false);

  const save = async (oz: number) => {
    if (!Number.isFinite(oz) || oz <= 0) { toast.error("Enter an amount in ounces"); return; }
    setBusy(true);
    try {
      await logWater(oz, date);
      toast.success(`${oz} oz added`);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display">Add water</SheetTitle>
          <SheetDescription>Every sip counts — log what you remember.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {QUICK_OZ.map(oz => (
              <Button key={oz} variant="secondary" size="sm" disabled={busy}
                      className="rounded-full" onClick={() => save(oz)}>
                {oz} oz
              </Button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="wf-water">Custom amount (oz)</Label>
              <Input id="wf-water" inputMode="decimal" value={amount}
                     onChange={e => setAmount(e.target.value)} />
            </div>
            <Button disabled={busy} onClick={() => save(Number(amount))}>Add</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ----------------------------------------------------------------- weight */

export function WeightSheet({ open, onOpenChange, date = todayISO() }: SheetProps) {
  const { goals, save: saveGoals } = useGoals();
  const [weight, setWeight] = useState("");
  const [when, setWhen] = useState(date);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setWeight(""); setNotes(""); setWhen(date); } }, [open, date]);

  const save = async () => {
    const w = Number(weight);
    if (!Number.isFinite(w) || w <= 0) { toast.error("Enter a weight"); return; }
    setBusy(true);
    try {
      await logWeight(w, when, notes.trim() || null);
      if (goals.starting_weight == null) await saveGoals({ starting_weight: w });
      toast.success("Weight recorded");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display">Record weight</SheetTitle>
          <SheetDescription>Just a data point. Trends matter more than any single day.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="wf-weight">Weight ({goals.weight_unit || "lb"})</Label>
              <Input id="wf-weight" inputMode="decimal" value={weight}
                     onChange={e => setWeight(e.target.value)} autoFocus />
            </div>
            <div>
              <Label htmlFor="wf-weight-date">Date</Label>
              <Input id="wf-weight-date" type="date" value={when} onChange={e => setWhen(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="wf-weight-note">Note (optional)</Label>
            <Textarea id="wf-weight-note" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <Button disabled={busy} onClick={save}>Save weight</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* -------------------------------------------------------------- injection */

const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export function InjectionSheet({ open, onOpenChange, date = todayISO() }: SheetProps) {
  const { profile } = useGlp1Profile();
  const [when, setWhen] = useState(date);
  const [time, setTime] = useState(nowTime);
  const [medication, setMedication] = useState("");
  const [dose, setDose] = useState("");
  const [site, setSite] = useState<string>(INJECTION_SITES[0]);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setWhen(date);
    setTime(nowTime());
    setMedication(profile.medication_name ?? "");
    setDose(profile.prescribed_dose ?? "");
    setSymptoms([]); setNotes("");
  }, [open, date, profile.medication_name, profile.prescribed_dose]);

  const toggle = (s: string) =>
    setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const save = async () => {
    setBusy(true);
    try {
      await logInjection({
        date: when,
        time_of_day: time || null,
        medication: medication.trim() || null,
        dose: dose.trim() || null,
        injection_site: site,
        symptoms,
        notes: notes.trim() || null,
      });
      toast.success("Injection logged");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display">Log an injection</SheetTitle>
          <SheetDescription>
            Record what you took, exactly as prescribed to you.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="wf-inj-date">Date</Label>
              <Input id="wf-inj-date" type="date" value={when} onChange={e => setWhen(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="wf-inj-time">Time</Label>
              <Input id="wf-inj-time" type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="wf-inj-dose">Dose</Label>
              <Input id="wf-inj-dose" value={dose} placeholder="e.g. 2.5 mg"
                     onChange={e => setDose(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="wf-inj-med">Medication</Label>
              <Input id="wf-inj-med" value={medication} onChange={e => setMedication(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="wf-inj-site">Injection site</Label>
            <Select value={site} onValueChange={setSite}>
              <SelectTrigger id="wf-inj-site"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INJECTION_SITES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>How are you feeling?</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {SYMPTOM_OPTIONS.map(s => (
                <button key={s} type="button" onClick={() => toggle(s)}
                        aria-pressed={symptoms.includes(s)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs transition-colors",
                          symptoms.includes(s)
                            ? "border-primary bg-primary/15 text-foreground"
                            : "border-border/60 text-muted-foreground hover:bg-muted/50",
                        )}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="wf-inj-notes">Notes (optional)</Label>
            <Textarea id="wf-inj-notes" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            CareFlow never suggests or changes a dose. Talk with your healthcare professional about
            dose questions or symptoms that persist.
          </p>
          <Button disabled={busy} onClick={save}>Save injection</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* --------------------------------------------------------------- check-in */

export function CheckInScale({
  label, low, high, value, onChange,
}: { label: string; low: string; high: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-[10px] text-muted-foreground">{low} → {high}</span>
      </div>
      <div className="flex gap-1.5" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map(v => (
          <button key={v} type="button"
                  aria-label={`${label} ${v} of 5`}
                  aria-pressed={value === v}
                  onClick={() => onChange(value === v ? null : v)}
                  className={cn(
                    "h-9 flex-1 rounded-xl border text-sm transition-all",
                    value === v
                      ? "border-primary bg-primary/20 font-semibold"
                      : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/60",
                  )}>
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CheckInFields({ date = todayISO() }: { date?: string }) {
  const { checkIn, save } = useCheckIn(date);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {CHECKIN_FIELDS.map(f => (
        <CheckInScale
          key={f.key as string}
          label={f.label} low={f.low} high={f.high}
          value={(checkIn[f.key] as number | null) ?? null}
          onChange={v => save({ [f.key]: v } as Partial<WellnessCheckIn>)}
        />
      ))}
    </div>
  );
}

export function CheckInSheet({ open, onOpenChange, date = todayISO() }: SheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display">How are you feeling today?</SheetTitle>
          <SheetDescription>Optional — answer only what's useful. Saves as you tap.</SheetDescription>
        </SheetHeader>
        <div className="mt-4"><CheckInFields date={date} /></div>
        <Button className="mt-4 w-full" onClick={() => onOpenChange(false)}>Done</Button>
      </SheetContent>
    </Sheet>
  );
}
