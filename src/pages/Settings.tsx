import { useStore } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { Link } from "react-router-dom";
import { Palette, ArrowRight } from "lucide-react";
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
import { GroceryPrefsSection } from "@/components/settings/GroceryPrefsSection";
import { CycleSettingsSection } from "@/components/settings/CycleSettingsSection";
import { WeatherPrefsSection } from "@/components/settings/WeatherPrefsSection";
import { TimeZoneSelect, detectDeviceTimeZone } from "@/components/settings/TimeZoneSelect";
import { ArchetypeThemeSection } from "@/components/settings/ArchetypeThemeSection";
import { AtmosphereFeelSection } from "@/components/settings/AtmosphereFeelSection";
import { FontSection } from "@/components/settings/FontSection";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";
import { useRhythmForecastEnabled, useRecommendationTone } from "@/lib/rhythm-forecast";
import {
  useAstrologyEnabled,
  useTransitsEnabledPref,
  useTarotEnabledPref,
} from "@/lib/astrology-prefs";
import { MOON_PROVIDERS, useMoonProvider } from "@/lib/moon-providers";
import { useEffect } from "react";
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
  const [rhythmOn, setRhythmOn] = useRhythmForecastEnabled();
  const [tone, setTone] = useRecommendationTone();
  const [astroOn, setAstroOn] = useAstrologyEnabled();
  const [transitsOn, setTransitsOn] = useTransitsEnabledPref();
  const [tarotOn, setTarotOn] = useTarotEnabledPref();
  const [moonProviderId, setMoonProviderId] = useMoonProvider();
  const activeProvider = MOON_PROVIDERS.find(p => p.id === moonProviderId);

  // Auto-sync time zone with the device on first load so the calendar schedule view
  // always reflects the user's current location.
  useEffect(() => {
    if (!state.settings.timeZone || state.settings.timeZone === "UTC") {
      const tz = detectDeviceTimeZone();
      if (tz && tz !== state.settings.timeZone) {
        updateProfile({ time_zone: tz });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            <TimeZoneSelect
              value={state.settings.timeZone ?? ""}
              onChange={(tz) => { updateProfile({ time_zone: tz }); toast.success(`Time zone set to ${tz}. Calendar schedule will use this.`); }}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Synced with your calendar schedule view.
            </p>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Default view on login</Label>
            <Select
              value={state.settings.defaultRoute ?? "/"}
              onValueChange={(v) => { updateProfile({ default_route: v }); toast.success("Default view updated."); }}
            >
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="/">Dashboard</SelectItem>
                <SelectItem value="/today">Today</SelectItem>
                <SelectItem value="/inbox">Inbox</SelectItem>
                <SelectItem value="/upcoming">Upcoming</SelectItem>
                <SelectItem value="/anytime">Anytime</SelectItem>
                <SelectItem value="/calendar">Calendar</SelectItem>
                <SelectItem value="/plan">Plan</SelectItem>
                <SelectItem value="/week">Week</SelectItem>
                <SelectItem value="/projects">Projects</SelectItem>
                <SelectItem value="/notes">Notes</SelectItem>
                <SelectItem value="/meals">Meals</SelectItem>
                <SelectItem value="/habits">Habits</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Where the app opens after you sign in.
            </p>
          </div>
        </div>
      </SectionCard>

      <ArchetypeThemeSection />

      <AtmosphereFeelSection />

      <SectionCard title="Flow colors" subtitle="Preview how each Flow header tints across every atmosphere." accent="sage">
        <Link
          to="/settings/flow-colors"
          className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors"
        >
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary-soft text-primary">
            <Palette className="h-4 w-4" />
          </span>
          <span className="flex-1 font-medium">Flow colors across atmospheres</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </SectionCard>

      <FontSection />

      <SectionCard title="Low-energy mode" subtitle="Hide non-essentials when you need a softer day." accent="calm">
        <div className="flex items-center gap-3">
          <Switch checked={state.settings.lowEnergyMode} onCheckedChange={setLowEnergyMode} />
          <Label className="text-sm">{state.settings.lowEnergyMode ? "On — only essentials shown" : "Off"}</Label>
        </div>
      </SectionCard>

      <SectionCard
        title="Install app"
        subtitle="Add CareFlow to your home screen for offline access and a full-screen experience."
        accent="warm"
      >
        <InstallAppButton />
      </SectionCard>

      <SectionCard
        title="Astrology & Rhythm"
        subtitle="Moon phases, transits, tarot, and lunar journal nudges — all opt-in."
        accent="sage"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={astroOn} onCheckedChange={setAstroOn} />
            <div className="flex flex-col">
              <Label className="text-sm font-medium">Astrology master switch</Label>
              <span className="text-[11px] text-muted-foreground">
                {astroOn
                  ? "On — moon, sign, transits, tarot, and lunar prompts may appear."
                  : "Off — hides moon phases, transits, tarot, and lunar journal prompts everywhere. Cycle tracking stays available under Health."}
              </span>
            </div>
          </div>

          <div className={`space-y-3 rounded-xl border border-border/50 bg-card/40 p-3 transition-opacity ${astroOn ? "opacity-100" : "pointer-events-none opacity-40"}`}>
          <div className="flex items-center gap-3">
            <Switch checked={rhythmOn} onCheckedChange={setRhythmOn} />
            <Label className="text-sm">
              Rhythm forecast — {rhythmOn ? "shown on Today, Week, and the dashboard" : "hidden"}
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={transitsOn} onCheckedChange={setTransitsOn} />
            <Label className="text-sm">
              Transits — {transitsOn ? "Mercury retrograde, ingresses, VoC moon" : "hidden"}
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={tarotOn} onCheckedChange={setTarotOn} />
            <Label className="text-sm">
              Tarot — {tarotOn ? "card of the day + small spreads" : "hidden"}
            </Label>
          </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Moon data source</Label>
            <Select value={moonProviderId} onValueChange={(v) => setMoonProviderId(v as any)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOON_PROVIDERS.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeProvider && (
              <p className="mt-1 text-[11px] text-muted-foreground">{activeProvider.description}</p>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Recommendation style</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              <Button
                variant={tone === "gentle" ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setTone("gentle")}
              >
                Gentle
              </Button>
              <Button
                variant={tone === "actionable" ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setTone("actionable")}
              >
                More actionable
              </Button>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {tone === "gentle"
                ? "Soft, caregiver-paced suggestions."
                : "Concrete, time-boxed nudges when you want to push."}
            </p>
          </div>
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

      <GroceryPrefsSection />

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

      <CycleSettingsSection />
      <WeatherPrefsSection />
    </div>
  );
}
