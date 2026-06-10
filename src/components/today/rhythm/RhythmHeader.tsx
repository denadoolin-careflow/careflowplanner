import { useEffect, useState, useMemo } from "react";
import { format, addDays } from "date-fns";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Sparkles, Clock, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/store";
import { personalGreeting } from "@/lib/greeting";
import { AffirmationHeader } from "@/components/today/AffirmationHeader";
import { AtmosphereChip } from "@/components/calendar/CalendarHeroChips";
import { DayPickerButton } from "@/components/calendar/DayPickerButton";
import {
  useTodayView,
  TODAY_VIEW_LABELS,
  type TodayView,
  useTodayPrefs,
} from "@/lib/today-view";
import { cn } from "@/lib/utils";
import { useWeatherSnapshot, useTempUnit, cToF } from "@/lib/weather-store";
import { getMoonPhase, MOON_INFO, getIllumination, daysUntilFull, daysUntilNew } from "@/lib/moon";
import { MoonGlyph } from "@/components/widgets/MoonGlyph";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo, PHASE_META } from "@/lib/cycle";
import { QuickAddBar } from "@/components/today/QuickAddBar";
import { ScopeNavToggle } from "@/components/calendar/ScopeNavToggle";

interface Props {
  date: Date;
  onDateChange: (d: Date) => void;
  isReallyToday: boolean;
}

/**
 * Calm hero header for the Daily Rhythm Today view.
 * Greeting + date + atmosphere + affirmation in a soft botanical card.
 */
export function RhythmHeader({ date, onDateChange, isReallyToday }: Props) {
  const { state } = useStore();
  const [view, setView] = useTodayView();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const snap = useWeatherSnapshot();
  const [unit] = useTempUnit();
  const tempStr = snap
    ? `${unit === "F" ? cToF(snap.tempC) : Math.round(snap.tempC)}°`
    : null;

  const moonPhase = getMoonPhase(date);
  const moon = MOON_INFO[moonPhase];
  const illum = getIllumination(date);
  const toFull = daysUntilFull(date);
  const toNew = daysUntilNew(date);
  const moonProximity =
    toFull === 0 ? "Full tonight"
    : toNew === 0 ? "New tonight"
    : toFull < toNew ? `${toFull}d to full`
    : `${toNew}d to new`;

  const { periods, settings } = useCycle();
  const cyclePhase = useMemo(() => {
    try { return getPhaseInfo(date, periods, settings); } catch { return null; }
  }, [date, periods, settings]);

  const [prefs, setPrefs] = useTodayPrefs();

  return (
    <div className="cozy-card overflow-hidden">
      <div className="relative gradient-calm px-4 py-4 sm:px-7 sm:py-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60% 80% at 85% 20%, hsl(var(--primary)/0.18), transparent 70%), radial-gradient(50% 70% at 10% 100%, hsl(var(--accent)/0.15), transparent 70%)",
          }}
        />
        <div className="relative flex flex-col items-center gap-4 text-center">
          <div className="flex flex-col items-center gap-1">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground inline-flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" />
              {personalGreeting(state.settings.name)}
            </p>
            <h1 className="font-display text-3xl font-semibold leading-none text-foreground sm:text-5xl">
              Today
            </h1>
            <div className="mt-1 flex items-center justify-center gap-2 text-sm text-foreground/80 sm:text-base">
              <Clock className="h-4 w-4 text-primary" />
              <span className="tabular-nums font-medium">{format(now, "h:mm a")}</span>
              {tempStr && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="tabular-nums font-medium">{tempStr}</span>
                  {snap?.conditionLabel && (
                    <span className="hidden text-muted-foreground sm:inline">
                      {snap.conditionLabel}
                    </span>
                  )}
                </>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <p className="text-sm font-medium text-muted-foreground sm:text-base">
                {format(date, "EEEE, MMMM d, yyyy")}
              </p>
              <Link
                to="/rhythm"
                title={`${moon.label} · ${illum}% lit · ${moonProximity} — open Lunar`}
                className="group inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/60 px-2 py-0.5 text-[11px] text-foreground/85 shadow-soft backdrop-blur transition hover:border-primary/40 hover:bg-card hover:text-foreground"
              >
                <MoonGlyph date={date} size={16} className="-my-0.5" />
                <span className="font-medium">{moon.label}</span>
                <span className="tabular-nums text-muted-foreground">· {illum}%</span>
                <span className="hidden text-muted-foreground sm:inline">· {moonProximity}</span>
              </Link>
              {cyclePhase && (
                <Link
                  to="/health"
                  title={`${PHASE_META[cyclePhase.phase].invitation} — open Cycle`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/60 px-2 py-0.5 text-[11px] text-foreground/85 shadow-soft backdrop-blur transition hover:border-primary/40 hover:bg-card hover:text-foreground"
                >
                  <span aria-hidden>{PHASE_META[cyclePhase.phase].glyph}</span>
                  <span className="font-medium">Day {cyclePhase.cycleDay}</span>
                  <span className="text-muted-foreground">· {PHASE_META[cyclePhase.phase].label}</span>
                </Link>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <ScopeNavToggle active="today" />
            <AtmosphereChip />
            <div className="inline-flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 rounded-full"
                onClick={() => onDateChange(addDays(date, -1))}
                aria-label="Previous day"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <DayPickerButton date={date} onChange={onDateChange} />
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 rounded-full"
                onClick={() => onDateChange(addDays(date, 1))}
                aria-label="Next day"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              {!isReallyToday && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 rounded-full px-2 text-xs"
                  onClick={() => onDateChange(new Date())}
                >
                  Today
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Plan with
            </span>
            <div className="inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-card/70 p-0.5 text-[11px]">
              {(Object.keys(TODAY_VIEW_LABELS) as TodayView[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setView(k)}
                  className={cn(
                    "rounded-full px-2.5 py-1 transition-colors",
                    view === k
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {TODAY_VIEW_LABELS[k]}
                </button>
              ))}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="ml-1 inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/70 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                  title="Today preferences"
                >
                  <Settings2 className="h-3 w-3" /> Preferences
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 space-y-3 p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Today preferences
                </div>
                <PrefRow
                  label="Try this now from Carey"
                  hint="Show Carey's actionable suggestions at the top of Today."
                  checked={prefs.showCareyNudges}
                  onChange={(v) => setPrefs({ showCareyNudges: v })}
                />
                <PrefRow
                  label="Quick add bar"
                  hint="Inline input to drop tasks or meals into the right time slot."
                  checked={prefs.showQuickAdd}
                  onChange={(v) => setPrefs({ showQuickAdd: v })}
                />
              </PopoverContent>
            </Popover>
          </div>

          <AffirmationHeader date={date} className="max-w-2xl" />
          {prefs.showQuickAdd && <QuickAddBar date={date} />}
        </div>
      </div>
    </div>
  );
}

function PrefRow({
  label, hint, checked, onChange,
}: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-3">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="block text-[11px] leading-snug text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}