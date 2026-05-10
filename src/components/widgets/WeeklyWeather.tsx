import { Cloud, CloudDrizzle, CloudFog, CloudRain, CloudSnow, CloudSun, Loader2, MapPin, Sun, Zap } from "lucide-react";
import type { WeatherCondition } from "@/lib/weather";
import { useTempUnit, cToF } from "@/lib/weather-store";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { useWeekForecast } from "@/lib/use-week-forecast";
import { MOON_INFO, getMoonPhase } from "@/lib/moon";

function CondIcon({ c, className }: { c: WeatherCondition; className?: string }) {
  const cls = cn("h-4 w-4", className);
  if (c === "clear") return <Sun className={cls} />;
  if (c === "partly-cloudy") return <CloudSun className={cls} />;
  if (c === "cloudy") return <Cloud className={cls} />;
  if (c === "fog") return <CloudFog className={cls} />;
  if (c === "drizzle") return <CloudDrizzle className={cls} />;
  if (c === "rain") return <CloudRain className={cls} />;
  if (c === "snow") return <CloudSnow className={cls} />;
  if (c === "thunderstorm") return <Zap className={cls} />;
  return <Cloud className={cls} />;
}

export function WeeklyWeather() {
  const { days, place, status } = useWeekForecast();
  const [unit] = useTempUnit();

  const fmt = (c: number) => `${unit === "F" ? cToF(c) : c}°`;

  return (
    <section className="cozy-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">7-day forecast</div>
          {place && (
            <div className="mt-0.5 flex items-center gap-1 text-sm font-medium">
              <MapPin className="h-3 w-3 text-muted-foreground" /> {place.name}
            </div>
          )}
        </div>
      </div>
      {status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading week…</div>
      )}
      {status === "needs-location" && (
        <p className="text-sm text-muted-foreground">Allow location or set a place in the daily weather widget to see the week.</p>
      )}
      {status === "error" && (
        <p className="text-sm text-muted-foreground">Couldn't load the forecast.</p>
      )}
      {days && (
        <div className="grid grid-cols-7 gap-1.5">
          {days.slice(0, 7).map(d => {
            const moon = MOON_INFO[getMoonPhase(parseISO(d.date))];
            return (
              <div key={d.date} className="flex flex-col items-center gap-1 rounded-xl bg-muted/40 p-2 text-center transition-colors hover:bg-muted/60">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{format(parseISO(d.date), "EEE")}</div>
                <CondIcon c={d.condition} className="text-secondary-foreground" />
                <div className="text-xs font-semibold tabular-nums">{fmt(d.highC)}</div>
                <div className="text-[10px] tabular-nums text-muted-foreground">{fmt(d.lowC)}</div>
                {d.precip > 20 && <div className="text-[9px] text-primary">{d.precip}%</div>}
                <div className="text-sm leading-none" title={moon.label}>{moon.glyph}</div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}