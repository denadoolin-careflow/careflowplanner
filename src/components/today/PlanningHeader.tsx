import { PlanningHero } from "@/components/today/rhythm/PlanningHero";
import { Triptych } from "@/components/today/RhythmDashboard";
import { BurnoutCheckIn } from "@/components/today/BurnoutCheckIn";
import { DailyDebrief } from "@/components/today/DailyDebrief";
import { CollapsibleSection } from "@/components/today/CollapsibleSection";
import { useLocation } from "react-router-dom";

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
      <div className="space-y-3">
        <CollapsibleSection
          storageKey="planning.section.rhythm.collapsed"
          eyebrow="Rhythm"
          title="Moon · Energy · Cycle"
        >
          <Triptych date={date} />
        </CollapsibleSection>
        <CollapsibleSection
          storageKey="planning.section.capacity.collapsed"
          eyebrow="Capacity check-in"
          title="How's your capacity today?"
        >
          <BurnoutCheckIn date={date} />
        </CollapsibleSection>
        <CollapsibleSection
          storageKey="planning.section.debrief.collapsed"
          eyebrow="Daily debrief"
          title="Reflect and reset"
        >
          <DailyDebrief date={date} onTaskClick={onTaskClick} />
        </CollapsibleSection>
      </div>
      {slot}
    </div>
  );
}