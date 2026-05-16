import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useCycle } from "@/lib/cycle-store";
import { SYMPTOM_CHIPS, MOOD_OPTIONS, type FlowLevel, type EnergyLevel, getPhaseInfo } from "@/lib/cycle";
import { Droplet, Heart, Sparkles, Thermometer, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const FLOWS: { key: FlowLevel; label: string }[] = [
  { key: "spotting", label: "Spotting" },
  { key: "light", label: "Light" },
  { key: "medium", label: "Medium" },
  { key: "heavy", label: "Heavy" },
];

const ENERGY: { key: EnergyLevel; label: string }[] = [
  { key: "low", label: "Low" }, { key: "medium", label: "Medium" }, { key: "high", label: "High" },
];

export function CycleLogSheet({ open, onOpenChange, date }: { open: boolean; onOpenChange: (v: boolean) => void; date?: Date }) {
  const targetDate = date ?? new Date();
  const iso = format(targetDate, "yyyy-MM-dd");
  const { settings, periods, dayLogs, addPeriodStart, deletePeriod, setPeriodEnd, upsertDayLog } = useCycle();
  const existing = useMemo(() => dayLogs.find(d => d.date === iso), [dayLogs, iso]);
  const phase = useMemo(() => getPhaseInfo(targetDate, periods, settings), [targetDate, periods, settings]);
  const activePeriod = useMemo(() => periods.find(p => p.periodStart <= iso && (!p.periodEnd || p.periodEnd >= iso)), [periods, iso]);

  const [flow, setFlow] = useState<FlowLevel | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [mood, setMood] = useState<string | null>(null);
  const [energy, setEnergy] = useState<EnergyLevel | null>(null);
  const [bbt, setBbt] = useState<string>("");
  const [mucus, setMucus] = useState<string>("");
  const [intimate, setIntimate] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setFlow(existing?.flow ?? null);
    setSymptoms(existing?.symptoms ?? []);
    setMood(existing?.mood ?? null);
    setEnergy(existing?.energyLevel ?? null);
    setBbt(existing?.bbt != null ? String(existing.bbt) : "");
    setMucus(existing?.cervicalMucus ?? "");
    setIntimate(existing?.isIntimate ?? false);
    setNotes(existing?.notes ?? "");
  }, [open, existing]);

  const toggleSymptom = (s: string) =>
    setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const handleSave = async () => {
    await upsertDayLog(iso, {
      flow, symptoms, mood, energyLevel: energy,
      bbt: bbt ? Number(bbt) : null,
      cervicalMucus: mucus || null,
      isIntimate: intimate,
      notes: notes || null,
    });
    toast.success("Logged");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" /> Cycle log
          </SheetTitle>
          <SheetDescription>
            {format(targetDate, "EEEE, MMM d")} · {phase ? `${phase.label} · Day ${phase.cycleDay}` : "No cycle data yet"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          {/* Period start/end */}
          <section className="rounded-xl border border-border/60 bg-card/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider">Period</Label>
              {activePeriod && (
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                  onClick={async () => { await deletePeriod(activePeriod.id); toast("Period removed"); }}>
                  <Trash2 className="h-3 w-3" /> Remove
                </Button>
              )}
            </div>
            {activePeriod ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span>Started {format(parseISO(activePeriod.periodStart), "MMM d")}</span>
                {activePeriod.periodEnd ? (
                  <span>· ended {format(parseISO(activePeriod.periodEnd), "MMM d")}</span>
                ) : (
                  <Button size="sm" variant="outline" className="h-7 text-xs"
                    onClick={async () => { await setPeriodEnd(activePeriod.id, iso); toast("Period end logged"); }}>
                    Mark ended today
                  </Button>
                )}
              </div>
            ) : (
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs"
                onClick={async () => { await addPeriodStart(iso); toast.success("Period start logged"); }}>
                <Droplet className="h-3.5 w-3.5" /> Log period start ({format(targetDate, "MMM d")})
              </Button>
            )}
          </section>

          {/* Flow */}
          <section>
            <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider">Flow</Label>
            <div className="flex flex-wrap gap-1.5">
              {FLOWS.map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFlow(flow === f.key ? null : f.key)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    flow === f.key ? "border-primary bg-primary/15 text-primary" : "border-border/60 bg-card/60 text-muted-foreground hover:text-foreground",
                  )}
                >{f.label}</button>
              ))}
            </div>
          </section>

          {/* Symptoms */}
          <section>
            <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider">Symptoms</Label>
            <div className="flex flex-wrap gap-1.5">
              {SYMPTOM_CHIPS.map(s => {
                const on = symptoms.includes(s);
                return (
                  <button key={s} type="button" onClick={() => toggleSymptom(s)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs transition-colors capitalize",
                      on ? "border-primary bg-primary/15 text-primary" : "border-border/60 bg-card/60 text-muted-foreground hover:text-foreground",
                    )}>{s}</button>
                );
              })}
            </div>
          </section>

          {/* Mood & Energy */}
          <section className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider">Mood</Label>
              <div className="flex flex-wrap gap-1.5">
                {MOOD_OPTIONS.map(m => (
                  <button key={m} type="button" onClick={() => setMood(mood === m ? null : m)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs transition-colors capitalize",
                      mood === m ? "border-primary bg-primary/15 text-primary" : "border-border/60 bg-card/60 text-muted-foreground hover:text-foreground",
                    )}>{m}</button>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider">Energy</Label>
              <div className="flex gap-1.5">
                {ENERGY.map(e => (
                  <button key={e.key} type="button" onClick={() => setEnergy(energy === e.key ? null : e.key)}
                    className={cn(
                      "flex-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                      energy === e.key ? "border-primary bg-primary/15 text-primary" : "border-border/60 bg-card/60 text-muted-foreground hover:text-foreground",
                    )}>{e.label}</button>
                ))}
              </div>
            </div>
          </section>

          {/* Fertility signals */}
          {settings.showFertility && (
            <section className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider">BBT (°F)</Label>
                <div className="relative">
                  <Thermometer className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input value={bbt} onChange={e => setBbt(e.target.value)} type="number" step="0.1" inputMode="decimal" className="pl-7" placeholder="98.4" />
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider">Cervical mucus</Label>
                <Input value={mucus} onChange={e => setMucus(e.target.value)} placeholder="dry / sticky / creamy / egg-white" />
              </div>
              <div className="sm:col-span-2 flex items-center justify-between rounded-xl border border-border/60 bg-card/60 px-3 py-2">
                <Label htmlFor="intimate" className="text-xs">Intimate today</Label>
                <Switch id="intimate" checked={intimate} onCheckedChange={setIntimate} />
              </div>
            </section>
          )}

          {/* Notes */}
          <section>
            <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider">Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="How are you feeling?" rows={3} />
          </section>

          {phase && (
            <section className="rounded-xl border border-border/60 bg-primary/5 p-3 text-xs">
              <p className="flex items-center gap-1.5 font-medium"><Sparkles className="h-3.5 w-3.5 text-primary" /> {phase.label} invitation</p>
              <p className="mt-1 italic text-muted-foreground">{phase.invitation}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {phase.planningHints.map(h => (
                  <Badge key={h} variant="secondary" className="rounded-full text-[10px] capitalize">{h}</Badge>
                ))}
              </div>
            </section>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save log</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
