import { useEffect, useMemo, useState } from "react";
import { Activity, HeartPulse, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { loadRecentCheckins, type MentalLoadCheckin } from "@/lib/mental-load";
import { FlowCard, FlowCardEyebrow, FlowCardTitle } from "@/components/ui/flow-card";
import { cn } from "@/lib/utils";

/**
 * Phase 3 — Caregiver load meter.
 * Reads the last 14 days of mental-load check-ins (energy / emotional / caregiving),
 * computes a 0–100 load score (higher = heavier), and renders a small ring + spark.
 */

type Band = { id: "light" | "moderate" | "heavy" | "very-heavy"; label: string; color: string; copy: string };

function bandFor(load: number): Band {
  if (load < 30)  return { id: "light",      label: "Spacious",   color: "hsl(150 55% 50%)", copy: "You're holding things gently. Keep protecting the soft edges." };
  if (load < 55)  return { id: "moderate",   label: "Moderate",   color: "hsl(200 70% 55%)", copy: "Steady weight. A small reset would keep the week soft." };
  if (load < 75)  return { id: "heavy",      label: "Heavy",      color: "hsl(35 85% 58%)",  copy: "You're carrying a lot — try a minimum-viable day or ask for help." };
  return            { id: "very-heavy", label: "Very heavy", color: "hsl(346 70% 60%)", copy: "Pause. Cancel one thing. Let Carey help redistribute the load." };
}

function loadFromRow(r: MentalLoadCheckin): number {
  // each axis is 1..5 where 1 = heaviest. Invert and scale to 0..100.
  const raw = (6 - r.energy) + (6 - r.emotional) + (6 - r.caregiving); // 3..15
  return ((raw - 3) / 12) * 100;
}

export function CaregiverLoadMeter({ className }: { className?: string }) {
  const [uid, setUid] = useState<string | null>(null);
  const [rows, setRows] = useState<MentalLoadCheckin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const id = data.user?.id ?? null;
      setUid(id);
      if (!id) { setLoading(false); return; }
      loadRecentCheckins(id, 14).then((r) => {
        if (cancelled) return;
        setRows(r);
        setLoading(false);
      }).catch(() => { if (!cancelled) setLoading(false); });
    });
    return () => { cancelled = true; };
  }, []);

  const summary = useMemo(() => {
    if (rows.length === 0) return null;
    const recent = rows.slice(-7);
    const avg = recent.reduce((s, r) => s + loadFromRow(r), 0) / recent.length;
    const prior = rows.slice(0, Math.max(0, rows.length - 7));
    const priorAvg = prior.length ? prior.reduce((s, r) => s + loadFromRow(r), 0) / prior.length : avg;
    const delta = avg - priorAvg;
    return { avg: Math.round(avg), delta: Math.round(delta), recent };
  }, [rows]);

  if (!uid && !loading) return null;

  const band = summary ? bandFor(summary.avg) : null;
  const ringStyle = summary && band ? {
    background: `conic-gradient(${band.color} ${summary.avg * 3.6}deg, hsl(var(--muted)) 0)`,
  } as React.CSSProperties : undefined;

  return (
    <FlowCard tone="carey" size="md" className={className}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <FlowCardEyebrow className="flex items-center gap-1.5">
            <HeartPulse className="h-3 w-3" /> Caregiver load · last 7 days
          </FlowCardEyebrow>
          {loading ? (
            <p className="mt-2 text-sm text-muted-foreground">Reading your check-ins…</p>
          ) : !summary ? (
            <>
              <FlowCardTitle className="mt-1 text-base">No check-ins yet</FlowCardTitle>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                A 30-second check-in helps Carey notice patterns and lighten the load before it spikes.
              </p>
              <Link
                to="/mental-load"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Sparkles className="h-3 w-3" /> Start a check-in
              </Link>
            </>
          ) : band && (
            <>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-3xl font-semibold tabular-nums" style={{ color: band.color }}>
                  {summary.avg}
                </span>
                <FlowCardTitle className="text-base">{band.label}</FlowCardTitle>
                {summary.delta !== 0 && (
                  <span className={cn(
                    "text-[11px] font-medium tabular-nums",
                    summary.delta > 0 ? "text-rose-500" : "text-emerald-500",
                  )}>
                    {summary.delta > 0 ? "↑" : "↓"}{Math.abs(summary.delta)} vs prior
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{band.copy}</p>
            </>
          )}
        </div>
        {summary && (
          <span
            className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full"
            style={ringStyle}
            aria-hidden
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-background">
              <Activity className="h-4 w-4 text-foreground/70" />
            </span>
          </span>
        )}
      </div>

      {summary && summary.recent.length > 1 && (
        <div className="mt-4 flex items-end gap-1" aria-hidden>
          {summary.recent.map((r) => {
            const v = loadFromRow(r);
            const h = Math.max(6, Math.round((v / 100) * 28));
            const c = bandFor(v).color;
            return (
              <div
                key={r.date}
                className="flex-1 rounded-sm"
                style={{ height: h, background: c, opacity: 0.7 }}
                title={`${r.date} · ${Math.round(v)}`}
              />
            );
          })}
        </div>
      )}

      {summary && (
        <div className="mt-3 flex items-center justify-between text-[11px]">
          <Link to="/mental-load" className="text-primary hover:underline">Log today</Link>
          <Link to="/insights" className="text-muted-foreground hover:underline">See patterns</Link>
        </div>
      )}
    </FlowCard>
  );
}