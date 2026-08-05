import { Settings2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AutoSchedulePrefs } from "@/lib/auto-schedule-prefs";
import { useAutoSchedulePrefs } from "@/lib/auto-schedule-prefs";
import {
  BAND_COLOR_PRESETS, swatchClass, useBandColors,
  type BandColorId, type BandId,
} from "@/lib/planner-band-colors";
import { useReminderPrefs, requestNotificationPermission } from "@/lib/reminders";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const BANDS: { id: BandId; label: string }[] = [
  { id: "morning", label: "Morning" },
  { id: "afternoon", label: "Afternoon" },
  { id: "evening", label: "Evening" },
];

function BandColorRow({ id, label, value, onPick }: {
  id: BandId; label: string; value: BandColorId; onPick: (c: BandColorId) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1">
        {BAND_COLOR_PRESETS.map(p => (
          <button
            key={p.id}
            type="button"
            aria-label={`${label} band ${p.label}`}
            aria-pressed={value === p.id}
            onClick={() => onPick(p.id)}
            className={cn(
              "h-4 w-4 rounded-full ring-offset-1 ring-offset-background transition",
              swatchClass(p.id),
              value === p.id ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-border",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function hourLabel(h: number) {
  const d = new Date(2000, 0, 1, h);
  return d.toLocaleTimeString(undefined, { hour: "numeric" });
}

function HourSelect({ value, onChange, from, to, label }: {
  value: number; onChange: (v: number) => void; from: number; to: number; label: string;
}) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="h-8 w-full text-xs" aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent className="max-h-64">
        {Array.from({ length: to - from + 1 }, (_, i) => from + i).map(h => (
          <SelectItem key={h} value={String(h)}>{hourLabel(h)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AutoScheduleSettings(props: {
  /** Optional — when omitted the popover reads and writes the prefs itself. */
  prefs?: AutoSchedulePrefs;
  update?: (patch: Partial<AutoSchedulePrefs>) => void;
  reset?: () => void;
  /** Larger trigger for page headers. */
  size?: "sm" | "md";
  className?: string;
}) {
  const own = useAutoSchedulePrefs();
  const prefs = props.prefs ?? own.prefs;
  const update = props.update ?? own.update;
  const reset = props.reset ?? own.reset;
  const big = props.size === "md";
  const [bandColors, setBandColors, resetBands] = useBandColors();
  const [reminders, setReminders] = useReminderPrefs();

  const toggleTaskReminders = async (on: boolean) => {
    setReminders({ tasksEnabled: on });
    if (!on) return;
    const p = await requestNotificationPermission();
    if (p === "denied") toast.info("Reminders will show in-app — notifications are blocked in your browser.");
    else if (p === "unsupported") toast.info("This browser can't show system notifications — reminders will appear in-app.");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={big ? "outline" : "ghost"}
          size="icon"
          className={cn(
            "shrink-0 rounded-full text-muted-foreground hover:text-foreground",
            big ? "h-8 w-8" : "h-7 w-7",
            props.className,
          )}
          aria-label="Planner preferences"
        >
          <Settings2 className={big ? "h-4 w-4" : "h-3.5 w-3.5"} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[70vh] w-80 space-y-3 overflow-y-auto p-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Auto-schedule preferences
          </p>
          <Button variant="ghost" size="sm" className="h-6 gap-1 px-1.5 text-[11px]" onClick={reset}>
            <RotateCcw className="h-3 w-3" /> Reset
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Day starts</Label>
            <HourSelect label="Day start hour" value={prefs.dayStartH} from={5} to={prefs.dayEndH - 1}
              onChange={(v) => update({ dayStartH: v })} />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Day ends</Label>
            <HourSelect label="Day end hour" value={prefs.dayEndH} from={prefs.dayStartH + 1} to={22}
              onChange={(v) => update({ dayEndH: v })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="as-default-dur" className="text-[11px] text-muted-foreground">Default duration</Label>
            <Input id="as-default-dur" type="number" min={15} max={240} step={15} className="h-8 text-xs"
              value={prefs.defaultDuration}
              onChange={(e) => update({ defaultDuration: Math.max(15, Math.min(240, Number(e.target.value) || 30)) })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="as-buffer" className="text-[11px] text-muted-foreground">Buffer between</Label>
            <Input id="as-buffer" type="number" min={0} max={60} step={5} className="h-8 text-xs"
              value={prefs.bufferMin}
              onChange={(e) => update({ bufferMin: Math.max(0, Math.min(60, Number(e.target.value) || 0)) })} />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Energy windows start at</Label>
          <div className="grid grid-cols-3 gap-2">
            <HourSelect label="High energy start" value={prefs.highEnergyH} from={prefs.dayStartH} to={prefs.dayEndH - 1}
              onChange={(v) => update({ highEnergyH: v })} />
            <HourSelect label="Medium energy start" value={prefs.mediumEnergyH} from={prefs.dayStartH} to={prefs.dayEndH - 1}
              onChange={(v) => update({ mediumEnergyH: v })} />
            <HourSelect label="Low energy start" value={prefs.lowEnergyH} from={prefs.dayStartH} to={prefs.dayEndH - 1}
              onChange={(v) => update({ lowEnergyH: v })} />
          </div>
          <p className="text-[10px] text-muted-foreground">High · Medium · Low</p>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Order tasks by</Label>
          <Select value={prefs.order} onValueChange={(v) => update({ order: v as AutoSchedulePrefs["order"] })}>
            <SelectTrigger className="h-8 text-xs" aria-label="Ordering strategy"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Priority first</SelectItem>
              <SelectItem value="duration">Longest first</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between rounded-lg px-1 py-1">
          <Label htmlFor="as-respect" className="text-xs font-normal">Work around appointments</Label>
          <Switch id="as-respect" checked={prefs.respectAppointments}
            onCheckedChange={(v) => update({ respectAppointments: !!v })} />
        </div>
        <div className="flex items-center justify-between rounded-lg px-1 py-1">
          <Label htmlFor="as-skip-past" className="text-xs font-normal">Skip times already passed</Label>
          <Switch id="as-skip-past" checked={prefs.skipPastTimes}
            onCheckedChange={(v) => update({ skipPastTimes: !!v })} />
        </div>

        <div className="space-y-2 border-t border-border/60 pt-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Day part colours</p>
            <Button variant="ghost" size="sm" className="h-6 gap-1 px-1.5 text-[11px]" onClick={resetBands}>
              <RotateCcw className="h-3 w-3" /> Reset
            </Button>
          </div>
          {BANDS.map(b => (
            <BandColorRow key={b.id} id={b.id} label={b.label} value={bandColors[b.id]}
              onPick={(c) => setBandColors({ [b.id]: c })} />
          ))}
        </div>

        <div className="space-y-2 border-t border-border/60 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Reminders</p>
          <div className="flex items-center justify-between rounded-lg px-1 py-1">
            <Label htmlFor="as-task-reminders" className="text-xs font-normal">Remind me about scheduled tasks</Label>
            <Switch id="as-task-reminders" checked={reminders.tasksEnabled}
              onCheckedChange={(v) => void toggleTaskReminders(!!v)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="as-lead" className="text-[11px] text-muted-foreground">Minutes before start</Label>
            <Input id="as-lead" type="number" min={0} max={120} step={5} className="h-8 text-xs"
              value={reminders.taskLeadMinutes}
              disabled={!reminders.tasksEnabled}
              onChange={(e) => setReminders({ taskLeadMinutes: Math.max(0, Math.min(120, Number(e.target.value) || 0)) })} />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
