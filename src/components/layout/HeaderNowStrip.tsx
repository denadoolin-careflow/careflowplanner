import { useEffect, useMemo, useState } from "react";
import { format, isToday } from "date-fns";
import { Link } from "react-router-dom";
import {
  ChevronDown, Cloud, CloudDrizzle, CloudFog, CloudRain, CloudSnow, CloudSun,
  Moon, Sun, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWeatherSnapshot, useTempUnit, cToF } from "@/lib/weather-store";
import { useEnsureWeather } from "@/lib/use-ensure-weather";
import type { WeatherCondition } from "@/lib/weather";
import { UnitToggle } from "@/components/weather/UnitToggle";
import { WeatherDetailPopover } from "@/components/weather/WeatherDetailPopover";
import { weatherTheme } from "@/lib/weather-theme";

function CondIcon({ c, isNight, className }: { c: WeatherCondition; isNight?: boolean; className?: string }) {
  const cls = cn("h-5 w-5", className);
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

export function HeaderNowStrip({ className }: { className?: string }) {
  useEnsureWeather();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const snap = useWeatherSnapshot();
  const [unit] = useTempUnit();
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const time = useMemo(() => format(now, "h:mm a"), [now]);
  const date = useMemo(() => format(now, "EEE, MMM d"), [now]);
  const shortDate = useMemo(() => format(now, "EEE, MMM d"), [now]);
  const currentSlot = useMemo<"morning" | "afternoon" | "evening">(() => {
    const h = now.getHours();
    if (h < 12) return "morning";
    if (h < 17) return "afternoon";
    return "evening";
  }, [now]);
  const slotLabel = currentSlot[0].toUpperCase() + currentSlot.slice(1);
  const tempStr = snap ? `${unit === "F" ? cToF(snap.tempC) : Math.round(snap.tempC)}°` : null;
  const fmtT = (c: number) => `${unit === "F" ? cToF(c) : Math.round(c)}°`;
  const rangeStr = snap ? `${fmtT(snap.highC)} / ${fmtT(snap.lowC)}` : null;
  const upcoming = useMemo(
    () => (snap?.daily ?? []).filter(d => !isToday(d.dateObj)).slice(0, 4),
    [snap],
  );

  const ring = snap ? weatherTheme(snap.condition, snap.isNight).ring : "";

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      {/* ───── Mobile (compact + toggle) ───── */}
      <div className="flex items-center gap-1.5 md:hidden">
        <Link
          to={`/today#slot-${currentSlot}`}
          aria-label={`Open today's ${slotLabel} tasks`}
          title={`Jump to ${slotLabel} tasks`}
          className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/40 px-2 py-1 tabular-nums text-xs font-medium text-foreground/85 hover:bg-muted/70 transition"
        >
          {time}
        </Link>
        {snap && tempStr && (
          <WeatherDetailPopover
            trigger={
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/40 px-2 py-1 text-xs text-foreground/85 hover:bg-muted/70 transition ring-1 ring-transparent",
                  ring,
                )}
                title={snap.conditionLabel ?? undefined}
                aria-label={`Weather: ${snap.conditionLabel ?? "unknown"} ${tempStr}`}
              >
                <CondIcon c={snap.condition} isNight={snap.isNight} className="h-4 w-4" />
                <span className="tabular-nums font-medium">{tempStr}</span>
              </button>
            }
          />
        )}
        <button
          type="button"
          onClick={() => setMobileExpanded(v => !v)}
          aria-expanded={mobileExpanded}
          aria-label={mobileExpanded ? "Hide date and forecast" : "Show date and forecast"}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/40 bg-muted/40 text-foreground/70 hover:bg-muted/70 transition"
        >
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", mobileExpanded && "rotate-180")} />
        </button>
      </div>

      {/* Mobile expanded row — drops under the header */}
      {mobileExpanded && (
        <div className="fixed inset-x-0 top-[52px] z-30 border-b border-border/50 bg-background/95 px-3 py-2 shadow-sm backdrop-blur-md md:hidden">
          <div className="mx-auto flex max-w-screen-sm flex-wrap items-center gap-1.5 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/40 px-2 py-1 text-foreground/85">
              {shortDate}
            </span>
            {snap && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/40 px-2 py-1 text-foreground/75">
                <span className="tabular-nums">{rangeStr}</span>
                {snap.conditionLabel && <span className="text-foreground/55">· {snap.conditionLabel}</span>}
              </span>
            )}
            {upcoming.length > 0 && (
              <WeatherDetailPopover
                trigger={
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/40 px-1.5 py-1 text-foreground/80 hover:bg-muted/70 transition"
                  >
                    {upcoming.map(d => (
                      <span key={d.date} className="inline-flex items-center gap-0.5 px-1">
                        <span className="text-[10px] uppercase tracking-wide text-foreground/55">
                          {format(d.dateObj, "EEE")}
                        </span>
                        <CondIcon c={d.condition} className="h-3.5 w-3.5" />
                        <span className="tabular-nums text-[11px] font-medium">{fmtT(d.highC)}</span>
                      </span>
                    ))}
                  </button>
                }
              />
            )}
            <UnitToggle />
          </div>
        </div>
      )}

      {/* ───── Desktop / tablet (inline full strip) ───── */}
      <div className="hidden items-center gap-2 md:flex">
      <Link
        to={`/today#slot-${currentSlot}`}
        aria-label={`Open today's ${slotLabel} tasks`}
        title={`Jump to ${slotLabel} tasks`}
        className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/40 px-2.5 py-1.5 tabular-nums font-medium text-foreground/85 hover:bg-muted/70 transition"
      >
        {time}
      </Link>
      <Link
        to="/today"
        aria-label="Open Today"
        title="Open today's tasks"
        className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/40 px-2.5 py-1.5 text-foreground/85 hover:bg-muted/70 transition"
      >
        {date}
      </Link>
      {snap && tempStr && (
        <WeatherDetailPopover
          trigger={
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/40 px-2.5 py-1.5 text-foreground/85 hover:bg-muted/70 transition ring-1 ring-transparent hover:ring-2",
                weatherTheme(snap.condition, snap.isNight).ring,
              )}
              title={snap.conditionLabel ?? undefined}
            >
              <CondIcon c={snap.condition} isNight={snap.isNight} />
              <span className="tabular-nums font-medium">{tempStr}</span>
              {rangeStr && (
                <span className="tabular-nums text-foreground/60">· {rangeStr}</span>
              )}
              {snap.conditionLabel && (
                <span className="hidden truncate text-foreground/70 lg:inline">· {snap.conditionLabel}</span>
              )}
              <span className="max-w-[100px] truncate text-foreground/60">· {snap.locationLabel}</span>
            </button>
          }
        />
      )}
      {upcoming.length > 0 && (
        <WeatherDetailPopover
          trigger={
            <button
              type="button"
              className="hidden items-center gap-1 rounded-full border border-border/40 bg-muted/40 px-2 py-1 text-foreground/80 hover:bg-muted/70 transition xl:inline-flex"
              title="Open weather details"
            >
              {upcoming.map(d => (
                <span
                  key={d.date}
                  className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5"
                >
                  <span className="text-[11px] uppercase tracking-wide text-foreground/60">
                    {format(d.dateObj, "EEE")}
                  </span>
                  <CondIcon c={d.condition} className="h-4 w-4" />
                  <span className="tabular-nums text-xs font-medium">{fmtT(d.highC)}</span>
                  <span className="tabular-nums text-xs text-foreground/55">{fmtT(d.lowC)}</span>
                </span>
              ))}
            </button>
          }
        />
      )}
      <UnitToggle />
      </div>
    </div>
  );
}