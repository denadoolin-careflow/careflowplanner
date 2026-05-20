import type { WeatherSnapshot } from "./weather";
import type { WeatherPrefs } from "./weather-prefs";

export type ClothingIcon =
  | "Umbrella" | "Shirt" | "CloudSnow" | "Wind" | "Sun"
  | "Glasses" | "Footprints" | "Thermometer";

export interface ClothingTip {
  icon: ClothingIcon;
  label: string;
  tone: "calm" | "warn" | "info";
}

export function getClothingAdvice(snap: WeatherSnapshot, prefs: WeatherPrefs): ClothingTip[] {
  const tips: ClothingTip[] = [];
  const t = snap.tempC;
  const high = snap.highC;
  const low = snap.lowC;
  const maxPrecip = Math.max(
    snap.dayParts.reduce((m, p) => Math.max(m, p.precipChance), 0),
    0,
  );

  // ---- Temperature
  if (t <= 0 || low <= -2) {
    tips.push({ icon: "Thermometer", label: "Heavy coat, hat & gloves", tone: "warn" });
  } else if (t <= 7) {
    tips.push({ icon: "Shirt", label: "Warm coat and layers", tone: "calm" });
  } else if (t < prefs.coldC) {
    tips.push({ icon: "Shirt", label: "Light jacket recommended", tone: "calm" });
  } else if (t >= prefs.hotC + 5) {
    tips.push({ icon: "Sun", label: "Short sleeves, sip water often", tone: "warn" });
  } else if (t >= prefs.hotC) {
    tips.push({ icon: "Sun", label: "Short-sleeves weather", tone: "calm" });
  } else {
    tips.push({ icon: "Shirt", label: "Comfortable layers suggested", tone: "calm" });
  }

  // ---- Day swing
  if (high - low >= 12) {
    tips.push({ icon: "Shirt", label: "Big swing today — bring a layer", tone: "info" });
  }

  // ---- Precipitation
  if (prefs.rainAlerts && (snap.condition === "rain" || snap.condition === "drizzle" || maxPrecip >= 60)) {
    tips.push({ icon: "Umbrella", label: "Bring an umbrella", tone: "warn" });
    if (maxPrecip >= 75) tips.push({ icon: "Footprints", label: "Rain boots may help today", tone: "info" });
  } else if (prefs.rainAlerts && maxPrecip >= 35) {
    tips.push({ icon: "Umbrella", label: "Umbrella, just in case", tone: "info" });
  }

  if (prefs.snowAlerts && snap.condition === "snow") {
    tips.push({ icon: "CloudSnow", label: "Snow possible — warm boots and slow steps", tone: "warn" });
  }

  // ---- Wind / sun
  if (prefs.windAlerts && (snap.condition === "thunderstorm")) {
    tips.push({ icon: "Wind", label: "Storms outside — plan indoor errands", tone: "warn" });
  }

  if (!snap.isNight && snap.condition === "clear" && t >= 20) {
    tips.push({ icon: "Glasses", label: "Sunglasses & a sip of water", tone: "info" });
  }

  // Dedupe by label, cap at 4
  const seen = new Set<string>();
  return tips.filter(tip => {
    if (seen.has(tip.label)) return false;
    seen.add(tip.label);
    return true;
  }).slice(0, 4);
}