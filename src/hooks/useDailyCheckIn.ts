import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  type CheckInAiPayload,
  type CheckInRecord,
  isoToday,
  loadCheckIn,
  saveCheckIn,
} from "@/lib/daily-checkin-store";
import { useStore } from "@/lib/store";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo } from "@/lib/cycle";
import { getMoonData } from "@/lib/moon-providers";
import { useWeatherSnapshot } from "@/lib/weather-store";

interface UseCheckInResult {
  iso: string;
  record: CheckInRecord | null;
  loading: boolean;
  generating: boolean;
  error: string | null;
  generate: (force?: boolean) => Promise<void>;
  update: (patch: Partial<CheckInRecord>) => Promise<void>;
  complete: () => Promise<void>;
}

export function useDailyCheckIn(dateISO: string = isoToday()): UseCheckInResult {
  const [record, setRecord] = useState<CheckInRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { state } = useStore();
  const { settings: cycleSettings, periods } = useCycle();
  const snap = useWeatherSnapshot();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadCheckIn(dateISO).then((rec) => {
      if (!cancelled) {
        setRecord(rec);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [dateISO]);

  const generate = useCallback(async (force = false) => {
    if (generating) return;
    if (!force && record?.ai_payload) return;
    setGenerating(true);
    setError(null);
    try {
      const moon = getMoonData(new Date(dateISO));
      const cycle = cycleSettings.enabled
        ? getPhaseInfo(new Date(dateISO), periods, cycleSettings)
        : null;
      const tasks = (state.tasks ?? []) as Array<{
        title: string; dueDate?: string; status?: string; priority?: string;
      }>;
      const today = tasks.filter((t) => t.dueDate === dateISO && t.status !== "done");
      const overdue = tasks.filter((t) => t.dueDate && t.dueDate < dateISO && t.status !== "done");

      const body = {
        date: dateISO,
        name: state.settings?.name ?? null,
        weather: snap ? { location: snap.locationLabel, tempC: snap.tempC, condition: snap.conditionLabel } : null,
        moon: moon ? { phase: moon.label, sign: moon.sign, illumination: moon.illumination } : null,
        cycle: cycle ? { phase: cycle.label, day: cycle.cycleDay } : null,
        taskLoad: {
          total: today.length,
          overdue: overdue.length,
          topThree: today.slice(0, 3).map((t) => t.title),
        },
        goals: (state.goals ?? []).slice(0, 5).map((g: { title: string }) => g.title),
        habits: (state.habits ?? []).slice(0, 6).map((h) => h.title),
      };

      const { data, error: fnError } = await supabase.functions.invoke("ai-daily-checkin", { body });
      if (fnError) throw fnError;
      const payload = (data as { payload?: CheckInAiPayload })?.payload;
      if (!payload || !payload.energy) throw new Error("Invalid AI response");

      const saved = await saveCheckIn(dateISO, {
        ai_payload: payload,
        chosen_intention: record?.chosen_intention ?? payload.method.anchor.intention,
      });
      setRecord(saved);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not generate check-in";
      setError(msg);
    } finally {
      setGenerating(false);
    }
  }, [dateISO, generating, record, cycleSettings, periods, snap, state]);

  const update = useCallback(async (patch: Partial<CheckInRecord>) => {
    const saved = await saveCheckIn(dateISO, patch);
    setRecord(saved);
  }, [dateISO]);

  const complete = useCallback(async () => {
    const saved = await saveCheckIn(dateISO, { completed_at: new Date().toISOString() });
    setRecord(saved);
  }, [dateISO]);

  return { iso: dateISO, record, loading, generating, error, generate, update, complete };
}