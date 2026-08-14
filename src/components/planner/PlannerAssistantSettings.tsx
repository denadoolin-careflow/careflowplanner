import { Plus, RotateCcw, Sliders, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  hmToMin, minToHm, newId, useAutoSchedulePrefs,
  type NoScheduleWindow, type PersonRule,
} from "@/lib/auto-schedule-prefs";
import { NUDGE_TYPES, useNudgePrefs, type NudgeTone } from "@/lib/planner/nudge-prefs";
import { usePeopleTags } from "@/lib/people-tags";
import { cn } from "@/lib/utils";

function hourLabel(h: number) {
  return new Date(2000, 0, 1, h).toLocaleTimeString(undefined, { hour: "numeric" });
}

function HourPick({ value, onChange, label, from = 0, to = 23 }: {
  value: number; onChange: (v: number) => void; label: string; from?: number; to?: number;
}) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="h-8 text-xs" aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent className="max-h-60">
        {Array.from({ length: Math.max(1, to - from + 1) }, (_, i) => from + i).map(h => (
          <SelectItem key={h} value={String(h)}>{hourLabel(h)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Constraints + nudge tuning for the scheduling assistant. */
export function PlannerAssistantSettings({ className }: { className?: string }) {
  const { prefs, update } = useAutoSchedulePrefs();
  const { prefs: nudges, update: updateNudges, toggleType } = useNudgePrefs();
  const people = usePeopleTags();

  const windows = prefs.noScheduleWindows ?? [];
  const rules = prefs.personRules ?? [];

  const setWindow = (id: string, patch: Partial<NoScheduleWindow>) =>
    update({ noScheduleWindows: windows.map(w => (w.id === id ? { ...w, ...patch } : w)) });
  const setRule = (id: string, patch: Partial<PersonRule>) =>
    update({ personRules: rules.map(r => (r.id === id ? { ...r, ...patch } : r)) });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className={cn("h-7 rounded-full text-[11px]", className)}
          aria-label="Assistant constraints and nudges"
        >
          <Sliders className="mr-1 h-3 w-3" />Tune
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[75vh] w-[21rem] space-y-4 overflow-y-auto p-3">
        {/* No-schedule windows */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Protected windows</p>
            <Button
              size="sm" variant="ghost" className="h-6 gap-1 px-1.5 text-[11px]"
              onClick={() => update({
                noScheduleWindows: [...windows, { id: newId(), label: "Break", startMin: 12 * 60, endMin: 13 * 60 }],
              })}
            >
              <Plus className="h-3 w-3" />Add
            </Button>
          </div>
          {!windows.length && (
            <p className="text-[11px] text-muted-foreground">Nothing protected yet — add lunch, school run, or rest time.</p>
          )}
          {windows.map(w => (
            <div key={w.id} className="flex items-center gap-1.5">
              <Input
                className="h-8 flex-1 text-xs" value={w.label} aria-label="Window label"
                onChange={(e) => setWindow(w.id, { label: e.target.value })}
              />
              <Input
                type="time" className="h-8 w-[6.2rem] text-xs" value={minToHm(w.startMin)} aria-label="Window start"
                onChange={(e) => setWindow(w.id, { startMin: hmToMin(e.target.value) })}
              />
              <Input
                type="time" className="h-8 w-[6.2rem] text-xs" value={minToHm(w.endMin)} aria-label="Window end"
                onChange={(e) => setWindow(w.id, { endMin: hmToMin(e.target.value) })}
              />
              <Button
                size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label={`Remove ${w.label}`}
                onClick={() => update({ noScheduleWindows: windows.filter(x => x.id !== w.id) })}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </section>

        {/* Energy bands */}
        <section className="space-y-2 border-t border-border/60 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Energy windows</p>
          {([
            ["High", "highEnergyH", "highEnergyEndH"],
            ["Medium", "mediumEnergyH", "mediumEnergyEndH"],
            ["Low", "lowEnergyH", "lowEnergyEndH"],
          ] as const).map(([label, sKey, eKey]) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-[11px] text-muted-foreground">{label}</span>
              <div className="flex-1"><HourPick label={`${label} energy start`} value={prefs[sKey]} from={prefs.dayStartH} to={prefs.dayEndH - 1} onChange={(v) => update({ [sKey]: v } as never)} /></div>
              <span className="text-[11px] text-muted-foreground">to</span>
              <div className="flex-1"><HourPick label={`${label} energy end`} value={prefs[eKey]} from={prefs.dayStartH + 1} to={prefs.dayEndH} onChange={(v) => update({ [eKey]: v } as never)} /></div>
            </div>
          ))}
        </section>

        {/* Person rules */}
        <section className="space-y-2 border-t border-border/60 pt-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Care partners</p>
            <Button
              size="sm" variant="ghost" className="h-6 gap-1 px-1.5 text-[11px]"
              onClick={() => update({
                personRules: [...rules, { id: newId(), name: people[0]?.name ?? "", startH: null, endH: null, group: true }],
              })}
            >
              <Plus className="h-3 w-3" />Add
            </Button>
          </div>
          {!rules.length && (
            <p className="text-[11px] text-muted-foreground">
              Group tasks tagged with a person so their care lands in one stretch.
            </p>
          )}
          {rules.map(r => (
            <div key={r.id} className="space-y-1.5 rounded-xl border border-border/50 p-2">
              <div className="flex items-center gap-1.5">
                {people.length ? (
                  <Select value={r.name} onValueChange={(v) => setRule(r.id, { name: v })}>
                    <SelectTrigger className="h-8 flex-1 text-xs" aria-label="Person"><SelectValue placeholder="Pick a person" /></SelectTrigger>
                    <SelectContent>
                      {people.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    className="h-8 flex-1 text-xs" placeholder="Tag name" value={r.name} aria-label="Person tag"
                    onChange={(e) => setRule(r.id, { name: e.target.value })}
                  />
                )}
                <Button
                  size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label={`Remove ${r.name || "person"} rule`}
                  onClick={() => update({ personRules: rules.filter(x => x.id !== r.id) })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor={`grp-${r.id}`} className="text-[11px] font-normal text-muted-foreground">Keep their tasks together</Label>
                <Switch id={`grp-${r.id}`} checked={r.group} onCheckedChange={(v) => setRule(r.id, { group: !!v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor={`win-${r.id}`} className="text-[11px] font-normal text-muted-foreground">Preferred window</Label>
                <Switch
                  id={`win-${r.id}`} checked={r.startH != null}
                  onCheckedChange={(v) => setRule(r.id, v ? { startH: 9, endH: 12 } : { startH: null, endH: null })}
                />
              </div>
              {r.startH != null && (
                <div className="flex items-center gap-2">
                  <div className="flex-1"><HourPick label="Person window start" value={r.startH} from={prefs.dayStartH} to={prefs.dayEndH - 1} onChange={(v) => setRule(r.id, { startH: v })} /></div>
                  <span className="text-[11px] text-muted-foreground">to</span>
                  <div className="flex-1"><HourPick label="Person window end" value={r.endH ?? prefs.dayEndH} from={prefs.dayStartH + 1} to={prefs.dayEndH} onChange={(v) => setRule(r.id, { endH: v })} /></div>
                </div>
              )}
            </div>
          ))}
        </section>

        {/* Nudges */}
        <section className="space-y-2 border-t border-border/60 pt-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nudges</p>
            <Button
              size="sm" variant="ghost" className="h-6 gap-1 px-1.5 text-[11px]"
              onClick={() => updateNudges({ tone: "gentle", quiet: false, enabled: { overbooked: true, nobreak: true, conflicts: true, estimates: true, energy: true } })}
            >
              <RotateCcw className="h-3 w-3" />Reset
            </Button>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Tone</Label>
            <Select value={nudges.tone} onValueChange={(v) => updateNudges({ tone: v as NudgeTone })}>
              <SelectTrigger className="h-8 text-xs" aria-label="Nudge tone"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gentle">Gentle</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="direct">Direct</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg px-1 py-1">
            <Label htmlFor="nudge-quiet" className="text-xs font-normal">Quiet mode</Label>
            <Switch id="nudge-quiet" checked={nudges.quiet} onCheckedChange={(v) => updateNudges({ quiet: !!v })} />
          </div>
          {NUDGE_TYPES.map(t => (
            <div key={t.id} className="flex items-center justify-between rounded-lg px-1 py-1">
              <Label htmlFor={`nudge-${t.id}`} className="text-xs font-normal">
                {t.label}
                <span className="block text-[10px] text-muted-foreground">{t.hint}</span>
              </Label>
              <Switch
                id={`nudge-${t.id}`} disabled={nudges.quiet}
                checked={nudges.enabled[t.id] !== false}
                onCheckedChange={(v) => toggleType(t.id, !!v)}
              />
            </div>
          ))}
        </section>
      </PopoverContent>
    </Popover>
  );
}
