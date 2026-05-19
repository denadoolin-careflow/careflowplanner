import { RhythmForecastCard } from "@/components/rhythm/RhythmForecastCard";
import { useRhythmForecastEnabled } from "@/lib/rhythm-forecast";

export function RhythmForecastWidget() {
  const [on] = useRhythmForecastEnabled();
  if (!on) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 p-4 text-xs text-muted-foreground">
        Rhythm Forecast is off. Enable it in Settings to see daily energy hints.
      </div>
    );
  }
  return <RhythmForecastCard variant="widget" />;
}
