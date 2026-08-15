import { useMemo, useState } from "react";
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

/** Soft background tints per condition (light / dark), used to color cells. */
const COND_TINT: Record<WeatherCondition, string> = {
  "clear": "from-amber-200/60 to-amber-100/30 dark:from-amber-500/25 dark:to-amber-400/10",
  "partly-cloudy": "from-sky-200/60 to-amber-100/30 dark:from-sky-500/25 dark:to-amber-400/10",
  "cloudy": "from-slate-300/55 to-slate-200/25 dark:from-slate-500/30 dark:to-slate-400/10",
  "fog": "from-zinc-300/55 to-zinc-200/25 dark:from-zinc-500/30 dark:to-zinc-400/10",
  "drizzle": "from-sky-300/60 to-sky-200/25 dark:from-sky-500/30 dark:to-sky-400/10",
  "rain": "from-blue-400/55 to-blue-200/25 dark:from-blue-500/35 dark:to-blue-400/10",
  "snow": "from-cyan-200/60 to-slate-100/30 dark:from-cyan-400/25 dark:to-slate-300/10",
  "thunderstorm": "from-indigo-400/55 to-violet-300/25 dark:from-indigo-500/35 dark:to-violet-400/10",
};

function nightTint(isNight?: boolean) {
  return isNight ? "from-indigo-300/50 to-slate-200/25 dark:from-indigo-500/30 dark:to-slate-500/10" : "";
}

/** Precipitation fill: height/width scales with chance. */
function precipTone(chance: number) {
  if (chance >= 70) return "bg-blue-600/70";
  if (chance >= 40) return "bg-blue-500/55";
  if (chance >= 20) return "bg-sky-500/45";
  return "bg-sky-400/25";
}

export function WeatherDetailCard({ className }: { className?: string }) {
  const snap = useWeatherSnapshot();
  const [unit] = useTempUnit();
  const { atmosphere } = useAtmosphere();
  const [openHour, setOpenHour] = useState<string | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);
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
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Colored by conditions — the blue fill is the chance of precipitation. Tap an hour for details.
            </p>
            <div className="mt-2 -mx-1 overflow-x-auto">
              <div className="flex min-w-max gap-1 px-1 pb-1">
                {hourly.map((h, i) => {
                  const label = i === 0
                    ? "Now"
                    : format(h.dateObj, h.hour === 0 || h.hour === 12 ? "h a" : "h a");
                  const key = `${h.hour}-${i}`;
                  const active = openHour === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setOpenHour(active ? null : key)}
                      aria-pressed={active}
                      aria-label={`${label}: ${h.conditionLabel ?? ""} ${fmtT(h.tempC)}, ${h.precipChance}% chance of precipitation`}
                      className={cn(
                        "relative flex w-12 flex-col items-center gap-1 overflow-hidden rounded-md bg-gradient-to-b px-1 py-2 transition",
                        COND_TINT[h.condition] ?? COND_TINT.cloudy,
                        nightTint(h.isNight) && h.condition === "clear" ? nightTint(h.isNight) : "",
                        active ? "ring-2 ring-primary/60" : "hover:brightness-105",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn("pointer-events-none absolute inset-x-0 bottom-0", precipTone(h.precipChance))}
                        style={{ height: `${Math.max(0, Math.min(100, h.precipChance))}%` }}
                      />
                      <span className="relative text-[10px] uppercase tracking-wide text-foreground/70">
                        {label}
                      </span>
                      <GlyphIcon c={h.condition} isNight={h.isNight} className="relative h-5 w-5" />
                      <span className="relative tabular-nums text-xs font-medium text-foreground">
                        {fmtT(h.tempC)}
                      </span>
                      <span
                        className={cn(
                          "relative tabular-nums text-[10px] font-medium",
                          h.precipChance >= 20 ? "text-foreground/85" : "text-foreground/40",
                        )}
                      >
                        {h.precipChance}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {openHour && (() => {
              const idx = hourly.findIndex((h, i) => `${h.hour}-${i}` === openHour);
              const h = hourly[idx];
              if (!h) return null;
              return (
                <div className="mt-2 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-xs text-foreground/80">
                  <span className="font-medium">{idx === 0 ? "Now" : format(h.dateObj, "h a")}</span>
                  {" · "}{h.conditionLabel ?? snap.conditionLabel}
                  {" · "}<span className="tabular-nums">{fmtT(h.tempC)}</span>
                  {" · "}<span className="tabular-nums">{h.precipChance}% chance of precipitation</span>
                </div>
              );
            })()}
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
                const active = openDay === d.date;
                return (
                  <li key={d.date}>
                    <button
                      type="button"
                      onClick={() => setOpenDay(active ? null : d.date)}
                      aria-expanded={active}
                      aria-label={`${dayLabel}: ${d.conditionLabel}, high ${fmtT(d.highC)}, low ${fmtT(d.lowC)}, ${d.precipChance}% chance of precipitation`}
                      className={cn(
                        "relative grid w-full grid-cols-[5.5rem_1.25rem_1fr_auto] items-center gap-2 overflow-hidden rounded-md bg-gradient-to-r px-2 py-1.5 text-left text-sm transition",
                        COND_TINT[d.condition] ?? COND_TINT.cloudy,
                        active ? "ring-2 ring-primary/60" : "hover:brightness-105",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn("pointer-events-none absolute inset-y-0 left-0", precipTone(d.precipChance))}
                        style={{ width: `${Math.max(0, Math.min(100, d.precipChance))}%` }}
                      />
                      <span className="relative truncate text-foreground/90">{dayLabel}</span>
                      <GlyphIcon c={d.condition} className="relative h-4 w-4 text-foreground/80" />
                      <span className="relative inline-flex items-center gap-1 text-xs text-foreground/75">
                        <Droplets className="h-3 w-3" />
                        <span className="tabular-nums">{d.precipChance}%</span>
                      </span>
                      <span className="relative tabular-nums text-xs text-foreground/85">
                        <span className="font-medium">{fmtT(d.highC)}</span>
                        <span className="ml-1 text-foreground/60">{fmtT(d.lowC)}</span>
                      </span>
                    </button>
                    {active && (
                      <div className="mt-1 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-xs text-foreground/80">
                        {d.conditionLabel} · high <span className="tabular-nums">{fmtT(d.highC)}</span>,
                        low <span className="tabular-nums">{fmtT(d.lowC)}</span> ·{" "}
                        <span className="tabular-nums">{d.precipChance}%</span> chance of precipitation
                      </div>
                    )}
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