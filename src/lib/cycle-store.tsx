import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_CYCLE_SETTINGS,
  type CycleSettings,
  type PeriodLog,
  type DayLog,
  type FlowLevel,
  type EnergyLevel,
} from "./cycle";

interface Ctx {
  settings: CycleSettings;
  periods: PeriodLog[];
  dayLogs: DayLog[];
  loaded: boolean;
  saveSettings: (patch: Partial<CycleSettings>) => Promise<void>;
  addPeriodStart: (date: string) => Promise<void>;
  setPeriodEnd: (id: string, date: string | null) => Promise<void>;
  deletePeriod: (id: string) => Promise<void>;
  upsertDayLog: (date: string, patch: Partial<Omit<DayLog, "id" | "date">>) => Promise<void>;
  deleteDayLog: (id: string) => Promise<void>;
}

const C = createContext<Ctx | null>(null);

const settingsFrom = (r: any): CycleSettings => ({
  enabled: !!r.enabled,
  avgCycleLength: r.avg_cycle_length ?? 28,
  avgPeriodLength: r.avg_period_length ?? 5,
  lutealLength: r.luteal_length ?? 14,
  showFertility: !!r.show_fertility,
  pairWithMoon: !!r.pair_with_moon,
  moonArchetype: (r.moon_archetype as any) ?? "auto",
  autoLowEnergy: !!r.auto_low_energy,
});

const periodFrom = (r: any): PeriodLog => ({
  id: r.id,
  periodStart: r.period_start,
  periodEnd: r.period_end ?? null,
  notes: r.notes ?? undefined,
});

const dayLogFrom = (r: any): DayLog => ({
  id: r.id,
  date: r.date,
  flow: (r.flow as FlowLevel) ?? null,
  symptoms: r.symptoms ?? [],
  mood: r.mood ?? null,
  energyLevel: (r.energy_level as EnergyLevel) ?? null,
  bbt: r.bbt ?? null,
  cervicalMucus: r.cervical_mucus ?? null,
  isIntimate: !!r.is_intimate,
  notes: r.notes ?? null,
});

export function CycleProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<CycleSettings>(DEFAULT_CYCLE_SETTINGS);
  const [periods, setPeriods] = useState<PeriodLog[]>([]);
  const [dayLogs, setDayLogs] = useState<DayLog[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [uid, setUid] = useState<string | null>(null);

  const reload = useCallback(async (userId: string) => {
    const [s, p, d] = await Promise.all([
      supabase.from("cycle_settings").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("cycle_logs").select("*").eq("user_id", userId).order("period_start", { ascending: false }).limit(24),
      supabase.from("cycle_day_logs").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(180),
    ]);
    setSettings(s.data ? settingsFrom(s.data) : DEFAULT_CYCLE_SETTINGS);
    setPeriods((p.data ?? []).map(periodFrom));
    setDayLogs((d.data ?? []).map(dayLogFrom));
    setLoaded(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const id = data?.user?.id ?? null;
      if (cancelled) return;
      setUid(id);
      if (id) await reload(id);
      else setLoaded(true);
    })();
    const sub = supabase.auth.onAuthStateChange((_e, sess) => {
      const id = sess?.user?.id ?? null;
      setUid(id);
      if (id) void reload(id);
      else {
        setSettings(DEFAULT_CYCLE_SETTINGS);
        setPeriods([]);
        setDayLogs([]);
      }
    });
    return () => { cancelled = true; sub.data.subscription.unsubscribe(); };
  }, [reload]);

  const saveSettings = useCallback(async (patch: Partial<CycleSettings>) => {
    if (!uid) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    await supabase.from("cycle_settings").upsert({
      user_id: uid,
      enabled: next.enabled,
      avg_cycle_length: next.avgCycleLength,
      avg_period_length: next.avgPeriodLength,
      luteal_length: next.lutealLength,
      show_fertility: next.showFertility,
      pair_with_moon: next.pairWithMoon,
      moon_archetype: next.moonArchetype,
      auto_low_energy: next.autoLowEnergy,
    }, { onConflict: "user_id" });
  }, [uid, settings]);

  const addPeriodStart = useCallback(async (date: string) => {
    if (!uid) return;
    const { data } = await supabase.from("cycle_logs").insert({ user_id: uid, period_start: date }).select().single();
    if (data) setPeriods(prev => [periodFrom(data), ...prev].sort((a, b) => b.periodStart.localeCompare(a.periodStart)));
  }, [uid]);

  const setPeriodEnd = useCallback(async (id: string, date: string | null) => {
    setPeriods(prev => prev.map(p => p.id === id ? { ...p, periodEnd: date } : p));
    await supabase.from("cycle_logs").update({ period_end: date }).eq("id", id);
  }, []);

  const deletePeriod = useCallback(async (id: string) => {
    setPeriods(prev => prev.filter(p => p.id !== id));
    await supabase.from("cycle_logs").delete().eq("id", id);
  }, []);

  const upsertDayLog = useCallback(async (date: string, patch: Partial<Omit<DayLog, "id" | "date">>) => {
    if (!uid) return;
    const existing = dayLogs.find(d => d.date === date);
    const merged: any = {
      user_id: uid,
      date,
      flow: patch.flow ?? existing?.flow ?? null,
      symptoms: patch.symptoms ?? existing?.symptoms ?? [],
      mood: patch.mood ?? existing?.mood ?? null,
      energy_level: patch.energyLevel ?? existing?.energyLevel ?? null,
      bbt: patch.bbt ?? existing?.bbt ?? null,
      cervical_mucus: patch.cervicalMucus ?? existing?.cervicalMucus ?? null,
      is_intimate: patch.isIntimate ?? existing?.isIntimate ?? false,
      notes: patch.notes ?? existing?.notes ?? null,
    };
    const { data } = await supabase.from("cycle_day_logs").upsert(merged, { onConflict: "user_id,date" }).select().single();
    if (data) {
      const row = dayLogFrom(data);
      setDayLogs(prev => {
        const others = prev.filter(d => d.date !== date);
        return [row, ...others].sort((a, b) => b.date.localeCompare(a.date));
      });
    }
  }, [uid, dayLogs]);

  const deleteDayLog = useCallback(async (id: string) => {
    setDayLogs(prev => prev.filter(d => d.id !== id));
    await supabase.from("cycle_day_logs").delete().eq("id", id);
  }, []);

  const value = useMemo<Ctx>(() => ({
    settings, periods, dayLogs, loaded,
    saveSettings, addPeriodStart, setPeriodEnd, deletePeriod, upsertDayLog, deleteDayLog,
  }), [settings, periods, dayLogs, loaded, saveSettings, addPeriodStart, setPeriodEnd, deletePeriod, upsertDayLog, deleteDayLog]);

  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useCycle(): Ctx {
  const v = useContext(C);
  if (!v) {
    return {
      settings: DEFAULT_CYCLE_SETTINGS,
      periods: [],
      dayLogs: [],
      loaded: false,
      saveSettings: async () => {},
      addPeriodStart: async () => {},
      setPeriodEnd: async () => {},
      deletePeriod: async () => {},
      upsertDayLog: async () => {},
      deleteDayLog: async () => {},
    };
  }
  return v;
}
