/**
 * Daily Check-In persistence: Supabase-backed with a local mirror per iso date.
 * Emits `careflow:checkin` on save so entry chips can hide.
 */
import { supabase } from "@/integrations/supabase/client";

export interface CheckInAiPayload {
  energy: {
    meter: "calm" | "active" | "intense";
    overall: string;
    moodTheme: string;
    focusTheme: string;
    challenge: string;
    opportunity: string;
  };
  moonGuidance: {
    summary: string;
    houseMeaning: string;
    lifeAreas: Record<
      "relationships" | "work" | "family" | "health" | "creativity" | "spiritual" | "financial",
      string
    >;
  };
  method: {
    capture: { question: string; tags: string[] };
    anchor: { intention: string; why: string };
    rhythm: { priorities: string[]; blocks: { time: string; label: string; kind: string }[] };
    exhale: { release: string; boundary: string; selfCare: string; breathing: string };
  };
  insight: string;
  mantra: string;
  recommendations: string[];
}

export interface CheckInRecord {
  id?: string;
  iso_date: string;
  ai_payload: CheckInAiPayload | null;
  mood: string | null;
  gratitude: string[];
  capture_text: string | null;
  chosen_intention: string | null;
  saved_mantra: string | null;
  completed_at: string | null;
}

const LKEY = (iso: string) => `careflow:checkin-full:${iso}`;

export function readLocal(iso: string): CheckInRecord | null {
  try {
    const raw = localStorage.getItem(LKEY(iso));
    return raw ? (JSON.parse(raw) as CheckInRecord) : null;
  } catch { return null; }
}

export function writeLocal(iso: string, rec: CheckInRecord) {
  try {
    localStorage.setItem(LKEY(iso), JSON.stringify(rec));
    window.dispatchEvent(new CustomEvent("careflow:checkin", { detail: { iso } }));
  } catch { /* noop */ }
}

export async function loadCheckIn(iso: string): Promise<CheckInRecord | null> {
  const local = readLocal(iso);
  try {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return local;
    const { data, error } = await supabase
      .from("daily_checkins")
      .select("*")
      .eq("user_id", uid)
      .eq("iso_date", iso)
      .maybeSingle();
    if (error || !data) return local;
    const rec: CheckInRecord = {
      id: data.id,
      iso_date: data.iso_date,
      ai_payload: (data.ai_payload as CheckInAiPayload) ?? local?.ai_payload ?? null,
      mood: data.mood ?? null,
      gratitude: Array.isArray(data.gratitude) ? (data.gratitude as string[]) : [],
      capture_text: data.capture_text ?? null,
      chosen_intention: data.chosen_intention ?? null,
      saved_mantra: data.saved_mantra ?? null,
      completed_at: data.completed_at ?? null,
    };
    writeLocal(iso, rec);
    return rec;
  } catch {
    return local;
  }
}

export async function saveCheckIn(iso: string, patch: Partial<CheckInRecord>): Promise<CheckInRecord> {
  const existing = readLocal(iso) ?? {
    iso_date: iso,
    ai_payload: null,
    mood: null,
    gratitude: [],
    capture_text: null,
    chosen_intention: null,
    saved_mantra: null,
    completed_at: null,
  };
  const merged: CheckInRecord = { ...existing, ...patch, iso_date: iso };
  writeLocal(iso, merged);

  try {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return merged;
    const row = {
      user_id: uid,
      iso_date: iso,
      ai_payload: merged.ai_payload as never,
      mood: merged.mood,
      gratitude: merged.gratitude as never,
      capture_text: merged.capture_text,
      chosen_intention: merged.chosen_intention,
      saved_mantra: merged.saved_mantra,
      completed_at: merged.completed_at,
    };
    const { data, error } = await supabase
      .from("daily_checkins")
      .upsert(row, { onConflict: "user_id,iso_date" })
      .select("id")
      .maybeSingle();
    if (!error && data?.id) merged.id = data.id;
  } catch { /* offline fallback */ }
  return merged;
}

export function isoToday(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}