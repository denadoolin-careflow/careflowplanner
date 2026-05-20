import {
  Umbrella, Shirt, CloudSnow, Wind, Sun, Glasses, Footprints, Thermometer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getClothingAdvice, type ClothingIcon } from "@/lib/clothing-advice";
import { useWeatherPrefs } from "@/lib/weather-prefs";
import type { WeatherSnapshot } from "@/lib/weather";

const ICON_MAP: Record<ClothingIcon, typeof Umbrella> = {
  Umbrella, Shirt, CloudSnow, Wind, Sun, Glasses, Footprints, Thermometer,
};

const TONE: Record<"calm" | "warn" | "info", string> = {
  calm: "bg-secondary-soft/70 text-secondary-foreground ring-1 ring-secondary/30",
  warn: "bg-accent-soft/70 text-accent-foreground ring-1 ring-accent/30",
  info: "bg-primary-soft/60 text-foreground ring-1 ring-primary/20",
};

export function ClothingStrip({ snap }: { snap: WeatherSnapshot | null }) {
  const [prefs] = useWeatherPrefs();
  if (!snap) return null;
  const tips = getClothingAdvice(snap, prefs);
  if (tips.length === 0) return null;

  return (
    <section aria-label="What to wear" className="cozy-card p-4">
      <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <Shirt className="h-3 w-3" /> What to wear
      </div>
      <ul className="flex flex-wrap gap-2">
        {tips.map((tip, i) => {
          const Icon = ICON_MAP[tip.icon];
          return (
            <li
              key={tip.label}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] transition-all",
                "animate-in fade-in slide-in-from-bottom-1",
                TONE[tip.tone],
              )}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <Icon className="h-3.5 w-3.5" />
              {tip.label}
            </li>
          );
        })}
      </ul>
    </section>
  );
}