import { useStore } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useThemePreset, type ThemePreset } from "@/lib/theme-preset";
import { toast } from "sonner";
import { AREAS } from "@/lib/types";
import { usHolidaysRange } from "@/lib/us-holidays";
import { usePomodoroTemplatesList } from "@/lib/pomodoro-templates";
import { pomodoroDefaults, usePomodoroDefaults } from "@/lib/pomodoro-defaults";
import { pomodoroPrefs, usePomodoroPrefs } from "@/lib/pomodoro-prefs";
import { playPomodoroChime } from "@/lib/pomodoro-chime";
import { PomodoroTemplatesEditor } from "@/components/tasks/PomodoroTemplatesEditor";
import { GoogleCalendarSection } from "@/components/calendar/GoogleCalendarSection";
import { PantryColorPicker } from "@/components/settings/PantryColorPicker";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function Settings() {
  const { state, setName, setLowEnergyMode, updateProfile, signOut, user, addHoliday } = useStore();
  const { theme, setTheme } = useTheme();
  const [preset, setPreset] = useThemePreset();
  const defaults = usePomodoroDefaults();
  const prefs = usePomodoroPrefs();
  const templates = usePomodoroTemplatesList();

  const seedUSHolidays = async () => {
    const year = new Date().getFullYear();
    const candidates = usHolidaysRange(year, year + 1);
    const existing = new Set(state.holidays.map(h => `${h.date}|${h.name.toLowerCase()}`));
    const toAdd = candidates.filter(h => !existing.has(`${h.date}|${h.name.toLowerCase()}`));
    if (toAdd.length === 0) {
      toast("All US holidays already in your calendar.");
      return;
    }
    for (const h of toAdd) {
      await addHoliday({ name: h.name, date: h.date });
    }
    toast.success(`Added ${toAdd.length} US holidays for ${year}–${year + 1}.`);
  };
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
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Mode</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {["light","dark","system"].map(t => (
                <Button key={t} variant={theme === t ? "default" : "outline"} className="capitalize rounded-full" onClick={() => setTheme(t)}>{t}</Button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Palette</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {(["default","sage","dusk","mono"] as ThemePreset[]).map(p => (
                <Button key={p} variant={preset === p ? "default" : "outline"} className="capitalize rounded-full" onClick={() => setPreset(p)}>{p}</Button>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Pantry status colors" subtitle="Used across grocery, pantry, and ingredient popups." accent="warm">
        <PantryColorPicker />
      </SectionCard>

      <SectionCard
        title="US holidays"
        subtitle={`Auto-populate your calendar with US federal & popular holidays for ${new Date().getFullYear()}–${new Date().getFullYear() + 1}.`}
        accent="warm"
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={seedUSHolidays} className="rounded-full">
            Add US holidays
          </Button>
          <span className="text-xs text-muted-foreground">
            {state.holidays.length} holiday{state.holidays.length === 1 ? "" : "s"} in your calendar.
          </span>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Skips dates already present. Includes federal holidays plus Valentine's, Mother's & Father's Day, Halloween, and Christmas/New Year's Eve.
        </p>
      </SectionCard>

      <SectionCard
        title="Connected calendars"
        subtitle="Bring Google Calendar events into your planner — read-only and color-coded."
        accent="calm"
      >
        <GoogleCalendarSection />
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
                    {templates.map(t => (
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

      <SectionCard
        title="Pomodoro templates"
        subtitle="Edit the built-ins or add your own."
        accent="warm"
      >
        <PomodoroTemplatesEditor />
      </SectionCard>

      <SectionCard
        title="Pomodoro notifications"
        subtitle="How you'd like to be nudged when a session ends."
        accent="sage"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label className="text-sm">Gentle chime</Label>
              <p className="text-[11px] text-muted-foreground">A soft two-note tone at each transition.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm" variant="ghost"
                className="h-7 rounded-full px-3 text-[11px]"
                onClick={() => playPomodoroChime("focus")}
                disabled={!prefs.sound}
              >
                Preview
              </Button>
              <Switch checked={prefs.sound} onCheckedChange={(v) => pomodoroPrefs.set({ sound: v })} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label className="text-sm">Visual flash</Label>
              <p className="text-[11px] text-muted-foreground">A brief, soft wash across the screen.</p>
            </div>
            <Switch checked={prefs.flash} onCheckedChange={(v) => pomodoroPrefs.set({ flash: v })} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label className="text-sm">Toast message</Label>
              <p className="text-[11px] text-muted-foreground">A small message in the corner.</p>
            </div>
            <Switch checked={prefs.toast} onCheckedChange={(v) => pomodoroPrefs.set({ toast: v })} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Account" subtitle="Synced across your devices." accent="warm">
        <p className="text-sm text-muted-foreground">Your CareFlow data is saved to your account. Sign in on any device to see the same planner.</p>
        <Button variant="outline" className="mt-3" onClick={async () => { await signOut(); toast.success("Signed out."); }}>Sign out</Button>
      </SectionCard>
    </div>
  );
}
