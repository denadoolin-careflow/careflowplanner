/**
 * WellFlow reminders — water, weight, daily check-in, and GLP-1 dose.
 *
 * Settings are stored per user (private, row-level security). The scheduler
 * runs in the browser: it works out the next fire time for each enabled
 * reminder, arms a timer, and re-arms after firing. Quiet hours from the
 * app's shared reminder preferences are respected.
 *
 * These reminders only repeat the schedule the user entered. CareFlow never
 * suggests, calculates, or changes a medication dose.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { inQuietHours, notifyReminder } from "@/lib/reminders";
import { doseSlots } from "@/lib/medications";
import { hasMovementOn } from "@/lib/wellflow/movement";

/** Dose times already entered by the user — never generated or adjusted here. */
function medSlotsForReminders() {
  return doseSlots().map(s => ({
    id: s.med.id, name: s.med.name, dose: s.med.dose, time: s.time,
  }));
}

export interface WellflowReminderSettings {
  water_enabled: boolean;
  water_start: string;
  water_end: string;
  water_interval_minutes: number;
  weight_enabled: boolean;
  weight_days: number[];
  weight_time: string;
  checkin_enabled: boolean;
  checkin_time: string;
  glp1_enabled: boolean;
  glp1_day: number;
  glp1_time: string;
  glp1_day_before: boolean;
  /** Nudge at each medication / supplement dose time already entered. */
  meds_enabled: boolean;
  /** Daily "how did food feel?" nudge. */
  symptom_enabled: boolean;
  symptom_time: string;
  /** Movement nudge on chosen weekdays (skipped if already logged). */
  movement_enabled: boolean;
  movement_days: number[];
  movement_time: string;
}

export const DEFAULT_WELLFLOW_REMINDERS: WellflowReminderSettings = {
  water_enabled: false,
  water_start: "08:00",
  water_end: "20:00",
  water_interval_minutes: 120,
  weight_enabled: false,
  weight_days: [1],
  weight_time: "07:30",
  checkin_enabled: false,
  checkin_time: "20:00",
  glp1_enabled: false,
  glp1_day: 0,
  glp1_time: "09:00",
  glp1_day_before: false,
  meds_enabled: false,
  symptom_enabled: false,
  symptom_time: "19:30",
  movement_enabled: false,
  movement_days: [1, 3, 6],
  movement_time: "17:00",
};

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const hhmm = (t: string | null | undefined, fallback: string) =>
  (t ?? fallback).slice(0, 5);

function normalize(row: any): WellflowReminderSettings {
  if (!row) return DEFAULT_WELLFLOW_REMINDERS;
  return {
    water_enabled: !!row.water_enabled,
    water_start: hhmm(row.water_start, "08:00"),
    water_end: hhmm(row.water_end, "20:00"),
    water_interval_minutes: Number(row.water_interval_minutes) || 120,
    weight_enabled: !!row.weight_enabled,
    weight_days: Array.isArray(row.weight_days) ? row.weight_days.map(Number) : [1],
    weight_time: hhmm(row.weight_time, "07:30"),
    checkin_enabled: !!row.checkin_enabled,
    checkin_time: hhmm(row.checkin_time, "20:00"),
    glp1_enabled: !!row.glp1_enabled,
    glp1_day: Number(row.glp1_day) || 0,
    glp1_time: hhmm(row.glp1_time, "09:00"),
    glp1_day_before: !!row.glp1_day_before,
    meds_enabled: !!row.meds_enabled,
    symptom_enabled: !!row.symptom_enabled,
    symptom_time: hhmm(row.symptom_time, "19:30"),
    movement_enabled: !!row.movement_enabled,
    movement_days: Array.isArray(row.movement_days) ? row.movement_days.map(Number) : [1, 3, 6],
    movement_time: hhmm(row.movement_time, "17:00"),
  };
}

/* ------------------------------------------------------------- settings */

let cached: WellflowReminderSettings | null = null;
const listeners = new Set<(s: WellflowReminderSettings) => void>();

export async function loadWellflowReminders(): Promise<WellflowReminderSettings> {
  const { data } = await supabase.from("wellflow_reminders").select("*").maybeSingle();
  cached = normalize(data);
  return cached;
}

export async function saveWellflowReminders(patch: Partial<WellflowReminderSettings>) {
  const { data: u } = await supabase.auth.getUser();
  const user_id = u.user?.id;
  if (!user_id) throw new Error("Please sign in");
  const next = { ...(cached ?? DEFAULT_WELLFLOW_REMINDERS), ...patch };
  const { error } = await supabase
    .from("wellflow_reminders")
    .upsert({ user_id, ...next } as any, { onConflict: "user_id" });
  if (error) throw error;
  cached = next;
  listeners.forEach(l => l(next));
  scheduleWellflowReminders(next);
  return next;
}

export function useWellflowReminders() {
  const [settings, setSettings] = useState<WellflowReminderSettings>(cached ?? DEFAULT_WELLFLOW_REMINDERS);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let alive = true;
    void loadWellflowReminders().then(s => { if (alive) { setSettings(s); setLoading(false); } });
    listeners.add(setSettings);
    return () => { alive = false; listeners.delete(setSettings); };
  }, []);

  const save = useCallback(async (patch: Partial<WellflowReminderSettings>) => {
    const next = await saveWellflowReminders(patch);
    setSettings(next);
    return next;
  }, []);

  return { settings, loading, save };
}

/* ------------------------------------------------------------ scheduler */

const timers: ReturnType<typeof setTimeout>[] = [];
const FIRED_KEY = "careflow:wellflow:reminders-fired:v1";

function alreadyFired(key: string) {
  try {
    const list: string[] = JSON.parse(localStorage.getItem(FIRED_KEY) ?? "[]");
    return list.includes(key);
  } catch { return false; }
}

function markFired(key: string) {
  try {
    const list: string[] = JSON.parse(localStorage.getItem(FIRED_KEY) ?? "[]");
    list.push(key);
    localStorage.setItem(FIRED_KEY, JSON.stringify(list.slice(-200)));
  } catch { /* noop */ }
}

function at(day: Date, time: string) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** Every fire time in the next 24 hours for the given settings. */
export function upcomingFires(s: WellflowReminderSettings, from = new Date()) {
  const out: { at: Date; key: string; title: string; body: string; skipIfMoved?: string }[] = [];
  const horizon = new Date(from.getTime() + 24 * 60 * 60_000);

  for (let offset = 0; offset <= 1; offset++) {
    const day = new Date(from);
    day.setDate(day.getDate() + offset);
    const dk = dayKey(day);

    if (s.water_enabled) {
      const start = at(day, s.water_start);
      const end = at(day, s.water_end);
      const step = Math.max(15, s.water_interval_minutes) * 60_000;
      for (let t = start.getTime(); t <= end.getTime(); t += step) {
        out.push({
          at: new Date(t), key: `water-${dk}-${t}`,
          title: "Water break", body: "A glass of water whenever you're ready.",
        });
      }
    }
    if (s.weight_enabled && s.weight_days.includes(day.getDay())) {
      out.push({
        at: at(day, s.weight_time), key: `weight-${dk}`,
        title: "Weigh-in", body: "Record today's weight if it's a good moment.",
      });
    }
    if (s.checkin_enabled) {
      out.push({
        at: at(day, s.checkin_time), key: `checkin-${dk}`,
        title: "How are you feeling?", body: "Your daily WellFlow check-in is waiting.",
      });
    }
    if (s.glp1_enabled) {
      if (day.getDay() === s.glp1_day) {
        out.push({
          at: at(day, s.glp1_time), key: `glp1-${dk}`,
          title: "GLP-1 day", body: "Your scheduled injection day — log it once it's done.",
        });
      }
      if (s.glp1_day_before && day.getDay() === (s.glp1_day + 6) % 7) {
        out.push({
          at: at(day, s.glp1_time), key: `glp1-pre-${dk}`,
          title: "GLP-1 tomorrow", body: "Heads-up: your injection day is tomorrow.",
        });
      }
    }
    if (s.symptom_enabled) {
      out.push({
        at: at(day, s.symptom_time), key: `symptom-${dk}`,
        title: "How did today's food feel?",
        body: "A quick note on energy or symptoms keeps your patterns honest.",
      });
    }
    if (s.movement_enabled && s.movement_days.includes(day.getDay())) {
      out.push({
        at: at(day, s.movement_time), key: `movement-${dk}`,
        title: "Movement, if you're up for it",
        body: "Even a short walk counts — log it when you're done.",
        skipIfMoved: dk,
      });
    }
    if (s.meds_enabled) {
      for (const slot of medSlotsForReminders()) {
        out.push({
          at: at(day, slot.time), key: `meds-${dk}-${slot.id}-${slot.time}`,
          title: `${slot.name}`,
          body: `${slot.time}${slot.dose ? ` · ${slot.dose}` : ""} — mark it taken or skipped when you can.`,
        });
      }
    }
  }

  return out
    .filter(f => f.at > from && f.at <= horizon && !alreadyFired(f.key))
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}

export function clearWellflowReminders() {
  timers.forEach(clearTimeout);
  timers.length = 0;
}

export function scheduleWellflowReminders(s: WellflowReminderSettings) {
  clearWellflowReminders();
  if (typeof window === "undefined") return;
  // Cap the number of live timers; the next pass picks up the rest.
  upcomingFires(s).slice(0, 20).forEach(f => {
    const delay = f.at.getTime() - Date.now();
    if (delay < 0) return;
    timers.push(setTimeout(() => {
      void (async () => {
        markFired(f.key);
        // A movement nudge stays quiet if the day is already logged.
        if (f.skipIfMoved && await hasMovementOn(f.skipIfMoved)) return;
        if (!inQuietHours()) notifyReminder(f.title, f.body, f.key);
      })();
      scheduleWellflowReminders(s);
    }, Math.min(delay, 2_147_000_000)));
  });
}

/** Load settings and arm the scheduler — safe to call on app start. */
export async function initWellflowReminders() {
  try {
    const s = await loadWellflowReminders();
    scheduleWellflowReminders(s);
  } catch { /* signed out or offline — nothing to schedule */ }
}
