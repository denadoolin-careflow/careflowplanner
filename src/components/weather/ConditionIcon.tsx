import { Cloud, CloudDrizzle, CloudFog, CloudRain, CloudSnow, CloudSun, Moon as MoonIcon, Sun, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeatherCondition } from "@/lib/weather";

/** Single source of truth for the icon that represents a weather condition. */
export function ConditionIcon({ condition, isNight, className, style }: {
  condition: WeatherCondition;
  isNight?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const p = { className: cn("h-3.5 w-3.5", className), style };
  if (condition === "clear") return isNight ? <MoonIcon {...p} /> : <Sun {...p} />;
  if (condition === "partly-cloudy") return <CloudSun {...p} />;
  if (condition === "cloudy") return <Cloud {...p} />;
  if (condition === "fog") return <CloudFog {...p} />;
  if (condition === "drizzle") return <CloudDrizzle {...p} />;
  if (condition === "rain") return <CloudRain {...p} />;
  if (condition === "snow") return <CloudSnow {...p} />;
  if (condition === "thunderstorm") return <Zap {...p} />;
  return <Cloud {...p} />;
}
