import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Cloud, CloudDrizzle, CloudFog, CloudRain, CloudSnow, CloudSun,
  Droplets, Moon, Snowflake, Sun, Sunrise, ThermometerSun, ThermometerSnowflake,
  Wind, X, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWeatherSnapshot, useTempUnit, cToF } from "@/lib/weather-store";
import type { HourlyForecast, WeatherCondition } from "@/lib/weather";
import { weatherTheme } from "@/lib/weather-theme";

type Tone = "rain" | "snow" | "storm" | "fog" | "heat" | "cold" | "wind" | "sun" | "clear";

interface Reminder {
  id: string;
  tone: Tone;
  title: string;
  body: string;
  whenLabel?: string;
  condition: WeatherCondition;
  isNight?: boolean;
}

function condIcon(c: WeatherCondition, isNight?: boolean, className = "h-5 w-5") {
  if (c === "clear") return isNight ? <Moon className={className} /> : <Sun className={className} />;
  if (c === "partly-cloudy") return <CloudSun className={className} />;
  if (c === "cloudy") return <Cloud className={className} />;
  if (c === "fog") return <CloudFog className={className} />;
  if (c === "drizzle") return <CloudDrizzle className={className} />;
  if (c === "rain") return <CloudRain className={className} />;
  if (c === "snow") return <CloudSnow className={className} />;
  if (c === "thunderstorm") return <Zap className={className} />;
  return <Cloud className={className} />;
}

function toneIcon(t: Tone, className = "h-5 w-5") {
  switch (t) {
    case "rain":  return <CloudRain className={className} />;
    case "snow":  return <Snowflake className={className} />;
    case "storm": return <Zap className={className} />;
    case "fog":   return <CloudFog className={className} />;
    case "heat":  return <ThermometerSun className={className} />;
    case "cold":  return <ThermometerSnowflake className={className} />;
    case "wind":  return <Wind className={className} />;
    case "sun":   return <Sunrise className={className} />;
    case "clear": return <Sun className={className} />;
  }
}

function toneClasses(t: Tone) {
  // Subtle colored chip — readable in both light & dark
  switch (t) {
    case "rain":
    case "storm":
      return "bg-sky-50 text-sky-900 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-100 dark:ring-sky-900/60";
    case "snow":
      return "bg-purple-50 text-purple-900 ring-purple-200 dark:bg-purple-950/40 dark:text-purple-100 dark:ring-purple-900/60";
    case "fog":
      return "bg-slate-50 text-slate-900 ring-slate-200 dark:bg-slate-900/50 dark:text-slate-100 dark:ring-slate-800/60";
    case "heat":
      return "bg-orange-50 text-orange-900 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-100 dark:ring-orange-900/60";
    case "cold":
      return "bg-indigo-50 text-indigo-900 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-100 dark:ring-indigo-900/60";
    case "wind":
      return "bg-teal-50 text-teal-900 ring-teal-200 dark:bg-teal-950/40 dark:text-teal-100 dark:ring-teal-900/60";
    case "sun":
    case "clear":
      return "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-900/60";
  }
}

function whenLabel(h: HourlyForecast): string {
  const diff = Math.max(0, Math.round((h.dateObj.getTime() - Date.now()) / 60_000));
  if (diff < 50) return `in ~${Math.max(10, Math.round(diff / 10) * 10)} min`;
  return `around ${format(h.dateObj, "h a")}`;
}

function buildReminders(
  snap: ReturnType<typeof useWeatherSnapshot> & object,
  unit: "C" | "F",
): Reminder[] {
  const out: Reminder[] = [];
  const fmtT = (c: number) => `${unit === "F" ? cToF(c) : Math.round(c)}°`;

  const now = new Date();
  const ahead = snap.todayHourly
    .filter(h => h.dateObj.getTime() >= now.getTime() - 5 * 60_000)
    .slice(0, 6); // ~next 6 hours

  // Rain / drizzle / storm in next 2h (prefer earliest)
  const wet = ahead.slice(0, 3).find(h =>
    h.precipChance >= 50 || h.condition === "rain" || h.condition === "drizzle" || h.condition === "thunderstorm"
  );
  if (wet) {
    const isStorm = wet.condition === "thunderstorm";
    const isDrizzle = wet.condition === "drizzle";
    out.push({
      id: `wet-${wet.dateObj.toISOString().slice(0, 13)}`,
      tone: isStorm ? "storm" : "rain",
      title: isStorm
        ? `Storms rolling in ${whenLabel(wet)}`
        : isDrizzle
          ? `Soft drizzle expected ${whenLabel(wet)}`
          : `Rain likely ${whenLabel(wet)}`,
      body: isStorm
        ? "If you can, settle errands soon and keep something cozy ready for the noise."
        : isDrizzle
          ? "Tuck a light umbrella in the bag — nothing dramatic, just kind preparation."
          : `Grab an umbrella before you head out. ${wet.precipChance}% chance.`,
      whenLabel: whenLabel(wet),
      condition: wet.condition,
      isNight: wet.isNight,
    });
  }

  // Snow soon
  const snow = ahead.find(h => h.condition === "snow");
  if (snow && !out.some(r => r.tone === "snow")) {
    out.push({
      id: `snow-${snow.dateObj.toISOString().slice(0, 13)}`,
      tone: "snow",
      title: `Snow expected ${whenLabel(snow)}`,
      body: "Warm boots and slow steps. There's no rush — let the world hush a moment.",
      whenLabel: whenLabel(snow),
      condition: "snow",
    });
  }

  // Fog ahead
  const fog = ahead.slice(0, 3).find(h => h.condition === "fog");
  if (fog) {
    out.push({
      id: `fog-${fog.dateObj.toISOString().slice(0, 13)}`,
      tone: "fog",
      title: `Foggy ${whenLabel(fog)}`,
      body: "If you're driving, headlights on and a little extra room between cars.",
      whenLabel: whenLabel(fog),
      condition: "fog",
    });
  }

  // Heat advisory — peak temp today
  const peakHigh = Math.max(snap.tempC, snap.highC, ...ahead.map(h => h.tempC));
  if (peakHigh >= 30) {
    out.push({
      id: `heat-${new Date().toDateString()}`,
      tone: "heat",
      title: `Warm one ahead — up to ${fmtT(peakHigh)}`,
      body: "Sip water often, find shade where you can, and let the loud tasks wait for cooler hours.",
      condition: snap.condition,
    });
  }

  // Cold advisory — coldest of now or upcoming
  const lowSoon = Math.min(snap.tempC, snap.lowC, ...ahead.map(h => h.tempC));
  if (lowSoon <= 0) {
    out.push({
      id: `cold-${new Date().toDateString()}`,
      tone: "cold",
      title: `Cold out — feels like ${fmtT(lowSoon)}`,
      body: "Bundle the crew before you go. A scarf and a slow exhale at the door.",
      condition: snap.condition,
    });
  } else if (lowSoon <= 5) {
    out.push({
      id: `chilly-${new Date().toDateString()}`,
      tone: "cold",
      title: `Chilly stretch — around ${fmtT(lowSoon)}`,
      body: "A warm layer makes the morning kinder. Hat is never overkill.",
      condition: snap.condition,
    });
  }

  // Wind advisory
  if (snap.windMaxKph >= 40) {
    out.push({
      id: `wind-${new Date().toDateString()}`,
      tone: "wind",
      title: `Breezy day — gusts to ${snap.windMaxKph} kph`,
      body: "Secure hats, light items, and outdoor cushions. Be gentle with doors.",
      condition: snap.condition,
    });
  }

  // Sunshine gift — clear & mild, morning hours
  const hour = now.getHours();
  if (
    out.length === 0 &&
    !snap.isNight &&
    snap.condition === "clear" &&
    snap.tempC >= 12 && snap.tempC <= 26 &&
    hour >= 7 && hour <= 11
  ) {
    out.push({
      id: `sun-${new Date().toDateString()}`,
      tone: "sun",
      title: "A clear, kind morning",
      body: "If you can, step outside for a minute. Even a sip of sunlight will land.",
      condition: "clear",
    });
  }

  // Cap to 3 — don't pile on
  return out.slice(0, 3);
}

const DISMISS_KEY = "careflow:weather-reminders:dismissed";
function loadDismissed(): Record<string, true> {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { date: string; ids: Record<string, true> };
    if (parsed.date !== new Date().toDateString()) return {};
    return parsed.ids ?? {};
  } catch { return {}; }
}
function saveDismissed(ids: Record<string, true>) {
  try {
    localStorage.setItem(
      DISMISS_KEY,
      JSON.stringify({ date: new Date().toDateString(), ids }),
    );
  } catch { /* noop */ }
}

export function WeatherRemindersCard({ className }: { className?: string }) {
  const snap = useWeatherSnapshot();
  const [unit] = useTempUnit();
  const [dismissed, setDismissed] = useState<Record<string, true>>(() => loadDismissed());

  useEffect(() => { saveDismissed(dismissed); }, [dismissed]);

  const reminders = useMemo(() => {
    if (!snap) return [];
    return buildReminders(snap, unit).filter(r => !dismissed[r.id]);
  }, [snap, unit, dismissed]);

  if (!snap || reminders.length === 0) return null;

  const theme = weatherTheme(snap.condition, snap.isNight);

  return (
    <section
      className={cn(
        "cozy-card overflow-hidden p-4",
        className,
      )}
      aria-label="Gentle weather reminders"
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-full ring-1", theme.ring, "bg-muted/60")}>
            {condIcon(snap.condition, snap.isNight, "h-4 w-4")}
          </span>
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">A gentle heads-up</h3>
            <p className="text-xs text-muted-foreground">From today's weather — small, kind nudges.</p>
          </div>
        </div>
        <span className="hidden text-[10px] uppercase tracking-wider text-muted-foreground sm:inline">
          {reminders.length} note{reminders.length === 1 ? "" : "s"}
        </span>
      </header>

      <ul className="mt-3 space-y-2">
        {reminders.map(r => (
          <li
            key={r.id}
            className={cn(
              "relative flex gap-3 rounded-xl px-3 py-2.5 ring-1",
              toneClasses(r.tone),
            )}
          >
            <span className="mt-0.5 shrink-0">{toneIcon(r.tone)}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">{r.title}</span>
              </div>
              <p className="mt-0.5 text-xs/relaxed opacity-90">{r.body}</p>
            </div>
            <button
              type="button"
              onClick={() => setDismissed(prev => ({ ...prev, [r.id]: true }))}
              className="-mr-1 -mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full opacity-60 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
              aria-label="Dismiss reminder"
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}