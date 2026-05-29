import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { Sparkles, RefreshCw, Wand2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { getRhythmForecast } from "@/lib/rhythm-forecast";
import type { WeatherSnapshot } from "@/lib/weather";
import { aiInvoke } from "@/lib/ai-invoke";

interface Props {
  date: Date;
  snap: WeatherSnapshot | null;
  onPlanWithEnergy: () => void;
}

const cacheKey = (iso: string) => `careflow:today-guidance:${iso}`;

export function AIDailyGuidance({ date, snap, onPlanWithEnergy }: Props) {
  const iso = format(date, "yyyy-MM-dd");
  const { state } = useStore();
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate from cache
  useEffect(() => {
    try {
      const cached = localStorage.getItem(cacheKey(iso));
      if (cached) setText(cached);
    } catch { /* ignore */ }
    setError(null);
  }, [iso]);

  const generate = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const f = getRhythmForecast(date);
      const todaysTasks = state.tasks.filter(t => t.dueDate === iso && !t.parentTaskId);
      const topThree = todaysTasks.filter(t => t.isTopThree).slice(0, 3).map(t => t.title);
      const payload = {
        date: iso,
        weather: snap ? {
          location: snap.locationLabel,
          tempC: snap.tempC,
          condition: snap.conditionLabel,
          highC: snap.highC,
          lowC: snap.lowC,
          rainChance: snap.dayParts.reduce((m, p) => Math.max(m, p.precipChance), 0),
        } : null,
        moon: { phase: f.phaseLabel, sign: f.sign.sign, element: f.element, illumination: f.illumination },
        taskLoad: { total: todaysTasks.length, topThree },
      };
      const { data, error: fnErr } = await aiInvoke("ai-today-guidance", { body: payload });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      const next = (data?.guidance as string) ?? "";
      setText(next);
      try { localStorage.setItem(cacheKey(iso), next); } catch { /* ignore */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load guidance right now.");
    } finally {
      setLoading(false);
    }
  }, [date, iso, snap, state.tasks]);

  return (
    <section
      aria-label="AI daily guidance"
      className="cozy-card relative overflow-hidden p-4"
      style={{ background: "var(--gradient-sage)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{ background: "radial-gradient(50% 60% at 90% 0%, hsl(var(--primary)/0.18), transparent 65%)" }}
      />
      <div className="relative">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <Sparkles className="h-3 w-3" /> Today's guidance
        </div>
        {text ? (
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-foreground/90">{text}</p>
        ) : loading ? (
          <p className="mt-1.5 flex items-center gap-2 text-[13px] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading the day…
          </p>
        ) : error ? (
          <p className="mt-1.5 text-[12.5px] text-destructive">{error}</p>
        ) : (
          <p className="mt-1.5 text-[13px] text-muted-foreground italic">
            Tap “Generate” for a short, weather-aware nudge for the day.
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={generate} disabled={loading}>
            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {text ? "Regenerate" : "Generate"}
          </Button>
          <Button size="sm" className="h-8 rounded-full text-xs" onClick={onPlanWithEnergy}>
            <Wand2 className="mr-1 h-3.5 w-3.5" /> Plan my day
          </Button>
        </div>
      </div>
    </section>
  );
}