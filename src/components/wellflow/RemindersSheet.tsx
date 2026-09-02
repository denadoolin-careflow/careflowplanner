import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { requestNotificationPermission } from "@/lib/reminders";
import {
  WEEKDAYS, useWellflowReminders, type WellflowReminderSettings,
} from "@/lib/wellflow/reminders";

const INTERVALS = [60, 90, 120, 180, 240];

export function RemindersSheet({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { settings, loading, save } = useWellflowReminders();
  const [draft, setDraft] = useState<WellflowReminderSettings>(settings);
  const [busy, setBusy] = useState(false);
  const [perm, setPerm] = useState<string>(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported",
  );

  useEffect(() => { setDraft(settings); }, [settings]);

  const set = <K extends keyof WellflowReminderSettings>(k: K, v: WellflowReminderSettings[K]) =>
    setDraft(p => ({ ...p, [k]: v }));

  const toggleDay = (d: number) =>
    setDraft(p => ({
      ...p,
      weight_days: p.weight_days.includes(d)
        ? p.weight_days.filter(x => x !== d)
        : [...p.weight_days, d].sort(),
    }));

  const toggleMovementDay = (d: number) =>
    setDraft(p => ({
      ...p,
      movement_days: p.movement_days.includes(d)
        ? p.movement_days.filter(x => x !== d)
        : [...p.movement_days, d].sort(),
    }));


  const submit = async () => {
    if (draft.water_enabled && draft.water_end <= draft.water_start) {
      toast.error("Water end time needs to be after the start time");
      return;
    }
    setBusy(true);
    try {
      await save(draft);
      toast.success("Reminders saved");
      onOpenChange(false);
    } catch {
      toast.error("Could not save your reminders");
    } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display">Reminders</SheetTitle>
          <SheetDescription>
            Gentle nudges at the times you choose. Nothing here changes a medication dose.
          </SheetDescription>
        </SheetHeader>

        {perm !== "granted" && (
          <Button variant="secondary" className="mt-3 w-full gap-2"
                  onClick={async () => setPerm(await requestNotificationPermission())}>
            <Bell className="h-4 w-4" /> Turn on notifications
          </Button>
        )}

        {loading ? (
          <div className="mt-4 h-40 animate-pulse rounded-xl bg-muted/50" />
        ) : (
          <div className="mt-4 space-y-5 pb-6">
            {/* water */}
            <Block title="Water" checked={draft.water_enabled} onChange={v => set("water_enabled", v)}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="wr-water-start">From</Label>
                  <Input id="wr-water-start" type="time" value={draft.water_start}
                         onChange={e => set("water_start", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="wr-water-end">Until</Label>
                  <Input id="wr-water-end" type="time" value={draft.water_end}
                         onChange={e => set("water_end", e.target.value)} />
                </div>
              </div>
              <div className="mt-2">
                <Label>How often</Label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {INTERVALS.map(m => (
                    <button key={m} type="button" onClick={() => set("water_interval_minutes", m)}
                            aria-pressed={draft.water_interval_minutes === m}
                            className={cn("rounded-full border px-3 py-1 text-xs",
                              draft.water_interval_minutes === m
                                ? "border-primary bg-primary/15 font-medium"
                                : "border-border/60 text-muted-foreground hover:bg-muted/50")}>
                      {m < 120 ? `${m} min` : `${m / 60} hrs`}
                    </button>
                  ))}
                </div>
              </div>
            </Block>

            {/* weight */}
            <Block title="Weight check-in" checked={draft.weight_enabled} onChange={v => set("weight_enabled", v)}>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((d, i) => (
                  <button key={d} type="button" onClick={() => toggleDay(i)}
                          aria-pressed={draft.weight_days.includes(i)}
                          className={cn("rounded-full border px-3 py-1 text-xs",
                            draft.weight_days.includes(i)
                              ? "border-primary bg-primary/15 font-medium"
                              : "border-border/60 text-muted-foreground hover:bg-muted/50")}>
                    {d}
                  </button>
                ))}
              </div>
              <div className="mt-2 w-40">
                <Label htmlFor="wr-weight-time">Time</Label>
                <Input id="wr-weight-time" type="time" value={draft.weight_time}
                       onChange={e => set("weight_time", e.target.value)} />
              </div>
            </Block>

            {/* daily check-in */}
            <Block title="Daily check-in" checked={draft.checkin_enabled} onChange={v => set("checkin_enabled", v)}>
              <div className="w-40">
                <Label htmlFor="wr-checkin-time">Time</Label>
                <Input id="wr-checkin-time" type="time" value={draft.checkin_time}
                       onChange={e => set("checkin_time", e.target.value)} />
              </div>
            </Block>

            {/* glp-1 */}
            <Block title="GLP-1 dose day" checked={draft.glp1_enabled} onChange={v => set("glp1_enabled", v)}>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((d, i) => (
                  <button key={d} type="button" onClick={() => set("glp1_day", i)}
                          aria-pressed={draft.glp1_day === i}
                          className={cn("rounded-full border px-3 py-1 text-xs",
                            draft.glp1_day === i
                              ? "border-primary bg-primary/15 font-medium"
                              : "border-border/60 text-muted-foreground hover:bg-muted/50")}>
                    {d}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-end gap-4">
                <div className="w-40">
                  <Label htmlFor="wr-glp1-time">Time</Label>
                  <Input id="wr-glp1-time" type="time" value={draft.glp1_time}
                         onChange={e => set("glp1_time", e.target.value)} />
                </div>
                <label className="flex items-center gap-2 pb-2 text-sm">
                  <Switch checked={draft.glp1_day_before}
                          onCheckedChange={v => set("glp1_day_before", v)} />
                  Remind me the day before
                </label>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                This only repeats the schedule you entered. Talk with your healthcare professional
                about anything dose-related.
              </p>
            </Block>

            {/* meds & supplements */}
            <Block title="Meds & supplements" checked={draft.meds_enabled}
                   onChange={v => set("meds_enabled", v)}>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Nudges at the dose times you already entered for each medication or supplement.
                Nothing is suggested or changed here — edit the times on the item itself.
              </p>
            </Block>

            {/* symptom check-in */}
            <Block title="Symptom check-in" checked={draft.symptom_enabled}
                   onChange={v => set("symptom_enabled", v)}>
              <div className="w-40">
                <Label htmlFor="wr-symptom-time">Time</Label>
                <Input id="wr-symptom-time" type="time" value={draft.symptom_time}
                       onChange={e => set("symptom_time", e.target.value)} />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                A daily prompt to note how foods felt — energy, bloating, nausea, heartburn.
              </p>
            </Block>

            {/* movement */}
            <Block title="Movement" checked={draft.movement_enabled}
                   onChange={v => set("movement_enabled", v)}>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((d, i) => (
                  <button key={d} type="button" onClick={() => toggleMovementDay(i)}
                          aria-pressed={draft.movement_days.includes(i)}
                          className={cn("rounded-full border px-3 py-1 text-xs",
                            draft.movement_days.includes(i)
                              ? "border-primary bg-primary/15 font-medium"
                              : "border-border/60 text-muted-foreground hover:bg-muted/50")}>
                    {d}
                  </button>
                ))}
              </div>
              <div className="mt-2 w-40">
                <Label htmlFor="wr-movement-time">Time</Label>
                <Input id="wr-movement-time" type="time" value={draft.movement_time}
                       onChange={e => set("movement_time", e.target.value)} />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Skipped automatically on days you've already logged movement.
              </p>
            </Block>

            <Button className="w-full" disabled={busy} onClick={submit}>Save reminders</Button>

          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Block({
  title, checked, onChange, children,
}: { title: string; checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        <Switch checked={checked} onCheckedChange={onChange} aria-label={`${title} reminders`} />
      </div>
      {checked && <div className="mt-3">{children}</div>}
    </div>
  );
}
