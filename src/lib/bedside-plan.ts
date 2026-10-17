import { format, parseISO } from "date-fns";
import { expandRecurrence } from "./recurrence";
import type { Task, Meal } from "./types";
import type { Medication } from "./medications";

export const localCareDate = (date = new Date()) => format(date, "yyyy-MM-dd");

export function mealsOnCareDate(meals: Meal[], date: string) {
  return meals.filter(meal => meal.recurrenceRule
    ? expandRecurrence(meal.date, meal.recurrenceRule, parseISO(date), parseISO(date)).includes(date)
    : meal.date === date);
}

export function parseDoseTimes(value: string): string[] {
  const values = value.split(",").map(time => time.trim());
  if (!values.length || values.some(time => !/^([01]?\d|2[0-3]):[0-5]\d$/.test(time))) return [];
  return [...new Set(values.map(time => time.padStart(5, "0")))].sort();
}

/** Only the duplicate reminders created by the earlier bedside implementation. */
export function legacyMedicineReminders(tasks: Task[], med: Medication, personName: string) {
  const title = `Give ${personName} ${med.name}${med.dose ? ` (${med.dose})` : ""}`;
  return tasks.filter(task => !task.done && task.recipientId === med.recipient_id &&
    task.title === title && task.recurrenceType === "daily" && med.times.includes(task.startTime ?? ""));
}