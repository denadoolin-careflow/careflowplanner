import { format, isSameDay } from "date-fns";
import { Cloud, CloudDrizzle, CloudFog, CloudRain, CloudSnow, CloudSun, Sun, Zap } from "lucide-react";
import { MoonSVG } from "./MoonInsightCard";
import { getDayTheme } from "@/lib/planner/day-theme";
import { useCycleDot } from "@/lib/planner/day-rhythm";
import { useWeatherSnapshot, useTempUnit, formatTemp } from "@/lib/weather-store";
import type { WeatherCondition } from "@/lib/weather";
import { cn } from "@/lib/utils";

const COND_ICON: Record<WeatherCondition, typeof Sun> = {
  "clear": Sun,
  "partly-cloudy": CloudSun,
  "cloudy": Cloud,
  "fog": CloudFog,
  "drizzle": CloudDrizzle,
  "rain": CloudRain,
  "snow": CloudSnow,
  "thunderstorm": Zap,
};

export type WeekHeaderMode = "insight" | "compact";

/** One week column header: date, weather, moon, zodiac and the day's theme. */
export function WeekDayHeader({ date, mode, onSelect }: {
  date: Date;
  mode: WeekHeaderMode;
  onSelect?: (d: Date) => void;
}) {
  const theme = getDayTheme(date);
  const cycle = useCycleDot(date);
  const snap = useWeatherSnapshot();
  const [unit] = useTempUnit();
  const day = snap?.daily?.find(d => d.date === format(date, "yyyy-MM-dd"));
  const Icon = day ? COND_ICON[day.condition] ?? Cloud : null;
  const isToday = isSameDay(date, new Date());
  const compact = mode === "compact";

  return (
    <button
      type="button"
      onClick={() => onSelect?.(date)}
      title={[format(date, "EEEE, MMMM d"), theme.moonLabel, `Moon in ${theme.sign}`, cycle?.text].filter(Boolean).join(" · ")}
      className={cn(
        "flex h-full w-full min-w-0 flex-col items-center gap-1 px-1.5 py-2 text-center transition-colors hover:bg-muted/40",
        isToday && "bg-primary/5",
      )}
    >
      <span className={cn("text-[10px] uppercase tracking-[0.18em]", isToday ? "text-primary" : "text-muted-foreground")}>
        {format(date, "EEE")}
      </span>
      <span className={cn(
        "font-display text-lg font-semibold leading-none",
        isToday && "grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground",
      )}>
        {format(date, "d")}
      </span>

      {Icon && (
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Icon className="h-3 w-3" aria-hidden />
          {day && <span>{formatTemp(day.highC, unit)}</span>}
        </span>
      )}

      {compact ? (
        <span className="mt-0.5 flex items-center gap-1 opacity-80">
          <MoonSVG fraction={theme.fraction} size={14} />
          {cycle && <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: cycle.color }} />}
        </span>
      ) : (
        <>
          <span className="mt-0.5 flex flex-col items-center gap-0.5">
            <MoonSVG fraction={theme.fraction} size={26} />
            <span className="text-[9px] leading-tight text-muted-foreground">
              {theme.moonLabel} · {theme.illumination}%
            </span>
          </span>
          <span className="text-[10px] leading-none text-muted-foreground">
            <span aria-hidden>{theme.signSymbol}</span> {theme.sign}
          </span>
          {cycle && (
            <span
              className="mt-0.5 inline-flex max-w-full items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] leading-tight"
              style={{ background: cycle.soft, color: cycle.color }}
            >
              <span aria-hidden>{cycle.glyph}</span>
              <span className="truncate">{cycle.label} · d{cycle.cycleDay}</span>
            </span>
          )}
          <span className="mt-1 flex min-w-0 flex-col items-center gap-0.5">
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-tight"
              style={{ background: `${theme.color}22`, color: theme.color }}
            >
              <span aria-hidden className="mr-0.5">{theme.icon}</span>{theme.themeName}
            </span>
            <span className="text-[9px] leading-tight text-muted-foreground [overflow-wrap:break-word]">{theme.blurb}</span>
            <span className="text-[9px] leading-tight text-muted-foreground/80">
              Good for: {theme.goodFor.join(" · ")}
            </span>
          </span>
        </>
      )}
    </button>
  );
}