import { useEffect, useState } from "react";
import type { Appointment } from "@/lib/types";

export type EventTypeKey = "appointment" | "family" | "reminder";

export const EVENT_TYPES: { key: EventTypeKey; label: string; emoji: string }[] = [
  { key: "appointment", label: "Appointment", emoji: "🩺" },
  { key: "family", label: "Family activity", emoji: "👨‍👩‍👧" },
  { key: "reminder", label: "Reminder", emoji: "🔔" },
];

export const DEFAULT_EVENT_TYPE_HEX: Record<EventTypeKey, string> = {
  appointment: "#0ea5e9",
  family: "#f97316",
  reminder: "#a855f7",
};

/** Appointment.type values are reused so no schema change is needed. */
export function eventTypeOf(a?: Pick<Appointment, "type"> | null): EventTypeKey {
  if (a?.type === "family") return "family";
  if (a?.type === "personal") return "reminder";
  return "appointment";
}
export function apptTypeFor(k: EventTypeKey): Appointment["type"] {
  return k === "family" ? "family" : k === "reminder" ? "personal" : "other";
}

const KEY = "careflow:calendar:event-type-colors:v1";
const EVT = "careflow:event-type-colors-changed";

function read(): Partial<Record<EventTypeKey, string>> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { return {}; }
}

export function useEventTypeColors() {
  const [overrides, setOverrides] = useState(read);
  useEffect(() => {
    const r = () => setOverrides(read());
    window.addEventListener(EVT, r); window.addEventListener("storage", r);
    return () => { window.removeEventListener(EVT, r); window.removeEventListener("storage", r); };
  }, []);
  const colorOf = (k: EventTypeKey) => overrides[k] ?? DEFAULT_EVENT_TYPE_HEX[k];
  const write = (next: Partial<Record<EventTypeKey, string>>) => {
    localStorage.setItem(KEY, JSON.stringify(next));
    setOverrides(next);
    window.dispatchEvent(new CustomEvent(EVT));
  };
  const setColor = (k: EventTypeKey, hex: string) => write({ ...overrides, [k]: hex });
  const reset = () => write({});
  return { overrides, colorOf, setColor, reset };
}
