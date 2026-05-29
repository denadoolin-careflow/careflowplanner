import { addDays, format } from "date-fns";
import type { PersonCheckin } from "@/lib/checkins";
import type { CareRecipient } from "@/lib/types";
import type { Appointment } from "@/lib/types";
import { DEFAULT_CYCLE_SETTINGS, phaseForDate, type PeriodLog, type CycleSettings } from "@/lib/cycle";

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** Build PeriodLog[]/CycleSettings from a recipient's intake cycle block. */
function recipientCycleContext(r: CareRecipient): { periods: PeriodLog[]; settings: CycleSettings } {
  const c = r.cycle ?? {};
  if (!c.tracks || !c.lastPeriodStart) {
    return { periods: [], settings: { ...DEFAULT_CYCLE_SETTINGS, enabled: false } };
  }
  const settings: CycleSettings = {
    ...DEFAULT_CYCLE_SETTINGS,
    enabled: true,
    avgCycleLength: c.avgLength ?? 28,
    avgPeriodLength: c.periodLength ?? 5,
  };
  // Synthesize a single anchor period so phaseForDate has something to work with.
  const periods: PeriodLog[] = [{
    id: `recip-${r.id}-anchor`,
    periodStart: c.lastPeriodStart,
    periodEnd: null,
  }];
  return { periods, settings };
}

/**
 * Project upcoming occurrences for one check-in over the next `horizonDays`.
 * Returns ISO date strings (yyyy-MM-dd).
 */
export function projectCheckinDates(
  checkin: PersonCheckin,
  recipient: CareRecipient | undefined,
  from: Date,
  horizonDays: number,
): string[] {
  if (!checkin.active) return [];
  const out: string[] = [];
  const today = new Date(from);
  today.setHours(0, 0, 0, 0);

  // Always include the explicit next_due_at if it's in range.
  if (checkin.next_due_at) {
    const due = new Date(checkin.next_due_at);
    if (due >= today && due <= addDays(today, horizonDays)) {
      out.push(format(due, "yyyy-MM-dd"));
    }
  }

  if (checkin.cadence === "daily") {
    for (let i = 0; i < horizonDays; i++) {
      out.push(format(addDays(today, i), "yyyy-MM-dd"));
    }
  } else if (checkin.cadence === "weekly") {
    const wd = checkin.cadence_config.weekday ?? today.getDay();
    for (let i = 0; i < horizonDays; i++) {
      const d = addDays(today, i);
      if (d.getDay() === wd) out.push(format(d, "yyyy-MM-dd"));
    }
  } else if (checkin.cadence === "custom_days") {
    const days = (checkin.cadence_config.days ?? [])
      .map(d => WEEKDAYS.indexOf(d.toLowerCase()))
      .filter(n => n >= 0);
    if (days.length) {
      for (let i = 0; i < horizonDays; i++) {
        const d = addDays(today, i);
        if (days.includes(d.getDay())) out.push(format(d, "yyyy-MM-dd"));
      }
    }
  } else if (checkin.cadence === "cycle_phase") {
    const wantPhase = checkin.cadence_config.phase;
    if (wantPhase && recipient) {
      const { periods, settings } = recipientCycleContext(recipient);
      if (settings.enabled && periods.length) {
        for (let i = 0; i < horizonDays; i++) {
          const d = addDays(today, i);
          if (phaseForDate(d, periods, settings) === wantPhase) {
            out.push(format(d, "yyyy-MM-dd"));
          }
        }
      }
    }
  }

  return [...new Set(out)].sort();
}

/**
 * Turn projected check-in occurrences into Appointment-shaped synthetic events
 * that calendar views can render alongside real appointments.
 */
export function buildCheckinAppointments(
  checkins: PersonCheckin[],
  recipients: CareRecipient[],
  from: Date,
  horizonDays: number,
): Appointment[] {
  const byId = new Map(recipients.map(r => [r.id, r] as const));
  const events: Appointment[] = [];
  for (const c of checkins) {
    if (!c.active) continue;
    const recipient = byId.get(c.recipient_id);
    const dates = projectCheckinDates(c, recipient, from, horizonDays);
    for (const date of dates) {
      events.push({
        id: `checkin:${c.id}:${date}`,
        date,
        time: "09:00",
        allDay: false,
        title: `Check-in · ${c.title}`,
        notes: c.prompt ?? undefined,
        with: recipient?.name,
        recipientId: c.recipient_id,
        type: "personal",
        color: "#a78bfa", // calm violet to distinguish from regular appts
        icon: "heart-pulse",
      });
    }
  }
  return events;
}