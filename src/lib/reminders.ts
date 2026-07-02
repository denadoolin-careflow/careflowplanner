import type { Appointment } from "./types";
import { toast } from "sonner";

/**
 * Lightweight in-browser reminder scheduler. Watches the appointments state
 * and fires a toast + Notification `reminderMinutesBefore` before each event
 * (up to 24h horizon so we don't hold thousands of timers).
 */
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const fired = new Set<string>();
let notifPermission: NotificationPermission | "unsupported" = "default";

export function initReminders() {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) { notifPermission = "unsupported"; return; }
  notifPermission = Notification.permission;
  if (notifPermission === "default") {
    // Ask once — non-blocking; failure is fine, we still toast.
    Notification.requestPermission().then(p => { notifPermission = p; }).catch(() => {});
  }
}

export function scheduleReminders(appts: Appointment[]) {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const HORIZON = 24 * 60 * 60 * 1000; // 24h

  // Clear stale timers
  for (const [id, t] of timers) { clearTimeout(t); timers.delete(id); }

  for (const a of appts) {
    if (!a.reminderMinutesBefore || !a.time) continue;
    const start = new Date(`${a.date}T${a.time.slice(0,5)}:00`).getTime();
    if (isNaN(start)) continue;
    const fireAt = start - a.reminderMinutesBefore * 60_000;
    const delta = fireAt - now;
    const key = `${a.id}@${fireAt}`;
    if (fired.has(key)) continue;
    if (delta < -60_000) continue;      // too far in the past
    if (delta > HORIZON) continue;      // beyond horizon; will be rescheduled later
    const delay = Math.max(0, delta);
    const t = setTimeout(() => {
      fired.add(key);
      const when = a.time ? ` at ${a.time.slice(0,5)}` : "";
      const minsCopy = a.reminderMinutesBefore! >= 60
        ? `${Math.round(a.reminderMinutesBefore!/60)}h`
        : `${a.reminderMinutesBefore}m`;
      toast(`⏰ Reminder — ${a.title}`, { description: `Starts in ${minsCopy}${when}` });
      try {
        if (notifPermission === "granted") {
          new Notification(a.title, { body: `Starts in ${minsCopy}${when}`, tag: a.id });
        }
      } catch { /* ignore */ }
    }, delay);
    timers.set(a.id, t);
  }
}