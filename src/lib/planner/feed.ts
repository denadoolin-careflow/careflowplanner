/**
 * One normalized planning feed shared by every planner range (day, week,
 * month, year). Composes the local store (tasks, appointments, meals,
 * birthdays, holidays), Google Calendar and the cosmic feed into a single
 * list of items keyed by ISO day, honouring the calendar kind filters/colors.
 */
import { useMemo } from "react";
import { addDays, format, parseISO } from "date-fns";
import { useStore } from "@/lib/store";
import { useCalendarPrefs, type CalendarKind } from "@/lib/calendar-prefs";
import { useKindColors, type KindKey } from "@/lib/calendar-colors";
import { useGCalEvents } from "@/lib/google-calendar";
import { apptOccursOn } from "@/lib/appointment-range";
import { buildCosmicCalendarIndex } from "@/lib/cosmic/calendar-feed";
import { expandRecurrence, taskRecurrenceRule } from "@/lib/recurrence";
import { useCaregivingChores } from "@/lib/caregiving-chores";
import { exceptionFor, usePlannerRecurrenceExceptions } from "./recurrence-exceptions";

export type FeedSource = "task" | "appointment" | "meal" | "care" | "birthday" | "holiday" | "gcal" | "cosmic";

export interface PlannerFeedItem {
  kind: KindKey;
  id: string;
  title: string;
  /** yyyy-MM-dd */
  date: string;
  /** "HH:MM" when the item has a start time. */
  time?: string | null;
  endTime?: string | null;
  allDay: boolean;
  color: string;
  done?: boolean;
  location?: string | null;
  /** Task attributes (undefined for events, meals, cosmic, etc.). */
  priority?: import("@/lib/types").Priority;
  area?: import("@/lib/types").Area;
  energy?: import("@/lib/types").Energy;
  estMinutes?: number;
  projectId?: string;
  tags?: string[];
  recurrenceSeriesId?: string;
  occurrenceDate?: string;
  /** Points back at the record so callers can open or mutate the original. */
  sourceRef: { type: FeedSource; id: string };
}


const iso = (d: Date) => format(d, "yyyy-MM-dd");
const MD = (s: string) => (s ?? "").slice(5, 10);

export interface PlannerFeed {
  items: PlannerFeedItem[];
  byDay: Map<string, PlannerFeedItem[]>;
  days: string[];
  gcalConnected: boolean;
  refreshGcal: () => void;
}

/**
 * @param from  first day of the window
 * @param days  window length in days
 */
export function usePlannerFeed(from: Date, days: number, opts: { applyFilters?: boolean } = {}): PlannerFeed {
  const { applyFilters = true } = opts;
  const { state } = useStore() as any;
  const { prefs } = useCalendarPrefs();
  const { colorOf } = useKindColors();
  const caregiving = useCaregivingChores();

  const startISO = iso(from);
  const endISO = iso(addDays(from, Math.max(0, days - 1)));
  const recurrenceExceptions = usePlannerRecurrenceExceptions(startISO, endISO);

  const { events: gEvents, connected: gcalConnected, refresh: refreshGcal } = useGCalEvents(
    new Date(`${startISO}T00:00:00`).toISOString(),
    new Date(`${endISO}T23:59:59`).toISOString(),
  );

  const allowed = useMemo(() => new Set<CalendarKind>(prefs.filters), [prefs.filters]);
  const on = (k: KindKey) => !applyFilters || allowed.has(k as CalendarKind);

  return useMemo(() => {
    const dayList: string[] = [];
    for (let i = 0; i < days; i++) dayList.push(iso(addDays(from, i)));
    const inWindow = (k: string) => k >= startISO && k <= endISO;

    const items: PlannerFeedItem[] = [];

    // Tasks (meals area folds into the meal kind so colors stay consistent).
    if (on("task") || on("meal")) {
      for (const t of state.tasks ?? []) {
        const baseKey = t.dueDate;
        if (!baseKey) continue;
        const kind: KindKey = t.area === "Meals" ? "meal" : "task";
        if (!on(kind)) continue;
        const rule = t.recurrenceSeriesId ? taskRecurrenceRule(t) : null;
        const dates = rule ? expandRecurrence(baseKey, rule, parseISO(startISO), parseISO(endISO)) : (inWindow(baseKey) ? [baseKey] : []);
        for (const key of dates) {
          const exception = exceptionFor(recurrenceExceptions, t.recurrenceSeriesId, key);
          if (exception?.action === "skip") continue;
          const occurrenceDate = exception?.overrideDate ?? key;
          if (!inWindow(occurrenceDate)) continue;
          items.push({
          kind, id: `task:${t.id}:${key}`, title: String(exception?.overridePayload.title ?? t.title), date: occurrenceDate,
          time: t.startTime ?? null, endTime: t.endTime ?? null,
          allDay: !t.startTime, color: colorOf(kind), done: !!t.done,
          priority: t.priority, area: t.area, energy: t.energy,
          estMinutes: t.estMinutes, projectId: t.projectId, tags: t.tags,
          recurrenceSeriesId: t.recurrenceSeriesId, occurrenceDate: key,
          sourceRef: { type: "task", id: t.id },
        });
        }
      }
    }

    // Appointments (may span multiple days).
    if (on("appt")) {
      for (const a of state.appointments ?? []) {
        const dates = a.recurrenceRule ? expandRecurrence(a.date, a.recurrenceRule, parseISO(startISO), parseISO(endISO)) : dayList;
        for (const key of dates) {
          const occurrence = a.recurrenceRule ? { ...a, date: key, endDate: undefined } : a;
          if (!apptOccursOn(occurrence, key)) continue;
          const exception = exceptionFor(recurrenceExceptions, a.recurrenceSeriesId, key);
          if (exception?.action === "skip") continue;
          const occurrenceDate = exception?.overrideDate ?? key;
          items.push({
            kind: "appt", id: `appt:${a.id}:${key}`, title: String(exception?.overridePayload.title ?? a.title), date: occurrenceDate,
            time: a.time ?? null,
            endTime: a.endTime ?? null,
            allDay: !!a.allDay || !a.time,
            color: a.color || colorOf("appt"),
            location: a.location ?? null,
            recurrenceSeriesId: a.recurrenceSeriesId, occurrenceDate: key,
            sourceRef: { type: "appointment", id: a.id },
          });
        }
      }
    }

    // Planned meals.
    if (on("meal")) {
      for (const m of state.meals ?? []) {
        if (!m.date) continue;
        const dates = m.recurrenceRule ? expandRecurrence(m.date, m.recurrenceRule, parseISO(startISO), parseISO(endISO)) : (inWindow(m.date) ? [m.date] : []);
        for (const key of dates) {
        const exception = exceptionFor(recurrenceExceptions, m.recurrenceSeriesId, key);
        if (exception?.action === "skip") continue;
        const occurrenceDate = exception?.overrideDate ?? key;
        items.push({
          kind: "meal", id: `meal:${m.id}:${key}`, title: `${m.slot}: ${String(exception?.overridePayload.name ?? m.name)}`, date: occurrenceDate,
          allDay: true, color: colorOf("meal"),
          recurrenceSeriesId: m.recurrenceSeriesId, occurrenceDate: key,
          sourceRef: { type: "meal", id: m.id },
        });
        }
      }
    }

    if (on("care")) {
      for (const chore of caregiving) {
        const base = chore.start_date;
        if (!base) continue;
        const dates = chore.recurrence_rule ? expandRecurrence(base, chore.recurrence_rule, parseISO(startISO), parseISO(endISO)) : (inWindow(base) ? [base] : []);
        for (const key of dates) {
          const exception = exceptionFor(recurrenceExceptions, chore.recurrence_series_id ?? undefined, key);
          if (exception?.action === "skip") continue;
          items.push({ kind: "care", id: `care:${chore.id}:${key}`, title: chore.title, date: exception?.overrideDate ?? key,
            allDay: true, color: colorOf("care"), done: chore.done, area: "Caregiving", estMinutes: chore.est_minutes ?? undefined,
            recurrenceSeriesId: chore.recurrence_series_id ?? undefined, occurrenceDate: key, sourceRef: { type: "care", id: chore.id } });
        }
      }
    }

    // Birthdays and holidays recur every year — match on month/day.
    if (on("bday")) {
      for (const b of state.birthdays ?? []) {
        for (const key of dayList) {
          if (!b.date || MD(b.date) !== MD(key)) continue;
          items.push({
            kind: "bday", id: `bday:${b.id}:${key}`, title: `${b.name}'s birthday`, date: key,
            allDay: true, color: colorOf("bday"), sourceRef: { type: "birthday", id: b.id },
          });
        }
      }
    }
    if (on("hol")) {
      for (const h of state.holidays ?? []) {
        for (const key of dayList) {
          if (!h.date || MD(h.date) !== MD(key)) continue;
          items.push({
            kind: "hol", id: `hol:${h.id}:${key}`, title: h.name, date: key,
            allDay: true, color: colorOf("hol"), sourceRef: { type: "holiday", id: h.id },
          });
        }
      }
    }

    // Google Calendar.
    if (on("gcal")) {
      for (const e of gEvents ?? []) {
        if (!inWindow(e.date)) continue;
        items.push({
          kind: "gcal", id: `gcal:${e.id}`, title: e.title, date: e.date,
          time: e.time ?? null, allDay: e.allDay,
          color: e.color || colorOf("gcal"), location: e.location ?? null,
          sourceRef: { type: "gcal", id: e.id },
        });
      }
    }

    // Cosmic events — computed, so only for reasonably sized windows.
    if (on("cosmic") && days <= 62) {
      const cosmic = buildCosmicCalendarIndex(from, days);
      for (const [key, list] of cosmic) {
        for (const c of list) {
          items.push({
            kind: "cosmic", id: `cosmic:${c.id}:${key}`, title: c.label, date: key,
            allDay: true, color: colorOf("cosmic"), sourceRef: { type: "cosmic", id: c.id },
          });
        }
      }
    }

    items.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return (a.time ?? "").localeCompare(b.time ?? "");
    });

    const byDay = new Map<string, PlannerFeedItem[]>();
    for (const key of dayList) byDay.set(key, []);
    for (const it of items) {
      const arr = byDay.get(it.date);
      if (arr) arr.push(it);
    }

    return { items, byDay, days: dayList, gcalConnected, refreshGcal };
  }, [state.tasks, state.appointments, state.meals, state.birthdays, state.holidays,
      caregiving, recurrenceExceptions, gEvents, gcalConnected, refreshGcal, from, days, startISO, endISO, colorOf, allowed, applyFilters]); // eslint-disable-line react-hooks/exhaustive-deps
}
