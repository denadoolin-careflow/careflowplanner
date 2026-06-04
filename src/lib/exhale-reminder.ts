import { format } from "date-fns";
import { useEffect, useState } from "react";

const ENABLED_KEY = "exhaleReminder.enabled";
const TIME_KEY = "exhaleReminder.time"; // "HH:mm"
const LAST_FIRED_KEY = "exhaleReminder.lastFired"; // yyyy-MM-dd
const CHANGE_EVT = "exhale-reminder-changed";

export const DEFAULT_EXHALE_TIME = "20:00";

export function getExhaleEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const v = window.localStorage.getItem(ENABLED_KEY);
  return v === null ? true : v === "1";
}

export function setExhaleEnabled(v: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ENABLED_KEY, v ? "1" : "0");
  window.dispatchEvent(new Event(CHANGE_EVT));
}

export function getExhaleTime(): string {
  if (typeof window === "undefined") return DEFAULT_EXHALE_TIME;
  return window.localStorage.getItem(TIME_KEY) || DEFAULT_EXHALE_TIME;
}

export function setExhaleTime(t: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TIME_KEY, t);
  window.dispatchEvent(new Event(CHANGE_EVT));
}

export function getExhaleLastFired(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LAST_FIRED_KEY);
}

export function markExhaleFired(date = new Date()) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_FIRED_KEY, format(date, "yyyy-MM-dd"));
  window.dispatchEvent(new Event(CHANGE_EVT));
}

export function onExhaleReminderChange(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVT, cb);
  return () => window.removeEventListener(CHANGE_EVT, cb);
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "default") {
    try { return await Notification.requestPermission(); } catch { return "denied"; }
  }
  return Notification.permission;
}

export function useExhaleReminderPrefs() {
  const [enabled, setEnabledState] = useState(getExhaleEnabled);
  const [time, setTimeState] = useState(getExhaleTime);
  useEffect(() => onExhaleReminderChange(() => {
    setEnabledState(getExhaleEnabled());
    setTimeState(getExhaleTime());
  }), []);
  return {
    enabled,
    time,
    setEnabled: setExhaleEnabled,
    setTime: setExhaleTime,
  };
}

/** Parse "HH:mm" → minutes since midnight. */
export function parseHHMM(s: string): number {
  const [h, m] = s.split(":").map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return 20 * 60;
  return h * 60 + m;
}