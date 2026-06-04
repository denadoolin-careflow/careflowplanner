import type { WeatherSnapshot } from "./weather";
import type { WeatherPrefs } from "./weather-prefs";
import { getTempUnit, formatTemp } from "./weather-store";

export type WarningSeverity = "info" | "caution" | "alert";
export interface WeatherWarning {
  id: string;
  severity: WarningSeverity;
  label: string;
  detail?: string;
}

function hourLabel(h: number): string {
  const d = new Date();
  d.setHours(h, 0, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric" });
}

export function computeWarnings(snap: WeatherSnapshot | null, prefs: WeatherPrefs): WeatherWarning[] {
  if (!snap) return [];
  const out: WeatherWarning[] = [];
  const hours = snap.todayHourly ?? [];

  const storm = hours.find(h => h.condition === "thunderstorm");
  if (storm) {
    out.push({ id: "storm", severity: "alert", label: "Thunderstorm expected", detail: `Around ${hourLabel(storm.hour)} — plan indoor errands.` });
  }

  if (prefs.rainAlerts) {
    const heavy = hours.find(h => h.precipChance >= 70);
    if (heavy) out.push({ id: "rain", severity: "caution", label: "Heavy rain likely", detail: `${heavy.precipChance}% chance near ${hourLabel(heavy.hour)} — grab an umbrella.` });
  }

  if (prefs.snowAlerts) {
    const snow = hours.find(h => h.condition === "snow");
    if (snow) out.push({ id: "snow", severity: "caution", label: "Snow in the forecast", detail: `Around ${hourLabel(snow.hour)} — warm boots and slow steps.` });
  }

  if (hours.length) {
    const minT = Math.min(...hours.map(h => h.tempC));
    const maxT = Math.max(...hours.map(h => h.tempC));
    const u = getTempUnit();
    if (minT <= prefs.coldC) out.push({ id: "cold", severity: "info", label: "Cold snap", detail: `Low near ${formatTemp(minT, u)}${u} — bundle up with a warm layer.` });
    if (maxT >= prefs.hotC) out.push({ id: "heat", severity: "caution", label: "Heat advisory", detail: `Up to ${formatTemp(maxT, u)}${u} — hydrate and find shade.` });
  }

  const fog = hours.slice(0, 6).find(h => h.condition === "fog");
  if (fog) out.push({ id: "fog", severity: "info", label: "Fog this morning", detail: "Headlights on if driving." });

  if (prefs.windAlerts && snap.windMaxKph >= 40) {
    out.push({ id: "wind", severity: "caution", label: "Windy day", detail: `Gusts up to ${snap.windMaxKph} km/h — secure loose items.` });
  }

  return out;
}