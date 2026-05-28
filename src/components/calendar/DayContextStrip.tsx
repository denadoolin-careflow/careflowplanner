import { useMemo } from "react";
import { Cloud, CloudDrizzle, CloudFog, CloudRain, CloudSnow, CloudSun, Sun, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMoonPhase, MOON_INFO } from "@/lib/moon";
import { getRhythmForecast } from "@/lib/rhythm-forecast";
import { useWeekForecast } from "@/lib/use-week-forecast";
import { useTempUnit, cToF } from "@/lib/weather-store";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo } from "@/lib/cycle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { WeatherCondition } from "@/lib/weather";

function WxIcon({ c, className }: { c: WeatherCondition; className?: string }) {
  const cls = cn("h-3 w-3", className);
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

interface Props {
  date: Date;
  compact?: boolean;
  className?: string;
  onLunar?: (date: Date) => void;
}

export function DayContextStrip({ date, compact = false, className, onLunar }: Props) {
  const iso = date.toISOString().slice(0, 10);
  const { days } = useWeekForecast();
  const [unit] = useTempUnit();
  const { settings: cycleSettings, periods } = useCycle();

  const moonPhase = getMoonPhase(date);
  const moon = MOON_INFO[moonPhase];
  const forecast = useMemo(() => getRhythmForecast(date), [date]);
  const wx = days?.find(d => d.date === iso);
  const phaseInfo = useMemo(
    () => (cycleSettings.enabled ? getPhaseInfo(date, periods, cycleSettings) : null),
    [date, periods, cycleSettings],
  );
  const fmt = (c: number) => `${unit === "F" ? cToF(c) : c}°`;

  const chipBase = "inline-flex items-center gap-1 rounded-full border border-border/50 bg-card/60 px-1.5 text-foreground/80";
  const chipSize = compact ? "py-0 text-[10px] leading-[18px]" : "py-0.5 text-[11px]";

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onLunar ? () => onLunar(date) : undefined}
            className={cn(chipBase, chipSize, onLunar && "hover:bg-card cursor-pointer")}
            aria-label={moon.label}
          >
            <span aria-hidden className="text-sm leading-none">{moon.glyph}</span>
            {!compact && <span>{moon.label}</span>}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[11px]">{moon.label}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onLunar ? () => onLunar(date) : undefined}
            className={cn(chipBase, chipSize, onLunar && "hover:bg-card cursor-pointer")}
            aria-label={forecast.sign.sign}
          >
            <span aria-hidden className="text-sm leading-none">{forecast.sign.glyph}</span>
            {!compact && <span>{forecast.sign.sign}</span>}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[11px]">
          Moon in {forecast.sign.sign} · {forecast.sign.element}
        </TooltipContent>
      </Tooltip>

      {phaseInfo && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(chipBase, chipSize)}
              style={{
                borderColor: `hsl(var(${phaseInfo.tokenVar}) / 0.45)`,
                color: `hsl(var(${phaseInfo.tokenVar}))`,
              }}
              aria-label={`${phaseInfo.label} phase`}
            >
              <span aria-hidden className="text-sm leading-none">{phaseInfo.glyph}</span>
              {!compact && <span>{phaseInfo.label}</span>}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[11px]">
            {phaseInfo.label} · day {phaseInfo.cycleDay}
          </TooltipContent>
        </Tooltip>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(chipBase, chipSize)} aria-label={wx ? wx.label : "Forecast unavailable"}>
            {wx ? (
              <>
                <WxIcon c={wx.condition} />
                <span className="tabular-nums">{fmt(wx.highC)}</span>
                {!compact && <span className="opacity-70 tabular-nums">/{fmt(wx.lowC)}</span>}
                {wx.precip >= 25 && <span className="text-primary tabular-nums">{wx.precip}%</span>}
              </>
            ) : (
              <>
                <Cloud className="h-3 w-3 opacity-50" />
                <span className="opacity-60">—</span>
              </>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[11px]">
          {wx ? `${wx.label} · high ${fmt(wx.highC)} / low ${fmt(wx.lowC)}${wx.precip >= 25 ? ` · ${wx.precip}% precip` : ""}` : "Weather out of forecast range"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}