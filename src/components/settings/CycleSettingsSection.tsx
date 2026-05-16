import { useCycle } from "@/lib/cycle-store";
import { SectionCard } from "@/components/cards/SectionCard";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CycleSettingsSection() {
  const { settings, saveSettings } = useCycle();
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
          </>
        )}
      </div>
    </SectionCard>
  );
}
