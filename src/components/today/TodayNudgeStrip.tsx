/**
 * Quiet Today nudges: no dinner planned, cleaning essentials still open, or
 * someone you haven't reached in a while. Each nudge can be acted on, marked
 * done, snoozed for a while, or dismissed until tomorrow.
 */
import { useMemo } from "react";
import { format } from "date-fns";
import { AlarmClock, Bell, Check, Settings2, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/store";
import { usePeopleDirectory } from "@/lib/people-directory";
import { useCheckins, lastReachedMap, daysSince } from "@/lib/connection-checkins";
import {
  buildNudges, dismissNudge, completeNudge, snoozeNudge,
  useNudgePrefs, useNudgeTick, type TodayNudge,
} from "@/lib/today-nudges";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const SNOOZE_OPTIONS = [
  { label: "1 hour", minutes: 60 },
  { label: "3 hours", minutes: 180 },
  { label: "Tonight", minutes: 360 },
] as const;

export function TodayNudgeStrip({
  date, onAction, className,
}: {
  date: Date;
  onAction?: (type: "dinner" | "cleaning" | "connection") => void;
  className?: string;
}) {
  const { state } = useStore();
  const people = usePeopleDirectory();
  const { checkins } = useCheckins(80);
  const { prefs, update } = useNudgePrefs();
  const tick = useNudgeTick();

  const iso = format(date, "yyyy-MM-dd");
  const hour = new Date().getHours();

  const nudges = useMemo(() => {
    const hasDinner = state.meals.some(m => m.date === iso && m.slot === "Dinner");
    const openEssentials = state.cleaning.filter(c => !c.done && c.cadence === "daily").length;
    const last = lastReachedMap(checkins);
    const stale = people
      .map(p => ({ id: p.id, name: p.name, days: daysSince(last[p.id]) ?? 999 }))
      .filter(p => p.days > 0);
    return buildNudges({ hour, dayIso: iso, hasDinner, openEssentials, staleConnections: stale, nowTs: Date.now() }, prefs);
    // tick re-evaluates dismissals and snoozes
  }, [state.meals, state.cleaning, people, checkins, prefs, iso, hour, tick]);

  if (nudges.length === 0) return null;

  return (
    <section aria-label="Gentle nudges" className={cn("space-y-1.5", className)}>
      {nudges.map(n => (
        <NudgeRow
          key={n.id}
          nudge={n}
          dayIso={iso}
          onAction={() => { haptics.tap?.(); onAction?.(n.type); }}
        />
      ))}

      <div className="flex justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Nudge settings"
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <Settings2 className="h-3 w-3" aria-hidden /> Nudge settings
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 space-y-3 p-3">
            <Row label="Dinner reminder" checked={prefs.dinner} onChange={(v) => update({ dinner: v })} />
            <label className="flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground">After hour</span>
              <input
                type="number" min={0} max={23} value={prefs.dinnerAfterHour}
                onChange={(e) => update({ dinnerAfterHour: Number(e.target.value) })}
                aria-label="Dinner nudge hour"
                className="w-16 rounded-lg border border-border/60 bg-background px-2 py-1 text-right text-[12px]"
              />
            </label>
            <Row label="Cleaning reminder" checked={prefs.cleaning} onChange={(v) => update({ cleaning: v })} />
            <label className="flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground">After hour</span>
              <input
                type="number" min={0} max={23} value={prefs.cleaningAfterHour}
                onChange={(e) => update({ cleaningAfterHour: Number(e.target.value) })}
                aria-label="Cleaning nudge hour"
                className="w-16 rounded-lg border border-border/60 bg-background px-2 py-1 text-right text-[12px]"
              />
            </label>
            <Row label="Connection reminder" checked={prefs.connection} onChange={(v) => update({ connection: v })} />
            <label className="flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground">After days</span>
              <input
                type="number" min={1} max={90} value={prefs.connectionAfterDays}
                onChange={(e) => update({ connectionAfterDays: Number(e.target.value) })}
                aria-label="Connection nudge days"
                className="w-16 rounded-lg border border-border/60 bg-background px-2 py-1 text-right text-[12px]"
              />
            </label>
          </PopoverContent>
        </Popover>
      </div>
    </section>
  );
}

function NudgeRow({ nudge, dayIso, onAction }: { nudge: TodayNudge; dayIso: string; onAction: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border/50 bg-muted/30 px-3 py-2">
      <Bell className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <p className="min-w-0 flex-1 text-[12.5px] leading-snug [overflow-wrap:anywhere]">{nudge.message}</p>
      <button
        type="button"
        onClick={onAction}
        className="shrink-0 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] hover:bg-muted"
      >
        {nudge.actionLabel}
      </button>
      <button
        type="button"
        onClick={() => { haptics.success?.(); completeNudge(nudge.id, dayIso); }}
        aria-label="Mark nudge done"
        title="Mark done"
        className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
      >
        <Check className="h-3.5 w-3.5" aria-hidden />
      </button>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Snooze nudge"
            title="Snooze"
            className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <AlarmClock className="h-3.5 w-3.5" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-36 p-1.5">
          {SNOOZE_OPTIONS.map(o => (
            <button
              key={o.minutes}
              type="button"
              onClick={() => { haptics.tap?.(); snoozeNudge(nudge.id, o.minutes); }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] hover:bg-muted"
            >
              <AlarmClock className="h-3 w-3 text-muted-foreground" aria-hidden />
              Snooze {o.label}
            </button>
          ))}
        </PopoverContent>
      </Popover>
      <button
        type="button"
        onClick={() => dismissNudge(nudge.id, dayIso)}
        aria-label="Not today"
        title="Not today"
        className="shrink-0 rounded-full p-1 text-muted-foreground hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}

function Row({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12.5px]">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
