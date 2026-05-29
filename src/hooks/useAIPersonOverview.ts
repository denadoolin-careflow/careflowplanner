import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { aiInvoke } from "@/lib/ai-invoke";
import type { CareRecipient } from "@/lib/types";

export interface PersonOverviewPayload {
  snapshot?: string;
  devPlan?: { area: string; focus: string; why?: string }[];
  foods?: { title: string; why?: string }[];
  habits?: { title: string; why?: string }[];
  carePlan?: { title: string; detail?: string }[];
  routines?: { title: string; when?: string; why?: string }[];
  activities?: { title: string; why?: string }[];
  cycle?: string | null;
  zodiacNote?: string | null;
}

export interface PersonOverviewState {
  payload: PersonOverviewPayload | null;
  generatedAt: string | null;
  loading: boolean;
  generating: boolean;
  error: string | null;
  regenerate: () => Promise<void>;
}

export function useAIPersonOverview(
  recipient: CareRecipient | null | undefined,
  extras: { cyclePhase?: string | null; routineTitles?: string[]; habitTitles?: string[] } = {}
): PersonOverviewState {
  const [payload, setPayload] = useState<PersonOverviewPayload | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // load cached
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!recipient?.id) { setPayload(null); setGeneratedAt(null); setLoading(false); return; }
      setLoading(true);
      const { data } = await supabase
        .from("person_overviews")
        .select("payload, generated_at")
        .eq("recipient_id", recipient.id)
        .maybeSingle();
      if (cancelled) return;
      setPayload(((data as any)?.payload as PersonOverviewPayload) ?? null);
      setGeneratedAt(((data as any)?.generated_at as string) ?? null);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [recipient?.id]);

  const regenerate = useCallback(async () => {
    if (!recipient?.id) return;
    setGenerating(true);
    setError(null);
    try {
      const { data, error: err, quotaExceeded } = await aiInvoke<{
        payload: PersonOverviewPayload; generatedAt: string;
      }>("ai-person-overview", {
        body: {
          recipient: {
            id: recipient.id,
            name: recipient.name,
            kind: recipient.kind,
            birthDate: recipient.birthDate ?? null,
            zodiac: recipient.zodiac ?? null,
            location: recipient.location ?? null,
            notes: recipient.notes ?? null,
            sensory: recipient.sensory ?? null,
            loveLanguages: recipient.loveLanguages ?? [],
            foodPreferences: recipient.foodPreferences ?? {},
            school: recipient.school ?? null,
            educationLevel: recipient.educationLevel ?? null,
            schedule: recipient.schedule ?? {},
            meds: recipient.meds ?? [],
          },
          cyclePhase: extras.cyclePhase ?? null,
          routineTitles: extras.routineTitles ?? [],
          habitTitles: extras.habitTitles ?? [],
        },
      });
      if (quotaExceeded) return;
      if (err) { setError(String((err as any)?.message ?? err)); return; }
      if (data?.payload) {
        setPayload(data.payload);
        setGeneratedAt(data.generatedAt ?? new Date().toISOString());
      }
    } catch (e) {
      setError(String((e as any)?.message ?? e));
    } finally {
      setGenerating(false);
    }
  }, [recipient, extras.cyclePhase, JSON.stringify(extras.routineTitles ?? []), JSON.stringify(extras.habitTitles ?? [])]);

  return { payload, generatedAt, loading, generating, error, regenerate };
}