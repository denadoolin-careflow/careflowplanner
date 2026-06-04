/**
 * Cosmic Flow data hooks — birth chart, settings, event saves.
 * Uses Supabase as source of truth; settings cached in localStorage for UX.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BirthInfo } from "@/lib/cosmic/natal";
import { computeNatal, type NatalSnapshot } from "@/lib/cosmic/natal";

/* ---------------- Birth chart ---------------- */

export interface BirthChartRow {
  birth_date: string;
  birth_time: string | null;
  birth_tz: string | null;
  birth_lat: number | null;
  birth_lng: number | null;
  birth_place: string | null;
  natal_json: NatalSnapshot | null;
}

export function useBirthChart() {
  const [row, setRow] = useState<BirthChartRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) { setLoading(false); return; }
    const { data } = await (supabase as any)
      .from("cosmic_birth_chart")
      .select("birth_date,birth_time,birth_tz,birth_lat,birth_lng,birth_place,natal_json")
      .eq("user_id", u.user.id)
      .maybeSingle();
    setRow((data as BirthChartRow) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const save = useCallback(async (birth: BirthInfo) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) throw new Error("not signed in");
    const natal = computeNatal(birth);
    const payload: any = {
      user_id: u.user.id,
      birth_date: birth.date,
      birth_time: birth.time ?? null,
      birth_tz: birth.tz ?? null,
      birth_lat: birth.lat ?? null,
      birth_lng: birth.lng ?? null,
      birth_place: birth.place ?? null,
      natal_json: natal,
    };
    const { error } = await (supabase as any)
      .from("cosmic_birth_chart")
      .upsert(payload, { onConflict: "user_id" });
    if (error) throw error;
    await refresh();
    return natal;
  }, [refresh]);

  const clear = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return;
    await (supabase as any).from("cosmic_birth_chart").delete().eq("user_id", u.user.id);
    await refresh();
  }, [refresh]);

  return { row, loading, save, clear, refresh, natal: row?.natal_json ?? null };
}

/* ---------------- Settings ---------------- */

export interface CosmicSettings {
  show_in_calendar: boolean;
  atmosphere: string;
  enabled_event_kinds: string[];
}

const DEFAULT_SETTINGS: CosmicSettings = {
  show_in_calendar: true,
  atmosphere: "cozy",
  enabled_event_kinds: ["phase", "ingress", "retrograde", "voc", "eclipse"],
};

const LOCAL_KEY = "careflow:cosmic:settings";

export function useCosmicSettings() {
  const [settings, setSettings] = useState<CosmicSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
      const raw = window.localStorage.getItem(LOCAL_KEY);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
    } catch { return DEFAULT_SETTINGS; }
  });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return;
      const { data } = await (supabase as any)
        .from("cosmic_settings")
        .select("show_in_calendar,atmosphere,enabled_event_kinds")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (data) {
        const merged = { ...DEFAULT_SETTINGS, ...(data as CosmicSettings) };
        setSettings(merged);
        try { window.localStorage.setItem(LOCAL_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
      }
    })();
  }, []);

  const update = useCallback(async (patch: Partial<CosmicSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      try { window.localStorage.setItem(LOCAL_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return;
    await (supabase as any)
      .from("cosmic_settings")
      .upsert({ user_id: u.user.id, ...patch }, { onConflict: "user_id" });
  }, []);

  return { settings, update };
}

/* ---------------- Event saves ---------------- */

export interface SavedEventRow {
  id: string;
  event_id: string;
  event_kind: string;
  event_date: string;
  payload: any;
  reminder_at: string | null;
}

export async function saveCosmicEvent(input: {
  event_id: string; event_kind: string; event_date: string;
  payload?: any; reminder_at?: string | null;
}): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) throw new Error("not signed in");
  await (supabase as any).from("cosmic_event_saves").insert({
    user_id: u.user.id,
    event_id: input.event_id,
    event_kind: input.event_kind,
    event_date: input.event_date,
    payload: input.payload ?? null,
    reminder_at: input.reminder_at ?? null,
  });
}

export async function logCosmicJournal(input: {
  journal_entry_id: string;
  event_id?: string; event_kind?: string;
  planet?: string; sign?: string; phase?: string;
  event_date?: string;
}): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) throw new Error("not signed in");
  await (supabase as any).from("cosmic_journal_entries").insert({
    user_id: u.user.id,
    ...input,
  });
}