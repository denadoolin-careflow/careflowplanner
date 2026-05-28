import { useCycle } from "@/lib/cycle-store";
import { SectionCard } from "@/components/cards/SectionCard";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { getMoonRemindersEnabled, setMoonRemindersEnabled } from "@/lib/moon-reminders";
import { getCyclePrefs, setCyclePrefs, onCyclePrefsChange, type CyclePlanningPrefs } from "@/lib/cycle-prefs";

export function CycleSettingsSection() {
  const { settings, saveSettings } = useCycle();
  const [moonReminders, setMoonReminders] = useState(false);
  const [prefs, setPrefs] = useState<CyclePlanningPrefs>(() => getCyclePrefs());
  useEffect(() => {
    setMoonReminders(getMoonRemindersEnabled());
    const onChange = () => setMoonReminders(getMoonRemindersEnabled());
    window.addEventListener("moon-reminders-changed", onChange);
    return () => window.removeEventListener("moon-reminders-changed", onChange);
  }, []);
  useEffect(() => onCyclePrefsChange(() => setPrefs(getCyclePrefs())), []);
  const updatePref = (patch: Partial<CyclePlanningPrefs>) => { setCyclePrefs(patch); setPrefs(getCyclePrefs()); };
  return (
    <SectionCard title="Cyclical living" subtitle="Track your menstrual cycle and plan with your phases. Private to you." accent="warm">
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/60 px-3 py-2">
          <div>
            <Label className="text-sm">Enable cycle tracking</Label>
            <p className="text-[11px] text-muted-foreground">Adds the cycle widget, phase badges, and log sheet.</p>
          </div>
          <Switch checked={settings.enabled} onCheckedChange={(v) => saveSettings({ enabled: v })} />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/60 px-3 py-2">
          <div>
            <Label className="text-sm">Moon journal reminders</Label>
            <p className="text-[11px] text-muted-foreground">On new, first quarter, full, and last quarter moon days, show a gentle prompt on Today to open the matching journal template.</p>
          </div>
          <Switch checked={moonReminders} onCheckedChange={(v) => setMoonRemindersEnabled(v)} />
        </div>

        {settings.enabled && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label className="text-xs text-muted-foreground">Avg cycle length</Label>
                <Input type="number" min={21} max={45} value={settings.avgCycleLength}
                  onChange={(e) => saveSettings({ avgCycleLength: Number(e.target.value) || 28 })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Avg period length</Label>
                <Input type="number" min={2} max={10} value={settings.avgPeriodLength}
                  onChange={(e) => saveSettings({ avgPeriodLength: Number(e.target.value) || 5 })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Luteal length</Label>
                <Input type="number" min={10} max={16} value={settings.lutealLength}
                  onChange={(e) => saveSettings({ lutealLength: Number(e.target.value) || 14 })} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/60 px-3 py-2">
                <Label className="text-sm">Show fertility window</Label>
                <Switch checked={settings.showFertility} onCheckedChange={(v) => saveSettings({ showFertility: v })} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/60 px-3 py-2">
                <Label className="text-sm">Pair with moon</Label>
                <Switch checked={settings.pairWithMoon} onCheckedChange={(v) => saveSettings({ pairWithMoon: v })} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/60 px-3 py-2">
                <Label className="text-sm">Auto low-energy on menstrual days</Label>
                <Switch checked={settings.autoLowEnergy} onCheckedChange={(v) => saveSettings({ autoLowEnergy: v })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Moon archetype</Label>
                <Select value={settings.moonArchetype} onValueChange={(v) => saveSettings({ moonArchetype: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (from period date)</SelectItem>
                    <SelectItem value="white">White Moon</SelectItem>
                    <SelectItem value="red">Red Moon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-border/60 bg-card/60 px-3 py-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Smart planning notifications</div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Warn when scheduling against your phase</Label>
                  <p className="text-[11px] text-muted-foreground">Soft nudge if you place a commitment on a discouraged day (e.g. menstrual).</p>
                </div>
                <Switch checked={prefs.warnOnSchedule} onCheckedChange={(v) => updatePref({ warnOnSchedule: v })} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Notify on phase changes</Label>
                  <p className="text-[11px] text-muted-foreground">Phase-entry, mid-phase, and burnout cards in your notification center.</p>
                </div>
                <Switch checked={prefs.notifyOnPhaseChange} onCheckedChange={(v) => updatePref({ notifyOnPhaseChange: v })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Burnout threshold (commitments in next menstrual window)</Label>
                  <Input type="number" min={1} max={10} value={prefs.burnoutThreshold}
                    onChange={(e) => updatePref({ burnoutThreshold: Math.max(1, Number(e.target.value) || 2) })} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Warn for</Label>
                  <Select value={prefs.warnScope} onValueChange={(v) => updatePref({ warnScope: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All tasks &amp; appointments</SelectItem>
                      <SelectItem value="appointments">Appointments &amp; commitments only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </SectionCard>
  );
}
