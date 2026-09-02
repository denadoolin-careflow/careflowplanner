/**
 * Medications + dose tracking. A medication carries a list of daily reminder
 * times ("HH:MM"); each dose taken/skipped is written to `medication_logs`
 * keyed by (medication, date, time) so history is honest and idempotent.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Medication {
  id: string;
  name: string;
  dose: string | null;
  notes: string | null;
  times: string[];
  active: boolean;
  recipient_id: string | null;
  /** medication | vitamin | mineral | supplement */
  kind: string;
}

export const MED_KINDS = [
  { key: "medication", label: "Medication" },
  { key: "vitamin", label: "Vitamin" },
  { key: "mineral", label: "Mineral" },
  { key: "supplement", label: "Supplement" },
] as const;

export type DoseStatus = "taken" | "skipped" | "missed";

export interface MedicationLog {
  id: string;
  medication_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: DoseStatus;
  taken_at: string | null;
}

export const todayISO = () => new Date().toISOString().slice(0, 10);

/* ---------------- shared cache ---------------- */

let meds: Medication[] = [];
let loaded = false;
const subs = new Set<(m: Medication[]) => void>();
const emit = () => subs.forEach(f => f(meds));

const normalizeTime = (t: string) => t.slice(0, 5);

function mapMed(r: any): Medication {
  return {
    id: r.id,
    name: r.name,
    dose: r.dose ?? null,
    notes: r.notes ?? null,
    times: (r.times ?? []).map(normalizeTime).sort(),
    active: r.active !== false,
    recipient_id: r.recipient_id ?? null,
    kind: r.kind ?? "medication",
  };
}

async function fetchMeds() {
  const { data } = await supabase.from("medications").select("*").order("name");
  meds = (data ?? []).map(mapMed);
  loaded = true;
  emit();
}

export const medications = {
  list: () => meds,
  async refresh() { await fetchMeds(); },
  async create(input: Partial<Medication> & { name: string }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("medications").insert({
      user_id: user.id,
      name: input.name,
      dose: input.dose ?? null,
      notes: input.notes ?? null,
      times: (input.times ?? []).map(normalizeTime),
      active: input.active ?? true,
      recipient_id: input.recipient_id ?? null,
      kind: input.kind ?? "medication",
    } as any).select().single();
    if (data) { meds = [...meds, mapMed(data)].sort((a, b) => a.name.localeCompare(b.name)); emit(); }
  },
  async update(id: string, patch: Partial<Medication>) {
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.dose !== undefined) row.dose = patch.dose;
    if (patch.notes !== undefined) row.notes = patch.notes;
    if (patch.times !== undefined) row.times = patch.times.map(normalizeTime);
    if (patch.active !== undefined) row.active = patch.active;
    if (patch.recipient_id !== undefined) row.recipient_id = patch.recipient_id;
    if (patch.kind !== undefined) row.kind = patch.kind;
    meds = meds.map(m => m.id === id ? { ...m, ...patch } : m);
    emit();
    await supabase.from("medications").update(row as any).eq("id", id);
  },
  async remove(id: string) {
    meds = meds.filter(m => m.id !== id);
    emit();
    await supabase.from("medications").delete().eq("id", id);
  },
};

export function useMedications() {
  const [list, setList] = useState<Medication[]>(meds);
  useEffect(() => {
    subs.add(setList);
    if (!loaded) void fetchMeds();
    return () => { subs.delete(setList); };
  }, []);
  return { medications: list, api: medications };
}

/* ---------------- dose logs for one day ---------------- */

export function useMedicationLogs(dateISO: string) {
  const [logs, setLogs] = useState<MedicationLog[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase.from("medication_logs")
      .select("*").eq("scheduled_date", dateISO);
    setLogs((data ?? []).map((r: any) => ({
      id: r.id,
      medication_id: r.medication_id,
      scheduled_date: r.scheduled_date,
      scheduled_time: normalizeTime(r.scheduled_time),
      status: r.status as DoseStatus,
      taken_at: r.taken_at ?? null,
    })));
  }, [dateISO]);

  useEffect(() => { void load(); }, [load]);

  const setStatus = useCallback(async (medId: string, time: string, status: DoseStatus | null) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const t = normalizeTime(time);
    if (status === null) {
      await supabase.from("medication_logs").delete()
        .eq("medication_id", medId).eq("scheduled_date", dateISO).eq("scheduled_time", `${t}:00`);
    } else {
      await supabase.from("medication_logs").upsert({
        user_id: user.id,
        medication_id: medId,
        scheduled_date: dateISO,
        scheduled_time: `${t}:00`,
        status,
        taken_at: status === "taken" ? new Date().toISOString() : null,
      } as any, { onConflict: "medication_id,scheduled_date,scheduled_time" } as any);
    }
    await load();
  }, [dateISO, load]);

  const statusOf = useCallback(
    (medId: string, time: string) =>
      logs.find(l => l.medication_id === medId && l.scheduled_time === normalizeTime(time))?.status ?? null,
    [logs],
  );

  return { logs, setStatus, statusOf, reload: load };
}

/* ---------------- today's dose slots ---------------- */

export interface DoseSlot {
  med: Medication;
  time: string;
  minutes: number;
}

/** Every scheduled dose for the day, sorted by clock time. */
export function doseSlots(list: Medication[] = meds): DoseSlot[] {
  const out: DoseSlot[] = [];
  for (const med of list) {
    if (!med.active) continue;
    for (const time of med.times) {
      const [h, m] = time.split(":").map(Number);
      if (!Number.isFinite(h)) continue;
      out.push({ med, time, minutes: h * 60 + (m || 0) });
    }
  }
  return out.sort((a, b) => a.minutes - b.minutes);
}

/* ---------------- reminders ---------------- */

const medTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Fire an in-app + browser notification at each of today's remaining dose
 * times. Re-run whenever the medication list changes.
 */
export async function scheduleMedicationReminders(list: Medication[] = meds) {
  if (typeof window === "undefined") return;
  const { notifyReminder } = await import("@/lib/reminders");
  for (const [, t] of medTimers) clearTimeout(t);
  medTimers.clear();

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (const slot of doseSlots(list)) {
    const delta = (slot.minutes - nowMin) * 60_000;
    if (delta < 0 || delta > 12 * 60 * 60_000) continue;
    const key = `med-${slot.med.id}-${slot.time}`;
    medTimers.set(key, setTimeout(() => {
      notifyReminder(
        `Medication — ${slot.med.name}`,
        `${slot.time}${slot.med.dose ? ` · ${slot.med.dose}` : ""}`,
        key,
      );
    }, delta));
  }
}
