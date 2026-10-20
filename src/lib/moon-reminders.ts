import { format } from "date-fns";
import { getMoonPhase, MOON_INFO, type MoonPhase } from "@/lib/moon";
import { monthRhythmMoments } from "@/lib/cosmic/lunar-rhythm";

const ENABLED_KEY = "moonJournalReminders.enabled";
const NEW_MOON_KEY = "careflow:new-moon-reminders:enabled";

export function getNewMoonRemindersEnabled(): boolean {
  try { return window.localStorage.getItem(NEW_MOON_KEY) !== "0"; } catch { return true; }
}

export function setNewMoonRemindersEnabled(value: boolean) {
  window.localStorage.setItem(NEW_MOON_KEY, value ? "1" : "0");
  window.dispatchEvent(new Event("moon-reminders-changed"));
}

export function newMoonReminderFor(date: Date) {
  const moment = monthRhythmMoments(date).find(item => item.phase === "plan" && format(item.date, "yyyy-MM-dd") === format(date, "yyyy-MM-dd"));
  return moment ? { date: moment.date, planner: `/planner/${format(moment.date, "yyyy-MM-dd")}?range=month` } : null;
}
const DISMISSED_KEY = "moonJournalReminders.dismissed"; // JSON: { [yyyy-mm-dd]: true }

export const MOON_TEMPLATE_FOR_PHASE: Partial<Record<MoonPhase, string>> = {
  "new": "new-moon",
  "first-quarter": "first-quarter-moon",
  "full": "full-moon",
  "last-quarter": "last-quarter-moon",
};

export function getMoonRemindersEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ENABLED_KEY) === "1";
}

export function setMoonRemindersEnabled(v: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ENABLED_KEY, v ? "1" : "0");
  window.dispatchEvent(new Event("moon-reminders-changed"));
}

function readDismissed(): Record<string, boolean> {
  try { return JSON.parse(window.localStorage.getItem(DISMISSED_KEY) || "{}"); }
  catch { return {}; }
}

export function isReminderDismissed(date = new Date()): boolean {
  if (typeof window === "undefined") return true;
  return !!readDismissed()[format(date, "yyyy-MM-dd")];
}

export function dismissReminder(date = new Date()) {
  if (typeof window === "undefined") return;
  const d = readDismissed();
  d[format(date, "yyyy-MM-dd")] = true;
  window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(d));
  window.dispatchEvent(new Event("moon-reminders-changed"));
}

export interface MoonReminder {
  phase: MoonPhase;
  label: string;
  glyph: string;
  invitation: string;
  template: string;
}

export function getMoonReminderFor(date = new Date()): MoonReminder | null {
  const phase = getMoonPhase(date);
  const template = MOON_TEMPLATE_FOR_PHASE[phase];
  if (!template) return null;
  const info = MOON_INFO[phase];
  return { phase, label: info.label, glyph: info.glyph, invitation: info.invitation, template };
}
