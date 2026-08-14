import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, ArrowRight, Check, Info, Pencil, RefreshCw, Shuffle, Sparkles, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Task } from "@/lib/types";
import { hmToMin, minToHm, useAutoSchedulePrefs } from "@/lib/auto-schedule-prefs";
import { useNudgePrefs } from "@/lib/planner/nudge-prefs";
import { aiInvoke } from "@/lib/ai-invoke";
import { PlannerAssistantSettings } from "./PlannerAssistantSettings";
import {
  buildNudges, buildSuggestions, nextFreeStart, rangeLabel, timeLabel,
  type BusyRange, type Suggestion,
} from "@/lib/planner/schedule-assistant";

interface Props {
  date: Date;
  /** Tasks due this day with no clock time yet. */
  unscheduled: Task[];
  /** Everything already occupying the day, in absolute minutes. */
  busy: BusyRange[];
  /** Commit a placement (goes through planner history + undo). */
  onPlace: (taskId: string, absMin: number, durMin?: number) => Promise<void>;
  className?: string;
}

/**
 * Smart scheduling assistant: instant rule-based placements from your
 * auto-schedule preferences, with an optional AI pass from Carey.
 */
export function PlannerAssistantPanel({ date, unscheduled, busy, onPlace, className }: Props) {
  const { prefs } = useAutoSchedulePrefs();
  const { prefs: nudgePrefs } = useNudgePrefs();
  const [open, setOpen] = useState(false);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [durOverrides, setDurOverrides] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [aiReasons, setAiReasons] = useState<Record<string, string>>({});
  const [aiOrder, setAiOrder] = useState<string[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [seed, setSeed] = useState(0);

  const isToday = format(new Date(), "yyyy-MM-dd") === format(date, "yyyy-MM-dd");

  const base = useMemo(
    () => buildSuggestions({ tasks: unscheduled.filter(t => !skipped.includes(t.id)), busy, prefs, isToday }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unscheduled, skipped, busy, prefs, isToday, seed],
  );

  const suggestions: Suggestion[] = useMemo(() => {
    const withOverrides = base.map(s => ({
      ...s,
      startAbsMin: overrides[s.taskId] ?? s.startAbsMin,
      durMin: durOverrides[s.taskId] ?? s.durMin,
      reason: aiReasons[s.taskId] ?? s.reason,
    }));
    if (!aiOrder.length) return withOverrides;
    const rank = new Map(aiOrder.map((id, i) => [id, i]));
    return withOverrides.slice().sort((a, b) => (rank.get(a.taskId) ?? 999) - (rank.get(b.taskId) ?? 999));
  }, [base, overrides, durOverrides, aiReasons, aiOrder]);

  // Everything is selected by default so "Apply selected" mirrors "Place all".
  useEffect(() => {
    setSelected(prev => {
      const next = { ...prev };
      for (const s of suggestions) if (next[s.taskId] === undefined) next[s.taskId] = true;
      return next;
    });
  }, [suggestions]);

  const nudges = useMemo(
    () => buildNudges({ busy, prefs, unscheduled, nudgePrefs }),
    [busy, prefs, unscheduled, nudgePrefs],
  );

  const activeConstraints = useMemo(() => {
    const chips: string[] = [];
    const w = prefs.noScheduleWindows ?? [];
    if (w.length) chips.push(`${w.length} protected window${w.length === 1 ? "" : "s"}`);
    const r = (prefs.personRules ?? []).filter(x => x.name);
    if (r.length) chips.push(`${r.map(x => x.name).join(", ")} grouped`);
    chips.push(`Energy bands ${prefs.highEnergyH}–${prefs.highEnergyEndH}h high`);
    if (prefs.bufferMin) chips.push(`${prefs.bufferMin}m buffer`);
    if (prefs.skipPastTimes && isToday) chips.push("Skips past times");
    return chips;
  }, [prefs, isToday]);

  if (!unscheduled.length && !nudges.length) return null;

  const selectedList = suggestions.filter(s => selected[s.taskId]);

  const place = async (s: Suggestion) => {
    setPlacing(true);
    try {
      await onPlace(s.taskId, s.startAbsMin, s.durMin);
      setSkipped(x => [...x, s.taskId]);
    } finally { setPlacing(false); }
  };

  const applyMany = async (list: Suggestion[]) => {
    if (!list.length) return;
    setPlacing(true);
    try {
      for (const s of list) await onPlace(s.taskId, s.startAbsMin, s.durMin);
      toast.success(`Placed ${list.length} task${list.length === 1 ? "" : "s"}`);
    } finally { setPlacing(false); }
  };

  const regenerate = () => {
    setOverrides({});
    setDurOverrides({});
    setAiOrder([]);
    setAiReasons({});
    setAiSummary(null);
    setSeed(n => n + 1);
    toast.success("Plan regenerated");
  };

  const anotherSlot = (s: Suggestion) => {
    const others = [...busy, ...suggestions.filter(o => o.taskId !== s.taskId).map(o => ({ start: o.startAbsMin, end: o.startAbsMin + o.durMin }))];
    const next = nextFreeStart(others, s.startAbsMin + 15, s.durMin, prefs);
    if (next === null) { toast.info("No later slot fits today"); return; }
    setOverrides(o => ({ ...o, [s.taskId]: next }));
  };

  const askCarey = async () => {
    setAiLoading(true);
    setAiSummary(null);
    try {
      const { data, error } = await aiInvoke<{ text?: string; plan?: any }>("ai-planner", {
        body: { action: "organize_day" },
      });
      if (error) throw error;
      const plan = (data as any)?.plan;
      if (!plan?.buckets) {
        setAiSummary((data as any)?.text ?? "Carey couldn't shape a plan right now — the suggestions below still stand.");
        return;
      }
      const order: string[] = [];
      const reasons: Record<string, string> = {};
      const times: Record<string, number> = {};
      for (const bucket of plan.buckets ?? []) {
        for (const item of bucket.items ?? []) {
          const match = unscheduled.find(t => t.title.toLowerCase().trim() === String(item.title ?? "").toLowerCase().trim());
          if (!match) continue;
          order.push(match.id);
          if (item.why) reasons[match.id] = `${bucket.label}: ${item.why}`;
          const hm = /^(\d{1,2}):(\d{2})$/.exec(String(item.suggested_time ?? ""));
          if (hm) times[match.id] = Number(hm[1]) * 60 + Number(hm[2]);
        }
      }
      setAiOrder(order);
      setAiReasons(reasons);
      setOverrides(o => ({ ...o, ...times }));
      setAiSummary(plan.summary ?? null);
      if (!order.length) toast.info("Carey didn't recognise any of today's tasks — keeping the instant plan.");
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : "Carey is unavailable right now";
      toast.error(msg.includes("429") ? "Carey is busy — the instant suggestions still work." : msg);
    } finally { setAiLoading(false); }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn("rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/5 to-card/70", className)}>
      <CollapsibleTrigger asChild>
        <button type="button" className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left">
          <Wand2 className="h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block font-display text-sm font-semibold">Scheduling assistant</span>
            <span className="block truncate text-[11.5px] text-muted-foreground">
              {suggestions.length
                ? `${suggestions.length} placement${suggestions.length === 1 ? "" : "s"} ready`
                : "Nothing to place — your day looks set"}
              {nudges.length ? ` · ${nudges.length} note${nudges.length === 1 ? "" : "s"}` : ""}
            </span>
          </span>
          <span className="shrink-0 text-[11px] text-muted-foreground">{open ? "Hide" : "Review"}</span>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="space-y-2 border-t border-border/50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" className="h-7 rounded-full text-[11px]" disabled={!selectedList.length || placing} onClick={() => void applyMany(selectedList)}>
              <Check className="mr-1 h-3 w-3" />
              {selectedList.length === suggestions.length ? "Place all" : `Apply ${selectedList.length}`}
            </Button>
            <Button size="sm" variant="outline" className="h-7 rounded-full text-[11px]" disabled={placing} onClick={regenerate}>
              <RefreshCw className="mr-1 h-3 w-3" />Regenerate
            </Button>
            <Button size="sm" variant="outline" className="h-7 rounded-full text-[11px]" disabled={aiLoading} onClick={() => void askCarey()}>
              <Sparkles className={cn("mr-1 h-3 w-3", aiLoading && "animate-pulse")} />
              {aiLoading ? "Carey is thinking…" : "Ask Carey"}
            </Button>
            <PlannerAssistantSettings />
            <Button size="sm" variant="ghost" className="h-7 rounded-full text-[11px]" onClick={() => { setSkipped([]); setOverrides({}); setDurOverrides({}); setAiOrder([]); setAiReasons({}); setAiSummary(null); setSelected({}); }}>
              Reset
            </Button>
          </div>

          {activeConstraints.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {activeConstraints.map(c => (
                <span key={c} className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">{c}</span>
              ))}
            </div>
          )}

          {aiSummary && (
            <p className="rounded-xl bg-card/70 px-3 py-2 text-[12px] italic text-muted-foreground">{aiSummary}</p>
          )}

          {nudges.length > 0 && (
            <ul className="space-y-1">
              {nudges.map(n => (
                <li key={n.id} className={cn(
                  "flex items-start gap-2 rounded-xl px-2.5 py-1.5 text-[11.5px]",
                  n.tone === "warn" ? "bg-destructive/10 text-destructive" : "bg-muted/50 text-muted-foreground",
                )}>
                  {n.tone === "warn" ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                  <span>{n.message}</span>
                </li>
              ))}
            </ul>
          )}

          <ul className="space-y-1.5">
            {suggestions.map(s => {
              const isEditing = editing === s.taskId;
              return (
                <li key={s.taskId} className="rounded-xl border border-border/50 bg-card/80 px-2.5 py-2 text-[12px]">
                  <div className="flex flex-wrap items-start gap-2">
                    <Checkbox
                      className="mt-1"
                      checked={!!selected[s.taskId]}
                      onCheckedChange={(v) => setSelected(m => ({ ...m, [s.taskId]: !!v }))}
                      aria-label={`Include ${s.title} in the plan`}
                    />
                    <div className="min-w-[170px] flex-1">
                      <div className="font-medium [overflow-wrap:anywhere]">{s.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                        <span className="rounded bg-muted/60 px-1 py-px font-mono">
                          {s.fromAbsMin != null ? timeLabel(s.fromAbsMin) : "Unscheduled"}
                        </span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="rounded bg-primary/10 px-1 py-px font-mono text-primary">
                          {rangeLabel(s.startAbsMin, s.durMin)}
                        </span>
                        <span>· {s.durMin}m</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">{s.reason}</div>
                      {!!s.constraints?.length && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {s.constraints.map(c => (
                            <span key={c} className="rounded-full bg-muted/50 px-1.5 py-px text-[10px] text-muted-foreground">{c}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button size="sm" className="h-7 rounded-full text-[11px]" disabled={placing} onClick={() => void place(s)}>Accept</Button>
                      <Button
                        size="icon" variant="ghost" className="h-7 w-7"
                        aria-label={`Edit slot for ${s.title}`}
                        onClick={() => setEditing(isEditing ? null : s.taskId)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Pick another slot for ${s.title}`} onClick={() => anotherSlot(s)}>
                        <Shuffle className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Skip ${s.title}`} onClick={() => setSkipped(x => [...x, s.taskId])}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border/50 pt-2">
                      <label className="text-[11px] text-muted-foreground" htmlFor={`start-${s.taskId}`}>Start</label>
                      <Input
                        id={`start-${s.taskId}`}
                        type="time"
                        className="h-7 w-[6.4rem] text-xs"
                        value={minToHm(s.startAbsMin)}
                        onChange={(e) => setOverrides(o => ({ ...o, [s.taskId]: hmToMin(e.target.value) }))}
                      />
                      <label className="text-[11px] text-muted-foreground" htmlFor={`dur-${s.taskId}`}>Duration</label>
                      <Input
                        id={`dur-${s.taskId}`}
                        type="number" min={15} max={480} step={15}
                        className="h-7 w-20 text-xs"
                        value={s.durMin}
                        onChange={(e) => setDurOverrides(d => ({ ...d, [s.taskId]: Math.max(15, Math.min(480, Number(e.target.value) || 15)) }))}
                      />
                      <Button size="sm" className="h-7 rounded-full text-[11px]" disabled={placing} onClick={() => { setEditing(null); void place(s); }}>
                        Apply
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
            {!suggestions.length && (
              <li className="rounded-xl border border-dashed border-border/60 px-3 py-4 text-center text-[11.5px] text-muted-foreground">
                Nothing left to place for this day.
              </li>
            )}
          </ul>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
