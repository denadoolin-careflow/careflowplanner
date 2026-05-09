import { useStore } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { AREAS } from "@/lib/types";
import { POMODORO_TEMPLATES } from "@/lib/pomodoro-store";
import { pomodoroDefaults, usePomodoroDefaults } from "@/lib/pomodoro-defaults";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function Settings() {
  const { state, setName, setLowEnergyMode, updateProfile, signOut, user } = useStore();
  const { theme, setTheme } = useTheme();
  const defaults = usePomodoroDefaults();
  return (
    <div className="space-y-6">
      <SectionCard title="Your profile" subtitle={user?.email ?? "Signed in"} accent="warm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input value={state.settings.name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Preferred planning style</Label>
            <Input placeholder="gentle, structured, flexible…" value={state.settings.planningStyle ?? ""} onChange={e => updateProfile({ planning_style: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Time zone</Label>
            <Input placeholder="America/Los_Angeles" value={state.settings.timeZone ?? ""} onChange={e => updateProfile({ time_zone: e.target.value })} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Low-energy mode" subtitle="Hide non-essentials when you need a softer day." accent="calm">
        <div className="flex items-center gap-3">
          <Switch checked={state.settings.lowEnergyMode} onCheckedChange={setLowEnergyMode} />
          <Label className="text-sm">{state.settings.lowEnergyMode ? "On — only essentials shown" : "Off"}</Label>
        </div>
      </SectionCard>

      <SectionCard title="Theme" accent="sage">
        <div className="flex flex-wrap gap-2">
          {["light","dark","system"].map(t => (
            <Button key={t} variant={theme === t ? "default" : "outline"} className="capitalize rounded-full" onClick={() => setTheme(t)}>{t}</Button>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Pomodoro defaults"
        subtitle="Auto-fill session length based on the task's area."
        accent="calm"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {AREAS.map(area => {
            const value = defaults[area] ?? "none";
            return (
              <div key={area} className="flex items-center justify-between gap-3">
                <Label className="text-sm">{area}</Label>
                <Select
                  value={value}
                  onValueChange={(v) => pomodoroDefaults.set(area, v === "none" ? null : v)}
                >
                  <SelectTrigger className="h-8 w-[180px] rounded-full text-xs">
                    <SelectValue placeholder="No default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No default</SelectItem>
                    {POMODORO_TEMPLATES.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label} · {t.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          When you start a Pomodoro for a task, the matching template's focus and break lengths fill in automatically.
        </p>
      </SectionCard>

      <SectionCard title="Account" subtitle="Synced across your devices." accent="warm">
        <p className="text-sm text-muted-foreground">Your CareFlow data is saved to your account. Sign in on any device to see the same planner.</p>
        <Button variant="outline" className="mt-3" onClick={async () => { await signOut(); toast.success("Signed out."); }}>Sign out</Button>
      </SectionCard>
    </div>
  );
}
