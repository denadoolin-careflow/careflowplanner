import type { Appointment, Task } from "./types";
import { toast } from "sonner";
import { useEffect, useState } from "react";

/* ---------------- Reminder preferences ---------------- */

export interface ReminderPrefs {
  /** Fire reminders for scheduled tasks, not just appointments. */
  tasksEnabled: boolean;
  /** Default lead time (minutes) for scheduled tasks. */
  taskLeadMinutes: number;
  /** Also remind for tasks that only have a due date (no start time). */
  dueEnabled: boolean;
  /** Time of day a due-date-only task is announced ("HH:MM"). */
  dueTime: string;
  /** Default snooze length in minutes. */
  snoozeMinutes: number;
  /** Suppress alerts inside quiet hours (wraps midnight). */
  quietEnabled: boolean;
  quietStart: string;
  quietEnd: string;
}

export const DEFAULT_REMINDER_PREFS: ReminderPrefs = {
  tasksEnabled: true,
  taskLeadMinutes: 10,
  dueEnabled: true,
  dueTime: "09:00",
  snoozeMinutes: 15,
  quietEnabled: false,
  quietStart: "21:00",
  quietEnd: "07:00",
};

export const SNOOZE_CHOICES = [5, 15, 60] as const;

/** Per-task lead time stored as a namespaced tag, e.g. `remind:30`. */
export const REMIND_TAG = "remind:";
export function readReminderLead(tags?: string[]): number | null {
  const raw = tags?.find(t => t.startsWith(REMIND_TAG))?.slice(REMIND_TAG.length);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : null;
}
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

/* ---------------- Snooze + fired persistence ---------------- */

const SNOOZE_KEY = "careflow:planner:reminder-snooze:v1";
const FIRED_KEY = "careflow:planner:reminder-fired:v1";

type SnoozeMap = Record<string, number>; // reminder key -> epoch ms to fire at

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

let snoozes: SnoozeMap = readJSON<SnoozeMap>(SNOOZE_KEY, {});
for (const k of readJSON<string[]>(FIRED_KEY, [])) fired.add(k);

function persistSnoozes() {
  const now = Date.now();
  for (const [k, at] of Object.entries(snoozes)) if (at < now - 6 * 60 * 60_000) delete snoozes[k];
  try { window.localStorage.setItem(SNOOZE_KEY, JSON.stringify(snoozes)); } catch { /* noop */ }
}

function persistFired() {
  try { window.localStorage.setItem(FIRED_KEY, JSON.stringify([...fired].slice(-300))); } catch { /* noop */ }
}

/** Push a reminder out; the next schedule pass picks up the new time. */
export function snoozeReminder(id: string, minutes = reminderPrefs.snoozeMinutes) {
  snoozes[id] = Date.now() + Math.max(1, minutes) * 60_000;
  for (const key of [...fired]) if (key.startsWith(`${id}@`)) fired.delete(key);
  persistSnoozes();
  persistFired();
  rescheduleListeners.forEach(l => l());
}

export function clearReminder(id: string) {
  delete snoozes[id];
  persistSnoozes();
  rescheduleListeners.forEach(l => l());
}

const rescheduleListeners = new Set<() => void>();
export function onReminderReschedule(cb: () => void): () => void {
  rescheduleListeners.add(cb);
  return () => { rescheduleListeners.delete(cb); };
}

/* ---------------- Host handlers (complete / open) ---------------- */

export interface ReminderHandlers {
  onComplete?: (taskId: string) => void;
  onOpen?: (taskId: string) => void;
}
let handlers: ReminderHandlers = {};
export function setReminderHandlers(h: ReminderHandlers) { handlers = h; }

const hm = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (m || 0);
};

/** True when `at` falls inside the configured quiet window. */
export function inQuietHours(at = new Date()): boolean {
  if (!reminderPrefs.quietEnabled) return false;
  const mins = at.getHours() * 60 + at.getMinutes();
  const start = hm(reminderPrefs.quietStart);
  const end = hm(reminderPrefs.quietEnd);
  return start <= end ? mins >= start && mins < end : mins >= start || mins < end;
}
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

function notify(title: string, body: string, tag: string, task?: { id: string }) {
  if (inQuietHours()) {
    // Hold it until quiet hours end rather than dropping it entirely.
    if (task) snoozeReminder(task.id, 30);
    return;
  }
  toast(`⏰ ${title}`, {
    description: body,
    duration: 15000,
    ...(task
      ? {
          action: {
            label: `Snooze ${reminderPrefs.snoozeMinutes}m`,
            onClick: () => snoozeReminder(task.id),
          },
          cancel: {
            label: "Done",
            onClick: () => { clearReminder(task.id); handlers.onComplete?.(task.id); },
          },
        }
      : {}),
  });
  try {
    if (notifPermission === "granted") {
      const n = new Notification(title, { body, tag });
      if (task) n.onclick = () => { window.focus(); handlers.onOpen?.(task.id); };
    }
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
  for (const t of tasks) {
    if (t.done || !t.dueDate) continue;
    const timeOfDay = t.startTime ?? (reminderPrefs.dueEnabled ? reminderPrefs.dueTime : null);
    if (!timeOfDay) continue;
    const lead = Math.max(0, readReminderLead(t.tags) ?? reminderPrefs.taskLeadMinutes);
    const start = new Date(`${t.dueDate}T${timeOfDay.slice(0, 5)}:00`).getTime();
    if (isNaN(start)) continue;
    const snoozedTo = snoozes[t.id];
    const fireAt = snoozedTo && snoozedTo > now ? snoozedTo : start - lead * 60_000;
    const delta = fireAt - now;
    const key = `task-${t.id}@${fireAt}`;
    if (fired.has(key)) continue;
    if (delta < -60_000 || delta > HORIZON) continue;
    const timer = setTimeout(() => {
      fired.add(key);
      persistFired();
      const when = ` at ${timeOfDay.slice(0, 5)}`;
      const snoozedNow = snoozedTo && snoozedTo > now;
      const copy = snoozedNow
        ? `Snoozed reminder — due${when}`
        : lead === 0
          ? `Starting now${when}`
          : `Starts in ${lead >= 60 ? `${Math.round(lead / 60)}h` : `${lead}m`}${when}`;
      notify(t.startTime ? `Up next — ${t.title}` : `Due today — ${t.title}`, copy, `task-${t.id}`, { id: t.id });
    }, Math.max(0, delta));
    timers.set(`task-${t.id}`, timer);
  }
}