/**
 * One normalized planning feed shared by every planner range (day, week,
 * month, year). Composes the local store (tasks, appointments, meals,
 * birthdays, holidays), Google Calendar and the cosmic feed into a single
 * list of items keyed by ISO day, honouring the calendar kind filters/colors.
 */
import { useMemo } from "react";
import { addDays, format } from "date-fns";
import { useStore } from "@/lib/store";
import { useCalendarPrefs, type CalendarKind } from "@/lib/calendar-prefs";
import { useKindColors, type KindKey } from "@/lib/calendar-colors";
import { useGCalEvents } from "@/lib/google-calendar";
import { apptOccursOn } from "@/lib/appointment-range";
import { buildCosmicCalendarIndex } from "@/lib/cosmic/calendar-feed";

export type FeedSource = "task" | "appointment" | "meal" | "birthday" | "holiday" | "gcal" | "cosmic";

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

  const startISO = iso(from);
  const endISO = iso(addDays(from, Math.max(0, days - 1)));

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
        const key = t.dueDate;
        if (!key || !inWindow(key)) continue;
        const kind: KindKey = t.area === "Meals" ? "meal" : "task";
        if (!on(kind)) continue;
        items.push({
          kind, id: `task:${t.id}`, title: t.title, date: key,
          time: t.startTime ?? null, endTime: t.endTime ?? null,
          allDay: !t.startTime, color: colorOf(kind), done: !!t.done,
          sourceRef: { type: "task", id: t.id },
        });
      }
    }

    // Appointments (may span multiple days).
    if (on("appt")) {
      for (const a of state.appointments ?? []) {
        for (const key of dayList) {
          if (!apptOccursOn(a, key)) continue;
          items.push({
            kind: "appt", id: `appt:${a.id}:${key}`, title: a.title, date: key,
            time: key === a.date ? a.time ?? null : null,
            endTime: a.endTime ?? null,
            allDay: !!a.allDay || !a.time,
            color: a.color || colorOf("appt"),
            location: a.location ?? null,
            sourceRef: { type: "appointment", id: a.id },
          });
        }
      }
    }

    // Planned meals.
    if (on("meal")) {
      for (const m of state.meals ?? []) {
        if (!m.date || !inWindow(m.date)) continue;
        items.push({
          kind: "meal", id: `meal:${m.id}`, title: `${m.slot}: ${m.name}`, date: m.date,
          allDay: true, color: colorOf("meal"),
          sourceRef: { type: "meal", id: m.id },
        });
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
      gEvents, gcalConnected, refreshGcal, from, days, startISO, endISO, colorOf, allowed, applyFilters]); // eslint-disable-line react-hooks/exhaustive-deps
}
