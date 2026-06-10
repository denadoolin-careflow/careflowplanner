/**
 * Carey's daily cosmic + cyclical snapshot.
 * - Pulls cached/AI-generated `cosmic_daily_guidance` via useDailyGuidance.
 * - Surfaces moon phase + sign, cycle phase, weather, plus a short body,
 *   a mindfulness journal prompt, and an affirmation.
 * - Tiny ✦ button to regenerate; tap headline to jump to Cosmic Flow.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Sparkles, RefreshCw, Telescope, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBirthChart } from "@/lib/cosmic/hooks";
import { useNatalChart, useDailyGuidance } from "@/lib/cosmic/v2-hooks";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo } from "@/lib/cycle";
import { getMoonData } from "@/lib/moon-providers";
import { WeatherWidget } from "@/components/widgets/WeatherWidget";

export function CareyDailySnapshot() {
  const { row } = useBirthChart();
  const chart = useNatalChart(
    row
      ? {
          date: row.birth_date, time: row.birth_time, tz: row.birth_tz,
          lat: row.birth_lat, lng: row.birth_lng, place: row.birth_place,
          house_system: "whole-sign",
        }
      : null,
  );
  const { data, loading, refresh } = useDailyGuidance(chart, new Date());
  const moon = getMoonData(new Date());
  const { settings: cycleSettings, periods } = useCycle();
  const cyclePhase = useMemo(
    () => getPhaseInfo(new Date(), periods, cycleSettings),
    [periods, cycleSettings],
  );

  return (
    <div className="cozy-card relative overflow-hidden p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(120% 80% at 0% 0%, hsl(var(--moon)/0.18), transparent 60%), radial-gradient(120% 80% at 100% 100%, hsl(var(--accent)/0.18), transparent 60%)",
        }}
      />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            Carey's daily snapshot
          </p>
          <h3 className="mt-0.5 truncate font-display text-base sm:text-lg">
            {loading && !data ? "Tuning in…" : data?.headline ?? "Today's cosmic guidance"}
          </h3>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0"
          onClick={() => refresh(true)}
          disabled={loading}
          aria-label="Regenerate snapshot"
          title="Regenerate"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" className="gap-1 font-normal">
          <span aria-hidden>{moon.glyph}</span>
          {moon.label}
          {moon.sign ? <span className="opacity-70">· {moon.sign}</span> : null}
        </Badge>
        {cyclePhase && (
          <Badge
            variant="outline"
            className="gap-1 font-normal"
            style={{
              borderColor: `hsl(var(${cyclePhase.tokenVar}) / 0.4)`,
              color: `hsl(var(${cyclePhase.tokenVar}))`,
            }}
          >
            <span aria-hidden>{cyclePhase.glyph}</span>
            Day {cyclePhase.cycleDay} · {cyclePhase.label}
          </Badge>
        )}
        {data?.mood_tags?.slice(0, 2).map((t) => (
          <Badge key={t} variant="outline" className="font-normal opacity-80">
            {t}
          </Badge>
        ))}
      </div>

      {data?.body && (
        <p className="mt-3 line-clamp-4 text-[13px] leading-relaxed text-foreground/85">
          {data.body}
        </p>
      )}

      {data?.suggested_actions && data.suggested_actions.length > 0 && (
        <ul className="mt-3 space-y-1 text-[12.5px]">
          {data.suggested_actions.slice(0, 3).map((a, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span aria-hidden className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary/70" />
              <span>{a}</span>
            </li>
          ))}
        </ul>
      )}

      {data?.journal_prompt && (
        <div className="mt-3 rounded-md border border-border/40 bg-card/60 p-2.5">
          <p className="flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <NotebookPen className="h-3 w-3" />
            Mindfulness prompt
          </p>
          <p className="mt-0.5 text-[12.5px] italic">{data.journal_prompt}</p>
        </div>
      )}

      {data?.gentle_reminder && (
        <p className="mt-2 text-[12px] italic text-primary/85">
          ✦ {data.gentle_reminder}
        </p>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="min-h-[60px] overflow-hidden rounded-md border border-border/40 bg-card/40 p-2">
          <WeatherWidget compact />
        </div>
        <Button asChild variant="outline" size="sm" className="h-auto justify-start gap-1.5 py-2">
          <Link to="/cosmic-flow">
            <Telescope className="h-3.5 w-3.5" />
            Open Cosmic Flow
          </Link>
        </Button>
      </div>

      {!row && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Add your <Link to="/cosmic-flow/birth-chart" className="underline">birth chart</Link> for more personal guidance.
        </p>
      )}
    </div>
  );
}