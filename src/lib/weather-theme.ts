import type { WeatherCondition } from "./weather";

export interface WeatherTheme {
  /** Gradient classes for the card header band. */
  band: string;
  /** Soft aura around the main glyph. */
  aura: string;
  /** Accent text/border color for chips and dividers. */
  accent: string;
  /** Accent ring on the trigger chip. */
  ring: string;
  /** Short label describing the palette. */
  label: string;
}

export function weatherTheme(c: WeatherCondition, isNight?: boolean): WeatherTheme {
  if (c === "thunderstorm") {
    return {
      band: "bg-gradient-to-br from-indigo-700 via-violet-700 to-slate-900 text-white",
      aura: "bg-violet-400/30",
      accent: "text-violet-300",
      ring: "ring-violet-400/40",
      label: "Storm",
    };
  }
  if (c === "snow") {
    return {
      band: "bg-gradient-to-br from-purple-300 via-fuchsia-200 to-indigo-300 text-purple-950",
      aura: "bg-purple-300/50",
      accent: "text-purple-700 dark:text-purple-300",
      ring: "ring-purple-300/50",
      label: "Snow",
    };
  }
  if (c === "rain" || c === "drizzle") {
    return {
      band: "bg-gradient-to-br from-sky-500 via-blue-500 to-blue-700 text-white",
      aura: "bg-sky-300/40",
      accent: "text-sky-700 dark:text-sky-300",
      ring: "ring-sky-400/50",
      label: "Rain",
    };
  }
  if (c === "fog") {
    return {
      band: "bg-gradient-to-br from-slate-400 via-zinc-400 to-slate-500 text-white",
      aura: "bg-slate-200/40",
      accent: "text-slate-700 dark:text-slate-300",
      ring: "ring-slate-400/40",
      label: "Fog",
    };
  }
  if (c === "cloudy") {
    return {
      band: "bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600 text-white",
      aura: "bg-slate-300/40",
      accent: "text-slate-700 dark:text-slate-300",
      ring: "ring-slate-400/40",
      label: "Cloudy",
    };
  }
  if (c === "partly-cloudy") {
    if (isNight) {
      return {
        band: "bg-gradient-to-br from-indigo-700 via-slate-700 to-slate-900 text-white",
        aura: "bg-indigo-300/30",
        accent: "text-indigo-300",
        ring: "ring-indigo-400/40",
        label: "Partly cloudy",
      };
    }
    return {
      band: "bg-gradient-to-br from-amber-300 via-sky-300 to-sky-500 text-slate-900",
      aura: "bg-amber-200/50",
      accent: "text-amber-700 dark:text-amber-300",
      ring: "ring-amber-300/50",
      label: "Partly cloudy",
    };
  }
  // clear
  if (isNight) {
    return {
      band: "bg-gradient-to-br from-indigo-800 via-slate-800 to-slate-950 text-white",
      aura: "bg-indigo-300/30",
      accent: "text-indigo-300",
      ring: "ring-indigo-400/40",
      label: "Clear night",
    };
  }
  return {
    band: "bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-400 text-amber-950",
    aura: "bg-yellow-200/60",
    accent: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-400/50",
    label: "Sunny",
  };
}

/** Caregiver-toned what-to-wear suggestions for a whole day. */
export function dayDressTips(opts: {
  highC: number;
  lowC: number;
  precipChance: number;
  condition: WeatherCondition;
  windMaxKph: number;
}): string[] {
  const tips: string[] = [];
  const { highC, lowC, precipChance, condition, windMaxKph } = opts;

  if (lowC <= -5) tips.push("Heavy coat, hat, gloves — bundle the whole crew");
  else if (lowC <= 4) tips.push("Warm coat and a hat for mornings");
  else if (lowC <= 10) tips.push("Layer up — a sweater plus a light jacket");
  else if (highC >= 30) tips.push("Light, breathable clothes and a sun hat");
  else if (highC >= 24) tips.push("Short sleeves; tuck a light layer in the bag");
  else if (highC >= 16) tips.push("A light layer is plenty");
  else tips.push("Cozy layers — easy to add or shed");

  if (precipChance >= 60) tips.push("Umbrella and waterproof shoes");
  else if (precipChance >= 30) tips.push("Slip an umbrella in the bag, just in case");

  if (condition === "snow") tips.push("Warm boots and slow steps outside");
  else if (condition === "thunderstorm") tips.push("Plan indoor errands where you can");
  else if (condition === "fog") tips.push("Headlights on if you're driving");
  else if (condition === "clear" && highC >= 22) tips.push("Sunscreen and a water bottle");

  if (windMaxKph >= 35) tips.push("It's breezy — secure hats and light items");

  return tips.slice(0, 4);
}

export function relativeFromNow(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (mins < 1) return "Just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return hrs === 1 ? "1 hr ago" : `${hrs} hr ago`;
}