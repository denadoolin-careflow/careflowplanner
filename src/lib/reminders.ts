import type { Appointment, Task } from "./types";
import { toast } from "sonner";
import { useEffect, useState } from "react";

/* ---------------- Reminder preferences ---------------- */

export interface ReminderPrefs {
  /** Fire reminders for scheduled tasks, not just appointments. */
  tasksEnabled: boolean;
  /** Default lead time (minutes) for scheduled tasks. */
  taskLeadMinutes: number;
}

export const DEFAULT_REMINDER_PREFS: ReminderPrefs = { tasksEnabled: true, taskLeadMinutes: 10 };
const PREFS_KEY = "careflow:planner:reminder-prefs:v1";
const prefsListeners = new Set<(p: ReminderPrefs) => void>();

function readPrefs(): ReminderPrefs {
  if (typeof window === "undefined") return DEFAULT_REMINDER_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_REMINDER_PREFS, ...(JSON.parse(raw) as Partial<ReminderPrefs>) } : DEFAULT_REMINDER_PREFS;
  } catch { return DEFAULT_REMINDER_PREFS; }
}

let reminderPrefs: ReminderPrefs = readPrefs();

export function setReminderPrefs(patch: Partial<ReminderPrefs>) {
  reminderPrefs = { ...reminderPrefs, ...patch };
  try { window.localStorage.setItem(PREFS_KEY, JSON.stringify(reminderPrefs)); } catch { /* noop */ }
  prefsListeners.forEach(l => l(reminderPrefs));
}

export function useReminderPrefs(): [ReminderPrefs, (p: Partial<ReminderPrefs>) => void] {
  const [p, setP] = useState<ReminderPrefs>(reminderPrefs);
  useEffect(() => {
    prefsListeners.add(setP);
    return () => { prefsListeners.delete(setP); };
  }, []);
  return [p, setReminderPrefs];
}

/** Ask for notification permission on an explicit user action. */
export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission !== "default") { notifPermission = Notification.permission; return Notification.permission; }
  try {
    const p = await Notification.requestPermission();
    notifPermission = p;
    return p;
  } catch { return "denied"; }
}

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

function notify(title: string, body: string, tag: string) {
  toast(`⏰ ${title}`, { description: body });
  try {
    if (notifPermission === "granted") new Notification(title, { body, tag });
  } catch { /* ignore */ }
}

export function scheduleReminders(appts: Appointment[], tasks: Task[] = []) {
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
      notify(`Reminder — ${a.title}`, `Starts in ${minsCopy}${when}`, a.id);
    }, delay);
    timers.set(a.id, t);
  }

  // Scheduled tasks (planner blocks) get the same treatment.
  if (!reminderPrefs.tasksEnabled) return;
  const lead = Math.max(0, reminderPrefs.taskLeadMinutes);
  for (const t of tasks) {
    if (t.done || !t.dueDate || !t.startTime) continue;
    const start = new Date(`${t.dueDate}T${t.startTime.slice(0, 5)}:00`).getTime();
    if (isNaN(start)) continue;
    const fireAt = start - lead * 60_000;
    const delta = fireAt - now;
    const key = `task-${t.id}@${fireAt}`;
    if (fired.has(key)) continue;
    if (delta < -60_000 || delta > HORIZON) continue;
    const timer = setTimeout(() => {
      fired.add(key);
      const when = ` at ${t.startTime!.slice(0, 5)}`;
      const copy = lead === 0 ? `Starting now${when}` : `Starts in ${lead >= 60 ? `${Math.round(lead / 60)}h` : `${lead}m`}${when}`;
      notify(`Up next — ${t.title}`, copy, `task-${t.id}`);
    }, Math.max(0, delta));
    timers.set(`task-${t.id}`, timer);
  }
}