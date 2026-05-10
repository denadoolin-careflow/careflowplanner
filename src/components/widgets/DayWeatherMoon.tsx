import { Cloud, CloudDrizzle, CloudFog, CloudRain, CloudSnow, CloudSun, Sun, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeatherCondition } from "@/lib/weather";
import { useWeekForecast } from "@/lib/use-week-forecast";
import { useTempUnit, cToF } from "@/lib/weather-store";
import { getMoonPhase, MOON_INFO } from "@/lib/moon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function CondIcon({ c, className }: { c: WeatherCondition; className?: string }) {
  const cls = cn("h-3.5 w-3.5", className);
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

export function DayWeatherMoon({ date, className }: { date: Date; className?: string }) {
  const { days } = useWeekForecast();
  const [unit] = useTempUnit();
  const iso = date.toISOString().slice(0, 10);
  const d = days?.find(x => x.date === iso);
  const moon = MOON_INFO[getMoonPhase(date)];
  const fmt = (c: number) => `${unit === "F" ? cToF(c) : c}°`;

  return (
    <div className={cn("flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-2 py-1 text-[11px]", className)}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {d ? (
          <>
            <CondIcon c={d.condition} className="text-secondary-foreground" />
            <span className="font-semibold tabular-nums text-foreground/85">{fmt(d.highC)}</span>
            <span className="tabular-nums opacity-70">/ {fmt(d.lowC)}</span>
            {d.precip >= 25 && <span className="text-primary tabular-nums">{d.precip}%</span>}
          </>
        ) : (
          <span className="opacity-60">—</span>
        )}
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-default text-base leading-none" aria-label={moon.label}>{moon.glyph}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[11px]">{moon.label}</TooltipContent>
      </Tooltip>
    </div>
  );
}
