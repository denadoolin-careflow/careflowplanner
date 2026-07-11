import type { Appointment } from "@/lib/types";

/** Keywords that suggest an event is emotionally or physically demanding. */
const DEMANDING = [
  { rx: /therap|counsel/i, minutes: 30, label: "Therapy recovery" },
  { rx: /doctor|dentist|clinic|hospital|surgery|appt|appointment/i, minutes: 20, label: "Appointment recovery" },
  { rx: /drive|commute|road trip|flight|airport/i, minutes: 25, label: "Travel recovery" },
  { rx: /meeting|standup|1:1|review|presentation|interview/i, minutes: 15, label: "Meeting recovery" },
  { rx: /funeral|memorial|difficult|hard convo/i, minutes: 45, label: "Emotional recovery" },
];

export interface RecoverySuggestion {
  apptId: string;
  apptTitle: string;
  afterTime: string;      // HH:MM (24h)
  recoveryMinutes: number;
  label: string;
  reason: string;
}

export function suggestRecovery(appointments: Appointment[]): RecoverySuggestion[] {
  const out: RecoverySuggestion[] = [];
  for (const a of appointments) {
    const hit = DEMANDING.find((d) => d.rx.test(a.title || "") || (a.type && d.rx.test(a.type)));
    if (!hit) continue;
    const end = a.endTime ?? a.time;
    if (!end) continue;
    out.push({
      apptId: a.id,
      apptTitle: a.title,
      afterTime: end.slice(0, 5),
      recoveryMinutes: hit.minutes,
      label: hit.label,
      reason: `After "${a.title}", protect ${hit.minutes}m to reset.`,
    });
  }
  return out;
}