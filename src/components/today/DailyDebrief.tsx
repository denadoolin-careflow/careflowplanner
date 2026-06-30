import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Sparkles, RefreshCcw, Loader2, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";
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
  toDebriefItem,
  type DebriefPayload,
  type DebriefItem,
} from "@/lib/daily-debrief";
import { useBurnoutCheckIn, BURNOUT_META } from "@/lib/burnout-checkin";
import { useDebriefTone, DEBRIEF_TONES } from "@/lib/debrief-tone";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const LABEL_TONE: Record<string, string> = {
  gentle: "hsl(140 45% 55%)",
  steady: "hsl(195 65% 55%)",
  stretched: "hsl(35 85% 55%)",
  overflowing: "hsl(0 70% 60%)",
};

export function DailyDebrief({
  date,
  onTaskClick,
}: {
  date: Date;
  onTaskClick?: (id: string) => void;
}) {
  const { state } = useStore();
  const { periods, settings } = useCycle();
  const cycle = useMemo(() => {
    try { return getPhaseInfo(date, periods, settings); } catch { return null; }
  }, [date, periods, settings]);

  const { entry: burnout } = useBurnoutCheckIn(date);
  const [tone, setTone] = useDebriefTone();

  const capacity = useMemo(
    () => computeCapacitySnapshot(state.tasks, state.appointments ?? [], date, cycle?.phase ?? null, burnout.level),
    [state.tasks, state.appointments, date, cycle?.phase, burnout.level],
  );
  const alignment = useMemo(
    () => computeRhythmAlignment(state.tasks, date, cycle?.phase ?? null),
    [state.tasks, date, cycle?.phase],
  );

  const mvdTask = burnout.mvdTaskId ? state.tasks.find(t => t.id === burnout.mvdTaskId) : null;
  const mvdActive = burnout.mvd && !!mvdTask;

  const [payload, setPayload] = useState<DebriefPayload | null>(() => readCache(date));
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setBusy(true);
    try {
      const ctx = buildDebriefContext(date, state.tasks, state.appointments ?? [], cycle, capacity);
      const body = {
        ...ctx,
        tone,
        burnout: { level: burnout.level, mvd: burnout.mvd, mvdTaskTitle: mvdTask?.title ?? null },
      };
      const { data, error } = await supabase.functions.invoke("ai-daily-debrief", { body });
      if (error) throw error;
      const next = (data ?? null) as DebriefPayload | null;
      if (next?.summary) {
        setPayload(next);
        writeCache(date, next);
      } else {
        const fb = localDebriefFallback(date, capacity, alignment, cycle, { tone, mvdTitle: mvdTask?.title ?? null });
        setPayload(fb);
      }
    } catch {
      const fb = localDebriefFallback(date, capacity, alignment, cycle, { tone, mvdTitle: mvdTask?.title ?? null });
      setPayload(fb);
      toast("Using gentle local insight — AI offline.");
    } finally {
      setBusy(false);
    }
  };

  const base = payload ?? localDebriefFallback(date, capacity, alignment, cycle, { tone, mvdTitle: mvdTask?.title ?? null });

  // Apply MVD reframing locally so toggling MVD never requires a refetch.
  let honors: DebriefItem[] = base.honors.map(toDebriefItem);
  let reshape: DebriefItem[] = base.reshape.map(toDebriefItem);
  if (mvdActive && mvdTask) {
    const mvdItem: DebriefItem = { id: mvdTask.id, title: mvdTask.title, reason: "Your one tender thing for today." };
    const others = [...honors, ...reshape].filter(h => h.id !== mvdTask.id);
    honors = [mvdItem];
    reshape = others.slice(0, 3).map(o => ({ ...o, reason: "Could wait — protect your one thing." }));
  }

  const pct = Math.min(100, Math.round(capacity.ratio * 100));
  const capColor = LABEL_TONE[capacity.label];
  const burnoutColor = burnout.level ? BURNOUT_META[burnout.level].tone : null;
  // Position of the unadjusted (cycle-only) ceiling on the bar.
  const basePct = capacity.baseCeilingMinutes > 0
    ? Math.min(140, Math.round((capacity.baseCeilingMinutes / Math.max(capacity.ceilingMinutes, 1)) * 100))
    : 0;

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
        <div className="flex items-center gap-1.5">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/60 px-2.5 py-1 text-[11px] capitalize text-foreground/80 transition hover:border-primary/40 hover:text-foreground"
                title="Debrief tone"
              >
                {tone}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-1.5">
              <p className="px-2 pb-1.5 pt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Tone</p>
              {DEBRIEF_TONES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTone(t.id)}
                  className={cn(
                    "block w-full rounded-md px-2 py-1.5 text-left text-[12px] transition",
                    tone === t.id ? "bg-primary/10 text-foreground" : "text-foreground/85 hover:bg-muted/60",
                  )}
                >
                  <div className="font-medium">{t.label}</div>
                  <div className="text-[11px] text-muted-foreground">{t.hint}</div>
                </button>
              ))}
            </PopoverContent>
          </Popover>
          <button
            type="button"
            onClick={refresh}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/60 px-3 py-1 text-[11px] text-foreground/80 transition hover:border-primary/40 hover:text-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />}
            {payload ? "Refresh" : "Get AI insight"}
          </button>
        </div>
      </header>

      <p className="mt-3 text-balance font-display text-base italic leading-snug text-foreground/90 sm:text-lg">
        {base.summary}
      </p>

      {/* Capacity bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="uppercase tracking-[0.18em]">Capacity</span>
          <span className="tabular-nums">
            {Math.round(capacity.plannedMinutes / 60 * 10) / 10}h / {Math.round(capacity.ceilingMinutes / 60 * 10) / 10}h
            <span className="ml-2 font-medium uppercase tracking-[0.14em]" style={{ color: capColor }}>
              {capacity.label}
            </span>
          </span>
        </div>
        <div className="relative mt-1.5 h-2 w-full overflow-visible rounded-full bg-background/60">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${capColor}, ${capColor}80)` }}
          />
          {burnout.level && burnout.level !== "steady" && basePct !== 100 && basePct > 0 && (
            <div
              className="pointer-events-none absolute -top-1 h-4 w-px bg-foreground/40"
              style={{ left: `${Math.min(100, basePct)}%` }}
              title={`Base ceiling (before ${burnout.level}): ${Math.round(capacity.baseCeilingMinutes / 60 * 10) / 10}h`}
            />
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          {cycle && (
            <span>Tuned for your {PHASE_META[cycle.phase].label.toLowerCase()} phase (day {cycle.cycleDay}).</span>
          )}
          {burnout.level && burnoutColor && (
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: burnoutColor }} />
              <span>Adjusted for <span style={{ color: burnoutColor }}>{BURNOUT_META[burnout.level].label.toLowerCase()}</span> capacity.</span>
            </span>
          )}
        </div>
      </div>

      {/* Rhythm note */}
      {base.rhythmNote && (
        <div className="mt-4 rounded-2xl border border-border/40 bg-background/50 px-3 py-2 text-[12px] italic leading-snug text-foreground/80">
          {base.rhythmNote}
        </div>
      )}

      {/* Honors + reshape lists */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <DebriefList
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          title={mvdActive ? "One tender thing" : "With the rhythm"}
          tone="hsl(140 45% 55%)"
          items={honors}
          onTaskClick={onTaskClick}
          empty="Nothing planned that obviously fits — or rest is fitting."
        />
        <DebriefList
          icon={<AlertCircle className="h-3.5 w-3.5" />}
          title={mvdActive ? "Could wait" : "Consider reshaping"}
          tone="hsl(35 85% 60%)"
          items={reshape}
          onTaskClick={onTaskClick}
          empty="Nothing flagged. Plan reads aligned."
        />
      </div>
    </section>
  );
}

function DebriefList({
  icon, title, tone, items, empty, onTaskClick,
}: {
  icon: React.ReactNode; title: string; tone: string;
  items: DebriefItem[]; empty: string;
  onTaskClick?: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-background/50 p-3">
      <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em]" style={{ color: tone }}>
        {icon} {title}
      </div>
      {items.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it, i) => {
            const clickable = !!(it.id && onTaskClick);
            const Inner = (
              <>
                <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full")} style={{ background: tone }} />
                <span className="min-w-0">
                  <span className={cn("font-medium text-foreground/95", clickable && "underline-offset-2 group-hover:underline")}>{it.title}</span>
                  {it.reason && <span className="text-foreground/70"> — {it.reason}</span>}
                </span>
              </>
            );
            return clickable ? (
              <li key={it.id ?? i}>
                <button
                  type="button"
                  onClick={() => onTaskClick!(it.id!)}
                  className="group -mx-1 flex w-full gap-2 rounded-lg px-1 py-0.5 text-left text-[12px] leading-snug text-foreground/85 transition hover:bg-background/80"
                >
                  {Inner}
                </button>
              </li>
            ) : (
              <li key={i} className="flex gap-2 text-[12px] leading-snug text-foreground/85">
                {Inner}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}