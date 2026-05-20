import { useCallback, useState } from "react";
import type { WeatherSnapshot } from "@/lib/weather";
import { getRhythmForecast } from "@/lib/rhythm-forecast";
import { PlanWithEnergyDialog } from "@/components/rhythm/PlanWithEnergyDialog";
import { WeatherHeroCard } from "./WeatherHeroCard";
import { ClothingStrip } from "./ClothingStrip";
import { RhythmGuidanceCard } from "./RhythmGuidanceCard";
import { AIDailyGuidance } from "./AIDailyGuidance";

export function TodayEnergy({ date }: { date: Date }) {
  const [snap, setSnap] = useState<WeatherSnapshot | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const handleSnap = useCallback((s: WeatherSnapshot | null) => setSnap(s), []);
  const forecast = getRhythmForecast(date);
  return (
    <section aria-label="Today's energy" className="space-y-4">
      <WeatherHeroCard onSnapshot={handleSnap} />
      <ClothingStrip snap={snap} />
      <RhythmGuidanceCard date={date} />
      <AIDailyGuidance date={date} snap={snap} onPlanWithEnergy={() => setPlanOpen(true)} />
      <PlanWithEnergyDialog open={planOpen} onOpenChange={setPlanOpen} date={date} forecast={forecast} />
    </section>
  );
}