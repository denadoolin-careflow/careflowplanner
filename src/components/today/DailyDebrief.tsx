import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Sparkles, RefreshCcw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo, PHASE_META } from "@/lib/cycle";
import {
  computeCapacitySnapshot,
  computeRhythmAlignment,
  buildDebriefContext,
  localDebriefFallback,
  readCache,
  writeCache,
  type DebriefPayload,
} from "@/lib/daily-debrief";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const LABEL_TONE: Record<string, string> = {
  gentle: "hsl(140 45% 55%)",
  steady: "hsl(195 65% 55%)",
  stretched: "hsl(35 85% 55%)",
  overflowing: "hsl(0 70% 60%)",
};

export function DailyDebrief({ date }: { date: Date }) {
  const { state } = useStore();
  const { periods, settings } = useCycle();
  const cycle = useMemo(() => {
    try { return getPhaseInfo(date, periods, settings); } catch { return null; }
  }, [date, periods, settings]);

  const capacity = useMemo(
    () => computeCapacitySnapshot(state.tasks, state.appointments ?? [], date, cycle?.phase ?? null),
    [state.tasks, state.appointments, date, cycle?.phase],
  );
  const alignment = useMemo(
    () => computeRhythmAlignment(state.tasks, date, cycle?.phase ?? null),
    [state.tasks, date, cycle?.phase],
  );

  const [payload, setPayload] = useState<DebriefPayload | null>(() => readCache(date));
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setBusy(true);
    try {
      const ctx = buildDebriefContext(date, state.tasks, state.appointments ?? [], cycle, capacity);
      const { data, error } = await supabase.functions.invoke("ai-daily-debrief", { body: ctx });
      if (error) throw error;
      const next = (data ?? null) as DebriefPayload | null;
      if (next?.summary) {
        setPayload(next);
        writeCache(date, next);
      } else {
        const fb = localDebriefFallback(date, capacity, alignment, cycle);
        setPayload(fb);
      }
    } catch {
      const fb = localDebriefFallback(date, capacity, alignment, cycle);
      setPayload(fb);
      toast("Using gentle local insight — AI offline.");
    } finally {
      setBusy(false);
    }
  };

  const view = payload ?? localDebriefFallback(date, capacity, alignment, cycle);
  const pct = Math.min(100, Math.round(capacity.ratio * 100));
  const tone = LABEL_TONE[capacity.label];

  return (
    <section
      className="overflow-hidden rounded-3xl border border-border/40 bg-card/55 p-5 shadow-soft backdrop-blur-xl sm:p-6"
      style={{
        backgroundImage:
          "radial-gradient(120% 90% at 0% 0%, hsl(var(--primary)/0.08), transparent 55%)," +
          "radial-gradient(120% 90% at 100% 100%, hsl(var(--accent)/0.10), transparent 55%)",
      }}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          <p className="text-[10px] uppercase tracking-[0.28em]">Daily debrief</p>
          <span className="text-[10px] text-muted-foreground">· {format(date, "EEE, MMM d")}</span>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/60 px-3 py-1 text-[11px] text-foreground/80 transition hover:border-primary/40 hover:text-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />}
          {payload ? "Refresh" : "Get AI insight"}
        </button>
      </header>

      <p className="mt-3 text-balance font-display text-base italic leading-snug text-foreground/90 sm:text-lg">
        {view.summary}
      </p>

      {/* Capacity bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="uppercase tracking-[0.18em]">Capacity</span>
          <span className="tabular-nums">
            {Math.round(capacity.plannedMinutes / 60 * 10) / 10}h / {Math.round(capacity.ceilingMinutes / 60 * 10) / 10}h
            <span className="ml-2 font-medium uppercase tracking-[0.14em]" style={{ color: tone }}>
              {capacity.label}
            </span>
          </span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-background/60">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${tone}, ${tone}80)` }}
          />
        </div>
        {cycle && (
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Tuned for your {PHASE_META[cycle.phase].label.toLowerCase()} phase (day {cycle.cycleDay}).
          </p>
        )}
      </div>

      {/* Rhythm note */}
      {view.rhythmNote && (
        <div className="mt-4 rounded-2xl border border-border/40 bg-background/50 px-3 py-2 text-[12px] italic leading-snug text-foreground/80">
          {view.rhythmNote}
        </div>
      )}

      {/* Honors + reshape lists */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <DebriefList
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          title="With the rhythm"
          tone="hsl(140 45% 55%)"
          items={view.honors}
          empty="Nothing planned that obviously fits — or rest is fitting."
        />
        <DebriefList
          icon={<AlertCircle className="h-3.5 w-3.5" />}
          title="Consider reshaping"
          tone="hsl(35 85% 60%)"
          items={view.reshape}
          empty="Nothing flagged. Plan reads aligned."
        />
      </div>
    </section>
  );
}

function DebriefList({
  icon, title, tone, items, empty,
}: { icon: React.ReactNode; title: string; tone: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-background/50 p-3">
      <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em]" style={{ color: tone }}>
        {icon} {title}
      </div>
      {items.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it, i) => (
            <li key={i} className="flex gap-2 text-[12px] leading-snug text-foreground/85">
              <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full")} style={{ background: tone }} />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}