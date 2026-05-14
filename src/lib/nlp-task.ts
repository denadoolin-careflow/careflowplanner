import { addDays, format, nextDay, parse, startOfDay } from "date-fns";
import type { Day } from "date-fns";
import type { Area, Priority, RecurrenceType } from "./types";
import { AREAS } from "./types";

export interface ParsedTask {
  title: string;
  dueDate?: string;
  time?: string;
  priority?: Priority;
  area?: Area;
  tags?: string[];
  estMinutes?: number;
  recurrenceType?: RecurrenceType;
  recurrenceInterval?: number;
  recurrenceDays?: number[];
  reminderMinutes?: number;
  projectName?: string;
  someday?: boolean;
  chips: { label: string; kind: "date" | "time" | "priority" | "area" | "tag" | "duration" | "recur" | "remind" | "project" | "someday" }[];
}

const WEEKDAYS: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

const AREA_LOOKUP: Record<string, Area> = AREAS.reduce((acc, a) => {
  acc[a.toLowerCase()] = a;
  return acc;
}, {} as Record<string, Area>);
const AREA_ALIASES: Record<string, Area> = {
  home: "Home",
  family: "Family",
  kids: "Kids",
  care: "Caregiving",
  caregiving: "Caregiving",
  meals: "Meals",
  food: "Meals",
  appt: "Appointments",
  appointments: "Appointments",
  personal: "Personal",
  creative: "Creative Projects",
  money: "Money",
  finance: "Money",
  bday: "Holidays & Birthdays",
  holiday: "Holidays & Birthdays",
};

function isoFromDate(d: Date) {
  return format(startOfDay(d), "yyyy-MM-dd");
}

function consume(text: string, regex: RegExp, onMatch: (m: RegExpMatchArray) => void): string {
  return text.replace(regex, (...args) => {
    const groups = args.slice(0, args.length - 2) as string[];
    onMatch(groups as unknown as RegExpMatchArray);
    return " ";
  });
}

/**
 * Parse a natural language quick-add string into a structured task.
 * Examples:
 *   "Doctor appointment tomorrow at 3pm #health p2 for 30m"
 *   "Laundry every sunday evening @home"
 */
export function parseTaskInput(raw: string): ParsedTask {
  let text = ` ${raw} `;
  const out: ParsedTask = { title: raw.trim(), chips: [] };

  // Tags
  text = consume(text, /\s#([a-z0-9_-]+)/gi, (m) => {
    out.tags = [...(out.tags ?? []), m[1]];
    out.chips.push({ kind: "tag", label: `#${m[1]}` });
  });

  // Project: +ProjectName  (allows hyphen/underscore/space-with-quotes)
  text = consume(text, /\s\+("([^"]+)"|([\w-]+(?:\s[\w-]+)?))/g, (m) => {
    const name = (m[2] ?? m[3] ?? "").trim();
    if (name) {
      out.projectName = name;
      out.chips.push({ kind: "project", label: `+${name}` });
    }
  });

  // Someday token: ~someday
  text = consume(text, /\s~someday\b/gi, () => {
    out.someday = true;
    out.chips.push({ kind: "someday", label: "someday" });
  });

  // Area
  text = consume(text, /\s@([a-z][a-z &-]*)/gi, (m) => {
    const key = m[1].trim().toLowerCase();
    const area = AREA_LOOKUP[key] || AREA_ALIASES[key.split(/\s+/)[0]];
    if (area) {
      out.area = area;
      out.chips.push({ kind: "area", label: area });
    }
  });

  // Priority
  text = consume(text, /\sp([1-4])\b/gi, (m) => {
    const n = Number(m[1]);
    const p: Priority = n <= 2 ? "high" : n === 3 ? "medium" : "low";
    out.priority = p;
    out.chips.push({ kind: "priority", label: `P${n}` });
  });

  // Duration
  text = consume(text, /\sfor\s+(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?/gi, (m) => {
    const h = Number(m[1] || 0);
    const min = Number(m[2] || 0);
    const total = h * 60 + min;
    if (total > 0) {
      out.estMinutes = total;
      out.chips.push({ kind: "duration", label: `${total}m` });
    }
  });

  // Reminder
  text = consume(text, /\s!(\d+)\s*(h|m)\b/gi, (m) => {
    const n = Number(m[1]);
    const mins = m[2] === "h" ? n * 60 : n;
    out.reminderMinutes = mins;
    out.chips.push({ kind: "remind", label: `remind ${m[1]}${m[2]}` });
  });

  // Recurrence
  text = consume(text, /\severy\s+(day|weekday|weekend|week|month|year|mon|monday|tue|tuesday|wed|wednesday|thu|thursday|fri|friday|sat|saturday|sun|sunday|\d+\s+(?:day|week|month)s?)/gi, (m) => {
    const v = m[1].toLowerCase();
    if (v === "day") { out.recurrenceType = "daily"; out.recurrenceInterval = 1; out.chips.push({ kind: "recur", label: "every day" }); }
    else if (v === "weekday") { out.recurrenceType = "weekly"; out.recurrenceDays = [1,2,3,4,5]; out.chips.push({ kind: "recur", label: "weekdays" }); }
    else if (v === "weekend") { out.recurrenceType = "weekly"; out.recurrenceDays = [0,6]; out.chips.push({ kind: "recur", label: "weekends" }); }
    else if (v === "week") { out.recurrenceType = "weekly"; out.recurrenceInterval = 1; out.chips.push({ kind: "recur", label: "weekly" }); }
    else if (v === "month") { out.recurrenceType = "monthly"; out.recurrenceInterval = 1; out.chips.push({ kind: "recur", label: "monthly" }); }
    else if (v === "year") { out.recurrenceType = "custom"; out.recurrenceInterval = 365; out.chips.push({ kind: "recur", label: "yearly" }); }
    else if (WEEKDAYS[v] !== undefined) {
      out.recurrenceType = "weekly"; out.recurrenceDays = [WEEKDAYS[v]];
      out.chips.push({ kind: "recur", label: `every ${v}` });
    } else {
      const mm = v.match(/^(\d+)\s+(day|week|month)s?$/);
      if (mm) {
        const n = Number(mm[1]);
        out.recurrenceType = mm[2] === "day" ? "daily" : mm[2] === "week" ? "weekly" : "monthly";
        out.recurrenceInterval = n;
        out.chips.push({ kind: "recur", label: `every ${n} ${mm[2]}s` });
      }
    }
  });

  // Date keywords
  const today = startOfDay(new Date());
  let dateMatched = false;
  text = consume(text, /\b(today|tonight|tomorrow|tmrw)\b/gi, (m) => {
    const v = m[1].toLowerCase();
    const d = v === "tomorrow" || v === "tmrw" ? addDays(today, 1) : today;
    out.dueDate = isoFromDate(d);
    out.chips.push({ kind: "date", label: v });
    dateMatched = true;
    if (v === "tonight" && !out.time) {
      out.time = "20:00";
      out.chips.push({ kind: "time", label: "8:00 PM" });
    }
  });

  if (!dateMatched) {
    text = consume(text, /\bnext\s+(mon|monday|tue|tuesday|wed|wednesday|thu|thursday|fri|friday|sat|saturday|sun|sunday|week|month)\b/gi, (m) => {
      const v = m[1].toLowerCase();
      if (v === "week") { out.dueDate = isoFromDate(addDays(today, 7)); out.chips.push({ kind: "date", label: "next week" }); dateMatched = true; return; }
      if (v === "month") { out.dueDate = isoFromDate(addDays(today, 30)); out.chips.push({ kind: "date", label: "next month" }); dateMatched = true; return; }
      const wd = WEEKDAYS[v];
      if (wd !== undefined) {
        const d = nextDay(today, wd as Day);
        out.dueDate = isoFromDate(addDays(d, 7));
        out.chips.push({ kind: "date", label: `next ${v}` });
        dateMatched = true;
      }
    });
  }

  if (!dateMatched) {
    text = consume(text, /\bin\s+(\d+)\s+(day|week|month)s?\b/gi, (m) => {
      const n = Number(m[1]);
      const days = m[2] === "day" ? n : m[2] === "week" ? n * 7 : n * 30;
      out.dueDate = isoFromDate(addDays(today, days));
      out.chips.push({ kind: "date", label: `in ${n} ${m[2]}s` });
      dateMatched = true;
    });
  }

  if (!dateMatched) {
    text = consume(text, /\b(?:on\s+)?(mon|monday|tue|tuesday|wed|wednesday|thu|thursday|fri|friday|sat|saturday|sun|sunday)\b/gi, (m) => {
      const v = m[1].toLowerCase();
      const wd = WEEKDAYS[v];
      if (wd !== undefined) {
        const d = nextDay(today, wd as Day);
        out.dueDate = isoFromDate(d);
        out.chips.push({ kind: "date", label: format(d, "EEE MMM d") });
        dateMatched = true;
      }
    });
  }

  if (!dateMatched) {
    text = consume(text, /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g, (m) => {
      const month = Number(m[1]);
      const day = Number(m[2]);
      const year = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : today.getFullYear();
      const d = new Date(year, month - 1, day);
      if (!isNaN(d.getTime())) {
        out.dueDate = isoFromDate(d);
        out.chips.push({ kind: "date", label: format(d, "MMM d") });
        dateMatched = true;
      }
    });
  }

  // Time
  text = consume(text, /\s(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/gi, (m) => {
    let h = Number(m[1]);
    const min = Number(m[2] || 0);
    const ap = m[3].toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    const t = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    out.time = t;
    out.chips = out.chips.filter(c => c.kind !== "time");
    out.chips.push({ kind: "time", label: format(parse(t, "HH:mm", new Date()), "h:mm a") });
  });
  if (!out.time) {
    text = consume(text, /\sat\s+(\d{1,2}):(\d{2})\b/g, (m) => {
      const t = `${m[1].padStart(2,"0")}:${m[2]}`;
      out.time = t;
      out.chips.push({ kind: "time", label: format(parse(t, "HH:mm", new Date()), "h:mm a") });
    });
  }

  out.title = text.replace(/\s+/g, " ").trim() || raw.trim();
  return out;
}
