import { useMemo } from "react";
import { format, isToday, isTomorrow } from "date-fns";
import {
  Cloud, CloudDrizzle, CloudFog, CloudRain, CloudSnow, CloudSun,
  Droplets, MapPin, Moon, Sun, Wind, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWeatherSnapshot, useTempUnit, cToF } from "@/lib/weather-store";
import type { WeatherCondition } from "@/lib/weather";
import { weatherTheme, dayDressTips, relativeFromNow } from "@/lib/weather-theme";
import { LocationPickerPopover } from "./LocationPickerPopover";
import { UnitToggle } from "./UnitToggle";
import { useAtmosphere } from "@/lib/atmospheres";

function GlyphIcon({
  c, isNight, className,
}: { c: WeatherCondition; isNight?: boolean; className?: string }) {
  const cls = cn("h-6 w-6", className);
  if (c === "clear") return isNight ? <Moon className={cls} /> : <Sun className={cls} />;
  if (c === "partly-cloudy") return <CloudSun className={cls} />;
  if (c === "cloudy") return <Cloud className={cls} />;
  if (c === "fog") return <CloudFog className={cls} />;
  if (c === "drizzle") return <CloudDrizzle className={cls} />;
  if (c === "rain") return <CloudRain className={cls} />;
  if (c === "snow") return <CloudSnow className={cls} />;
  if (c === "thunderstorm") return <Zap className={cls} />;
  return <Cloud className={cls} />;
}

export function WeatherDetailCard({ className }: { className?: string }) {
  const snap = useWeatherSnapshot();
  const [unit] = useTempUnit();
  const { atmosphere } = useAtmosphere();
  const fmtT = (c: number) => `${unit === "F" ? cToF(c) : Math.round(c)}°`;

  const theme = useMemo(
    () => weatherTheme(snap?.condition ?? "cloudy", snap?.isNight),
    [snap?.condition, snap?.isNight],
  );

  const p = atmosphere.palette;
  const bandStyle: React.CSSProperties = {
    backgroundImage: `linear-gradient(135deg, ${p[4 % p.length] ?? p[0]}, ${p[1 % p.length] ?? p[0]} 55%, ${p[3 % p.length] ?? p[0]})`,
    color: p[2 % p.length] ?? "#fff",
  };
  const auraStyle: React.CSSProperties = {
    backgroundColor: `color-mix(in srgb, ${p[3 % p.length] ?? p[0]} 45%, transparent)`,
  };

  if (!snap) {
    return (
      <div className={cn("p-4 text-sm text-muted-foreground", className)}>
        Weather loading…
      </div>
    );
  }

  // Hourly: from current hour onward, cap to ~12 entries
  const nowHour = new Date().getHours();
  const hourly = snap.todayHourly
    .filter(h => h.hour >= nowHour)
    .slice(0, 12);

  // Today's max precip chance from hourly
  const todayPrecip = hourly.length
    ? Math.max(...snap.todayHourly.map(h => h.precipChance))
    : 0;

  const tips = dayDressTips({
    highC: snap.highC,
    lowC: snap.lowC,
    precipChance: todayPrecip,
    condition: snap.condition,
    windMaxKph: snap.windMaxKph,
  });

  const upcoming = snap.daily.filter(d => !isToday(d.dateObj)).slice(0, 5);

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header band — colored by condition */}
      <div
        style={bandStyle}
        className="relative overflow-hidden rounded-t-md px-4 py-4"
      >
        <div
          style={auraStyle}
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-2xl"
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide opacity-80">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{snap.locationLabel}</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl font-semibold tabular-nums">{fmtT(snap.tempC)}</span>
              <span className="text-sm opacity-90">{snap.conditionLabel}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs opacity-90">
              <span className="tabular-nums">H {fmtT(snap.highC)} · L {fmtT(snap.lowC)}</span>
              <span className="inline-flex items-center gap-1">
                <Droplets className="h-3 w-3" />
                <span className="tabular-nums">{todayPrecip}%</span>
              </span>
              {snap.windMaxKph > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Wind className="h-3 w-3" />
                  <span className="tabular-nums">{snap.windMaxKph} kph</span>
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0 rounded-full bg-white/15 p-2 backdrop-blur-sm">
            <GlyphIcon c={snap.condition} isNight={snap.isNight} className="h-10 w-10" />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-4 p-4">
        {/* What to wear */}
        {tips.length > 0 && (
          <section>
            <h4 className={cn("text-xs font-semibold uppercase tracking-wide", theme.accent)}>
              What to wear today
            </h4>
            <ul className="mt-2 space-y-1.5 text-sm text-foreground/85">
              {tips.map((t, i) => (
                <li key={i} className="flex gap-2">
                  <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current", theme.accent)} />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Hourly */}
        {hourly.length > 0 && (
          <section>
            <h4 className={cn("text-xs font-semibold uppercase tracking-wide", theme.accent)}>
              Hourly today
            </h4>
            <div className="mt-2 -mx-1 overflow-x-auto">
              <div className="flex min-w-max gap-1 px-1 pb-1">
                {hourly.map((h, i) => {
                  const label = i === 0
                    ? "Now"
                    : format(h.dateObj, h.hour === 0 || h.hour === 12 ? "h a" : "h a");
                  return (
                    <div
                      key={`${h.hour}-${i}`}
                      className="flex w-12 flex-col items-center gap-1 rounded-md bg-muted/40 px-1 py-2"
                    >
                      <span className="text-[10px] uppercase tracking-wide text-foreground/60">
                        {label}
                      </span>
                      <GlyphIcon c={h.condition} isNight={h.isNight} className="h-5 w-5" />
                      <span className="tabular-nums text-xs font-medium text-foreground/90">
                        {fmtT(h.tempC)}
                      </span>
                      <span
                        className={cn(
                          "tabular-nums text-[10px]",
                          h.precipChance >= 20 ? "text-sky-600 dark:text-sky-300" : "text-transparent",
                        )}
                      >
                        {h.precipChance}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* 3–5 day */}
        {upcoming.length > 0 && (
          <section>
            <h4 className={cn("text-xs font-semibold uppercase tracking-wide", theme.accent)}>
              Next {upcoming.length} days
            </h4>
            <ul className="mt-2 space-y-1">
              {upcoming.map(d => {
                const dayLabel = isTomorrow(d.dateObj) ? "Tomorrow" : format(d.dateObj, "EEEE");
                return (
                  <li
                    key={d.date}
                    className="grid grid-cols-[5.5rem_1.25rem_1fr_auto] items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/40"
                    title={d.conditionLabel}
                  >
                    <span className="truncate text-foreground/85">{dayLabel}</span>
                    <GlyphIcon c={d.condition} className="h-4 w-4 text-foreground/80" />
                    <span className="inline-flex items-center gap-1 text-xs text-foreground/60">
                      <Droplets className="h-3 w-3" />
                      <span className="tabular-nums">{d.precipChance}%</span>
                    </span>
                    <span className="tabular-nums text-xs text-foreground/80">
                      <span className="font-medium">{fmtT(d.highC)}</span>
                      <span className="ml-1 text-foreground/55">{fmtT(d.lowC)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-3 text-xs text-muted-foreground">
          <LocationPickerPopover
            trigger={
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/40 px-2 py-1 hover:bg-muted/70 transition"
              >
                <MapPin className="h-3 w-3" />
                <span className="max-w-[140px] truncate">Change location</span>
              </button>
            }
          />
          <div className="flex items-center gap-2">
            <span>Updated {relativeFromNow(snap.fetchedAt)}</span>
            <UnitToggle />
          </div>
        </div>
      </div>
    </div>
  );
}