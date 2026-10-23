import { useWeatherSnapshot, useTempUnit, cToF } from "@/lib/weather-store";

/** Compact weather line for a ritual's time frame (morning or evening). Hidden when unavailable. */
export function RitualWeather({ slot }: { slot: "morning" | "evening" }) {
  const snap = useWeatherSnapshot();
  const [unit] = useTempUnit();
  const part = slot === "morning" ? "Morning" : "Evening";
  const dp = snap?.dayParts.find(p => p.part === part);
  if (!dp || dp.conditionLabel === "—") return null;
  const f = (c: number) => `${unit === "F" ? cToF(c) : Math.round(c)}°`;
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[12px] tabular-nums text-muted-foreground" aria-label={`${part} weather`}>
      <span className="font-semibold text-foreground">{f(dp.avgTempC)}</span>
      <span>{dp.conditionLabel}</span>
      {dp.precipChance >= 10 && <span>💧 {dp.precipChance}%</span>}
      <span className="opacity-80">{part.toLowerCase()}</span>
    </p>
  );
}
