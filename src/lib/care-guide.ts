import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { aiInvoke } from "@/lib/ai-invoke";
import { useStore } from "@/lib/store";
import { useAtmosphere } from "@/lib/atmospheres";
import { DEFAULT_ANCHORS } from "@/lib/anchors";
import { format } from "date-fns";

export interface CareGuideBrief {
  focus: { title: string; why: string }[];
  anchor_reminder: string;
  rhythm_insight: string;
  dinner_suggestion: string;
  exhale_prompt: string;
}

const FALLBACK: CareGuideBrief = {
  focus: [
    { title: "One small kind thing", why: "Begin gently to build momentum" },
    { title: "Tend a quiet anchor", why: "Notice what's been waiting for care" },
  ],
  anchor_reminder: "Notice which anchor feels under-tended — one breath toward it counts.",
  rhythm_insight: "Match the wave of your energy today; don't fight it.",
  dinner_suggestion: "Something warm and simple from your pantry.",
  exhale_prompt: "What can you release before the day ends?",
};

/** Loads (or generates + caches) today's Care Guide brief for the signed-in user. */
export function useCareGuide() {
  const { state } = useStore();
  const { current: atmosphere } = useAtmosphere();
  const [brief, setBrief] = useState<CareGuideBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    setLoading(true); setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setBrief(FALLBACK); return; }
      const today = format(new Date(), "yyyy-MM-dd");

      if (!force) {
        const { data: cached } = await supabase
          .from("care_guide_briefs")
          .select("brief")
          .eq("user_id", user.id)
          .eq("brief_date", today)
          .maybeSingle();
        if (cached?.brief) { setBrief(cached.brief as CareGuideBrief); return; }
      }

      // Build small context payload
      const todayTasks = state.tasks
        .filter((t) => t.dueDate === today && t.status !== "done")
        .slice(0, 6);
      const topAnchors = DEFAULT_ANCHORS.map((a) => {
        const n = state.tasks.filter((t) => t.anchorKey === a.key && t.status === "done").length;
        return { key: a.key, label: a.label, flowPct: n };
      }).sort((a, b) => b.flowPct - a.flowPct).slice(0, 4);

      const ctx = {
        date: today,
        atmosphere,
        energy: state.energyToday ?? null,
        topAnchors,
        taskLoad: {
          total: todayTasks.length,
          topThree: todayTasks.slice(0, 3).map((t) => t.title),
        },
      };

      const { data, error: e } = await aiInvoke<{ brief: CareGuideBrief }>("ai-care-guide", { body: ctx });
      if (e) throw new Error(e?.message || "Care Guide unavailable");
      const fresh = (data?.brief as CareGuideBrief) ?? FALLBACK;
      setBrief(fresh);
      await supabase.from("care_guide_briefs").upsert({
        user_id: user.id,
        brief_date: today,
        atmosphere,
        brief: fresh as any,
      }, { onConflict: "user_id,brief_date" });
    } catch (err: any) {
      setError(err?.message ?? "Could not load Care Guide");
      setBrief(FALLBACK);
    } finally {
      setLoading(false);
    }
  }, [state.tasks, state.energyToday, atmosphere]);

  useEffect(() => { void load(false); /* eslint-disable-next-line */ }, []);

  return { brief: brief ?? FALLBACK, loading, error, refresh: () => load(true) };
}