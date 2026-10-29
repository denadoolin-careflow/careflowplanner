import { useMemo, useState } from "react";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo, predictCycleLength, type CyclePhase } from "@/lib/cycle";
import { CalendarDays, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const PHASE_LABEL: Record<CyclePhase, string> = { menstrual: "Menstrual", follicular: "Follicular", ovulatory: "Ovulatory", luteal: "Luteal" };
const PHASE_VAR: Record<CyclePhase, string> = { menstrual: "letgo", follicular: "plan", ovulatory: "grow", luteal: "care" };
const iso = (d: Date) => format(d, "yyyy-MM-dd");

/** Edit period history, nudge this cycle's phases, and tune averages with a live preview. */
export function CycleDatesSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { settings, periods, saveSettings, addPeriodStart, updatePeriod, deletePeriod } = useCycle();
  const [missed, setMissed] = useState("");
  const current = periods[0];
  const today = new Date();

  // 35-day preview strip from the current period start.
  const preview = useMemo(() => {
    const start = current ? parseISO(current.periodStart) : today;
    const len = Math.min(40, predictCycleLength(periods, settings));
    return Array.from({ length: len }, (_, i) => {
      const d = addDays(start, i);
      return { d, phase: getPhaseInfo(d, periods, settings)?.phase ?? null };
    });
  }, [current, periods, settings]); // eslint-disable-line react-hooks/exhaustive-deps

  const ovulationISO = useMemo(() => {
    if (!current) return null;
    if (current.ovulationDate) return current.ovulationDate;
    const day = predictCycleLength(periods, settings) - settings.lutealLength;
    return iso(addDays(parseISO(current.periodStart), day - 1));
  }, [current, periods, settings]);

  const nudge = (field: "periodStart" | "periodEnd" | "ovulationDate", delta: number) => {
    if (!current) return;
    const base = field === "periodStart" ? current.periodStart
      : field === "periodEnd" ? (current.periodEnd ?? iso(addDays(parseISO(current.periodStart), settings.avgPeriodLength - 1)))
      : ovulationISO!;
    void updatePeriod(current.id, { [field]: iso(addDays(parseISO(base), delta)) });
  };

  const quickStart = async (d: Date) => { await addPeriodStart(iso(d)); toast.success(`Period start set to ${format(d, "MMM d")}`); };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Edit cycle dates</SheetTitle>
          <SheetDescription>Fix dates any time — your phases update right away.</SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-6">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Quick fixes</h3>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="min-h-11" onClick={() => quickStart(today)}>Period started today</Button>
              <Button size="sm" variant="outline" className="min-h-11" onClick={() => quickStart(addDays(today, -1))}>Started yesterday</Button>
              {current && !current.periodEnd && (
                <Button size="sm" variant="outline" className="min-h-11" onClick={() => { void updatePeriod(current.id, { periodEnd: iso(today) }); toast("Period end set to today"); }}>Period ended today</Button>
              )}
            </div>
          </section>

          {current && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">This cycle</h3>
              {([
                ["Period started", "periodStart", current.periodStart],
                ["Period ended", "periodEnd", current.periodEnd],
                ["Ovulation", "ovulationDate", ovulationISO],
              ] as const).map(([label, field, val]) => (
                <div key={field} className="flex items-center gap-2">
                  <span className="w-28 shrink-0 text-sm">{label}</span>
                  <Button size="icon" variant="outline" className="h-11 w-11 shrink-0" aria-label={`${label} one day earlier`} onClick={() => nudge(field, -1)}><Minus className="h-4 w-4" /></Button>
                  <Input type="date" className="h-11 min-w-0 flex-1" value={val ?? ""} aria-label={label}
                    onChange={e => void updatePeriod(current.id, { [field]: e.target.value || null })} />
                  <Button size="icon" variant="outline" className="h-11 w-11 shrink-0" aria-label={`${label} one day later`} onClick={() => nudge(field, 1)}><Plus className="h-4 w-4" /></Button>
                </div>
              ))}
              {current.ovulationDate && (
                <button type="button" className="text-xs text-muted-foreground underline" onClick={() => void updatePeriod(current.id, { ovulationDate: null })}>Use estimated ovulation instead</button>
              )}
              <div aria-label="Phase preview" className="flex h-6 overflow-hidden rounded-full border border-border/60">
                {preview.map(({ d, phase }) => (
                  <span key={iso(d)} title={`${format(d, "MMM d")} · ${phase ? PHASE_LABEL[phase] : ""}`} className="flex-1"
                    style={{ background: phase ? `hsl(var(--rhythm-${PHASE_VAR[phase]}) / 0.85)` : undefined, outline: iso(d) === iso(today) ? "2px solid hsl(var(--foreground))" : undefined }} />
                ))}
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {(Object.keys(PHASE_LABEL) as CyclePhase[]).map(p => (
                  <span key={p} className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: `hsl(var(--rhythm-${PHASE_VAR[p]}))` }} />{PHASE_LABEL[p]}</span>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Your averages</h3>
            {([
              ["Cycle length", "avgCycleLength", 20, 45],
              ["Period length", "avgPeriodLength", 2, 10],
              ["Luteal length", "lutealLength", 9, 17],
            ] as const).map(([label, key, min, max]) => (
              <div key={key} className="space-y-2">
                <div className="flex justify-between text-sm"><Label>{label}</Label><span className="font-medium">{settings[key]} days</span></div>
                <Slider min={min} max={max} step={1} value={[settings[key]]} onValueChange={([v]) => void saveSettings({ [key]: v })} aria-label={label} />
              </div>
            ))}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Past periods</h3>
            <div className="flex gap-2">
              <Input type="date" className="h-11" value={missed} max={iso(today)} onChange={e => setMissed(e.target.value)} aria-label="Missed period start" />
              <Button className="min-h-11" disabled={!missed} onClick={async () => { await addPeriodStart(missed); setMissed(""); toast.success("Period added"); }}>Add</Button>
            </div>
            <ul className="space-y-2">
              {periods.map((p, i) => {
                const next = periods[i - 1];
                const len = next ? differenceInCalendarDays(parseISO(next.periodStart), parseISO(p.periodStart)) : null;
                return (
                  <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 p-2">
                    <Input type="date" className="h-11 w-[9.5rem]" value={p.periodStart} aria-label="Start" onChange={e => e.target.value && void updatePeriod(p.id, { periodStart: e.target.value })} />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input type="date" className="h-11 w-[9.5rem]" value={p.periodEnd ?? ""} aria-label="End" onChange={e => void updatePeriod(p.id, { periodEnd: e.target.value || null })} />
                    {len != null && <span className="text-xs text-muted-foreground">{len}-day cycle</span>}
                    <Button size="icon" variant="ghost" className="ml-auto h-11 w-11" aria-label="Delete period" onClick={() => { void deletePeriod(p.id); toast("Period removed"); }}><Trash2 className="h-4 w-4" /></Button>
                  </li>
                );
              })}
              {!periods.length && <li className="text-sm text-muted-foreground">No periods logged yet.</li>}
            </ul>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
