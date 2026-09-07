import { usHolidaysFor, type USHoliday } from "@/lib/us-holidays";

export type HolidaySize = "big" | "medium" | "small";

const SIZE: Record<string, HolidaySize> = {
  "Christmas Day": "big",
  "Christmas Eve": "big",
  "Thanksgiving": "big",
  "Halloween": "big",
  "Easter": "big",
  "New Year's Eve": "medium",
  "New Year's Day": "medium",
  "Valentine's Day": "medium",
  "Mother's Day": "medium",
  "Father's Day": "medium",
  "Independence Day": "medium",
};

/** How far ahead prep should start, by size. */
export const LEAD_DAYS: Record<HolidaySize, number> = { big: 60, medium: 30, small: 10 };

const CHECKLISTS: Record<HolidaySize, Array<{ daysBefore: number; title: string }>> = {
  big: [
    { daysBefore: 60, title: "Set the budget" },
    { daysBefore: 45, title: "Decide who's hosting / where you'll be" },
    { daysBefore: 30, title: "Make the gift list" },
    { daysBefore: 21, title: "Order anything that ships" },
    { daysBefore: 14, title: "Plan the menu" },
    { daysBefore: 7, title: "Grocery order + wrapping" },
    { daysBefore: 2, title: "Prep ahead and rest" },
  ],
  medium: [
    { daysBefore: 30, title: "Decide what you actually want to do" },
    { daysBefore: 14, title: "Buy cards, gifts or supplies" },
    { daysBefore: 7, title: "Plan the food" },
    { daysBefore: 1, title: "Final touches" },
  ],
  small: [
    { daysBefore: 10, title: "Decide if you're marking it" },
    { daysBefore: 3, title: "Grab anything you need" },
  ],
};

export interface RunwayHoliday extends USHoliday {
  size: HolidaySize;
  daysUntil: number;
  startsIn: number;      // days until prep should start (<=0 means start now)
  inRunway: boolean;
  checklist: Array<{ daysBefore: number; title: string }>;
}

export function holidaySize(name: string): HolidaySize {
  return SIZE[name] ?? "small";
}

export function checklistFor(name: string) {
  return CHECKLISTS[holidaySize(name)];
}

/** Upcoming holidays with their prep runway, ordered by date. */
export function holidayRunway(from: Date = new Date(), horizonDays = 120): RunwayHoliday[] {
  const t0 = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const pool = [...usHolidaysFor(t0.getFullYear()), ...usHolidaysFor(t0.getFullYear() + 1)];
  return pool
    .map(h => {
      const size = holidaySize(h.name);
      const target = new Date(`${h.date}T00:00:00`);
      const daysUntil = Math.round((target.getTime() - t0.getTime()) / 86400000);
      const startsIn = daysUntil - LEAD_DAYS[size];
      return { ...h, size, daysUntil, startsIn, inRunway: daysUntil >= 0 && startsIn <= 0, checklist: CHECKLISTS[size] };
    })
    .filter(h => h.daysUntil >= 0 && h.daysUntil <= horizonDays)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

/** Holidays that fall inside a given month. */
export function holidaysInMonth(cursor: Date): USHoliday[] {
  const prefix = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
  return usHolidaysFor(cursor.getFullYear()).filter(h => h.date.startsWith(prefix));
}
