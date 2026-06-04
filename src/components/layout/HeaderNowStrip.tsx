import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Cloud, CloudDrizzle, CloudFog, CloudRain, CloudSnow, CloudSun, Moon, Sun, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWeatherSnapshot, useTempUnit, cToF } from "@/lib/weather-store";
import { useEnsureWeather } from "@/lib/use-ensure-weather";
import type { WeatherCondition } from "@/lib/weather";
import { LocationPickerPopover } from "@/components/weather/LocationPickerPopover";
import { UnitToggle } from "@/components/weather/UnitToggle";

function CondIcon({ c, isNight, className }: { c: WeatherCondition; isNight?: boolean; className?: string }) {
  const cls = cn("h-3.5 w-3.5", className);
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

  return (
    <div className={cn("hidden items-center gap-1.5 text-[11px] md:flex", className)}>
      <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/40 px-2 py-1 tabular-nums text-foreground/85">
        {time}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/40 px-2 py-1 text-foreground/85">
        {date}
      </span>
      {snap && tempStr && (
        <LocationPickerPopover
          trigger={
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/40 px-2 py-1 text-foreground/85 hover:bg-muted/70 transition"
              title={snap.conditionLabel ?? undefined}
            >
              <CondIcon c={snap.condition} isNight={snap.isNight} />
              <span className="tabular-nums">{tempStr}</span>
              <span className="max-w-[100px] truncate text-foreground/60">· {snap.locationLabel}</span>
            </button>
          }
        />
      )}
      <UnitToggle />
    </div>
  );
}