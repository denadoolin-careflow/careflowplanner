/**
 * Wellness lane on the planner day grid — the dose times you entered, your
 * movement plan slot, and a symptom check-in marker. Tapping a chip opens
 * WellFlow. Nothing here changes a medication dose.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Footprints, HeartPulse, Pill } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMedications, doseSlots, useMedicationLogs } from "@/lib/medications";
import { useWellflowReminders } from "@/lib/wellflow/reminders";

interface Chip {
  key: string;
  atMin: number;
  label: string;
  icon: typeof Pill;
  done: boolean;
  to: string;
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

export function PlannerWellnessLane({
  iso, topFor,
}: { iso: string; topFor: (absMin: number) => number | null }) {
  const navigate = useNavigate();
  const { medications } = useMedications();
  const { statusOf } = useMedicationLogs(iso);
  const { settings } = useWellflowReminders();

  const weekday = useMemo(() => new Date(`${iso}T12:00:00`).getDay(), [iso]);

  const chips = useMemo<Chip[]>(() => {
    const out: Chip[] = doseSlots(medications).map(s => ({
      key: `dose-${s.med.id}-${s.time}`,
      atMin: s.minutes,
      label: s.med.name,
      icon: Pill,
      done: statusOf(s.med.id, s.time) === "taken",
      to: "/wellflow",
    }));

    if (settings.movement_enabled && settings.movement_days.includes(weekday)) {
      out.push({
        key: "movement",
        atMin: toMin(settings.movement_time),
        label: "Movement",
        icon: Footprints,
        done: false,
        to: "/wellflow/plan",
      });
    }

    if (settings.symptom_enabled) {
      out.push({
        key: "symptom",
        atMin: toMin(settings.symptom_time),
        label: "Check-in",
        icon: HeartPulse,
        done: false,
        to: "/wellflow/insights",
      });
    }

    return out.sort((a, b) => a.atMin - b.atMin);
  }, [medications, statusOf, settings, weekday]);

  return (
    <>
      {chips.map(c => {
        const top = topFor(c.atMin);
        if (top === null) return null;
        const Icon = c.icon;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => navigate(c.to)}
            style={{ top: top + 2 }}
            aria-label={`${c.label} at ${Math.floor(c.atMin / 60)}:${String(c.atMin % 60).padStart(2, "0")}. Open WellFlow`}
            className={cn(
              "absolute left-1 z-10 flex max-w-[42%] items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] shadow-sm backdrop-blur",
              c.done
                ? "border-primary/50 bg-primary/15 text-foreground line-through"
                : "border-border/70 bg-card/70 text-muted-foreground",
            )}
          >
            <Icon className="h-3 w-3 shrink-0" />
            <span className="truncate">{c.label}</span>
          </button>
        );
      })}
    </>
  );
}
