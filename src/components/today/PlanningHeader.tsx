import { PlanningHero } from "@/components/today/rhythm/PlanningHero";
import { Triptych } from "@/components/today/RhythmDashboard";
import { SlotWeatherStrip } from "@/components/today/SlotWeatherStrip";
import { BurnoutCheckIn } from "@/components/today/BurnoutCheckIn";
import { DailyDebrief } from "@/components/today/DailyDebrief";

/**
 * Shared planning header for Today, Week, and Month.
 * Carries greeting + date + clock + weather, the Moon · Energy · Cycle
 * triptych, a morning/afternoon/evening weather strip, a burnout
 * check-in, the daily debrief, and an optional `slot` that pages use
 * for view toggles and the Quick Add bar.
 */
export function PlanningHeader({
  date,
  title,
  subtitle,
  slot,
  onTaskClick,
  hideHero,
}: {
  date: Date;
  title?: string;
  subtitle?: string;
  slot?: React.ReactNode;
  onTaskClick?: (id: string) => void;
  /** Today renders its own larger hero — let it skip the compact hero. */
  hideHero?: boolean;
}) {
  return (
    <div className="space-y-6">
      {!hideHero && <PlanningHero date={date} title={title} subtitle={subtitle} />}
      <Triptych date={date} />
      <SlotWeatherStrip />
      <BurnoutCheckIn date={date} />
      <DailyDebrief date={date} onTaskClick={onTaskClick} />
      {slot}
    </div>
  );
}