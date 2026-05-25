import { useEffect, useState, useMemo, memo } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { MoonGlyph } from "@/components/widgets/MoonGlyph";
import { useWeatherSnapshot, useTempUnit, cToF } from "@/lib/weather-store";
import { Cloud, CloudDrizzle, CloudFog, CloudRain, CloudSnow, CloudSun, Moon, Sun, Zap } from "lucide-react";
import type { WeatherCondition } from "@/lib/weather";
import { getMoonPhase, MOON_INFO, getIllumination } from "@/lib/moon";
import { PhaseBadge } from "@/components/cycle/PhaseBadge";

function ConditionIcon({ condition, isNight, className }: { condition: WeatherCondition; isNight?: boolean; className?: string }) {
  if (condition === "clear") return isNight ? <Moon className={className} /> : <Sun className={className} />;
  if (condition === "partly-cloudy") return <CloudSun className={className} />;
  if (condition === "cloudy") return <Cloud className={className} />;
  if (condition === "fog") return <CloudFog className={className} />;
  if (condition === "drizzle") return <CloudDrizzle className={className} />;
  if (condition === "rain") return <CloudRain className={className} />;
  if (condition === "snow") return <CloudSnow className={className} />;
  if (condition === "thunderstorm") return <Zap className={className} />;
  return <Cloud className={className} />;
}

/** Minute-resolution digital readout — re-renders at most once per minute. */
const DigitalReadout = memo(function DigitalReadout({ compact = false }: { compact?: boolean }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const msToNextMin = 60_000 - (Date.now() % 60_000);
    const timeoutId = setTimeout(() => {
      setNow(new Date());
      intervalId = setInterval(() => setNow(new Date()), 60_000);
    }, msToNextMin);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);
  const time = useMemo(() => format(now, "h:mm"), [now]);
  const ampm = useMemo(() => format(now, "a"), [now]);
  return (
    <div className="flex items-baseline gap-1.5 font-display tabular-nums leading-none">
      <span className={cn(
        "text-gradient-glow font-semibold",
        compact ? "text-xl" : "text-4xl sm:text-5xl",
      )}>{time}</span>
      <span className={cn(
        "font-medium uppercase tracking-[0.2em] text-muted-foreground",
        compact ? "text-[9px]" : "text-xs",
      )}>{ampm}</span>
    </div>
  );
});

const fmtTemp = (c: number, u: "C" | "F") => `${u === "F" ? cToF(c) : Math.round(c)}°`;

const WeatherLine = memo(function WeatherLine({ compact = false }: { compact?: boolean }) {
  const snap = useWeatherSnapshot();
  const [unit] = useTempUnit();
  if (!snap) return null;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-muted-foreground",
      compact ? "text-[10px]" : "text-xs",
    )}>
      <ConditionIcon condition={snap.condition} isNight={snap.isNight} className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
      <span className="tabular-nums">{fmtTemp(snap.tempC, unit)}</span>
      {!compact && <span className="truncate max-w-[8rem]">{snap.conditionLabel}</span>}
    </span>
  );
});

/**
 * AuroraClock — calm digital readout with moon phase + weather beneath the time.
 * Pass `compact` to render the slim header variant.
 */
export const AuroraClock = memo(function AuroraClock({
  className,
  compact = false,
}: { className?: string; compact?: boolean }) {
  const moonSize = compact ? 24 : 48;
  const today = new Date();
  const moon = MOON_INFO[getMoonPhase(today)];
  const illum = getIllumination(today);

  if (compact) {
    return (
      <div className={cn("flex flex-col gap-0.5", className)}>
        <DigitalReadout compact />
        <div className="flex items-center gap-1.5">
          <MoonGlyph size={moonSize} />
          <WeatherLine compact />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-3 sm:items-end", className)}>
      <div className="flex items-center gap-3">
        <DigitalReadout />
        <WeatherLine />
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <MoonGlyph size={moonSize} />
        <div className="flex flex-col items-center leading-tight">
          <span className="font-display text-sm text-foreground/85">{moon.label}</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground tabular-nums">
            {illum}% lit
          </span>
        </div>
        <PhaseBadge date={today} />
      </div>
    </div>
  );
});