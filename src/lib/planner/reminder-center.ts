/**
 * Reminder center data: gathers upcoming planner items, moon phase moments,
 * cycle milestones and saved journal prompts into one grouped list, and keeps
 * snooze / handled state in the database so it follows across devices.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, format, isSameDay, parseISO, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { usePlannerFeed, type PlannerFeedItem } from "./feed";
import { useCycleDots } from "./day-rhythm";
import { getMoonPhase, MOON_INFO, type MoonPhase } from "@/lib/moon";
import { getMoonSign } from "@/lib/zodiac";
import { useReminderPrefs } from "@/lib/reminders";

export type ReminderSourceKind = "task" | "appointment" | "meal" | "care" | "moon" | "cycle" | "journal";
export type ReminderGroup = "overdue" | "today" | "rhythm" | "journal" | "later";

export interface ReminderRow {
  key: string;
  sourceKind: ReminderSourceKind;
  sourceId: string;
  occurrenceKey: string;
  title: string;
  detail?: string;
  /** Local Date the reminder wants attention at. */
  at: Date;
  group: ReminderGroup;
  glyph?: string;
  /** Present for planner rows so the row can open the underlying item. */
  item?: PlannerFeedItem;
  snoozedUntil?: Date | null;
}

interface InstanceRow {
  source_kind: string;
  source_id: string;
  occurrence_key: string;
  snoozed_until: string | null;
  handled_at: string | null;
}

const KEY_PHASES: MoonPhase[] = ["new", "first-quarter", "full", "last-quarter"];
const PHASE_INTENT: Record<string, string> = {
  "new": "Sow — set a quiet intention",
  "first-quarter": "Grow — take one steady step",
  "full": "Glow — feel it without fixing it",
  "last-quarter": "Let go — release one thing",
};

const instanceKey = (kind: string, id: string, occ: string) => `${kind}|${id}|${occ}`;

function atFor(dateISO: string, time?: string | null): Date {
  return new Date(`${dateISO}T${time && /^\d{2}:\d{2}/.test(time) ? time : "09:00"}:00`);
}

export function useReminderCenter(horizonDays = 8) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [prefs] = useReminderPrefs();
  const { items } = usePlannerFeed(today, horizonDays);
  const days = useMemo(() => Array.from({ length: horizonDays }, (_, i) => addDays(today, i)), [today, horizonDays]);
  const cycles = useCycleDots(days);
  const [instances, setInstances] = useState<Map<string, InstanceRow>>(new Map());
  const [prompts, setPrompts] = useState<{ id: string; prompt: string; remind_at: string; completed_at: string | null }[]>([]);
  const [tick, setTick] = useState(0);

  const reload = useCallback(async () => {
    const [inst, saved] = await Promise.all([
      supabase.from("planner_reminder_instances").select("source_kind,source_id,occurrence_key,snoozed_until,handled_at"),
      supabase.from("planner_saved_prompt_reminders").select("id,prompt,remind_at,completed_at").order("remind_at"),
    ]);
    const map = new Map<string, InstanceRow>();
    for (const row of (inst.data ?? []) as InstanceRow[]) {
      map.set(instanceKey(row.source_kind, row.source_id, row.occurrence_key), row);
    }
    setInstances(map);
    setPrompts((saved.data ?? []) as any);
  }, []);

  useEffect(() => { void reload(); }, [reload, tick]);

  const rows = useMemo(() => {
    const now = new Date();
    const out: ReminderRow[] = [];

    const push = (row: Omit<ReminderRow, "group" | "key" | "snoozedUntil">) => {
      const state = instances.get(instanceKey(row.sourceKind, row.sourceId, row.occurrenceKey));
      if (state?.handled_at) return;
      const snoozedUntil = state?.snoozed_until ? new Date(state.snoozed_until) : null;
      const at = snoozedUntil && snoozedUntil > row.at ? snoozedUntil : row.at;
      const group: ReminderGroup =
        row.sourceKind === "journal" ? "journal"
        : at < now ? "overdue"
        : row.sourceKind === "moon" || row.sourceKind === "cycle" ? "rhythm"
        : isSameDay(at, now) ? "today"
        : "later";
      out.push({ ...row, at, group, snoozedUntil, key: instanceKey(row.sourceKind, row.sourceId, row.occurrenceKey) });
    };

    if (prefs.plannerEnabled !== false) {
      for (const item of items) {
        if (item.done) continue;
        const kind: ReminderSourceKind | null =
          item.sourceRef.type === "task" ? "task"
          : item.sourceRef.type === "appointment" ? "appointment"
          : item.sourceRef.type === "meal" ? "meal"
          : item.sourceRef.type === "care" ? "care" : null;
        if (!kind) continue;
        if (kind === "meal" || kind === "care") {
          if (item.date !== format(now, "yyyy-MM-dd")) continue;
        }
        push({
          sourceKind: kind,
          sourceId: item.sourceRef.id,
          occurrenceKey: item.occurrenceDate ?? item.date,
          title: item.title,
          detail: item.time ? format(atFor(item.date, item.time), "EEE h:mm a") : format(parseISO(item.date), "EEE"),
          at: atFor(item.date, item.time),
          item,
        });
      }
    }

    if (prefs.moonEnabled) {
      for (const day of days) {
        const phase = getMoonPhase(day);
        if (!KEY_PHASES.includes(phase)) continue;
        const key = format(day, "yyyy-MM-dd");
        const info = MOON_INFO[phase];
        const sign = getMoonSign(day);
        push({
          sourceKind: "moon", sourceId: phase, occurrenceKey: key,
          title: `${info.label} in ${sign.name}`,
          detail: PHASE_INTENT[phase] ?? info.invitation,
          glyph: info.glyph,
          at: atFor(key, "09:00"),
        });
      }
    }

    if (prefs.cycleEnabled) {
      let prevPhase: string | null = null;
      for (const day of days) {
        const key = format(day, "yyyy-MM-dd");
        const dot = cycles.get(key);
        if (!dot) { prevPhase = null; continue; }
        if (dot.phase !== prevPhase) {
          prevPhase = dot.phase;
          push({
            sourceKind: "cycle", sourceId: dot.phase, occurrenceKey: key,
            title: `${dot.label} phase begins`,
            detail: `Cycle day ${dot.cycleDay}`,
            glyph: dot.glyph,
            at: atFor(key, "09:00"),
          });
        }
      }
    }

    if (prefs.journalPromptEnabled) {
      for (const p of prompts) {
        if (p.completed_at) continue;
        push({
          sourceKind: "journal", sourceId: p.id, occurrenceKey: p.remind_at.slice(0, 10),
          title: p.prompt, detail: "Saved journal prompt", glyph: "📓",
          at: new Date(p.remind_at),
        });
      }
    }

    out.sort((a, b) => a.at.getTime() - b.at.getTime());
    return out;
  }, [items, days, cycles, prompts, instances, prefs, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const write = useCallback(async (row: ReminderRow, patch: { snoozed_until?: string | null; handled_at?: string | null }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("planner_reminder_instances").upsert({
      user_id: user.id,
      source_kind: row.sourceKind,
      source_id: row.sourceId,
      occurrence_key: row.occurrenceKey,
      title: row.title,
      fire_at: row.at.toISOString(),
      ...patch,
    }, { onConflict: "user_id,source_kind,source_id,occurrence_key" });
    setTick(t => t + 1);
  }, []);

  const snooze = useCallback(async (row: ReminderRow, minutes: number) => {
    await write(row, { snoozed_until: new Date(Date.now() + minutes * 60_000).toISOString(), handled_at: null });
  }, [write]);

  const snoozeUntil = useCallback(async (row: ReminderRow, when: Date) => {
    await write(row, { snoozed_until: when.toISOString(), handled_at: null });
  }, [write]);

  const dismiss = useCallback(async (row: ReminderRow) => {
    if (row.sourceKind === "journal") {
      await supabase.from("planner_saved_prompt_reminders").update({ completed_at: new Date().toISOString() }).eq("id", row.sourceId);
    }
    await write(row, { handled_at: new Date().toISOString() });
  }, [write]);

  const grouped = useMemo(() => {
    const map: Record<ReminderGroup, ReminderRow[]> = { overdue: [], today: [], rhythm: [], journal: [], later: [] };
    for (const row of rows) map[row.group].push(row);
    return map;
  }, [rows]);

  const actionableCount = grouped.overdue.length + grouped.today.length;

  return { rows, grouped, actionableCount, snooze, snoozeUntil, dismiss, reload };
}

export const SNOOZE_PRESETS = [
  { label: "10 min", minutes: 10 },
  { label: "1 hour", minutes: 60 },
] as const;

/** Tonight at 7pm, or tomorrow morning at 9. */
export function eveningToday(): Date {
  const d = new Date();
  d.setHours(19, 0, 0, 0);
  return d > new Date() ? d : addDays(d, 1);
}
export function tomorrowMorning(): Date {
  const d = addDays(startOfDay(new Date()), 1);
  d.setHours(9, 0, 0, 0);
  return d;
}
