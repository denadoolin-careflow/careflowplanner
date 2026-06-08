import { useEffect, useMemo, useState } from "react";
import { format, isToday } from "date-fns";
import { Cloud, CloudDrizzle, CloudFog, CloudRain, CloudSnow, CloudSun, Moon, Sun, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWeatherSnapshot, useTempUnit, cToF } from "@/lib/weather-store";
import { useEnsureWeather } from "@/lib/use-ensure-weather";
import type { WeatherCondition } from "@/lib/weather";
import { LocationPickerPopover } from "@/components/weather/LocationPickerPopover";
import { UnitToggle } from "@/components/weather/UnitToggle";

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

  const time = useMemo(() => format(now, "h:mm a"), [now]);
  const date = useMemo(() => format(now, "EEE, MMM d"), [now]);
  const tempStr = snap ? `${unit === "F" ? cToF(snap.tempC) : Math.round(snap.tempC)}°` : null;
  const fmtT = (c: number) => `${unit === "F" ? cToF(c) : Math.round(c)}°`;
  const rangeStr = snap ? `${fmtT(snap.highC)} / ${fmtT(snap.lowC)}` : null;
  const upcoming = useMemo(
    () => (snap?.daily ?? []).filter(d => !isToday(d.dateObj)).slice(0, 4),
    [snap],
  );

  return (
    <div className={cn("hidden items-center gap-2 text-sm md:flex", className)}>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/40 px-2.5 py-1.5 tabular-nums font-medium text-foreground/85">
        {time}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/40 px-2.5 py-1.5 text-foreground/85">
        {date}
      </span>
      {snap && tempStr && (
        <LocationPickerPopover
          trigger={
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/40 px-2.5 py-1.5 text-foreground/85 hover:bg-muted/70 transition"
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
        <span className="hidden items-center gap-1 rounded-full border border-border/40 bg-muted/40 px-2 py-1 text-foreground/80 xl:inline-flex">
          {upcoming.map(d => (
            <span
              key={d.date}
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5"
              title={`${format(d.dateObj, "EEEE")} · ${d.conditionLabel} · ${fmtT(d.highC)} / ${fmtT(d.lowC)}`}
            >
              <span className="text-[11px] uppercase tracking-wide text-foreground/60">
                {format(d.dateObj, "EEE")}
              </span>
              <CondIcon c={d.condition} className="h-4 w-4" />
              <span className="tabular-nums text-xs font-medium">{fmtT(d.highC)}</span>
              <span className="tabular-nums text-xs text-foreground/55">{fmtT(d.lowC)}</span>
            </span>
          ))}
        </span>
      )}
      <UnitToggle />
    </div>
  );
}